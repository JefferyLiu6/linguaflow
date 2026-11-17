"""Freeze, preflight, collect or replay a paired 100-question expansion evaluation.

No writes to the vector database and no deployment. Collection requires an
explicit paid-call flag, matching index and frozen per-request spending guard.
"""
import argparse
import asyncio
from datetime import datetime, timezone
import json
import math
import os
from pathlib import Path

from evals.release import pipeline
from evals.release.runner import identity as serving_identity
from evals.rag.runner import ROOT, write_new
from evals.rag.telemetry import PRICES
from evals.rag_v2 import judge
from retrieval.benchmark import fingerprint, git_revision
from retrieval.db import read_manifest, IndexUnavailable
from retrieval.loader import load_contrast_docs
from retrieval.manifest import manifest_for
from .budget import Budget, guarded_clients
from .dataset import validate, audit
from .metrics import summarize

ARMS = ['verified', 'hybrid']
MODELS = {'generator': pipeline.GENERATION_MODEL, 'verifier': pipeline.evidence_gate.MODEL,
          'judge': judge.MODEL, 'embedding': pipeline.EMBED_MODEL}
PRICES_VERIFIED_ON = '2026-11-16'
PRICE_SOURCE = 'https://developers.openai.com/api/docs/pricing'
PROTOCOL = ROOT / 'docs/EXPANSION_EVALUATION_100.md'
TARGETS = {'correctness_mean_min': 3, 'faithfulness_mean_min': .9,
           'hallucinated_answer_rate_max': .1, 'teaching_mean_min': 4,
           'scope_pass_min': .9, 'request_failure_rate_max': .02, 'judge_failure_count_max': 0}


def identity():
    files = sorted((ROOT / 'agent/evals/expansion').glob('*.py')) + [PROTOCOL, ROOT / 'scripts/run_expansion_eval_local.py']
    return {**serving_identity(), **{str(p.relative_to(ROOT)): fingerprint(p.read_text()) for p in files}}


def freeze(dataset, output, *, max_usd=5.0):
    if not math.isfinite(max_usd) or not 0 < max_usd <= 20:
        raise ValueError('Freeze a positive spending cap at most $20')
    data = validate(json.loads(Path(dataset).read_text()))
    inspection = audit(data, dataset)
    plan = {
        'kind': 'paired_expansion_evaluation_v1', 'status': 'frozen_not_run',
        'created_at': datetime.now(timezone.utc).isoformat(), 'git_revision': git_revision(),
        'source_identity': 'Content hashes are authoritative; git_revision is the base commit and may precede uncommitted work.',
        'dataset': data, 'dataset_sha256': fingerprint(data), 'dataset_audit': inspection,
        'arms': ARMS, 'order': 'alternate first arm by case; concurrency one',
        'code': identity(), 'corpus': manifest_for(load_contrast_docs('en')), 'models': MODELS,
        'prices_usd_per_million': {model: PRICES[model] for model in set(MODELS.values())},
        'price_date': PRICES_VERIFIED_ON, 'price_source': PRICE_SOURCE,
        'budget': {'max_usd': max_usd, 'max_provider_requests': 900, 'pipeline_jobs': 200,
                   'max_pipeline_calls': 500, 'max_judge_calls': 400, 'concurrency': 1},
        'targets': TARGETS,
        'limitations': [
            'AI-authored, corpus-aware labels; not expert validation or sampled user traffic.',
            'Fresh wording in known grammar families is not independent semantic holdout.',
            'Acceptable-note sets may be incomplete; recall@k is recall against listed labels.',
            'Verifier and judge share GPT-4.1 and may make correlated errors.',
            'Sentence-unit faithfulness, not independently calibrated atomic-claim truth.',
            'Local sequential handler adapter: different provider timeouts/retries from production; excludes public HTTP and cold starts.',
            'Each arm retrieves separately; pairing controls questions, not identical provider execution.',
            'Quality deltas include only pairs with applicable successful judgments; coverage is reported.',
            'Spending estimates use published token rates, not an invoice; index embedding cost is separate.',
        ],
    }
    write_new(output, plan)
    return plan


def checked(plan):
    validate(plan['dataset'])
    if plan.get('kind') != 'paired_expansion_evaluation_v1' or plan['arms'] != ARMS:
        raise ValueError('Wrong comparison protocol')
    if fingerprint(plan['dataset']) != plan['dataset_sha256']:
        raise ValueError('Frozen labels changed')
    if plan['code'] != identity() or plan['corpus'] != manifest_for(load_contrast_docs('en')):
        raise ValueError('Frozen code/corpus changed; preserve this plan and freeze a new version')
    if plan['models'] != MODELS:
        raise ValueError('Frozen models changed')
    if plan['budget']['max_provider_requests'] != 900 or not 0 < plan['budget']['max_usd'] <= 20:
        raise ValueError('Invalid collection budget')
    return plan


def index_preflight(plan):
    actual = read_manifest('en')
    if not actual or not actual.get('complete'):
        raise ValueError('A complete evaluation index is required before provider calls')
    if actual['fingerprint'] != plan['corpus']['fingerprint'] or actual['note_count'] != plan['corpus']['note_count']:
        raise ValueError('Evaluation index does not match the frozen 200-note corpus')
    return {'fingerprint': actual['fingerprint'], 'note_count': actual['note_count'],
            'generation': actual['generation'], 'complete': True}


