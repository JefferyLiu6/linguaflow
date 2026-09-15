from copy import deepcopy
import json
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock
import pytest
from retrieval import answer_study as study
from retrieval.reviewed_dataset import freeze
from retrieval.fusion_experiment import fuse


@pytest.fixture(scope='module')
def plan():
    report=json.loads((study.ROOT/'agent/runs/retrieval-comparison.json').read_text())
    return study.build_plan(report)


def test_pilot_has_paired_cases_and_bounded_exposure(plan):
    assert len(plan['jobs'])==56 and plan['budgets']['estimated_cost_upper_usd']<0.50
    for cid in study.CASE_IDS:
        jobs=[j for j in plan['jobs'] if j['case_id']==cid]
        assert {j['arm'] for j in jobs}==set(study.ARMS)
        assert len({j['question'] for j in jobs})==1
        assert len({j['messages'][0]['content'] for j in jobs})==1
    for job in plan['jobs']:
        if job['arm']=='whole_corpus':assert len(job['references'])==31
        if job['arm']=='card_only':assert job['references']==[]
        if job['case_id'].startswith('scope_') and job['arm']=='gold':assert job['references']==[]


def test_stale_retrieval_report_is_rejected():
    with pytest.raises(ValueError):study.build_plan({'status':'synthetic_test_only'})


def test_citation_identity_is_not_claim_support():
    output={'answer':'A claim','answerability':'reference_supported','claims':[{'text':'A claim','source_ids':['invented']} ]}
    checked=study.output_checks(output,['real'])
    assert checked['invalid_source_ids']==['invented']
    assert checked['claim_support_review']=='pending'


def test_collect_checkpoint_and_review_masking(plan,tmp_path):
    # One mocked response tests output plumbing; it is not measured answer quality.
    miniature=deepcopy(plan);miniature['jobs']=miniature['jobs'][:1]
    output={'answer':'An explanation.','answerability':'general_knowledge','claims':[]}
    client=MagicMock();client.chat.completions.create.return_value=SimpleNamespace(
        choices=[SimpleNamespace(finish_reason='stop',message=SimpleNamespace(content=json.dumps(output),refusal=None))],
        usage=SimpleNamespace(prompt_tokens=12,completion_tokens=10,prompt_tokens_details=None),model=study.MODEL)
    path=tmp_path/'run.json';report=study.collect(miniature,path,client=client)
    assert report['status']=='generated_review_pending' and path.exists()
    packet,key=study.review_exports(report)
    assert 'arm' not in packet['answers'][0] and packet['answers'][0]['factual_correctness'] is None
    assert len(key)==1 and study.summarize(report)['quality_review']=='pending'
    with pytest.raises(ValueError):study.collect(miniature,path,client=client)


def test_collection_failure_preserves_status(plan,tmp_path):
    client=MagicMock();client.chat.completions.create.side_effect=RuntimeError('should not copy provider details')
    result=study.collect(plan,tmp_path/'partial.json',client=client)
    assert result['status']=='collection_failed' and result['error_type']=='RuntimeError'
    assert 'should not copy' not in json.dumps(result)


def intake():
    rows=[]
    for i in range(240):
        labels=['en_formal_register_precision'] if i<160 else []
        rows.append({'case_id':f'independent_{i}','scenario_group':f'group_{i//2}',
          'question':f'uniqueterm{i} distinctterm{i}', 'current_item':{},'origin':'independent_author','author_id':'external-author',
          'expected_note_ids':labels,'reviews':[{'reviewer_id':id,'approved':True,'evaluation_kind':'author','relevant_note_ids':labels,'rationale':'Test-only fixture.'} for id in ('reviewer-a','reviewer-b')]})
    return rows


def test_freeze_preserves_groups_and_balanced_splits():
    result=freeze(intake());sets=result['splits']
    for rows in sets.values():
        assert len(rows)==120 and sum(bool(r['expected_note_ids']) for r in rows)==80
    assert not ({r['scenario_group'] for r in sets['test']} & {r['scenario_group'] for r in sets['development']})
    assert freeze(intake())['split_sha256']==result['split_sha256']


@pytest.mark.parametrize('defect',['missing_provenance','disagreement','missing_review','seen_question'])
def test_unreviewed_or_leaky_intake_cannot_be_frozen(defect):
    rows=intake()
    if defect=='missing_provenance':rows[0]['reviews'][0].pop('evaluation_kind')
    if defect=='disagreement':rows[0]['reviews'][0]['relevant_note_ids']=[]
    if defect=='missing_review':rows[0]['reviews'].clear()
    if defect=='seen_question':rows[0]['question']='What is the capital of France?'
    with pytest.raises(ValueError):freeze(rows)


def test_rrf_combines_ranks_and_rejects_duplicates():
    result=fuse(['a','b'],['b','a'])
    assert result[0][0]=='a' and result[0][1]==pytest.approx(1/61+1/62)
    with pytest.raises(ValueError):fuse(['a','a'],[])


def test_scoring_requires_review_and_preserves_recorded_answer(plan,tmp_path):
    miniature=deepcopy(plan);miniature['jobs']=miniature['jobs'][:1]
    output={'answer':'An explanation.','answerability':'general_knowledge','claims':[]}
    client=MagicMock();client.chat.completions.create.return_value=SimpleNamespace(
        choices=[SimpleNamespace(finish_reason='stop',message=SimpleNamespace(content=json.dumps(output),refusal=None))],
        usage=SimpleNamespace(prompt_tokens=12,completion_tokens=10,prompt_tokens_details=None),model=study.MODEL)
    report=study.collect(miniature,tmp_path/'run.json',client=client)
    packet,key=study.review_exports(report)
    with pytest.raises(ValueError):study.score_reviews(report,packet,key)
    row=packet['answers'][0];row.update(reviewer_id='unit-test-fixture',evaluation_kind='author',factual_correctness=2,
        meaning_preservation=2,teaching_usefulness=1,scope_handling='not_applicable',claim_judgments=[])
    result=study.score_reviews(report,packet,key)
    arm=miniature['jobs'][0]['arm']
    assert result['arms'][arm]['factual_correctness']['mean']==2
    assert result['arms'][arm]['source_supported']['rate'] is None
    row['answer']['answer']='Altered text'
    # Deep copy: exports are in-memory views; serialized review packets are separate objects.
    report['responses'][0]['output']['answer']='An explanation.'
    packet=deepcopy(packet);packet['answers'][0]['answer']['answer']='Altered text'
    with pytest.raises(ValueError):study.score_reviews(report,packet,key)


def test_cli_rejects_output_collision_before_any_api_call(tmp_path):
    path=tmp_path/'same.json'
    assert study.main(['collect','--run',str(path),'--output',str(path)])==2


def test_author_can_freeze_without_external_reviewers():
    rows=intake()
    for row in rows:
        row['origin']='project_author'
        row['reviews']=row['reviews'][:1]
        row['reviews'][0]['reviewer_id']=row['author_id']
    assert freeze(rows)['status']=='evaluation_provenance_validated_split_frozen'


def test_ai_evaluation_requires_model_provenance():
    rows=intake()
    for row in rows:
        row['origin']='ai_assisted'
        row['reviews']=row['reviews'][:1]
        row['reviews'][0].update(evaluation_kind='ai_assisted',model='test-model')
    assert freeze(rows)['status']=='evaluation_provenance_validated_split_frozen'
    rows[0]['reviews'][0].pop('model')
    with pytest.raises(ValueError):freeze(rows)
