"""Freeze/run/replay paired legacy-vs-candidate evaluations with one common judge."""
import argparse
import asyncio
from datetime import datetime,timezone
import json
from pathlib import Path
from unittest.mock import patch
from evals.rag import pipeline
from evals.rag.runner import ROOT, write_new, validate_dataset, identity as base_identity, report
from evals.rag.telemetry import PRICES
from evals.rag.judge import validate as validate_normalized
from evals.rag.metrics import answer_scores
from retrieval.benchmark import fingerprint,git_revision
from retrieval.manifest import manifest_for
from retrieval.loader import load_contrast_docs
from study_assist import evidence_policy
from . import judge as indexed

ARMS=['legacy','candidate']


def identity():
    return {**base_identity(),**{str(p.relative_to(ROOT)):fingerprint(p.read_text()) for p in sorted((ROOT/'agent/evals/rag_v2').glob('*.py'))}}


def freeze(dataset,out):
    data=validate_dataset(json.loads(Path(dataset).read_text()))
    plan={'kind':'paired_routing_answer_candidate','dataset':data,'arms':ARMS,'code':identity(),
        'created_at':datetime.now(timezone.utc).isoformat(),'git_revision':git_revision(),
        'corpus':manifest_for(load_contrast_docs('en')),'prices_usd_per_million':PRICES,
        'models':{'generator':pipeline.GENERATION_MODEL,'verifier':evidence_policy.MODEL,'judge':indexed.MODEL},
        'budget':{'max_pipeline_calls':len(data['cases'])*6,'max_judge_calls_including_one_429_retry':len(data['cases'])*4,'judge_reserved_tokens_per_minute':24000,'concurrency':1},
        'targets':{'correctness_mean_min':3,'faithfulness_mean_min':.9,'hallucinated_answer_rate_max':.1,'teaching_mean_min':4,'scope_pass_min':.9,'request_failure_rate_max':.02,'judge_failure_count_max':0},
        'limitations':['Frozen synthetic scenarios, AI-authored references; no independent validation.','Common judge scores deterministic sentence/line units, not atomic claims; not directly comparable to the v1 judge.','Live local handler measurements exclude public HTTP/browser hops and judge queue time.','Both arms use GPT-4o mini; the candidate changes the policy structure, not the model.']}
    write_new(out,plan);print('Frozen',len(data['cases']),'cases',fingerprint(plan))


def summarize(plan,rows):
    for row in rows:
        j=row.get('judge',{})
        if j.get('status')=='ok':
            # Reconstruct normalized judgment from saved indexed output, not trusted cached scores.
            parsed=j['attempts'][-1]['raw_verdict']
            j['verdict']=indexed.decode(parsed,row['case'],row['answer'],row['contexts'])
    result=report(plan,rows)
    # Source selector metrics are calculated by the original deterministic implementation.
    from evals.rag.metrics import summarize as metric_summary
    for arm in ARMS:
        selection=metric_summary([{**r,'arm':'verified'} for r in rows if r['arm']==arm])['verified']['retrieval']
        result['summaries'][arm]['retrieval']=selection
        m=result['summaries'][arm]['answer_metrics']
        m['judged_factual_unit_accuracy']=m.pop('judged_factual_claim_accuracy')
        m['hallucinated_unit_rate']=m.pop('hallucinated_claim_rate')
        m['sentence_unit_faithfulness']=m.pop('faithfulness')
        group=[r for r in rows if r['arm']==arm];ok=[r for r in group if r.get('judge',{}).get('status')=='ok']
        result['summaries'][arm]['judge_first_attempt_success_rate']=sum(r['judge']['attempts'][0]['status']=='ok' for r in ok)/len(group)
        result['summaries'][arm]['judge_retry_requests']=sum(max(0,len(r.get('judge',{}).get('attempts',[]))-1) for r in group)
        result['summaries'][arm]['routes']={behavior:{'requests':len([r for r in group if r['case']['expected_behavior']==behavior]),
            'scope_passes':sum(r['judge']['verdict']['scope_result']=='pass' for r in ok if r['case']['expected_behavior']==behavior)} for behavior in sorted({r['case']['expected_behavior'] for r in group})}
    return result


async def execute(plan,records):
    rows=[];pacer=indexed.TokenPacer()
    with Path(records).open('x') as f:
        for i,c in enumerate(plan['dataset']['cases']):
            for arm in (ARMS if i%2==0 else ARMS[::-1]):
                if arm=='candidate':
                    with patch.object(pipeline,'evidence_gate',evidence_policy):row=await pipeline.run_pipeline(c,'verified')
                else:row=await pipeline.run_pipeline(c,'verified')
                row['arm']=arm
                if row['status']=='ok':
                    try:row['judge']=await indexed.judge(c,row['answer'],row['contexts'],row['spans'],pacer)
                    except Exception as exc:row['judge']={'status':'error','error_type':type(exc).__name__,'attempts':[]}
                row['plan_sha256']=fingerprint(plan);rows.append(row)
                f.write(json.dumps(row)+'\n');f.flush()
                print(c['case_id'],arm,row['status'],row.get('judge',{}).get('status'),flush=True)
    return summarize(plan,rows)


def main():
    p=argparse.ArgumentParser();p.add_argument('mode',choices=['freeze','run','replay']);p.add_argument('--dataset');p.add_argument('--plan',required=True,type=Path);p.add_argument('--records',type=Path);p.add_argument('--output',type=Path);a=p.parse_args()
    if a.mode=='freeze':freeze(a.dataset,a.plan);return
    plan=json.loads(a.plan.read_text())
    if plan['code']!=identity() or plan['corpus']!=manifest_for(load_contrast_docs('en')):raise ValueError('Frozen code/corpus changed')
    if a.output.exists():raise ValueError('Preserve existing result')
    if a.mode=='run':result=asyncio.run(execute(plan,a.records))
    else:
        rows=[json.loads(x) for x in a.records.read_text().splitlines()]
        if any(r['plan_sha256']!=fingerprint(plan) for r in rows):raise ValueError('Wrong run identity')
        result=summarize(plan,rows)
    write_new(a.output,result);print(json.dumps(result['summaries'],indent=2))

if __name__=='__main__':main()
