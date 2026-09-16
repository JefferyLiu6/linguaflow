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
