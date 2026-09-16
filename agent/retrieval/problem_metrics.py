"""Source reliability and routing metrics; infrastructure failures are never abstentions."""
from collections import Counter
import math
from .heldout_eval import wilson


def ratio(n,d):return n/d if d else None


def percentile(values,p):
    if not values:return None
    v=sorted(values);return v[max(0,math.ceil(p*len(v))-1)]


def summarize(rows):
    errors=[r for r in rows if r['decision']=='verification_unavailable']
    valid=[r for r in rows if r['decision']!='verification_unavailable']
    positives=[r for r in valid if r['acceptable_note_ids']];negatives=[r for r in valid if not r['acceptable_note_ids']]
    selected=[r for r in valid if r['selected_note_id']];abstained=[r for r in valid if not r['selected_note_id']]
    correct=sum(r['selected_note_id'] in r['acceptable_note_ids'] for r in selected)
    fp=sum(bool(r['selected_note_id']) for r in negatives)
    misses=sum(not r['selected_note_id'] for r in positives)
    precision=ratio(correct,len(selected));recall=ratio(correct,len(positives))
    context=[r for r in valid if r.get('expected_decision')=='needs_context']
    noncontext=[r for r in valid if r.get('expected_decision')!='needs_context']
    pairs={}
    for r in valid:
        if r.get('pair_id'):pairs.setdefault(r['pair_id'],{})[r['card_condition']]=r
    complete=[v for v in pairs.values() if set(v)=={'absent','distractor'}]
    rank_values=[r.get('gold_rank') for r in positives]
    return dict(total=len(rows),scored=len(valid),infrastructure_errors=len(errors),infrastructure_error_rate=ratio(len(errors),len(rows)),
        positive_count=len(positives),negative_count=len(negatives),correct_sources=correct,false_retrievals=fp,
        source_precision=precision,source_precision_wilson95=wilson(correct,len(selected)),
        positive_source_recall=recall,positive_source_recall_wilson95=wilson(correct,len(positives)),
        negative_false_retrieval_rate=ratio(fp,len(negatives)),negative_fp_wilson95=wilson(fp,len(negatives)),
        negative_specificity=ratio(len(negatives)-fp,len(negatives)),
        over_abstention_rate=ratio(misses,len(positives)),wrong_source_rate=ratio(len(positives)-correct-misses,len(positives)),
        coverage=ratio(len(selected),len(valid)),selective_risk=1-precision if precision is not None else None,
        harmful_source_rate_all_requests=ratio(len(selected)-correct,len(rows)),
        abstention_precision=ratio(sum(not r['acceptable_note_ids'] for r in abstained),len(abstained)),
        source_f05=1.25*precision*recall/(.25*precision+recall) if precision is not None and recall is not None and .25*precision+recall else 0.0,
        balanced_accuracy=(recall+1-fp/len(negatives))/2 if recall is not None and negatives else None,
        candidate_recall_at_5=ratio(sum(x is not None and x<=5 for x in rank_values),len(positives)),
        candidate_mrr_at_5=ratio(sum(1/x for x in rank_values if x is not None and x<=5),len(positives)),
        clarification_recall=ratio(sum(r['decision']=='needs_context' for r in context),len(context)),
        inappropriate_clarification_rate=ratio(sum(r['decision']=='needs_context' for r in noncontext),len(noncontext)),
        routing_accuracy=ratio(sum(r['decision']==r.get('expected_decision') for r in valid),len(valid)),
        decision_counts=dict(Counter(r['decision'] for r in rows)),
        end_to_end_correct_source_rate_on_all_positive_requests=ratio(correct,sum(bool(r['acceptable_note_ids']) for r in rows)),
        paired_distractor_cases=len(complete),
        card_contamination_rate=ratio(sum(bool(v['distractor']['selected_note_id']) and not v['absent']['selected_note_id'] for v in complete),len(complete)),
        paired_negative_fp_delta=ratio(sum(int(bool(v['distractor']['selected_note_id']))-int(bool(v['absent']['selected_note_id'])) for v in complete),len(complete)),
        verifier_p50_ms=percentile([r['verification']['elapsed_ms'] for r in rows if r.get('verification')],.5),
        verifier_p95_ms=percentile([r['verification']['elapsed_ms'] for r in rows if r.get('verification')],.95),
        verifier_requests=sum((r.get('verification') or {}).get('provider_requests',0) for r in rows),
        input_tokens=sum((r.get('verification') or {}).get('input_tokens',0) for r in rows),
        output_tokens=sum((r.get('verification') or {}).get('output_tokens',0) for r in rows))
