"""Deterministic metrics. Undefined quantities are null, never perfect scores."""
from statistics import mean
from retrieval.problem_metrics import percentile, ratio


def ranking(ranked, relevant):
    ranked = list(dict.fromkeys(ranked))
    gold = set(relevant)
    if not gold:
        return {**{f'{m}@{k}': None for m in ('recall', 'hit') for k in (1, 3, 5)}, 'mrr@5': None}
    result = {}
    for k in (1, 3, 5):
        hits = len(set(ranked[:k]) & gold)
        result[f'recall@{k}'] = hits / len(gold)
        result[f'hit@{k}'] = float(hits > 0)
    result['mrr@5'] = next((1 / (i + 1) for i, doc in enumerate(ranked[:5]) if doc in gold), 0.0)
    return result


def answer_scores(verdict, context_present):
    claims = verdict['claims']
    grounded = [c for c in claims if c['grounding'] != 'not_applicable'] if context_present else []
    factual = [c for c in claims if c['truth'] != 'unverifiable']
    return {
        'correctness_0_4': verdict['correctness'],
        'required_fact_coverage': ratio(sum(verdict['required_facts_covered']), len(verdict['required_facts_covered'])),
        'faithfulness': ratio(sum(c['grounding'] == 'supported' for c in grounded), len(grounded)),
        'judged_factual_claim_accuracy': ratio(sum(c['truth'] == 'correct' for c in factual), len(factual)),
        'hallucinated_claim_rate': ratio(sum(c['truth'] == 'incorrect' or c['fabricated'] for c in claims), len(claims)),
        'hallucinated_answer': bool(any(c['truth'] == 'incorrect' or c['fabricated'] for c in claims)),
        'teaching_usefulness_1_5': verdict['teaching_usefulness'] if verdict['teaching_applicable'] else None,
        'scope_pass': verdict['scope_result'] == 'pass',
        'scope_result': verdict['scope_result'],
    }


def mean_present(values):
    items = [v for v in values if v is not None]
    return {'mean': mean(items) if items else None, 'n': len(items)}


def summarize(rows):
    result = {}
    for arm in sorted({r['arm'] for r in rows}):
        group = [r for r in rows if r['arm'] == arm]
        answered = [r for r in group if r['status'] == 'ok']
        judged = [r for r in answered if r.get('judge', {}).get('status') == 'ok']
        selected = [r for r in answered if r['selected_source_ids']]
        # Full-corpus is a context baseline, not a source selector.
        retrieval = None
        if arm in ('hybrid', 'verified'):
            valid = [r for r in group if r.get('retrieval_status') == 'ok']
            neg = [r for r in valid if not r['case']['acceptable_note_ids']]
            pos = [r for r in valid if r['case']['acceptable_note_ids']]
            chosen = [r for r in valid if r['selected_source_ids']]
            abstained = [r for r in valid if not r['selected_source_ids']]
            correct = sum(bool(set(r['selected_source_ids']) & set(r['case']['acceptable_note_ids'])) for r in chosen)
            retrieval = {
                'scored_requests': len(valid),
                'source_precision': ratio(correct, len(chosen)),
                'source_recall': ratio(correct, len(pos)),
                'false_positive_rate': ratio(sum(bool(r['selected_source_ids']) for r in neg), len(neg)),
                'negative_abstention_accuracy': ratio(sum(not r['selected_source_ids'] for r in neg), len(neg)),
                'abstention_precision': ratio(sum(not r['case']['acceptable_note_ids'] for r in abstained), len(abstained)),
                'ranking': {key: mean_present([r['ranking'][key] for r in valid]) for key in ranking([], ['x'])},
            }
        stages = sorted({s['stage'] for r in group for s in r['spans']})
        performance = {}
        for stage in stages:
            spans = [s for r in group for s in r['spans'] if s['stage'] == stage]
            performance[stage] = {'count': len(spans), 'p50_ms': percentile([s['elapsed_ms'] for s in spans], .5), 'p95_ms': percentile([s['elapsed_ms'] for s in spans], .95)}
        costs = [r['cost'] for r in group]
        result[arm] = {
            'requests': len(group), 'answers': len(answered), 'request_failure_rate': ratio(len(group)-len(answered), len(group)),
            'judged_answers': len(judged), 'judge_failure_count': len(answered)-len(judged),
            'answer_metrics': {key: mean_present([r['answer_metrics'][key] for r in judged]) for key in ('correctness_0_4','required_fact_coverage','faithfulness','judged_factual_claim_accuracy','hallucinated_claim_rate','hallucinated_answer','teaching_usefulness_1_5','scope_pass')},
            'end_to_end_correct_and_in_scope_rate': ratio(sum(r['answer_metrics']['correctness_0_4'] >= 3 and r['answer_metrics']['scope_pass'] for r in judged), len(group)),
            'retrieval': retrieval, 'latency': performance,
            'known_pipeline_cost_usd': sum(c['known_pipeline_usd'] for c in costs),
            'known_judge_cost_usd': sum(c['known_judge_usd'] for c in costs),
            'complete_pipeline_cost_requests': sum(c['pipeline_complete'] for c in costs),
            'mean_pipeline_cost_usd': mean([c['known_pipeline_usd'] for c in costs]) if all(c['pipeline_complete'] for c in costs) else None,
            'recorded_tokens': {stage: {k: sum(((s.get('usage') or {}).get(k, 0) or 0) for r in group for s in r['spans'] if s['stage']==stage) for k in ('input_tokens','output_tokens','cached_input_tokens')} for stage in stages},
        }
    return result
