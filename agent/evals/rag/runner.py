"""freeze -> run -> replay. Public synthetic inputs only; never deploys or uploads by default."""
import argparse
import asyncio
from datetime import datetime, timezone
from importlib.metadata import version, PackageNotFoundError
import json
from pathlib import Path
from .pipeline import ARMS, GENERATION_MODEL, run_pipeline
from .judge import MODEL as JUDGE_MODEL, judge, validate
from .metrics import summarize, answer_scores, ranking
from .telemetry import PRICES, PRICE_DATE, cost
from retrieval.benchmark import fingerprint, git_revision
from retrieval.loader import load_contrast_docs
from retrieval.manifest import manifest_for
from retrieval.evidence_gate import MODEL as VERIFIER_MODEL

ROOT=Path(__file__).resolve().parents[3]


def write_new(path,value):
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    with path.open('x') as f:json.dump(value,f,indent=2);f.write('\n')


def identity():
    paths=list((ROOT/'agent/evals/rag').glob('*.py'))+list((ROOT/'agent/retrieval').glob('*.py'))+list((ROOT/'agent/study_assist').glob('*.py'))+[ROOT/'agent/providers.py',ROOT/'agent/config.py']
    return {str(p.relative_to(ROOT)):fingerprint(p.read_text()) for p in sorted(paths)}


def validate_dataset(data):
    cases=data['cases']; ids={d.id for d in load_contrast_docs('en')}
    if data.get('provenance')!='AI-authored public synthetic pilot; no expert validation' or not 1<=len(cases)<=20:
        raise ValueError('Only bounded public synthetic pilot data accepted')
    if len({c['case_id'] for c in cases})!=len(cases):raise ValueError('Duplicate case IDs')
    for c in cases:
        if not c['reference_answer'] or not c['required_facts'] or not c['reference_urls'] or not c['question']:
            raise ValueError('Missing reference labels')
        if set(c['acceptable_note_ids'])-ids:raise ValueError('Unknown note')
        if c['expected_behavior'] not in ('answer','answer_with_disclosure','clarify','redirect'):raise ValueError('Invalid route')
        if set(c['current_item'])-{'instruction','prompt','answer'}:raise ValueError('No metadata shortcuts')
    return data


def freeze(dataset,out):
    data=validate_dataset(json.loads(Path(dataset).read_text()))
    packages={}
    for name in ('openai','pydantic','langfuse','deepeval'):
        try:packages[name]=version(name)
        except PackageNotFoundError:packages[name]=None
    plan={'kind':'frozen_synthetic_answer_pilot','dataset':data,'arms':list(ARMS),'code':identity(),
        'created_at':datetime.now(timezone.utc).isoformat(),'git_revision':git_revision(),
        'corpus':manifest_for(load_contrast_docs('en')),'models':{'generator':GENERATION_MODEL,'judge':JUDGE_MODEL,'verifier':VERIFIER_MODEL},
        'prices_usd_per_million':PRICES,'price_date':PRICE_DATE,'packages':packages,
        'budget':{'max_provider_requests':len(data['cases'])*11,'generation_max_output':500,'judge_max_output':2000,'concurrency':1},
        'targets':{'correctness_mean_min':3,'faithfulness_mean_min':.9,'hallucinated_answer_rate_max':.1,'teaching_mean_min':4,'scope_pass_min':.9,'request_failure_rate_max':.02,'judge_failure_count_max':0},
        'limitations':['AI-authored labels; no independent validation or human calibration.','Judge model differs from generator but shares provider; correlated errors possible.','Local handler pipeline with live provider/DB calls; excludes public HTTP/browser/network hops and is not load testing.','Full-corpus and card-only are benchmark context adapters, not deployed endpoints.','Saved verdict replay reproduces scoring, not stochastic provider execution.']}
    write_new(out,plan);print('Frozen',len(data['cases']),'cases across',len(ARMS),'arms;',fingerprint(plan))


