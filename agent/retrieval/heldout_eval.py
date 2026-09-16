"""Frozen, corpus-aware synthetic holdout. No tuning or threshold sweep.

freeze -> collect -> replay; database-check optionally checks pgvector parity.
Run from agent/: python -m retrieval.heldout_eval --help
"""
from __future__ import annotations
import argparse
from collections import Counter
from datetime import datetime, timezone
import gzip
import hashlib
import json
import math
import os
from pathlib import Path
import random
import time
from unittest.mock import patch

from .benchmark import fingerprint, git_revision
from .embeddings import EMBED_MODEL, EMBED_DIM, VECTOR_MIN_SIMILARITY, format_chunk_text, format_query_from_question
from .hybrid import HYBRID_ALPHA, _META_NORM_CAP, retrieve_for_freeform_question
from .lexical import BM25Index, tokenize
from .loader import load_contrast_docs
from .manifest import manifest_for, valid_vector
from .retrieve import retrieve_contrast_note
from .retrieval_comparison import vector_rank

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT/'agent/knowledge/evaluation/heldout_v1.json'
LOCK = ROOT/'agent/knowledge/evaluation/heldout_v1.lock.json'
PROTOCOL = ROOT/'docs/HELDOUT_PROTOCOL_01.md'
SOURCE_FILES = ['heldout_eval.py','embeddings.py','hybrid.py','lexical.py','tagger.py','retrieve.py','loader.py','manifest.py','db.py','retrieval_comparison.py']
ARMS = ('metadata','bm25','vector','hybrid')
CONFIG = dict(embedding_model=EMBED_MODEL, dimensions=EMBED_DIM, min_cosine=VECTOR_MIN_SIMILARITY,
              hybrid_alpha=HYBRID_ALPHA, metadata_cap=_META_NORM_CAP, candidate_limit=10,
              bm25_k1=1.2,bm25_b=0.75,bm25_min_exclusive=0, bootstrap_seed=73193, bootstrap_samples=2000,
              positive_accuracy_target=0.80, false_positive_rate_target=0.10,
              batch_size=20,max_requests=7,max_input_utf8_bytes=100000)


def read(path): return json.loads(Path(path).read_text())

def write_new(path, obj):
    path=Path(path); path.parent.mkdir(parents=True,exist_ok=True)
    with path.open('x') as f: json.dump(obj,f,indent=2);f.write('\n')


def jaccard(a,b):
    a,b=set(tokenize(a)),set(tokenize(b))
    return len(a&b)/len(a|b) if a|b else 1.0


def validate_dataset(data, notes):
    cases=data['cases']; ids={n.id for n in notes}
    provenance=data.get('provenance',{})
    if provenance.get('evaluation_kind')!='ai_assisted' or not all(provenance.get(k) for k in ('author','model','review','held_out_from','distribution')):
        raise ValueError('Missing AI authorship/label-review provenance')
    if len(cases)!=93 or len({c['case_id'] for c in cases})!=93:
        raise ValueError('Expected 93 distinct case IDs')
    counts=Counter(c['primary_note_id'] for c in cases)
    if counts.pop(None,0)!=31 or set(counts)!=ids or set(counts.values())!={2}:
        raise ValueError('Require two positives per note and 31 negatives')
    for c in cases:
        gold=c['acceptable_note_ids']
        if not c['question'].strip() or not c['label_rationale'].strip() or not c['scenario_group'].strip():
            raise ValueError('Missing query, group or label rationale')
        if len(set(gold))!=len(gold) or set(gold)-ids or bool(gold)!=bool(c['primary_note_id']):
            raise ValueError('Invalid relevance labels')
        if gold and c['primary_note_id'] not in gold: raise ValueError('Primary label must be acceptable')
        if set(c['current_item'])-{'instruction','prompt','answer'}:
            raise ValueError('No authoring IDs or taxonomy shortcuts permitted')
    historical=[]
    for name in ('freeform.json','challenge.json'):
        historical += read(DATA.parent/name)
    audit=[]
    for i,c in enumerate(cases):
        comparisons=[(h['case_id'],jaccard(c['question'],h['question'])) for h in historical]
        comparisons += [(p['case_id'],jaccard(c['question'],p['question'])) for p in cases[:i]]
        closest,score=max(comparisons,key=lambda x:x[1])
        if score>=0.70: raise ValueError(f'Near-duplicate query: {c["case_id"]} / {closest}')
        audit.append(dict(case_id=c['case_id'],closest_case_id=closest,token_jaccard=round(score,4)))
    return dict(cases=len(cases),positives=62,negatives=31,groups=len({c['scenario_group'] for c in cases}),
                buckets=dict(Counter(c['bucket'] for c in cases)),near_duplicate_cutoff=0.70,overlap_audit=audit,
                caveat='Lexical checks do not establish semantic independence; concepts and corpus were visible during authorship.')


