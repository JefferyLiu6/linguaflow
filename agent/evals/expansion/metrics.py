"""Paired reporting with explicit denominators, failures and judge coverage."""
from copy import deepcopy
import random
from statistics import mean

from evals.rag.runner import report
from evals.rag_v2 import judge
from retrieval.problem_metrics import percentile, ratio, wilson


def rate(numerator, denominator):
    return {'numerator': numerator, 'denominator': denominator,
            'rate': ratio(numerator, denominator), 'wilson95': wilson(numerator, denominator) if denominator else None}


def route_correct(row):
    if row['status'] != 'ok' or row.get('judge', {}).get('status') != 'ok':
        return False
    verdict = row['judge']['attempts'][-1]['raw_verdict']
    expected = row['case']['expected_behavior']
    actual = verdict['actual_action']
    if expected == 'answer_with_disclosure':
        return actual == 'answer' and verdict['reference_gap_disclosed']
    return actual == expected


def timeout(row):
    errors = [row.get('error_type', ''), (row.get('verification') or {}).get('error_type', '')]
    errors += [span.get('error_type', '') for span in row['spans'] if span['stage'] not in ('judge', 'judge_queue')]
    return row.get('http_status') == 504 or any('timeout' in error.casefold() for error in errors)


def source_metrics(rows):
    positives = [r for r in rows if r['case']['acceptable_note_ids']]
    selected = [r for r in rows if r['retrieval_status'] == 'ok' and r['selected_source_ids']]
    correct = lambda r: bool(set(r['selected_source_ids']) & set(r['case']['acceptable_note_ids']))
    return {
        'source_precision': rate(sum(correct(r) for r in selected), len(selected)),
        'end_to_end_supported_source_coverage': rate(sum(r['status'] == 'ok' and r['retrieval_status'] == 'ok' and correct(r) for r in positives), len(positives)),
        'negative_buckets': {
            bucket: {
                'cases': len(group),
                'false_reference_rate': rate(sum(bool(r['selected_source_ids']) for r in group), len(group)),
                'successful_no_reference_rate': rate(sum(r['status'] == 'ok' and r['retrieval_status'] == 'ok' and not r['selected_source_ids'] for r in group), len(group)),
                'request_failures': sum(r['status'] != 'ok' for r in group),
            } for bucket in ('uncovered', 'missing_context', 'out_of_scope')
            for group in [[r for r in rows if r['case']['bucket'] == bucket]]
        },
    }


def paired_difference(values):
    """Cluster bootstrap by frozen scenario group, preserving each paired case."""
    if not values:
        return {'paired_cases': 0, 'mean_verified_minus_hybrid': None, 'cluster_bootstrap95': None}
    groups = {}
    for group, value in values:
        groups.setdefault(group, []).append(value)
    names = sorted(groups)
    rng = random.Random(20261116)
    draws = [mean(v for name in rng.choices(names, k=len(names)) for v in groups[name]) for _ in range(2000)]
    return {'paired_cases': len(values), 'scenario_groups': len(groups),
            'mean_verified_minus_hybrid': mean(value for _, value in values),
            'cluster_bootstrap95': [percentile(draws, .025), percentile(draws, .975)]}


def summarize(plan, records):
    rows = deepcopy(records)
    for row in rows:
        if len(row['selected_source_ids']) > 1:
            raise ValueError('This protocol assumes one selected source per request')
        if row.get('judge', {}).get('status') == 'ok':
            row['judge']['verdict'] = judge.decode(row['judge']['attempts'][-1]['raw_verdict'], row['case'], row['answer'], row['contexts'])
    result = report(plan, rows)  # Enforces complete, unique pairs and exact frozen labels.
    result['status'] = 'completed_synthetic_comparison'
    for arm, summary in result['summaries'].items():
        group = [r for r in rows if r['arm'] == arm]
        summary['source_outcomes'] = source_metrics(group)
        summary['routing_accuracy_all_requests'] = rate(sum(route_correct(r) for r in group), len(group))
        summary['timeout_rate'] = rate(sum(timeout(r) for r in group), len(group))
        summary['routing_by_bucket'] = {
            bucket: rate(sum(route_correct(r) for r in bucket_rows), len(bucket_rows))
            for bucket in sorted({r['case']['bucket'] for r in group})
            for bucket_rows in [[r for r in group if r['case']['bucket'] == bucket]]
        }
        summary['judge_failure_rate_among_answers'] = rate(summary['judge_failure_count'], summary['answers'])
        scores = summary['answer_metrics']
        scores['sentence_unit_faithfulness'] = scores.pop('faithfulness')
        scores['judged_factual_unit_accuracy'] = scores.pop('judged_factual_claim_accuracy')
        scores['hallucinated_unit_rate'] = scores.pop('hallucinated_claim_rate')
    paired = {c['case_id']: {} for c in plan['dataset']['cases']}
    for row in rows:
        paired[row['case']['case_id']][row['arm']] = row
    differences = {key: [] for key in ('correctness', 'faithfulness', 'required_fact_coverage', 'teaching_usefulness', 'routing_success', 'request_success', 'pipeline_latency_ms', 'pipeline_cost_usd')}
    for pair in paired.values():
        a, b = pair['verified'], pair['hybrid']
        group = a['case']['scenario_group']
        differences['routing_success'].append((group, int(route_correct(a)) - int(route_correct(b))))
        differences['request_success'].append((group, int(a['status'] == 'ok') - int(b['status'] == 'ok')))
        for key, field in (('correctness', 'correctness_0_4'), ('faithfulness', 'faithfulness'), ('required_fact_coverage', 'required_fact_coverage'), ('teaching_usefulness', 'teaching_usefulness_1_5')):
            x, y = a.get('answer_metrics', {}).get(field), b.get('answer_metrics', {}).get(field)
            if x is not None and y is not None:
                differences[key].append((group, x - y))
        elapsed = lambda r: next((s['elapsed_ms'] for s in r['spans'] if s['stage'] == 'pipeline_total'), None)
        if elapsed(a) is not None and elapsed(b) is not None:
            differences['pipeline_latency_ms'].append((group, elapsed(a) - elapsed(b)))
        if a['cost']['pipeline_complete'] and b['cost']['pipeline_complete']:
            differences['pipeline_cost_usd'].append((group, a['cost']['known_pipeline_usd'] - b['cost']['known_pipeline_usd']))
    result['paired_differences'] = {key: paired_difference(values) for key, values in differences.items()}
    result['per_case'] = [{
        'case_id': r['case']['case_id'], 'arm': r['arm'], 'bucket': r['case']['bucket'],
        'status': r['status'], 'routing_reason': r['routing_reason'], 'routing_correct': route_correct(r),
        'selected_source_ids': r['selected_source_ids'], 'ranking': r['ranking'],
        'judge_status': r.get('judge', {}).get('status', 'not_run'), 'answer_metrics': r.get('answer_metrics'),
        'cost': r['cost'], 'timeout': timeout(r),
    } for r in rows]
    return result
