import pytest
from evals.routing_v4 import policy as p
from retrieval.evidence_gate import validate_decision


def value():
    return dict(task_summary='A supplied wording question.',context_status='question_complete',missing_reference='',task_kind='language',evidence_reason='The rule states the constraint.',evidence_id='')


def test_metadata_is_not_selectable_and_negative_example_stays_with_warning():
    rule='Title: Example note\nWhen to use: General vocabulary matching and selection.\n\nExplanation: Preserve the original degree of uncertainty.\n\nExamples:\n- It may rain. -> Rain is possible.\n\nBoundary (incorrect example; do not imitate):\nOriginal: It may rain. Bad rewrite: It will rain.\nWhy incorrect: Certainty was added.\n\nTags: transformation'
    refs=[{'id':'real','rule':rule}];units=p.evidence_units(refs)
    assert len(units)==3
    assert all('When to use:' not in u['text'] and 'Tags:' not in u['text'] for u in units.values())
    boundary=next(k for k,u in units.items() if u['text'].startswith('Boundary'))
    assert 'Why incorrect:' in units[boundary]['text']
    v=value();v['evidence_id']=boundary
    out=p.decode(v,units,'Can a possibility become a certainty?',{})
    validate_decision({k:out[k] for k in ['decision','source_id','support_quote','rationale']},refs)


def test_out_of_scope_does_not_need_language_context():
    v=value();v.update(task_kind='other',context_status='not_applicable')
    assert p.decode(v,{},'Implement a sorting algorithm.',{})['decision']=='out_of_scope'
    v['task_kind']='language'
    with pytest.raises(ValueError):p.decode(v,{},'Explain a phrase.',{})


def test_language_missing_quote_is_still_enforced():
    v=value();v.update(context_status='missing_referent',missing_reference='not in question')
    with pytest.raises(ValueError):p.decode(v,{},'Explain it.',{})


def test_general_rule_without_support_is_not_covered():
    v=value();v['context_status']='general_rule'
    assert p.decode(v,{},'Explain a general rule.',{})['decision']=='not_covered'


def test_probe_failure_stays_in_denominator_and_blocks_acceptance():
    from evals.routing_v4.probe import summary
    c={'case_id':'x','acceptable_note_ids':['note'],'expected_behavior':'answer','question':'Why?', 'current_item':{}}
    plan={'cases':[{'case':c,'references':[]}]}
    rows=[{'case_id':'x','verdict':{'decision':'verification_unavailable','source_id':''}}]
    r=summary(plan,rows)['counts']
    assert r['positive_cases']==1 and r['correct_sources']==0 and r['errors']==1 and not r['pass']
    with pytest.raises(ValueError):summary(plan,rows+rows)


def test_probe_rejects_saved_decision_inconsistent_with_routing():
    from evals.routing_v4.probe import summary
    c={'case_id':'x','acceptable_note_ids':[],'expected_behavior':'clarify','question':'Explain that.', 'current_item':{}}
    plan={'cases':[{'case':c,'references':[]}]}
    v=value();v.update(context_status='missing_referent',missing_reference='that')
    out=p.decode(v,{},c['question'],{});out['decision']='not_covered'
    with pytest.raises(ValueError,match='Inconsistent'):summary(plan,[{'case_id':'x','verdict':out}])