def identity():
    notes=load_contrast_docs('en');data=read(DATA); audit=validate_dataset(data,notes)
    texts={};documents=[];queries=[]
    for n in notes:
        text=format_chunk_text(n);key=fingerprint(text);texts[key]=text;documents.append(dict(id=n.id,key=key))
    for c in data['cases']:
        text=format_query_from_question(c['question'],c['current_item']);key=fingerprint(text);texts[key]=text
        queries.append(dict(case_id=c['case_id'],key=key))
    obj=dict(dataset_sha256=fingerprint(data),corpus_manifest=manifest_for(notes),configuration=CONFIG,
             protocol_sha256=hashlib.sha256(PROTOCOL.read_bytes()).hexdigest(),
             source_hashes={f:hashlib.sha256((ROOT/'agent/retrieval'/f).read_bytes()).hexdigest() for f in SOURCE_FILES},
             historical_sha256=fingerprint({f:read(DATA.parent/f) for f in ('freeform.json','challenge.json')}),
             documents=documents,queries=queries,texts=texts)
    return data,notes,obj,audit


def checked():
    data,notes,obj,audit=identity();lock=read(LOCK)
    if lock['identity_sha256']!=fingerprint(obj): raise ValueError('Frozen inputs/code/configuration changed; this is not the preregistered run')
    return data,notes,obj,lock


def collect(obj, lock, path):
    if Path(path).exists(): raise ValueError('Artifact exists; replay instead of recollecting')
    keys=sorted(obj['texts']);requests=math.ceil(len(keys)/CONFIG['batch_size']);size=sum(len(v.encode()) for v in obj['texts'].values())
    if requests>CONFIG['max_requests'] or size>CONFIG['max_input_utf8_bytes']: raise ValueError('Provider budget exceeded')
    from openai import OpenAI
    artifact=dict(origin='openai_provider',identity_sha256=fingerprint(obj),freeze_sha256=fingerprint(lock),
                  model=EMBED_MODEL,dimensions=EMBED_DIM,created_at=datetime.now(timezone.utc).isoformat(),vectors={},batches=[],complete=False)
    with OpenAI(timeout=45,max_retries=0) as client:
        for start in range(0,len(keys),20):
            batch=keys[start:start+20];t=time.monotonic()
            r=client.embeddings.create(model=EMBED_MODEL,dimensions=EMBED_DIM,encoding_format='float',input=[obj['texts'][k] for k in batch])
            entries=sorted(r.data,key=lambda e:e.index)
            if r.model!=EMBED_MODEL or [e.index for e in entries]!=list(range(len(batch))) or not all(valid_vector(e.embedding) for e in entries):
                raise ValueError('Invalid provider response')
            artifact['vectors'].update({k:e.embedding for k,e in zip(batch,entries)})
            artifact['batches'].append(dict(inputs=len(batch),prompt_tokens=r.usage.prompt_tokens,total_tokens=r.usage.total_tokens,elapsed_ms=round(1000*(time.monotonic()-t))))
            print(f'Embedding batch {len(artifact["batches"])}/{requests} complete',flush=True)
            # Persist successful batches, including if a later request fails. Never silently retry.
            Path(path).parent.mkdir(parents=True,exist_ok=True)
            with gzip.open(path,'wt') as f: json.dump(artifact,f)
    artifact['complete']=True;artifact['vectors_sha256']=fingerprint(artifact['vectors'])
    with gzip.open(path,'wt') as f: json.dump(artifact,f)
    return artifact


def load_artifact(path,obj,lock):
    with gzip.open(path,'rt') as f: a=json.load(f)
    if not a.get('complete') or a.get('origin')!='openai_provider' or a.get('identity_sha256')!=fingerprint(obj) or a.get('freeze_sha256')!=fingerprint(lock):
        raise ValueError('Incomplete or incompatible frozen artifact')
    if a.get('model')!=EMBED_MODEL or a.get('dimensions')!=EMBED_DIM or set(a['vectors'])!=set(obj['texts']) or not all(valid_vector(v) for v in a['vectors'].values()):
        raise ValueError('Invalid artifact vectors')
    if a.get('vectors_sha256')!=fingerprint(a['vectors']): raise ValueError('Vector checksum mismatch')
    return a


