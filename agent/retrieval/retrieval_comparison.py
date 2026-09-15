"""Paired metadata/BM25/exact-vector/hybrid experiment; never changes serving.

Modes: plan (offline), collect (bounded provider calls), replay (offline artifact).
"""
from __future__ import annotations
import argparse
from dataclasses import asdict
from datetime import datetime, timezone
import json
from importlib.metadata import version
import math
import os
from pathlib import Path
import time

from .benchmark import fingerprint, source_fingerprint, git_revision
from .embeddings import EMBED_MODEL, EMBED_DIM, format_chunk_text, VECTOR_MIN_SIMILARITY
from .eval_cases_freeform import all_freeform_cases
from .eval_runner import evaluate_freeform_case_metadata
from .hybrid import _rerank_candidates, HYBRID_ALPHA, _META_NORM_CAP
from .lexical import BM25Index
from .lexical_benchmark import query_text, summarize
from .loader import load_contrast_docs
from .manifest import manifest_for, valid_vector
from .tagger import infer_contrast_tags
from .validate_corpus import validate_corpus

BATCH_SIZE = 20
THRESHOLDS = (0.2, 0.3, 0.4, 0.5, 0.6)


def experiment_inputs():
    validation = validate_corpus()
    if validation['errors']:
        raise ValueError('Invalid data bundle')
    load_contrast_docs.cache_clear()
    notes = load_contrast_docs('en')
    cases = {'development': all_freeform_cases(), 'challenge': all_freeform_cases(challenge=True)}
    texts = {}
    def key(text):
        identity = fingerprint(text)
        texts[identity] = text
        return identity
    documents = [{'id': n.id, 'key': key(format_chunk_text(n))} for n in notes]
    queries = [{'split': split, 'case_id': c.case_id, 'variant': variant,
                'key': key(query_text(c, include_card=variant == 'question_card'))}
               for split, rows in cases.items() for c in rows for variant in ('question', 'question_card')]
    identity = {'manifest': manifest_for(notes), 'bundle_sha256': validation['bundle_sha256'],
                'cases_sha256': fingerprint({k: [asdict(c) for c in v] for k,v in cases.items()}),
                'documents': documents, 'queries': queries, 'texts': texts}
    return notes, cases, identity


def preflight(identity, *, max_requests=10, max_utf8_bytes=100000):
    lengths = [len(text.encode('utf-8')) for text in identity['texts'].values()]
    requests = math.ceil(len(lengths) / BATCH_SIZE)
    if max_requests < 1 or max_utf8_bytes < 1:
        raise ValueError('Budgets must be positive')
    if not lengths or any(size == 0 or size > 8000 for size in lengths):
        raise ValueError('Embedding input outside the 1..8000 UTF-8 byte budget')
    if requests > max_requests or sum(lengths) > max_utf8_bytes:
        raise ValueError('Experiment exceeds request/input budget')
    return {'status': 'planned_not_run', 'experiment_sha256': fingerprint(identity),
            'model': EMBED_MODEL, 'dimensions': EMBED_DIM, 'documents': len(identity['documents']),
            'cases': len(identity['queries']) // 2, 'query_variants': 2,
            'unique_inputs': len(lengths), 'max_input_utf8_bytes': max(lengths),
            'total_utf8_bytes': sum(lengths), 'planned_requests': requests,
            'budgets': {'max_requests': max_requests, 'max_utf8_bytes': max_utf8_bytes, 'batch_size': BATCH_SIZE},
            'note': 'UTF-8 bytes are a conservative input-token upper bound, not a billed token count or dollar estimate. No provider calls in plan mode.'}


def collect(identity, *, max_requests=10, max_utf8_bytes=100000):
    plan = preflight(identity, max_requests=max_requests, max_utf8_bytes=max_utf8_bytes)
    if not os.getenv('OPENAI_API_KEY'):
        raise ValueError('OPENAI_API_KEY is not configured; provider experiment was not run')
    from openai import OpenAI
    # No automatic retries: the planned request count bounds attempted requests.
    client = OpenAI(max_retries=0, timeout=45.0)
    keys = sorted(identity['texts'])
    vectors, batches = {}, []
    try:
        for start in range(0, len(keys), BATCH_SIZE):
            batch = keys[start:start+BATCH_SIZE]
            started = time.monotonic()
            response = client.embeddings.create(model=EMBED_MODEL, dimensions=EMBED_DIM,
                encoding_format='float', input=[identity['texts'][k] for k in batch])
            ordered = sorted(response.data, key=lambda entry: entry.index)
            if response.model != EMBED_MODEL or [entry.index for entry in ordered] != list(range(len(batch))):
                raise ValueError('Provider returned incompatible model or misaligned inputs')
            if not all(valid_vector(entry.embedding) for entry in ordered):
                raise ValueError('Provider returned invalid vectors')
            vectors.update({k: entry.embedding for k, entry in zip(batch, ordered)})
            batches.append({'inputs': len(batch), 'elapsed_ms': round((time.monotonic()-started)*1000),
                            'prompt_tokens': response.usage.prompt_tokens, 'total_tokens': response.usage.total_tokens,
                            'request_id': getattr(response, '_request_id', None)})
            print(f'Embedding batch {len(batches)}/{plan["planned_requests"]} complete', flush=True)
    finally:
        client.close()
    return {'schema_version': 1, 'origin': 'openai_provider', 'created_at_utc': datetime.now(timezone.utc).isoformat(),
            'experiment_sha256': fingerprint(identity), 'model': EMBED_MODEL, 'dimensions': EMBED_DIM,
            'vectors': vectors, 'vectors_sha256': fingerprint(vectors), 'batches': batches, 'preflight': plan, 'sdk_version': version('openai')}


