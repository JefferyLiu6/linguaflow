import pytest
from evals.routing_v3 import policy as p


def value(**kw):
    return dict(task_summary='Compare the supplied wording.',context_status='question_complete',missing_reference='',task_kind='language',evidence_id='',**kw)


@pytest.mark.parametrize('status',['general_rule','question_complete'])
def test_sufficient_context_does_not_require_card_or_reference(status):
    v=value();v['context_status']=status
    assert p.decode(v,{},'Explain this grammar rule.',{})['decision']=='not_covered'


def test_missing_reference_requires_real_quote():
    v=value();v.update(context_status='missing_referent',missing_reference='those choices')
    assert p.decode(v,{},'Compare those choices.',{})['decision']=='needs_context'
    with pytest.raises(ValueError):p.decode(v,{},'Compare these supplied sentences.',{})


def test_card_resolution_cannot_use_empty_card():
    v=value();v['context_status']='card_resolves'
    with pytest.raises(ValueError):p.decode(v,{},'Why?',{})
    assert p.decode(v,{},'Why?',{'prompt':'A concrete sentence.'})['decision']=='not_covered'


def test_routing_overrides_selected_source():
    units={'x':{'source_id':'note','text':'A genuine quoted grammar rule.'}}
    v=value();v.update(evidence_id='x',context_status='missing_referent',missing_reference='those choices')
    for kind,expected in [('language','needs_context'),('other','out_of_scope')]:
        v['task_kind']=kind;r=p.decode(v,units,'Compare those choices.',{})
        assert r['decision']==expected and not r['source_id']


def test_complete_context_cannot_have_missing_quote():
    v=value();v['missing_reference']='that'
    with pytest.raises(ValueError):p.decode(v,{},'Explain that.',{})


def test_unknown_evidence_fails_instead_of_silent_abstention():
    v=value();v['evidence_id']='invented'
    with pytest.raises(ValueError):p.decode(v,{},'Why?',{})
