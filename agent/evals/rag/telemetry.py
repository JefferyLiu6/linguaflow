"""Local stage measurements; optional metrics-only Langfuse export, no raw text."""
from contextlib import contextmanager
import time

# USD / million tokens; freeze in each plan. Not a billing receipt.
PRICES = {
    'gpt-4.1-2025-04-14': {'input': 2.0, 'cached': .50, 'output': 8.0},
    'gpt-4o-mini-2024-07-18': {'input': .15, 'cached': .075, 'output': .60},
    'gpt-4.1-mini-2025-04-14': {'input': .40, 'cached': .10, 'output': 1.60},
    'text-embedding-3-small': {'input': .02, 'cached': .02, 'output': 0},
}
PRICE_DATE = '2026-09-16'


@contextmanager
def span(spans, stage, model=None):
    entry = {'stage': stage, 'model': model, 'status': 'error'}
    started = time.perf_counter()
    try:
        yield entry
        entry['status'] = 'ok'
    except BaseException as exc:
        entry['error_type'] = type(exc).__name__
        raise
    finally:
        entry['elapsed_ms'] = round((time.perf_counter()-started)*1000, 3)
        spans.append(entry)


def openai_usage(usage):
    details = getattr(usage, 'prompt_tokens_details', None)
    return {'input_tokens': getattr(usage, 'prompt_tokens', getattr(usage, 'total_tokens', 0)),
            'output_tokens': getattr(usage, 'completion_tokens', 0),
            'cached_input_tokens': getattr(details, 'cached_tokens', 0) or 0}


def cost(spans, prices=PRICES):
    result = {'known_pipeline_usd': 0.0, 'known_judge_usd': 0.0, 'pipeline_complete': True, 'judge_complete': True}
    for s in spans:
        if not s.get('model'):
            continue
        kind = 'judge' if s['stage'] == 'judge' else 'pipeline'
        u = s.get('usage'); p = prices.get(s['model'])
        if not u or not p:
            result[kind+'_complete'] = False
            continue
        cached = u.get('cached_input_tokens')
        # Missing cache breakdown: price all input at uncached rate, disclose estimate.
        if cached is None:
            cached = 0
        if not 0 <= cached <= u['input_tokens']:
            raise ValueError('Invalid token usage')
        amount = ((u['input_tokens']-cached)*p['input'] + cached*p['cached'] + u['output_tokens']*p['output'])/1_000_000
        result['known_'+kind+'_usd'] += amount
    return result


def export_langfuse(rows, plan_hash, client=None):
    """Export numeric replay summaries; export spans are not live-request timing spans."""
    if client is None:
        from langfuse import Langfuse
        client = Langfuse()
    count = 0
    for r in rows:
        trace_id = client.create_trace_id(seed=f"{plan_hash}:{r['case']['case_id']}:{r['arm']}")
        with client.start_as_current_observation(name='rag.eval.replay_summary', trace_context={'trace_id': trace_id}, metadata={
            'plan_sha256': plan_hash, 'case_id': r['case']['case_id'], 'arm': r['arm'],
            'status': r['status'], 'cost': r['cost'], 'measured_spans': r['spans'],
            'timing_scope': 'Recorded local pipeline measurements; this export span is not request latency',
        }):
            for name, value in r.get('answer_metrics', {}).items():
                if isinstance(value, (int,float)):
                    client.create_score(trace_id=trace_id, name=name, value=float(value), data_type='NUMERIC', metadata={'judge_kind': 'uncalibrated_llm_judge'})
        count += 1
    client.flush()
    return count