def validate_artifact(artifact, identity):
    if artifact.get('schema_version') != 1 or artifact.get('origin') not in {'openai_provider', 'synthetic_test'}:
        raise ValueError('Unknown vector artifact schema/origin')
    if artifact.get('experiment_sha256') != fingerprint(identity) or artifact.get('model') != EMBED_MODEL or artifact.get('dimensions') != EMBED_DIM:
        raise ValueError('Artifact does not match current corpus, queries, or embedding configuration')
    vectors = artifact.get('vectors', {})
    if set(vectors) != set(identity['texts']) or not all(valid_vector(v) for v in vectors.values()):
        raise ValueError('Artifact has missing, unexpected, or invalid vectors')
    if artifact.get('vectors_sha256') != fingerprint(vectors):
        raise ValueError('Vector artifact checksum mismatch')


def normalized(vector):
    norm = math.hypot(*vector)
    if not math.isfinite(norm) or norm == 0:
        raise ValueError('Vector norm is invalid')
    return [v/norm for v in vector]


def vector_rank(documents, query):
    q = normalized(query)
    scores = [{'id': id, 'vector_score': max(-1.0, min(1.0, sum(a*b for a,b in zip(q, normalized(vector)))))}
              for id, vector in documents.items()]
    return sorted(scores, key=lambda row: (-row['vector_score'], row['id']))


def result_row(case, candidates, *, score_key, threshold, inclusive=True):
    top = candidates[:5]
    ids = [row['id'] for row in top]
    eligible = bool(top) and (top[0][score_key] >= threshold if inclusive else top[0][score_key] > threshold)
    return {'case_id': case.case_id, 'question': case.question, 'expected_note_id': case.expected_note_id,
            'selected_note_id': ids[0] if eligible else None,
            'gold_rank': ids.index(case.expected_note_id)+1 if case.expected_note_id in ids else None,
            'candidates': top}


