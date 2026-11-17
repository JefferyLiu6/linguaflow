from copy import deepcopy
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from evals.expansion import dataset, runner
from evals.expansion.budget import Budget, BudgetExceeded, guarded_clients
from evals.expansion.metrics import paired_difference, summarize
from evals.rag.runner import ROOT
from retrieval.benchmark import fingerprint

DATA = ROOT / 'agent/evals/datasets/expansion-fresh-v1.json'
PRICES = {'test': {'input': 2, 'cached': .5, 'output': 8}}


@pytest.fixture
def data():
    return json.loads(DATA.read_text())


@pytest.fixture
def plan(tmp_path):
    return runner.freeze(DATA, tmp_path / 'plan.json')


def test_dataset_balance_group_coverage_and_historical_overlap(data):
    inspection = dataset.audit(data, DATA)
    assert inspection['counts'] == {'supported': 60, 'uncovered': 15, 'missing_context': 15, 'out_of_scope': 10}
    assert len(inspection['supported_groups']) == 9
    assert len(inspection['overlap']) == 100
    assert not any(row['review_flag'] for row in inspection['overlap'])


@pytest.mark.parametrize('defect', ['duplicate_id', 'duplicate_question', 'wrong_route', 'missing_gold', 'metadata', 'empty_fact', 'unknown_note', 'wrong_bucket', 'wrong_group'])
def test_dataset_rejects_invalid_labels(data, defect):
    row = data['cases'][0]
    if defect == 'duplicate_id': row['case_id'] = data['cases'][1]['case_id']
    if defect == 'duplicate_question': row['question'] = data['cases'][1]['question']
    if defect == 'wrong_route': row['expected_behavior'] = 'redirect'
    if defect == 'missing_gold': row['acceptable_note_ids'] = []
    if defect == 'metadata': row['current_item']['id'] = 'en03'
    if defect == 'empty_fact': row['required_facts'] = [' ']
    if defect == 'unknown_note': row['acceptable_note_ids'] = ['missing']
    if defect == 'wrong_bucket': row['bucket'] = 'uncovered'
    if defect == 'wrong_group': row['coverage_group'] = 'tense_aspect'
    with pytest.raises(ValueError): dataset.validate(data)


def test_fresh_set_rejects_historical_question(data):
    historical = json.loads((ROOT / 'agent/evals/datasets/release-fresh-v2.json').read_text())
    data['cases'][0]['question'] = historical['cases'][0]['question']
    with pytest.raises(ValueError, match='duplicates historical'): dataset.audit(data, DATA)


def test_freeze_and_offline_preflight_never_access_services(plan):
    with patch.object(runner, 'read_manifest') as db, patch('openai.OpenAI') as sync, patch('openai.AsyncOpenAI') as async_client:
        result = runner.preflight(plan)
    assert result['pipeline_jobs'] == 200 and result['provider_calls_made'] == 0
    db.assert_not_called(); sync.assert_not_called(); async_client.assert_not_called()


@pytest.mark.parametrize('field', ['code', 'corpus', 'dataset'])
def test_frozen_inputs_reject_drift(plan, field):
    if field == 'code': plan[field] = {}
    if field == 'corpus': plan[field]['fingerprint'] = 'stale'
    if field == 'dataset': plan[field]['cases'][0]['reference_answer'] += ' Changed.'
    with pytest.raises(ValueError, match='changed'): runner.checked(plan)


@pytest.mark.parametrize('manifest', [None, {'complete': False}, {'complete': True, 'fingerprint': 'old', 'note_count': 31}])
def test_index_mismatch_stops_before_provider_construction(plan, tmp_path, manifest, monkeypatch):
    path = tmp_path / 'input.json'; path.write_text(json.dumps(plan))
    monkeypatch.setenv('OPENAI_API_KEY', 'test-placeholder')
    with patch.object(runner, 'read_manifest', return_value=manifest), patch('openai.OpenAI') as sync, patch('openai.AsyncOpenAI') as async_client:
        status = runner.main(['run', '--allow-paid', '--plan', str(path), '--records', str(tmp_path / 'records.jsonl'), '--output', str(tmp_path / 'report.json')])
    assert status == 2
    assert not (tmp_path / 'records.jsonl').exists()
    sync.assert_not_called(); async_client.assert_not_called()


