"""Freeze/run/replay the current serving path; no automatic deployment or re-runs."""
import argparse
import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path
from . import pipeline
from evals.rag.runner import ROOT, write_new, validate_dataset, identity as base_identity, report
from evals.rag_v2 import judge
from evals.rag.telemetry import PRICES, PRICE_DATE
from evals.rag.metrics import summarize as metric_summary
from retrieval.benchmark import fingerprint, git_revision
from retrieval.manifest import manifest_for
from retrieval.loader import load_contrast_docs
from retrieval.problem_metrics import wilson


def identity():
    paths=list((ROOT/'agent/evals/release').glob('*.py'))+list((ROOT/'agent/evals/rag_v2').glob('*.py'))
    return {**base_identity(),**{str(p.relative_to(ROOT)):fingerprint(p.read_text()) for p in sorted(paths)}}


def freeze(dataset, path):
    data=json.loads(Path(dataset).read_text())
    if not 1<=len(data['cases'])<=64 or len({c['case_id'] for c in data['cases']})!=len(data['cases']):raise ValueError('Invalid dataset size/IDs')
    for i in range(0,len(data['cases']),20):validate_dataset({**data,'cases':data['cases'][i:i+20]})
    plan={'kind':'serving_path_release_evaluation','dataset':data,'arms':['candidate'],'code':identity(),
          'git_revision':git_revision(),'created_at':datetime.now(timezone.utc).isoformat(),
          'corpus':manifest_for(load_contrast_docs('en')),'prices_usd_per_million':PRICES,'price_date':PRICE_DATE,
          'models':{'verifier':pipeline.evidence_gate.MODEL,'generator':pipeline.GENERATION_MODEL,'judge':judge.MODEL},
          'budget':{'max_pipeline_calls':len(data['cases'])*3,'max_judge_calls':len(data['cases'])*2,'concurrency':1,'verifier_timeout_seconds':8,'judge_reserved_tokens_per_minute':24000},
          'targets':{'correctness_mean_min':3,'faithfulness_mean_min':.9,'hallucinated_answer_rate_max':.1,'teaching_mean_min':4,'scope_pass_min':.9,'request_failure_rate_max':.02,'judge_failure_count_max':0},
          'retrieval_targets':{'precision_min':.9,'recall_min':.8,'negative_fp_max':.1,'required_clarification_min':1,'required_redirect_min':1,'wrong_clarification_max':0},
          'limitations':['AI-authored synthetic labels, not expert validation or user traffic.','Generator and judge differ; verifier and judge share GPT-4.1 and may have correlated errors.','Sentence-unit judgments, not directly comparable with v1 atomic claims.','Local live handler measurements exclude public HTTP/browser and evaluation pacing; not a load benchmark.','Raw hybrid comparison measures source selection only, not generated-answer superiority.']}
    write_new(path,plan);print('Frozen',len(data['cases']),'cases',fingerprint(plan))


