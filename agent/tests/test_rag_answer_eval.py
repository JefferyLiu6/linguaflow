from contextlib import contextmanager
from unittest.mock import AsyncMock
import pytest
from evals.rag.metrics import ranking, answer_scores, summarize
from evals.rag.judge import validate
from evals.rag.telemetry import cost, span, export_langfuse


def case():
    return {'case_id':'x','question':'Why?','current_item':{},'acceptable_note_ids':['a','b'],
            'expected_behavior':'answer','learner_level':'B1','reference_answer':'Gold secret',
            'required_facts':['Preserve tense.'],'reference_urls':['https://example.test']}


def verdict():
    return {'correctness':4,'required_facts_covered':[True], 'teaching_applicable':True,'teaching_usefulness':4,
        'scope_result':'pass','claims':[{'answer_quote':'Preserve tense.','truth':'correct','fabricated':False,
        'grounding':'supported','context_id':'a','evidence_quote':'Preserve tense.'}],'reason':'Matches the rule.'}


def test_standard_recall_is_not_hit_rate_with_alternatives():
    m=ranking(['a','a','c','b'],['a','b'])
    assert m['recall@1']==.5 and m['hit@1']==1 and m['recall@3']==1 and m['mrr@5']==1
    assert ranking(['x'],[])['recall@5'] is None
    assert ranking(['x'],['a'])['mrr@5']==0


def test_judge_rejects_fabricated_evidence_and_claims():
    for changes in ({'evidence_quote':'invented'},{'context_id':'unknown'},{'answer_quote':'not in answer'}):
        v=verdict();v['claims'][0].update(changes)
        with pytest.raises(ValueError):validate(v,case(),'Preserve tense.',[{'id':'a','text':'Preserve tense.'}])


def test_judge_rejects_missing_facts_and_wrong_applicability():
    for changes in ({'required_facts_covered':[]},{'teaching_applicable':False}):
        with pytest.raises(ValueError):validate({**verdict(),**changes},case(),'Preserve tense.',[{'id':'a','text':'Preserve tense.'}])


def test_true_but_ungrounded_is_not_automatically_hallucinated():
    v=verdict();v['claims'][0].update(grounding='unsupported',context_id='',evidence_quote='')
    m=answer_scores(v,True)
    assert m['faithfulness']==0 and m['hallucinated_answer'] is False and m['judged_factual_claim_accuracy']==1
    assert answer_scores(v,False)['faithfulness'] is None


def test_no_claims_has_no_faithfulness_score():
    v=verdict();v['claims']=[]
    assert answer_scores(v,True)['faithfulness'] is None


def test_cached_cost_and_unknown_timeout_cost():
    s={'stage':'generation','model':'gpt-4o-mini-2024-07-18','usage':{'input_tokens':1000000,'output_tokens':0,'cached_input_tokens':500000}}
    assert cost([s])['known_pipeline_usd']==pytest.approx(.1125)
    c=cost([s,{'stage':'judge','model':'gpt-4.1-mini-2025-04-14'}])
    assert c['pipeline_complete'] and not c['judge_complete']
    assert not cost([{'stage':'generation','model':'gpt-4o-mini-2024-07-18'}])['pipeline_complete']


def test_failure_latency_is_recorded():
    spans=[]
    with pytest.raises(ValueError):
        with span(spans,'generation'):raise ValueError('private error details')
    assert spans[0]['status']=='error' and spans[0]['elapsed_ms']>=0
    assert 'private error' not in str(spans)


def test_end_to_end_denominator_includes_failed_requests():
    base={'case':case(),'arm':'card_only','selected_source_ids':[],'spans':[], 'cost':cost([])}
    good={**base,'status':'ok','judge':{'status':'ok'},'answer_metrics':answer_scores(verdict(),True)}
    bad={**base,'status':'error'}
    m=summarize([good,bad])['card_only']
    assert m['end_to_end_correct_and_in_scope_rate']==.5 and m['request_failure_rate']==.5
    assert m['answer_metrics']['correctness_0_4']['mean']==4


def test_langfuse_export_never_sends_raw_text():
    sent=[]
    class Fake:
        def create_trace_id(self,**kw):return 'a'*32
        @contextmanager
        def start_as_current_observation(self,**kw):sent.append(kw);yield
        def create_score(self,**kw):sent.append(kw)
        def flush(self):pass
    row={'case':case(),'arm':'hybrid','status':'ok','answer':'PRIVATE ANSWER','contexts':[{'text':'PRIVATE CONTEXT'}],
         'spans':[],'cost':cost([]),'answer_metrics':{'scope_pass':True}}
    assert export_langfuse([row],'hash',Fake())==1
    assert all(s not in str(sent) for s in ('Gold secret','PRIVATE ANSWER','PRIVATE CONTEXT'))


@pytest.mark.asyncio
async def test_baselines_use_real_handler_without_gold_leakage(monkeypatch):
    from evals.rag import pipeline
    captured=[]
    async def generate(model,messages):
        captured.extend(m.content for m in messages)
        return 'Preserve tense.'
    monkeypatch.setattr(pipeline.router,'_generate_reply',generate)
    r=await pipeline.run_pipeline(case(),'card_only')
    assert r['status']=='ok' and r['contexts']==[] and 'Gold secret' not in str(captured)
    captured.clear()
    r=await pipeline.run_pipeline(case(),'full_corpus')
    assert r['status']=='ok' and len(r['contexts'])==31 and 'Gold secret' not in str(captured)


@pytest.mark.asyncio
async def test_retrieval_failure_never_becomes_answer_or_abstention(monkeypatch):
    from evals.rag import pipeline
    monkeypatch.setattr(pipeline.hybrid,'retrieve_for_freeform_question',lambda *a,**kw:{**pipeline.empty_debug(),'reason':'db_unavailable'})
    generate=AsyncMock();monkeypatch.setattr(pipeline.router,'_generate_reply',generate)
    r=await pipeline.run_pipeline(case(),'hybrid')
    assert r['status']=='error' and r['retrieval_status']=='error' and r['http_status']==503
    generate.assert_not_awaited()