def wilson(k,n):
    if not n:return None
    z=1.959963984540054;p=k/n;d=1+z*z/n
    centre=(p+z*z/(2*n))/d;half=z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d
    return [max(0,centre-half),min(1,centre+half)]


def metrics(rows):
    pos=[r for r in rows if r['positive']];neg=[r for r in rows if not r['positive']]
    correct=sum(r['correct'] for r in pos);fp=sum(r['selected_note_id'] is not None for r in neg)
    selected=sum(r['selected_note_id'] is not None for r in rows)
    return dict(positive_count=len(pos),negative_count=len(neg),correct_positive=correct,
                acceptable_source_accuracy=correct/len(pos) if pos else None,
                primary_source_accuracy=sum(r['selected_note_id']==r['primary_note_id'] for r in pos)/len(pos) if pos else None,
                positive_wilson95=wilson(correct,len(pos)),false_positives=fp,false_positive_rate=fp/len(neg) if neg else None,
                false_positive_wilson95=wilson(fp,len(neg)),missed_positive=sum(r['selected_note_id'] is None for r in pos),
                wrong_source_positive=sum(r['selected_note_id'] is not None and not r['correct'] for r in pos),
                correct_among_selected=correct/selected if selected else None,
                coverage=selected/len(rows), balanced_accuracy=(correct/len(pos)+1-fp/len(neg))/2 if pos and neg else None,
                recall_at_5=sum(r['gold_rank'] is not None and r['gold_rank']<=5 for r in pos)/len(pos) if pos else None)


def paired_bootstrap(a,b):
    # Resample concept groups for positives and scenario groups for negatives separately.
    paired=[(x,y) for x,y in zip(a,b)]
    groups={True:{},False:{}}
    for x,y in paired: groups[x['positive']].setdefault(x['scenario_group'],[]).append((x,y))
    rng=random.Random(CONFIG['bootstrap_seed']);draws=[]
    for _ in range(CONFIG['bootstrap_samples']):
        rates=[]
        for positive in (True,False):
            values=list(groups[positive].values());sample=[pair for group in rng.choices(values,k=len(values)) for pair in group]
            rates.append(sum(int(x['correct'])-int(y['correct']) for x,y in sample)/len(sample))
        draws.append(sum(rates)/2)
    draws.sort()
    return dict(metric='balanced_accuracy_delta',delta=metrics(a)['balanced_accuracy']-metrics(b)['balanced_accuracy'],
                cluster_bootstrap95=[draws[int(.025*len(draws))],draws[int(.975*len(draws))-1]],
                seed=CONFIG['bootstrap_seed'],resamples=CONFIG['bootstrap_samples'],
                interpretation='Conditional uncertainty for these synthetic scenarios, not population representativeness; shared distractor-card negatives are one cluster; other template correlations may remain.')


