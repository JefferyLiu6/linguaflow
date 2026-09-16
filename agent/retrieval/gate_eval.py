"""Bounded development/regression/fresh-test comparison with replayable verifier outputs."""
import argparse
import asyncio
from dataclasses import asdict
from datetime import datetime,timezone
import gzip
import json
from pathlib import Path
from unittest.mock import patch
from .benchmark import fingerprint,git_revision
from . import evidence_gate as gate
from .embeddings import format_chunk_text,format_query_from_question
from .loader import load_contrast_docs
from .manifest import manifest_for
from .retrieval_comparison import vector_rank
from .heldout_eval import collect,load_artifact,write_new,paired_bootstrap
from .hybrid import retrieve_for_freeform_question
from .problem_metrics import summarize

ROOT=Path(__file__).resolve().parents[2]
FILES=['evidence_gate.py','gate_eval.py','problem_metrics.py','hybrid.py','embeddings.py','tagger.py','retrieve.py','loader.py','manifest.py','retrieval_comparison.py']


def inputs(dataset):
    data=json.loads(Path(dataset).read_text());cases=data['cases'];docs=load_contrast_docs('en')
    if not cases or len(cases)>100 or len({c['case_id'] for c in cases})!=len(cases):raise ValueError('Case budget or IDs invalid')
    ids={d.id for d in docs}
    for c in cases:
        if set(c['acceptable_note_ids'])-ids or not c['label_rationale'] or not c.get('scenario_group'):raise ValueError('Invalid labels')
    texts={};documents=[];queries=[]
    for d in docs:
        t=format_chunk_text(d);k=fingerprint(t);texts[k]=t;documents.append({'id':d.id,'key':k})
    for c in cases:
        t=format_query_from_question(c['question'],c['current_item']);k=fingerprint(t);texts[k]=t;queries.append({'case_id':c['case_id'],'key':k})
    obj={'corpus_manifest':manifest_for(docs),'documents':documents,'queries':queries,'texts':texts}
    return data,obj


def code_identity():return {f:fingerprint((ROOT/'agent/retrieval'/f).read_text()) for f in FILES}


def prepare(dataset,out):
    data,obj=inputs(dataset)
    plan={'dataset':data,'embedding_inputs':obj,'code':code_identity(),'git_revision':git_revision(),
          'created_at':datetime.now(timezone.utc).isoformat(),'model':gate.MODEL,'protocol':'Candidate generator fixed; top-five semantic support verification, no threshold tuning on this set.',
          'targets':{'min_source_precision':.90,'min_positive_recall':.80,'max_negative_fp':.10,'max_infrastructure_error_rate':.02},
          'budget':{'verifier_requests':len(data['cases']),'max_output_tokens_per_request':gate.MAX_OUTPUT_TOKENS,'concurrency':3,'max_embedding_requests':7}}
    write_new(out,plan);print('Prepared',len(data['cases']),'cases; hash',fingerprint(plan))


def candidate_debug(case,query_vector,doc_vectors):
    candidates=vector_rank(doc_vectors,query_vector)[:10]
    with patch('retrieval.hybrid.embed_text',return_value=query_vector),patch('retrieval.hybrid.query_by_vector',return_value=candidates):
        return retrieve_for_freeform_question(case['question'],current_item=case['current_item'])


def row(case,debug,verification=None):
    choices=[c['id'] for c in debug['top_candidates']];gold=case['acceptable_note_ids']
    return {**case,'selected_note_id':debug['note'].id if debug['hit'] else None,
            'decision':verification['decision'] if verification else ('supported' if debug['hit'] else 'not_covered'),
            'gold_rank':next((i+1 for i,id in enumerate(choices) if id in gold),None),'verification':verification}


