"""Freeze/run/replay candidate-only development routing with cached top-five notes."""
import argparse
import asyncio
import json
from pathlib import Path
from . import policy
from .runner import identity
from evals.rag.runner import write_new
from retrieval.benchmark import fingerprint,git_revision


def summary(plan,rows):
    expected={r['case']['case_id']:r for r in plan['cases']}
    if len(rows)!=len(expected) or {r['case_id'] for r in rows}!=set(expected):raise ValueError('Missing/duplicate rows')
    counts={'requests':len(rows),'errors':0,'correct_sources':0,'selected_sources':0,'positive_cases':0,'negative_cases':0,'false_retrievals':0,'answerable_cases':0,'wrong_clarifications':0,'missing_context_cases':0,'correct_clarifications':0,'out_of_scope_cases':0,'correct_redirects':0}
    for row in rows:
        c=expected[row['case_id']]['case'];v=row['verdict'];gold=c['acceptable_note_ids'];behavior=c['expected_behavior']
        if v['decision']!='verification_unavailable':
            rebuilt=policy.decode({'task_summary':v['rationale'],'context_status':v['routing']['context_status'],
                'missing_reference':v['routing']['missing_reference'],'task_kind':v['routing']['task_kind'],
                'evidence_reason':v['evidence_reason'],'evidence_id':v['evidence_id']},policy.evidence_units(expected[row['case_id']]['references']),c['question'],c['current_item'])
            if any(rebuilt[k]!=v[k] for k in ('decision','source_id','support_quote')):raise ValueError('Inconsistent saved routing verdict')
        counts['errors']+=v['decision']=='verification_unavailable'
        counts['positive_cases']+=bool(gold);counts['negative_cases']+=not gold
        counts['selected_sources']+=bool(v['source_id']);counts['correct_sources']+=v['source_id'] in gold
        counts['false_retrievals']+=not gold and bool(v['source_id'])
        counts['answerable_cases']+=behavior in ('answer','answer_with_disclosure')
        counts['wrong_clarifications']+=behavior in ('answer','answer_with_disclosure') and v['decision']=='needs_context'
        counts['missing_context_cases']+=behavior=='clarify';counts['correct_clarifications']+=behavior=='clarify' and v['decision']=='needs_context'
        counts['out_of_scope_cases']+=behavior=='redirect';counts['correct_redirects']+=behavior=='redirect' and v['decision']=='out_of_scope'
    # Retain all expected cases in denominators; a provider failure never passes an abstention check.
    counts['pass']=counts['errors']==0 and counts['wrong_clarifications']==0 and counts['correct_sources']==counts['positive_cases'] and counts['false_retrievals']==0 and counts['correct_clarifications']==counts['missing_context_cases'] and counts['correct_redirects']==counts['out_of_scope_cases']
    return {'plan_sha256':fingerprint(plan),'counts':counts,'release_authorized':False,'limitation':'Exposed development cases and cached retrieval, not held-out or end-to-end latency evidence.'}


async def execute(plan,path):
    rows=[]
    with path.open('x') as f:
        for item in plan['cases']:
            c=item['case'];v=await policy.verify_evidence(c['question'],c['current_item'],item['references'])
            row={'plan_sha256':fingerprint(plan),'case_id':c['case_id'],'verdict':v};rows.append(row)
            f.write(json.dumps(row)+'\n');f.flush();print(c['case_id'],v['decision'],v.get('source_id'),flush=True)
    return summary(plan,rows)


def main():
    p=argparse.ArgumentParser();p.add_argument('mode',choices=['freeze','run','replay']);p.add_argument('--plan',type=Path,required=True);p.add_argument('--records',type=Path);p.add_argument('--output',type=Path);a=p.parse_args()
    if a.mode=='freeze':
        old=[json.loads(s) for s in Path('runs/routing-answer-dev-v2-records.jsonl').read_text().splitlines()]
        cases=[{'case':r['case'],'references':policy.references_for({'top_candidates':r['ranked_candidates']})} for r in old if r['arm']=='candidate']
        write_new(a.plan,{'kind':'context_sufficiency_development_probe','code':identity(),'git_revision':git_revision(),'cases':cases,'max_provider_calls':len(cases),'model':policy.MODEL,'targets':'No errors, wrong clarification or false references; all positive sources and required blocked routes correct.'});return
    plan=json.loads(a.plan.read_text())
    if plan['code']!=identity():raise ValueError('Frozen source changed')
    if a.output.exists():raise ValueError('Preserve results')
    if a.mode=='run':result=asyncio.run(execute(plan,a.records))
    else:
        rows=[json.loads(s) for s in a.records.read_text().splitlines()]
        if any(r['plan_sha256']!=fingerprint(plan) for r in rows):raise ValueError('Wrong run identity')
        result=summary(plan,rows)
    write_new(a.output,result);print(json.dumps(result))

if __name__=='__main__':main()
