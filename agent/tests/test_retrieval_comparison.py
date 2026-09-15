from copy import deepcopy
import json
from types import SimpleNamespace
from unittest.mock import patch
import pytest
from retrieval import retrieval_comparison as experiment
from retrieval.benchmark import fingerprint


@pytest.fixture(scope='module')
def inputs():
    return experiment.experiment_inputs()


def synthetic(identity):
    vectors={key:[1.0]+[0.0]*1535 for key in identity['texts']}
    return {'schema_version':1,'origin':'synthetic_test','experiment_sha256':fingerprint(identity),
            'model':experiment.EMBED_MODEL,'dimensions':1536,'vectors':vectors,'vectors_sha256':fingerprint(vectors)}


def test_preflight_is_offline_and_budgeted(inputs):
    _,_,identity=inputs
    plan=experiment.preflight(identity)
    assert plan['cases']==68 and plan['documents']==31
    assert plan['planned_requests']<=10
    for args in ({'max_requests':1},{'max_utf8_bytes':1}):
        with pytest.raises(ValueError,match='budget'):experiment.preflight(identity,**args)


def test_missing_credentials_fails_before_client_creation(inputs,monkeypatch):
    monkeypatch.delenv('OPENAI_API_KEY',raising=False)
    with patch('openai.OpenAI') as client:
        with pytest.raises(ValueError,match='not configured'):experiment.collect(inputs[2])
    client.assert_not_called()


@pytest.mark.parametrize('defect',['identity','missing','nonfinite','checksum'])
def test_artifact_corruption_is_rejected(inputs,defect):
    artifact=synthetic(inputs[2]);key=next(iter(artifact['vectors']))
    if defect=='identity':artifact['experiment_sha256']='stale'
    if defect=='missing':artifact['vectors'].pop(key)
    if defect=='nonfinite':artifact['vectors'][key][0]=float('nan')
    if defect=='checksum':artifact['vectors_sha256']='wrong'
    with pytest.raises(ValueError):experiment.validate_artifact(artifact,inputs[2])


def test_cosine_ranking_normalizes_and_breaks_ties_stably():
    ranked=experiment.vector_rank({'b':[0.,2.],'a':[0.,4.],'c':[5.,0.]},[0.,9.])
    assert [r['id'] for r in ranked]==['a','b','c']
    assert ranked[0]['vector_score']==pytest.approx(1)
    assert ranked[2]['vector_score']==pytest.approx(0)


def test_paired_comparison_labels_synthetic_results_and_preserves_query_inputs(inputs):
    notes,cases,identity=inputs
    report=experiment.compare(notes,cases,identity,synthetic(identity))
    assert report['status']=='synthetic_test_only' and report['quality_gate'] is False
    for split,arms in report['sets'].items():
        expected=[c.case_id for c in cases[split]]
        for arm in arms.values():assert [r['case_id'] for r in arm['results']]==expected
        for variant in ('question','question_card'):
            keys=[[r['query_sha256'] for r in arms[method+'_'+variant]['results']] for method in ('bm25','vector','hybrid')]
            assert keys[0]==keys[1]==keys[2]
        assert [r['selected_note_id'] for r in arms['vector_question']['results']]==[r['selected_note_id'] for r in arms['hybrid_question']['results']]
        assert arms['vector_question']['summary']['false_positive_rate']==1


def test_provider_collection_orders_vectors_and_disables_retries(monkeypatch):
    monkeypatch.setenv('OPENAI_API_KEY','test-placeholder')
    identity={'texts':{'a':'first','b':'second'},'documents':[{'id':'a'}],'queries':[]}
    first=[1.]+[0.]*1535;second=[0.,1.]+[0.]*1534
    reply=SimpleNamespace(model=experiment.EMBED_MODEL, data=[SimpleNamespace(index=1,embedding=second),SimpleNamespace(index=0,embedding=first)],usage=SimpleNamespace(prompt_tokens=2,total_tokens=2),_request_id='mock')
    with patch('openai.OpenAI') as client:
        client.return_value.embeddings.create.return_value=reply
        artifact=experiment.collect(identity)
        client.assert_called_once_with(max_retries=0,timeout=45.0)
        client.return_value.close.assert_called_once()
    assert artifact['vectors']=={'a':first,'b':second}
    assert artifact['batches'][0]['total_tokens']==2


def test_replay_needs_no_provider_and_refuses_artifact_output_collision(inputs,tmp_path):
    cache=tmp_path/'vectors.json';output=tmp_path/'report.json'
    cache.write_text(json.dumps(synthetic(inputs[2])))
    original=cache.read_bytes()
    with patch('openai.OpenAI') as client:
        assert experiment.main(['replay','--artifact',str(cache),'--output',str(output)])==0
    client.assert_not_called()
    assert json.loads(output.read_text())['status']=='synthetic_test_only'
    assert experiment.main(['replay','--artifact',str(cache),'--output',str(cache)])==2
    assert cache.read_bytes()==original