def test_collection_requires_flag_and_preserves_artifacts(plan, tmp_path):
    path = tmp_path / 'input.json'; path.write_text(json.dumps(plan))
    original = path.read_bytes()
    with patch.object(runner, 'index_preflight') as db:
        assert runner.main(['run', '--plan', str(path), '--records', str(tmp_path / 'records'), '--output', str(tmp_path / 'report')]) == 2
        assert runner.main(['run', '--allow-paid', '--plan', str(path), '--records', str(path), '--output', str(tmp_path / 'report')]) == 2
    db.assert_not_called()
    assert path.read_bytes() == original
    with pytest.raises(FileExistsError): runner.freeze(DATA, path)


def request():
    return {'model': 'test', 'messages': [{'role': 'user', 'content': 'Example'}], 'max_tokens': 10}


def response(inputs=100, outputs=5):
    return SimpleNamespace(usage=SimpleNamespace(prompt_tokens=inputs, completion_tokens=outputs))


def test_budget_reserves_before_call_then_reconciles_actual_usage():
    budget = Budget(PRICES, 1, 2)
    entry = budget.reserve('chat', request())
    upper = budget.charged
    budget.settle(entry, response())
    assert budget.charged == pytest.approx(.00024) and budget.charged < upper
    assert budget.receipt()['provider_requests_attempted'] == 1


@pytest.mark.parametrize('cap,requests', [(.000001, 2), (1, 1)])
def test_budget_refuses_unaffordable_or_excess_requests(cap, requests):
    budget = Budget(PRICES, cap, requests)
    if requests == 1:
        budget.settle(budget.reserve('chat', request()), response())
    with pytest.raises(BudgetExceeded): budget.reserve('chat', request())


def test_unknown_usage_keeps_reservation_and_blocks_further_calls():
    budget = Budget(PRICES, 1, 10)
    entry = budget.reserve('chat', request()); reserved = budget.charged
    with pytest.raises(BudgetExceeded): budget.settle(entry, SimpleNamespace(usage=None))
    assert budget.charged == reserved
    assert budget.receipt()['unknown_usage_requests'] == 1
    with pytest.raises(BudgetExceeded): budget.reserve('chat', request())


def test_unbounded_output_unknown_model_and_oversized_usage_stop_budget():
    for changes in ({'max_tokens': 0}, {'model': 'unknown'}):
        with pytest.raises(BudgetExceeded): Budget(PRICES, 1, 10).reserve('chat', {**request(), **changes})
    budget = Budget(PRICES, 1, 10)
    with pytest.raises(BudgetExceeded): budget.settle(budget.reserve('chat', request()), response(outputs=11))
    assert budget.stopped == 'provider_usage_exceeded_reservation'


@pytest.mark.asyncio
async def test_sdk_guards_wrap_both_clients_without_real_network():
    sync = MagicMock(); sync.embeddings.create.return_value = response(outputs=0)
    asynchronous = MagicMock(); asynchronous.chat.completions.create = AsyncMock(return_value=response())
    budget = Budget(PRICES, 1, 10)
    with patch('openai.OpenAI', return_value=sync) as sync_ctor, patch('openai.AsyncOpenAI', return_value=asynchronous) as async_ctor:
        with guarded_clients(budget):
            import openai
            openai.OpenAI(max_retries=9).embeddings.create(model='test', input=['Example'])
            await openai.AsyncOpenAI().chat.completions.create(**request())
    assert sync_ctor.call_args.kwargs['max_retries'] == async_ctor.call_args.kwargs['max_retries'] == 0
    assert budget.receipt()['provider_requests_attempted'] == 2


