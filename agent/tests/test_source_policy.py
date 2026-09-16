import importlib
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from fastapi.testclient import TestClient
from main import app
from study_assist import source_policy as p
from retrieval.evidence_gate import validate_decision


def verdict(**changes):
    return {'scope':'english','context':'sufficient','answer_requirement':'Preserve tense in a complete sentence.','evidence_id':'','support_reason':'No supporting rule.',**changes}


def test_scope_precedes_context_and_clears_sources():
    units={'a':{'source_id':'real','text':'An actual reference passage of sufficient length.'}}
    for changes,expected in [({'scope':'other','context':'missing'},'out_of_scope'),({'context':'missing'},'needs_context')]:
        r=p.decode(verdict(evidence_id='a',**changes),units)
        assert r['decision']==expected and r['source_id']=='' and r['support_quote']==''


def test_no_coverage_is_not_missing_context():
    assert p.decode(verdict(),{})['decision']=='not_covered'
    with pytest.raises(ValueError):p.decode(verdict(context='not_applicable'),{})
    with pytest.raises(ValueError):p.decode(verdict(evidence_id='invented'),{})


def test_evidence_excludes_metadata_and_preserves_boundary():
    text='Title: Topic\nWhen to use: A retrieval-only hint.\n\nExplanation: Preserve the original tense and participants.\n\nBoundary (incorrect example; do not imitate):\nOriginal: It may happen. Bad rewrite: It happened.\nWhy incorrect: This asserts completion.\n\nTags: tense'
    refs=[{'id':'note','title':'Topic','rule':text}];units=p.evidence_units(refs)
    assert len(units)==2 and all('When to use' not in u['text'] for u in units.values())
    key=next(k for k,u in units.items() if u['text'].startswith('Boundary'))
    out=p.decode(verdict(evidence_id=key),units)
    assert 'Why incorrect:' in out['support_quote']
    validate_decision({k:out[k] for k in ['decision','source_id','support_quote','rationale']},refs)


@pytest.mark.asyncio
async def test_single_provider_call_and_usage(monkeypatch):
    response=SimpleNamespace(model=p.MODEL,usage=SimpleNamespace(prompt_tokens=50,completion_tokens=10,prompt_tokens_details=SimpleNamespace(cached_tokens=20)),choices=[SimpleNamespace(finish_reason='stop',message=SimpleNamespace(content=json.dumps(verdict()),refusal=None))])
    create=AsyncMock(return_value=response)
    client=MagicMock();client.chat.completions.create=create;client.__aenter__=AsyncMock(return_value=client);client.__aexit__=AsyncMock(return_value=False)
    with patch('openai.AsyncOpenAI',return_value=client) as ctor:
        r=await p.verify_evidence('A general English question.',{},[])
    assert r['decision']=='not_covered' and r['cached_input_tokens']==20 and r['provider_requests']==1
    create.assert_awaited_once();assert ctor.call_args.kwargs['max_retries']==0


@pytest.mark.asyncio
async def test_provider_failure_has_no_answer_or_secret_error():
    with patch('openai.AsyncOpenAI',side_effect=RuntimeError('private-key-detail')):
        r=await p.verify_evidence('Why?',{},[])
    assert r['decision']=='verification_unavailable' and r['source_id']=='' and 'private-key-detail' not in str(r)


def test_coverage_disclosure_is_added_when_model_omits_it():
    module=importlib.import_module('study_assist.router')
    miss={'hit':False,'note':None,'safe_examples':[],'score':0,'matched_tags':[],'reason':'not_covered','latency_ms':0}
    llm=MagicMock();llm.ainvoke=AsyncMock(return_value=SimpleNamespace(content='Use an before a vowel sound.'))
    with patch.object(module,'retrieve_for_freeform_question',AsyncMock(return_value=miss)),patch.object(module,'get_llm',return_value=llm):
        response=TestClient(app).post('/study-assist',json={'action':'freeform_help','question':'Why use an?','current_item':{}})
    assert response.status_code==200
    assert response.json()['assistant_message']==module.REFERENCE_DISCLOSURE+' Use an before a vowel sound.'
    assert response.json()['retrieved_sources']==[]


@pytest.mark.parametrize('reason',['needs_context','out_of_scope'])
def test_blocked_routes_have_no_general_knowledge_disclosure(reason):
    module=importlib.import_module('study_assist.router')
    miss={'hit':False,'note':None,'safe_examples':[],'score':0,'matched_tags':[],'reason':reason,'latency_ms':0}
    with patch.object(module,'retrieve_for_freeform_question',AsyncMock(return_value=miss)),patch.object(module,'get_llm') as llm:
        response=TestClient(app).post('/study-assist',json={'action':'freeform_help','question':'A blocked request','current_item':{}})
    assert response.status_code==200 and module.REFERENCE_DISCLOSURE not in response.json()['assistant_message']
    llm.assert_not_called()


def test_release_pipeline_uses_current_serving_policy():
    from evals.release import pipeline
    from evals.release.runner import identity
    assert pipeline.evidence_gate is p
    assert 'agent/study_assist/source_policy.py' in identity()