def preflight(plan, *, check_index=False):
    checked(plan)
    result = {'status': 'ready_not_run', 'cases': len(plan['dataset']['cases']),
              'pipeline_jobs': 200, 'models': plan['models'], 'budget': plan['budget'],
              'corpus_fingerprint': plan['corpus']['fingerprint'],
              'dataset_sha256': plan['dataset_sha256'], 'provider_calls_made': 0,
              'live_index': 'not_checked', 'collection_requires': '--allow-paid and a matching database index'}
    if check_index:
        result['live_index'] = index_preflight(plan)
    return result


async def execute(plan, records, *, budget):
    """Call only after preflight. Keep partial records; never silently resume/retry a run."""
    rows = []
    pacer = judge.TokenPacer()
    records.parent.mkdir(parents=True, exist_ok=True)
    with records.open('x') as handle, guarded_clients(budget):
        for index, case in enumerate(plan['dataset']['cases']):
            arms = plan['arms'][index % 2:] + plan['arms'][:index % 2]
            for arm in arms:
                if budget.stopped:
                    break
                waited = await pacer.acquire(5000) if arm == 'verified' else 0
                row = await pipeline.run_pipeline(case, arm)
                row['spans'].append({'stage': 'evaluation_queue', 'model': None, 'status': 'ok', 'elapsed_ms': round(waited, 3)})
                if row['status'] == 'ok' and not budget.stopped:
                    try:
                        row['judge'] = await judge.judge(case, row['answer'], row['contexts'], row['spans'], pacer)
                    except Exception as exc:
                        row['judge'] = {'status': 'error', 'error_type': type(exc).__name__, 'attempts': []}
                row['plan_sha256'] = fingerprint(plan)
                row['collection_budget'] = {'accounted_upper_usd': budget.charged, 'stop_reason': budget.stopped,
                                             'provider_requests_attempted': len(budget.entries)}
                handle.write(json.dumps(row, ensure_ascii=False) + '\n')
                handle.flush()
                rows.append(row)
                print(case['case_id'], arm, row['status'], row.get('judge', {}).get('status', 'not_run'), flush=True)
            if budget.stopped:
                break
    if budget.stopped or len(rows) != 200:
        return {'status': 'incomplete_collection', 'plan_sha256': fingerprint(plan),
                'completed_records': len(rows), 'expected_records': 200,
                'budget': budget.receipt(), 'release_authorized': False,
                'limitations': ['Partial data is preserved; no complete comparison or acceptance result is claimed.']}
    return {**summarize(plan, rows), 'budget': budget.receipt()}


def distinct_paths(paths):
    actual = [Path(p).resolve() for p in paths if p is not None]
    if len(actual) != len(set(actual)):
        raise ValueError('Dataset, plan, records and report must use distinct paths')


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=['freeze', 'preflight', 'run', 'replay'])
    parser.add_argument('--dataset', type=Path)
    parser.add_argument('--plan', type=Path, required=True)
    parser.add_argument('--records', type=Path)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--max-usd', type=float, default=5.0)
    parser.add_argument('--check-index', action='store_true')
    parser.add_argument('--allow-paid', action='store_true')
    args = parser.parse_args(argv)
    try:
        distinct_paths([args.dataset, args.plan, args.records, args.output])
        if args.mode == 'freeze':
            if not args.dataset:
                raise ValueError('--dataset is required')
            result = freeze(args.dataset, args.plan, max_usd=args.max_usd)
            print(json.dumps({'status': result['status'], 'cases': 100, 'budget': result['budget']}))
            return 0
        plan = checked(json.loads(args.plan.read_text()))
        if args.mode == 'preflight':
            result = preflight(plan, check_index=args.check_index)
        else:
            if not args.records or not args.output:
                raise ValueError('--records and --output are required')
            if args.output.exists():
                raise ValueError('Preserve existing report')
            if args.mode == 'run':
                if not args.allow_paid:
                    raise ValueError('Live collection requires --allow-paid; no provider calls made')
                if args.records.exists():
                    raise ValueError('Preserve existing records')
                checked_index = index_preflight(plan)  # Before constructing any provider client.
                if not os.getenv('OPENAI_API_KEY'):
                    raise ValueError('Provider credentials are not configured')
                budget = Budget(plan['prices_usd_per_million'], plan['budget']['max_usd'], plan['budget']['max_provider_requests'])
                result = asyncio.run(execute(plan, args.records, budget=budget))
                result['index_at_start'] = checked_index
            else:
                rows = [json.loads(line) for line in args.records.read_text().splitlines() if line.strip()]
                if any(row.get('plan_sha256') != fingerprint(plan) for row in rows):
                    raise ValueError('Records do not match frozen plan')
                result = summarize(plan, rows)
        if args.output:
            write_new(args.output, result)
        print(json.dumps({'status': result.get('status'), 'report': str(args.output) if args.output else None,
                          **({'preflight': result} if args.mode == 'preflight' else {})}, indent=2))
        return 0 if result.get('status') != 'incomplete_collection' else 2
    except (ValueError, OSError, KeyError, IndexUnavailable) as exc:
        print(type(exc).__name__ + ': ' + str(exc))
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