def evaluate(data,notes,obj,artifact,lock, *, database=False):
    vectors=artifact['vectors'];dv={d['id']:vectors[d['key']] for d in obj['documents']};qkeys={q['case_id']:q['key'] for q in obj['queries']}
    lexical=BM25Index([(n.id,format_chunk_text(n)) for n in notes]);arms={a:[] for a in ARMS};parity=[]
    if database:
        from .db import read_manifest
        m=read_manifest('en')
        if not m or not m['complete'] or m['fingerprint']!=obj['corpus_manifest']['fingerprint']:raise ValueError('Production index differs from frozen corpus')
    for c in data['cases']:
        vector=vectors[qkeys[c['case_id']]];ranked=vector_rank(dv,vector)[:10]
        with patch('retrieval.hybrid.embed_text',return_value=vector),patch('retrieval.hybrid.query_by_vector',return_value=ranked):
            hybrid=retrieve_for_freeform_question(c['question'],current_item=c['current_item'])
        meta=retrieve_contrast_note(language='en',route='explain',current_item=c['current_item'])
        bm=lexical.rank(obj['texts'][qkeys[c['case_id']]],limit=10)
        candidates={'metadata':[meta['note'].id] if meta['hit'] else [],'bm25':[r.note_id for r in bm],
                    'vector':[r['id'] for r in ranked], 'hybrid':[r['id'] for r in hybrid['top_candidates']]}
        choices={'metadata':meta['note'].id if meta['hit'] else None,'bm25':bm[0].note_id if bm else None,
                 'vector':ranked[0]['id'] if ranked and ranked[0]['vector_score']>=VECTOR_MIN_SIMILARITY else None,
                 'hybrid':hybrid['note'].id if hybrid['hit'] else None}
        for name in ARMS:
            selected=choices[name];gold=c['acceptable_note_ids'];rank=next((i+1 for i,id in enumerate(candidates[name]) if id in gold),None)
            arms[name].append(dict(case_id=c['case_id'],scenario_group=c['scenario_group'],bucket=c['bucket'],positive=bool(gold),primary_note_id=c['primary_note_id'],acceptable_note_ids=gold,selected_note_id=selected,correct=selected in gold if gold else selected is None,gold_rank=rank,candidates=candidates[name][:5]))
        if database:
            with patch('retrieval.hybrid.embed_text',return_value=vector): live=retrieve_for_freeform_question(c['question'],current_item=c['current_item'])
            if live['reason'] not in ('matched','freeform_below_threshold'): raise ValueError(f'Infrastructure error at {c["case_id"]}: {live["reason"]}')
            live_id=live['note'].id if live['hit'] else None
            parity.append(dict(case_id=c['case_id'],offline=choices['hybrid'],database=live_id,match=live_id==choices['hybrid']))
    summary={a:metrics(rows) for a,rows in arms.items()};h=summary['hybrid']
    return dict(schema_version=1,status='frozen_synthetic_holdout_completed',created_at=datetime.now(timezone.utc).isoformat(),git_revision=git_revision(),
                identity_sha256=fingerprint(obj),freeze_sha256=fingerprint(lock),vectors_sha256=artifact['vectors_sha256'],configuration=CONFIG,
                provider_requests=len(artifact['batches']),embedding_tokens=sum(b['total_tokens'] for b in artifact['batches']),
                summaries=summary,paired_comparisons={f'hybrid_minus_{a}':paired_bootstrap(arms['hybrid'],arms[a]) for a in ARMS if a!='hybrid'},
                slices={a:{bucket:metrics([r for r in rows if r['bucket']==bucket]) for bucket in sorted({r['bucket'] for r in rows})} for a,rows in arms.items()},
                acceptance=dict(passed=h['acceptable_source_accuracy']>=.80 and h['false_positive_rate']<=.10,min_positive=.80,max_negative_fp=.10,note='Predeclared project targets, not universal standards; do not retune on this holdout.'),
                results=arms,database_parity=parity,
                limitations=['AI-authored and corpus-aware; not independent human or real-user evaluation.',
                  'Held out from parameter selection and execution only; concepts and source documents are not held out.',
                  'Multi-source relevance labels are fallible; strict primary-source accuracy is also reported.',
                  'No generated answers, learner outcomes or deployed HTTP latency measured.',
                  'Exact cosine replay isolates retrieval; database-check reuses query embeddings and does not test embedding service or generation.',
                  'Intervals are descriptive for this small designed sample; negative templates share structure.'])


def main(argv=None):
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('mode',choices=['freeze','collect','replay','database-check']);p.add_argument('--artifact',type=Path);p.add_argument('--output',type=Path)
    args=p.parse_args(argv)
    if args.mode=='freeze':
        data,notes,obj,audit=identity()
        lock=dict(frozen_at=datetime.now(timezone.utc).isoformat(),parent_git_revision=git_revision(),identity_sha256=fingerprint(obj),identity=obj,audit=audit,
                  note='Commit this freeze before collection. Hashes detect drift; Git history establishes ordering, not independent authorship.')
        write_new(LOCK,lock);print(json.dumps({'identity_sha256':lock['identity_sha256'],'cases':audit['cases'],'buckets':audit['buckets']}));return
    if not args.artifact or not args.output: p.error('--artifact and --output are required')
    if args.output.exists(): raise ValueError('Output already exists; choose a new path, preserve prior results')
    data,notes,obj,lock=checked()
    if args.mode=='collect':collect(obj,lock,args.artifact)
    a=load_artifact(args.artifact,obj,lock)
    report=evaluate(data,notes,obj,a,lock,database=args.mode=='database-check');write_new(args.output,report)
    print(json.dumps({'summaries':report['summaries'],'acceptance':report['acceptance'],'database_matches':sum(r['match'] for r in report['database_parity'])},indent=2))

if __name__=='__main__': main()