@pytest.mark.asyncio
async def test_sdk_guard_stops_failed_request_without_retry_or_secret_output():
    client = MagicMock(); client.chat.completions.create = AsyncMock(side_effect=RuntimeError('secret-placeholder'))
    budget = Budget(PRICES, 1, 10)
    with patch('openai.AsyncOpenAI', return_value=client):
        with guarded_clients(budget):
            import openai
            with pytest.raises(RuntimeError): await openai.AsyncOpenAI().chat.completions.create(**request())
            with pytest.raises(BudgetExceeded): await client.chat.completions.create(**request())
    assert budget.receipt()['provider_requests_attempted'] == 1
    assert 'secret-placeholder' not in json.dumps(budget.receipt())


def measured_row(case, arm, *, ok=True, score=4):
    substantive = case['bucket'] == 'supported'
    contexts = [{'id': case['acceptable_note_ids'][0], 'text': 'Use the rule.'}] if substantive else []
    raw = {'correctness': score, 'covered_facts': {f'f{i}': True for i in range(len(case['required_facts']))},
           'teaching_usefulness': 4, 'actual_action': 'answer' if substantive else 'clarify',
           'violations': [], 'reference_gap_disclosed': False,
           'units': {'a0': {'substantive': substantive, 'truth': 'correct', 'fabricated': False,
                            'grounding': 'supported' if contexts else 'not_applicable', 'evidence_id': 'c0s0' if contexts else ''}},
           'reason': 'Unit-test fixture, not a provider judgment.'}
    row = {'case': case, 'arm': arm, 'status': 'ok' if ok else 'error', 'answer': 'Use the rule.' if substantive else 'Please provide the text.',
           'contexts': contexts, 'selected_source_ids': [c['id'] for c in contexts],
           'ranked_candidates': [{'id': c['id']} for c in contexts], 'retrieval_status': 'ok' if ok else 'error',
           'routing_reason': 'matched' if substantive else 'needs_context',
           'spans': [{'stage': 'pipeline_total', 'elapsed_ms': 100 if arm == 'hybrid' else 150, 'status': 'ok' if ok else 'error'}]}
    if ok: row['judge'] = {'status': 'ok', 'attempts': [{'raw_verdict': raw}]}
    else: row.update(http_status=504, error_type='TimeoutError')
    return row


def small_plan(data):
    return {'dataset': {'cases': [data['cases'][0], data['cases'][75]]}, 'arms': runner.ARMS,
            'prices_usd_per_million': {}, 'targets': runner.TARGETS, 'limitations': ['Synthetic unit test only.']}


def test_metrics_keep_errors_in_denominators_and_report_paired_coverage(data):
    plan = small_plan(data); positive, missing = plan['dataset']['cases']
    rows = [measured_row(positive, 'verified'), measured_row(positive, 'hybrid', score=2),
            measured_row(missing, 'verified', ok=False), measured_row(missing, 'hybrid')]
    result = summarize(plan, rows)
    verified = result['summaries']['verified']
    assert verified['timeout_rate']['rate'] == .5
    assert verified['routing_accuracy_all_requests']['rate'] == .5
    assert verified['source_outcomes']['negative_buckets']['missing_context']['successful_no_reference_rate']['rate'] == 0
    assert result['paired_differences']['correctness']['paired_cases'] == 1
    assert result['paired_differences']['correctness']['mean_verified_minus_hybrid'] == 2
    assert result['paired_differences']['request_success']['paired_cases'] == 2
    assert result['release_authorized'] is False


@pytest.mark.parametrize('defect', ['missing', 'duplicate', 'labels'])
def test_replay_rejects_incomplete_duplicate_or_changed_records(data, defect):
    plan = small_plan(data)
    rows = [measured_row(c, a) for c in plan['dataset']['cases'] for a in runner.ARMS]
    if defect == 'missing': rows.pop()
    if defect == 'duplicate': rows.append(deepcopy(rows[0]))
    if defect == 'labels':
        rows[0] = deepcopy(rows[0]); rows[0]['case']['question'] = 'Changed'
    with pytest.raises(ValueError): summarize(plan, rows)