def report(plan,records,base_rows):
    summaries={'baseline':summarize(base_rows),'verified':summarize(records)};m=summaries['verified'];t=plan['targets']
    def paired_rows(rows):
        return [{**r,'positive':bool(r['acceptable_note_ids']),'correct':r['selected_note_id'] in r['acceptable_note_ids'] if r['acceptable_note_ids'] else r['selected_note_id'] is None,'primary_note_id':r['acceptable_note_ids'][0] if r['acceptable_note_ids'] else None} for r in rows]
    usable=[i for i,r in enumerate(records) if r['decision']!='verification_unavailable']
    a=[records[i] for i in usable];b=[base_rows[i] for i in usable]
    pair=paired_bootstrap(paired_rows(a),paired_rows(b)) if any(r['acceptable_note_ids'] for r in a) and any(not r['acceptable_note_ids'] for r in a) else None
    passed=m['source_precision'] is not None and m['source_precision']>=t['min_source_precision'] and m['positive_source_recall']>=t['min_positive_recall'] and m['negative_false_retrieval_rate']<=t['max_negative_fp'] and m['infrastructure_error_rate']<=t['max_infrastructure_error_rate']
    buckets=sorted({r['bucket'] for r in records})
    return {'plan_sha256':fingerprint(plan),'created_at':datetime.now(timezone.utc).isoformat(),'summaries':summaries,'paired_balanced_accuracy_delta':pair,
            'slices':{arm:{s:summarize([r for r in rows if r['bucket']==s]) for s in buckets} for arm,rows in [('baseline',base_rows),('verified',records)]},
            'targets':t,'passed':passed,'baseline_results':base_rows,'verified_results':records,
            'limitations':['AI-authored corpus-aware labels; not independent human ground truth.','Verifier is the system under test, not the label judge.','Provider timing is local verifier-only at concurrency three, not deployed endpoint p95.','Infrastructure failures excluded from conditional quality but counted separately and in end-to-end positive source rate.','Routing accuracy for legacy labels mapped into new categories is descriptive only.','No answer generation: citation faithfulness and answer correctness remain unmeasured.']}


async def execute(plan,artifact,records_path):
    obj=plan['embedding_inputs'];vectors=artifact['vectors'];dv={r['id']:vectors[r['key']] for r in obj['documents']};qkeys={r['case_id']:r['key'] for r in obj['queries']}
    sem=asyncio.Semaphore(3);results=[None]*len(plan['dataset']['cases']);baselines=[None]*len(results)
    async def run(i,c):
        debug=candidate_debug(c,vectors[qkeys[c['case_id']]],dv);baselines[i]=row(c,debug)
        async with sem:verdict=await gate.verify_evidence(c['question'],c['current_item'],gate.references_for(debug))
        checked=gate.apply_decision(debug,verdict);results[i]=row(c,checked,verdict)
        with Path(records_path).open('a') as f:f.write(json.dumps({'case_id':c['case_id'],'verification':verdict})+'\n')
        if (i+1)%10==0:print(f'Completed case {i+1}/{len(results)}',flush=True)
    await asyncio.gather(*(run(i,c) for i,c in enumerate(plan['dataset']['cases'])))
    return report(plan,results,baselines)


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('mode',choices=['prepare','run','replay']);p.add_argument('--dataset');p.add_argument('--plan',type=Path,required=True);p.add_argument('--artifact',type=Path);p.add_argument('--records',type=Path);p.add_argument('--output',type=Path);args=p.parse_args()
    if args.mode=='prepare':prepare(args.dataset,args.plan);return
    plan=json.loads(args.plan.read_text())
    if plan['code']!=code_identity():raise ValueError('Code changed after plan freeze')
    if args.output.exists():raise ValueError('Preserve existing result')
    obj=plan['embedding_inputs']
    if args.mode=='run':
        if args.records.exists():raise ValueError('Existing verifier records; replay or explicitly plan a new run')
        if not args.artifact.exists():collect(obj,plan,args.artifact)
        artifact=load_artifact(args.artifact,obj,plan)
        result=asyncio.run(execute(plan,artifact,args.records))
    else:
        artifact=load_artifact(args.artifact,obj,plan);v=artifact['vectors'];dv={r['id']:v[r['key']] for r in obj['documents']};q={r['case_id']:r['key'] for r in obj['queries']}
        saved=[json.loads(l) for l in args.records.read_text().splitlines()];saved_by={r['case_id']:r['verification'] for r in saved}
        if len(saved_by)!=len(saved) or set(saved_by)!={c['case_id'] for c in plan['dataset']['cases']}:raise ValueError('Missing or duplicate verifier records')
        rows=[];base=[]
        for c in plan['dataset']['cases']:
            debug=candidate_debug(c,v[q[c['case_id']]],dv);base.append(row(c,debug));verdict=saved_by[c['case_id']]
            rows.append(row(c,gate.apply_decision(debug,verdict),verdict))
        result=report(plan,rows,base)
    write_new(args.output,result);print(json.dumps({'summaries':result['summaries'],'passed':result['passed']},indent=2))

if __name__=='__main__':main()
