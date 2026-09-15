"""Validate evaluation provenance and freeze a grouped 120/120 evaluation split.

Author and AI-assisted evaluation are supported. No external reviewer is required.
"""
from __future__ import annotations
import argparse
from collections import defaultdict
from datetime import datetime,timezone
import json
from pathlib import Path
import random
import re
from .benchmark import fingerprint
from .eval_cases_freeform import all_freeform_cases
from .loader import load_contrast_docs
from .retrieval_comparison import write_json


def words(question):return set(re.findall(r'\w+',question.casefold()))


def freeze(cases, *, seed=20260915):
    if len(cases)!=240:raise ValueError('Require exactly 240 reviewed cases: 160 positive, 80 negative')
    known_notes={n.id for n in load_contrast_docs('en')}
    known_cases=all_freeform_cases()+all_freeform_cases(challenge=True)
    known_ids={c.case_id for c in known_cases}
    known_questions=[words(c.question) for c in known_cases]
    ids=set();groups=defaultdict(list);seen=[]
    for case in cases:
        for key in ('case_id','scenario_group','question','author_id'):
            if not isinstance(case.get(key),str) or not case[key].strip():raise ValueError('Missing '+key)
        if case['case_id'] in ids or case['case_id'] in known_ids:raise ValueError('Duplicate or previously evaluated case ID')
        ids.add(case['case_id'])
        if case.get('origin') not in {'independent_author','project_author','ai_assisted','consented_learner_question'}:raise ValueError('Explicit intake origin required')
        labels=case.get('expected_note_ids')
        if not isinstance(labels,list) or not all(isinstance(id,str) for id in labels) or len(labels)!=len(set(labels)) or not set(labels)<=known_notes:
            raise ValueError('Invalid multi-relevance labels')
        if not isinstance(case.get('current_item'),dict):raise ValueError('current_item must be an object')
        reviewers=case.get('reviews',[])
        if not reviewers:raise ValueError('At least one documented evaluation required')
        reviewer_ids=[review.get('reviewer_id') for review in reviewers]
        if any(not isinstance(id,str) or not id.strip() for id in reviewer_ids) or len(set(reviewer_ids))!=len(reviewer_ids):
            raise ValueError('Evaluation identities must be nonempty and unique')
        for review in reviewers:
            if review.get('evaluation_kind') not in {'author','ai_assisted'}:
                raise ValueError('Declare evaluation_kind as author or ai_assisted')
            if review['evaluation_kind']=='ai_assisted' and not str(review.get('model','')).strip():
                raise ValueError('AI-assisted evaluation requires a model identifier')
            if review.get('approved') is not True or not review.get('rationale') or set(review.get('relevant_note_ids',[]))!=set(labels):
                raise ValueError('Resolve label disagreement and document rationale before freezing')
        tokens=words(case['question'])
        if len(tokens)<2:raise ValueError('Question is too short for intake review')
        def similar(other):return len(tokens & other)/len(tokens | other)>=0.8
        if any(similar(other) for other in known_questions):raise ValueError('Question overlaps an already-inspected development/challenge question')
        if any(group!=case['scenario_group'] and similar(other) for group,other in seen):raise ValueError('Near-duplicate questions must share one scenario group')
        seen.append((case['scenario_group'],tokens));groups[case['scenario_group']].append(case)
    if sum(bool(c['expected_note_ids']) for c in cases)!=160:raise ValueError('Require 160 positives and 80 negatives')
    # Two-dimensional group subset selection: never split a scenario across sets.
    ordered=sorted(groups);random.Random(seed).shuffle(ordered)
    reachable={(0,0):()}
    for group in ordered:
        positive=sum(bool(c['expected_note_ids']) for c in groups[group]);negative=len(groups[group])-positive
        for (p,n),chosen in list(reachable.items()):
            state=(p+positive,n+negative)
            if state[0]<=80 and state[1]<=40:reachable.setdefault(state,chosen+(group,))
    if (80,40) not in reachable:raise ValueError('Cannot form 80/40 splits without breaking scenario groups')
    test_groups=set(reachable[(80,40)])
    result={name:sorted([c for g,rows in groups.items() if (g in test_groups)==(name=='test') for c in rows],key=lambda c:c['case_id']) for name in ('development','test')}
    return {'schema_version':1,'status':'evaluation_provenance_validated_split_frozen','created_at_utc':datetime.now(timezone.utc).isoformat(),
            'seed':seed,'input_sha256':fingerprint(sorted(cases,key=lambda c:c['case_id'])),
            'split_sha256':{name:fingerprint(rows) for name,rows in result.items()},
            'limits':['Author/AI-assisted labels are developmental evidence, not independent expert validation.',
                      'Lexical similarity screening cannot detect all paraphrase leakage.',
                      'Test data remains held out only if not inspected or used for tuning after freeze.'], 'splits':result}


def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input',required=True,type=Path);parser.add_argument('--output',required=True,type=Path)
    args=parser.parse_args(argv)
    if args.output.exists():raise SystemExit('Refusing to overwrite a frozen split')
    result=freeze(json.loads(args.input.read_text()))
    write_json(args.output,result)
    print('Frozen 120 development / 120 test; evaluation provenance validated; no independent validation implied.')


if __name__=='__main__':main()