def report(plan,rows):
    expected={(c['case_id'],a) for c in plan['dataset']['cases'] for a in plan['arms']}
    keys=[(r['case']['case_id'],r['arm']) for r in rows]
    if len(keys)!=len(set(keys)) or set(keys)!=expected:raise ValueError('Missing or duplicate run records')
    cases={c['case_id']:c for c in plan['dataset']['cases']}
    for r in rows:
        if r['case']!=cases[r['case']['case_id']]:raise ValueError('Changed case labels')
        r['cost']=cost(r['spans'],plan['prices_usd_per_million'])
        r['ranking']=ranking([c['id'] for c in r['ranked_candidates']],r['case']['acceptable_note_ids'])
        if r.get('judge',{}).get('status')=='ok':
            v=validate(r['judge']['verdict'],r['case'],r['answer'],r['contexts'])
            r['answer_metrics']=answer_scores(v,bool(r['contexts']))
    totals=summarize(rows); t=plan['targets']; decisions={}
    for arm,m in totals.items():
        a=m['answer_metrics']
        tests={'correctness':a['correctness_0_4']['mean'] is not None and a['correctness_0_4']['mean']>=t['correctness_mean_min'],
               'faithfulness':a['faithfulness']['mean'] is not None and a['faithfulness']['mean']>=t['faithfulness_mean_min'],
               'hallucination':a['hallucinated_answer']['mean'] is not None and a['hallucinated_answer']['mean']<=t['hallucinated_answer_rate_max'],
               'teaching':a['teaching_usefulness_1_5']['mean'] is not None and a['teaching_usefulness_1_5']['mean']>=t['teaching_mean_min'],
               'scope':a['scope_pass']['mean'] is not None and a['scope_pass']['mean']>=t['scope_pass_min'],
               'reliability':m['request_failure_rate']<=t['request_failure_rate_max'],
               'judge_complete':m['judge_failure_count']<=t['judge_failure_count_max']}
        # No-context baseline cannot pass a grounding requirement; mark that criterion N/A.
        if arm=='card_only':tests['faithfulness']=None
        decisions[arm]={'criteria':tests,'diagnostic_pass':all(v for v in tests.values() if v is not None)}
    return {'plan_sha256':fingerprint(plan),'summaries':totals,'diagnostic_gates':decisions,'limitations':plan['limitations'],'release_authorized':False}


async def execute(plan,records):
    rows=[]
    with Path(records).open('x') as f:
        for i,case in enumerate(plan['dataset']['cases']):
            # Rotate order to reduce consistent warmup/order advantage.
            arms=plan['arms'][i%len(ARMS):]+plan['arms'][:i%len(ARMS)]
            for arm in arms:
                row=await run_pipeline(case,arm)
                if row['status']=='ok':
                    row['judge']=await judge(case,row['answer'],row['contexts'],row['spans'])
                row['plan_sha256']=fingerprint(plan)
                f.write(json.dumps(row)+'\n');f.flush();rows.append(row)
                print(case['case_id'],arm,row['status'],row.get('judge',{}).get('status','not_run'),flush=True)
    return report(plan,rows)


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('mode',choices=['freeze','run','replay','langfuse-export','deepeval-check'])
    p.add_argument('--dataset',type=Path);p.add_argument('--plan',required=True,type=Path)
    p.add_argument('--records',type=Path);p.add_argument('--output',type=Path)
    args=p.parse_args()
    if args.mode=='freeze':freeze(args.dataset,args.plan);return
    plan=json.loads(args.plan.read_text())
    if plan['code']!=identity() or plan['corpus']!=manifest_for(load_contrast_docs('en')):raise ValueError('Frozen code/corpus changed')
    if args.output and args.output.exists():raise ValueError('Preserve existing results')
    if args.mode=='run':
        result=asyncio.run(execute(plan,args.records))
    else:
        rows=[json.loads(l) for l in args.records.read_text().splitlines()]
        if any(r['plan_sha256']!=fingerprint(plan) for r in rows):raise ValueError('Record plan mismatch')
        result=report(plan,rows)
        if args.mode=='langfuse-export':
            from .telemetry import export_langfuse
            print('Exported numeric summaries:',export_langfuse(rows,fingerprint(plan)))
        if args.mode=='deepeval-check':
            from .deepeval_adapter import SavedRubricMetric
            from deepeval.test_case import LLMTestCase
            checks=0
            for r in rows:
                if r.get('judge',{}).get('status')!='ok':continue
                case=LLMTestCase(input=r['case']['question'],actual_output=r['answer'],expected_output=r['case']['reference_answer'],retrieval_context=[c['text'] for c in r['contexts']],additional_metadata={'judge_status':'ok','scores':r['answer_metrics'],'judge_reason':r['judge']['verdict']['reason']})
                for key,scale in [('correctness_0_4',4),('faithfulness',1),('teaching_usefulness_1_5',5),('scope_pass',1)]:
                    if r['answer_metrics'][key] is None:continue
                    metric=SavedRubricMetric(key,scale); assert metric.measure(case)==float(r['answer_metrics'][key])/scale
                    checks+=1
            result['deepeval_saved_metric_checks']=checks
    if args.output:write_new(args.output,result)
    print(json.dumps(result['summaries'],indent=2))

if __name__=='__main__':main()
