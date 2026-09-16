import asyncio
from types import SimpleNamespace
import pytest
from study_assist import evidence_policy as p
from evals.rag_v2.judge import decode, index_units, TokenPacer, retry_delay


def test_missing_context_and_scope_override_even_selected_evidence():
    units={'e':{'source_id':'note','text':'A reference is not a learner question.'}}
    base={'task_kind':'language','context_missing':False,'evidence_id':'e','reason':'test'}
    assert p.decode(base,units)['decision']=='supported'
    for changes,expected in [({'context_missing':True},'needs_context'),({'task_kind':'other'},'out_of_scope')]:
        result=p.decode({**base,**changes},units)
        assert result['decision']==expected and result['source_id']=='' and result['support_quote']==''


def test_unknown_evidence_id_is_rejected():
    with pytest.raises(ValueError):p.decode({'task_kind':'language','context_missing':False,'evidence_id':'invented','reason':'test'}, {})


def test_evidence_text_is_restored_not_generated():
    refs=[{'id':'real','rule':'Explanation: Preserve tense and participants.'}]
    units=p.evidence_units(refs);ident=next(iter(units))
    result=p.decode({'task_kind':'language','context_missing':False,'evidence_id':ident,'reason':'test'},units)
    assert result['support_quote']==refs[0]['rule']


def fixture():
    case={'expected_behavior':'clarify','required_facts':['Ask for the missing options.']}
    answer='The second option is passive.'
    value={'correctness':0,'covered_facts':{'f0':False},'teaching_usefulness':1,
           'actual_action':'answer','violations':['invented_context'],'reference_gap_disclosed':False,
           'units':{'a0':{'substantive':True,'truth':'incorrect','fabricated':True,'grounding':'not_applicable','evidence_id':''}},'reason':'Missing choices were invented.'}
    return case,answer,value


def test_backend_derives_scope_and_teaching_applicability():
    c,a,v=fixture();out=decode(v,c,a,[])
    assert out['scope_result']=='overanswer' and out['teaching_applicable'] is False
    assert out['claims'][0]['answer_quote']==a


def test_judge_requires_every_answer_unit():
    c,a,v=fixture();v['units']={}
    with pytest.raises(ValueError,match='missing_answer_units'):decode(v,c,a,[])


def test_judge_evidence_cannot_be_invented():
    c,a,v=fixture();v['units']['a0'].update(grounding='supported',evidence_id='fake')
    with pytest.raises(ValueError):decode(v,c,a,[{'id':'note','text':'Passive voice changes focus.'}])


@pytest.mark.asyncio
async def test_pacer_waits_for_token_window_without_provider_calls():
    now=[0.0];waits=[]
    async def sleep(n):waits.append(n);now[0]+=n
    pacer=TokenPacer(budget=10,window=60,clock=lambda:now[0],sleep=sleep)
    assert await pacer.acquire(7)==0
    assert await pacer.acquire(4)==60000 and waits==[60]
    with pytest.raises(ValueError):await pacer.acquire(11)


def test_retry_requires_temporary_provider_guidance():
    e=SimpleNamespace(status_code=429,code='rate_limit_exceeded',response=SimpleNamespace(headers={'retry-after':'2'}))
    assert retry_delay(e)==2
    e.code='insufficient_quota';assert retry_delay(e) is None
    e.code='rate_limit_exceeded';e.response.headers={'retry-after':'120'};assert retry_delay(e) is None
    e.response.headers={};assert retry_delay(e) is None


@pytest.mark.parametrize('field,value',[('substantive','false'),('fabricated','false'),('evidence_id','fake'),('truth','maybe')])
def test_unused_units_still_require_valid_schema(field,value):
    c,a,v=fixture();v['units']['a0']['substantive']=False;v['units']['a0'][field]=value
    with pytest.raises(ValueError):decode(v,c,a,[])


def test_fact_booleans_are_not_coerced():
    c,a,v=fixture();v['covered_facts']['f0']='false'
    with pytest.raises(ValueError):decode(v,c,a,[])


def test_paired_report_rebuilds_scores_and_keeps_failed_requests():
    from copy import deepcopy
    from evals.rag_v2.runner import summarize
    c,a,v=fixture();c.update(case_id='paired',acceptable_note_ids=[])
    plan={'dataset':{'cases':[c]},'arms':['legacy','candidate'],'prices_usd_per_million':{},'limitations':[],
        'targets':{'correctness_mean_min':3,'faithfulness_mean_min':.9,'hallucinated_answer_rate_max':.1,
                   'teaching_mean_min':4,'scope_pass_min':.9,'request_failure_rate_max':.02,'judge_failure_count_max':0}}
    base={'case':c,'spans':[],'ranked_candidates':[],'selected_source_ids':[],'retrieval_status':'ok','contexts':[]}
    rows=[{**base,'arm':'legacy','status':'ok','answer':a,
        'judge':{'status':'ok','verdict':{'correctness':4},'attempts':[{'status':'ok','raw_verdict':v}]}},
          {**base,'arm':'candidate','status':'error'}]
    result=summarize(plan,deepcopy(rows))
    assert result['summaries']['legacy']['answer_metrics']['correctness_0_4']['mean']==0
    assert result['summaries']['candidate']['end_to_end_correct_and_in_scope_rate']==0
    assert result['summaries']['candidate']['request_failure_rate']==1
    assert result['release_authorized'] is False
    rows[0]['case']={**c,'required_facts':['Changed labels']}
    with pytest.raises(ValueError,match='Changed case labels'):summarize(plan,rows)