def summarize(plan, rows):
    for r in rows:
        if r.get('judge',{}).get('status')=='ok':
            r['judge']['verdict']=judge.decode(r['judge']['attempts'][-1]['raw_verdict'],r['case'],r['answer'],r['contexts'])
    result=report(plan,rows)
    selected=metric_summary([{**r,'arm':'verified'} for r in rows])['verified']['retrieval']
    result['summaries']['candidate']['retrieval']=selected
    result['raw_hybrid_source_baseline']=metric_summary([{**r,'arm':'hybrid','selected_source_ids':r['raw_selected_source_ids']} for r in rows])['hybrid']['retrieval']
    positives=[r for r in rows if r['case']['acceptable_note_ids']]
    negatives=[r for r in rows if not r['case']['acceptable_note_ids']]
    chosen=[r for r in rows if r['selected_source_ids']]
    correct=sum(bool(set(r['selected_source_ids']) & set(r['case']['acceptable_note_ids'])) for r in rows)
    fp=sum(bool(r['selected_source_ids']) for r in negatives)
    clar=[r for r in rows if r['case']['expected_behavior']=='clarify'];redirect=[r for r in rows if r['case']['expected_behavior']=='redirect']
    answerable=[r for r in rows if r['case']['expected_behavior'] in ('answer','answer_with_disclosure')]
    counts={'positive_cases':len(positives),'negative_cases':len(negatives),'selected_sources':len(chosen),'correct_sources':correct,'false_retrievals':fp,
            'required_clarifications':len(clar),'correct_clarifications':sum(r['routing_reason']=='needs_context' for r in clar),
            'required_redirects':len(redirect),'correct_redirects':sum(r['routing_reason']=='out_of_scope' for r in redirect),
            'answerable_cases':len(answerable),'wrong_clarifications':sum(r['routing_reason']=='needs_context' for r in answerable)}
    result['routing_counts']=counts
    result['uncertainty']={'source_precision_wilson95':wilson(correct,len(chosen)),'end_to_end_source_recall_wilson95':wilson(correct,len(positives)),'negative_false_reference_wilson95':wilson(fp,len(negatives))}
    t=plan['retrieval_targets']
    gates={'source_precision':bool(chosen) and correct/len(chosen)>=t['precision_min'],
           'end_to_end_source_recall':bool(positives) and correct/len(positives)>=t['recall_min'],
           'false_retrieval':bool(negatives) and fp/len(negatives)<=t['negative_fp_max'],
           'clarification':not clar or counts['correct_clarifications']/len(clar)>=t['required_clarification_min'],
           'redirect':not redirect or counts['correct_redirects']/len(redirect)>=t['required_redirect_min'],
           'wrong_clarification':counts['wrong_clarifications']<=t['wrong_clarification_max']}
    result['retrieval_gates']=gates
    result['acceptance_pass']=all(gates.values()) and result['diagnostic_gates']['candidate']['diagnostic_pass']
    m=result['summaries']['candidate']['answer_metrics']
    m['sentence_unit_faithfulness']=m.pop('faithfulness');m['judged_factual_unit_accuracy']=m.pop('judged_factual_claim_accuracy');m['hallucinated_unit_rate']=m.pop('hallucinated_claim_rate')
    return result


async def execute(plan,path):
    rows=[];pacer=judge.TokenPacer()
    with path.open('x') as f:
        for c in plan['dataset']['cases']:
            # Conservative verifier reservation; pause is outside measured tutor latency.
            queued=await pacer.acquire(5000)
            row=await pipeline.run_pipeline(c,'verified');row['arm']='candidate'
            row['spans'].append({'stage':'evaluation_queue','model':None,'status':'ok','elapsed_ms':round(queued,3)})
            if row['status']=='ok':
                try:row['judge']=await judge.judge(c,row['answer'],row['contexts'],row['spans'],pacer)
                except Exception as exc:row['judge']={'status':'error','error_type':type(exc).__name__,'attempts':[]}
            row['plan_sha256']=fingerprint(plan);rows.append(row)
            f.write(json.dumps(row)+'\n');f.flush()
            print(c['case_id'],row['status'],row['routing_reason'],row.get('judge',{}).get('status'),flush=True)
    return summarize(plan,rows)


def main():
    p=argparse.ArgumentParser();p.add_argument('mode',choices=['freeze','run','replay']);p.add_argument('--dataset');p.add_argument('--plan',required=True,type=Path);p.add_argument('--records',type=Path);p.add_argument('--output',type=Path);a=p.parse_args()
    if a.mode=='freeze':freeze(a.dataset,a.plan);return
    plan=json.loads(a.plan.read_text())
    if plan['code']!=identity() or plan['corpus']!=manifest_for(load_contrast_docs('en')):raise ValueError('Frozen code/corpus changed')
    if a.output.exists():raise ValueError('Preserve prior results')
    if a.mode=='run':result=asyncio.run(execute(plan,a.records))
    else:
        rows=[json.loads(s) for s in a.records.read_text().splitlines()]
        if any(r['plan_sha256']!=fingerprint(plan) for r in rows):raise ValueError('Wrong run identity')
        result=summarize(plan,rows)
    write_new(a.output,result);print(json.dumps(result,indent=2))

if __name__=='__main__':main()