def test_paired_bootstrap_is_reproducible_and_empty_is_not_perfect():
    assert paired_difference([('a', 0), ('b', 0)])['cluster_bootstrap95'] == [0, 0]
    assert paired_difference([])['mean_verified_minus_hybrid'] is None


@pytest.mark.asyncio
async def test_collection_alternates_arms_and_preserves_partial_records(data, tmp_path, monkeypatch):
    plan = small_plan(data); order = []
    budget = Budget(PRICES, 1, 10)
    async def run(case, arm):
        order.append(arm)
        if len(order) == 3: budget.stopped = 'collection_budget_exhausted'
        return measured_row(case, arm, ok=False)
    monkeypatch.setattr(runner.pipeline, 'run_pipeline', run)
    monkeypatch.setattr(runner.judge.TokenPacer, 'acquire', AsyncMock(return_value=0))
    path = tmp_path / 'records.jsonl'
    result = await runner.execute(plan, path, budget=budget)
    assert order == ['verified', 'hybrid', 'hybrid']
    assert result['status'] == 'incomplete_collection'
    assert len(path.read_text().splitlines()) == 3
    assert all(json.loads(line)['plan_sha256'] == fingerprint(plan) for line in path.read_text().splitlines())
    with pytest.raises(FileExistsError): await runner.execute(plan, path, budget=budget)


@pytest.mark.asyncio
async def test_complete_200_record_collection_replays_without_services(plan, tmp_path, monkeypatch):
    async def run(case, arm):
        return measured_row(case, arm, ok=False)
    monkeypatch.setattr(runner.pipeline, 'run_pipeline', run)
    monkeypatch.setattr(runner.judge.TokenPacer, 'acquire', AsyncMock(return_value=0))
    records = tmp_path / 'records.jsonl'
    result = await runner.execute(plan, records, budget=Budget(PRICES, 1, 10))
    assert result['status'] == 'completed_synthetic_comparison'
    assert result['summaries']['verified']['request_failure_rate'] == 1
    assert not result['diagnostic_gates']['verified']['diagnostic_pass']
    assert len(records.read_text().splitlines()) == 200
    frozen = tmp_path / 'input-plan.json'; frozen.write_text(json.dumps(plan))
    output = tmp_path / 'replay.json'
    with patch('openai.OpenAI') as client, patch('openai.AsyncOpenAI') as async_client:
        assert runner.main(['replay', '--plan', str(frozen), '--records', str(records), '--output', str(output)]) == 0
    client.assert_not_called(); async_client.assert_not_called()
    replay = json.loads(output.read_text())
    assert replay['summaries'] == result['summaries']
    assert replay['paired_differences'] == result['paired_differences']


def test_local_wrapper_does_not_load_or_use_production_database(plan, tmp_path, monkeypatch):
    import importlib.util
    spec = importlib.util.spec_from_file_location('local_expansion_eval', ROOT / 'scripts/run_expansion_eval_local.py')
    wrapper = importlib.util.module_from_spec(spec); spec.loader.exec_module(wrapper)
    frozen = tmp_path / 'input-plan.json'; frozen.write_text(json.dumps(plan))
    output = tmp_path / 'result.json'
    monkeypatch.setenv('DATABASE_URL', 'test-production-placeholder')
    monkeypatch.setenv('OPENAI_API_KEY', 'test-key-placeholder')
    with patch('tiktoken.get_encoding'), patch.object(wrapper, 'command', side_effect=OSError('test failure')), patch.object(wrapper.subprocess, 'run', return_value=SimpleNamespace(returncode=0)), patch('psycopg2.connect') as db:
        assert wrapper.main(['--allow-paid', '--plan', str(frozen), '--records', str(tmp_path / 'records.jsonl'), '--output', str(output)]) == 2
    db.assert_not_called()
    import os
    assert os.getenv('DATABASE_URL') == 'test-production-placeholder'
    result = json.loads(output.read_text())
    assert result['production_database_used'] is False
    assert 'test-key-placeholder' not in output.read_text()