def compare(notes, cases, identity, artifact):
    validate_artifact(artifact, identity)
    if not math.isfinite(HYBRID_ALPHA) or not 0 <= HYBRID_ALPHA <= 1:
        raise ValueError('Invalid hybrid weight')
    vectors = artifact['vectors']
    docs = {n.id: n for n in notes}
    document_vectors = {row['id']: vectors[row['key']] for row in identity['documents']}
    query_keys = {(row['split'],row['case_id'],row['variant']): row['key'] for row in identity['queries']}
    lexical = BM25Index([(n.id, format_chunk_text(n)) for n in notes])
    sets = {}
    for split, rows in cases.items():
        arms = {'metadata': {'results': []}}
        for case in rows:
            metadata = evaluate_freeform_case_metadata(case)
            arms['metadata']['results'].append({'case_id': case.case_id,'expected_note_id': case.expected_note_id,'selected_note_id': metadata.selected_note_id})
            for variant in ('question', 'question_card'):
                key = query_keys[(split,case.case_id,variant)]
                query = identity['texts'][key]
                ranked = vector_rank(document_vectors, vectors[key])[:10]
                item = case.current_item if variant == 'question_card' else {}
                hybrid = _rerank_candidates(ranked, docs, query_tags=infer_contrast_tags(item),
                    item_id=str(item.get('id') or ''), item_type=str(item.get('type') or '').lower(),
                    category=str(item.get('category') or '').lower(), topic=str(item.get('topic') or '').lower(), route='explain')
                hybrid_rows = [{'id': row['doc'].id, 'vector_score': row['vector_score'], 'meta_score': row['meta_score'],
                                'combined_score': row['combined_score']} for row in hybrid]
                lexical_rows = [{'id': row.note_id, 'bm25_score': row.score, 'matched_terms': row.matched_terms} for row in lexical.rank(query)]
                for method, candidates, score_key, threshold in (
                    ('bm25', lexical_rows, 'bm25_score', 0),
                    ('vector', ranked, 'vector_score', VECTOR_MIN_SIMILARITY),
                    ('hybrid', hybrid_rows, 'vector_score', VECTOR_MIN_SIMILARITY)):
                    name = method+'_'+variant
                    row = result_row(case, candidates, score_key=score_key, threshold=threshold, inclusive=method != 'bm25')
                    row['query_sha256'] = key
                    if method in {'vector','hybrid'}:
                        row['vector_candidate_gold_rank'] = next((i+1 for i,c in enumerate(ranked) if c['id']==case.expected_note_id), None)
                    arms.setdefault(name, {'results': []})['results'].append(row)
        for name, arm in arms.items():
            arm['summary'] = summarize(arm['results'], ranking=name != 'metadata')
            if name.startswith(('vector_', 'hybrid_')):
                positives = [row for row in arm['results'] if row['expected_note_id'] is not None]
                arm['summary']['vector_candidate_recall_at_10'] = sum(row['vector_candidate_gold_rank'] is not None for row in positives) / len(positives) if positives else None
                sensitivity=[]
                for threshold in THRESHOLDS:
                    adjusted=[{**row, 'selected_note_id': row['candidates'][0]['id'] if row['candidates'] and row['candidates'][0]['vector_score'] >= threshold else None} for row in arm['results']]
                    sensitivity.append({'min_vector_score': threshold,'summary': summarize(adjusted, ranking=False)})
                arm['threshold_sensitivity'] = sensitivity
        sets[split] = arms
    return {'status': 'provider_diagnostic_completed' if artifact['origin']=='openai_provider' else 'synthetic_test_only',
            'quality_gate': False, 'provenance': {'experiment_sha256': fingerprint(identity), 'vector_sha256': artifact['vectors_sha256'],
            'bundle_sha256': identity['bundle_sha256'], 'cases_sha256': identity['cases_sha256'],
            'vector_origin': artifact['origin'], 'vector_created_at_utc': artifact.get('created_at_utc'), 'source_sha256': source_fingerprint(), 'git_revision': git_revision()},
            'configuration': {'embedding_model': artifact['model'], 'embedding_dimensions': artifact['dimensions'],
            'embedding_sdk_version': artifact.get('sdk_version'), 'corpus_manifest': identity['manifest'], 'search': 'exact in-memory cosine; no database calls', 'candidate_limit':10,'reported_ranks':5,
            'hybrid_alpha':HYBRID_ALPHA,'metadata_normalization_cap':_META_NORM_CAP,'vector_min_score':VECTOR_MIN_SIMILARITY,
            'query_format':'identical raw query_text() inputs for BM25/vector; hybrid uses card metadata only in question_card variant'},
            'provider_batches':artifact.get('batches',[]), 'sets':sets,
            'limitations':['Corpus-aware development/challenge labels; not held out or independently reviewed.',
                'Exact cosine isolates ranking policy; this is not a pgvector end-to-end latency benchmark.',
                'Synthetic-test vectors cannot establish semantic retrieval quality.',
                'Artifact origin is recorded metadata, not cryptographic proof of provider authorship.',
                'No generated-answer quality, user outcomes, or production latency measured.']}


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix+'.tmp')
    temporary.write_text(json.dumps(value, indent=2)+'\n')
    temporary.replace(path)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=['plan','collect','replay'])
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--artifact', type=Path)
    parser.add_argument('--max-requests', type=int, default=10)
    parser.add_argument('--max-input-bytes', type=int, default=100000)
    args=parser.parse_args(argv)
    try:
        if args.artifact and args.artifact.resolve() == args.output.resolve():
            raise ValueError('Artifact and report paths must differ')
        if args.mode != 'plan' and args.artifact is None:
            raise ValueError('--artifact is required for collect/replay')
        notes,cases,identity=experiment_inputs()
        if args.mode=='plan':
            report=preflight(identity,max_requests=args.max_requests,max_utf8_bytes=args.max_input_bytes)
        else:
            if args.mode=='collect':
                if args.artifact.exists():
                    raise ValueError('Artifact exists; use replay or choose a new path')
                artifact=collect(identity,max_requests=args.max_requests,max_utf8_bytes=args.max_input_bytes)
                # Only complete batches are persisted; protect against source edits during requests.
                if experiment_inputs()[2] != identity:
                    raise ValueError('Corpus/queries changed during collection; no artifact published')
                write_json(args.artifact,artifact)
            else:
                artifact=json.loads(args.artifact.read_text())
            report=compare(notes,cases,identity,artifact)
        write_json(args.output,report)
        print(report['status']+'; '+str(args.output))
        return 0
    except Exception as exc:
        # SDK exception strings may contain request details; do not copy them into public artifacts.
        message = str(exc) if isinstance(exc, (ValueError, FileNotFoundError)) else type(exc).__name__
        if not args.artifact or args.artifact.resolve() != args.output.resolve():
            write_json(args.output,{'status':'invalid_not_evaluated','error':message})
        print('Experiment not evaluated: '+message)
        return 2


if __name__=='__main__':
    raise SystemExit(main())
