"""Fixed BM25+vector reciprocal-rank fusion, using the existing private vectors."""
import argparse
import json
from pathlib import Path
from .benchmark import fingerprint
from .embeddings import format_chunk_text,VECTOR_MIN_SIMILARITY
from .lexical import BM25Index
from .lexical_benchmark import query_text,summarize
from .retrieval_comparison import experiment_inputs,validate_artifact,vector_rank,result_row,write_json

RRF_K=60


def fuse(lexical_ids,vector_ids):
    scores={}
    for ids in (lexical_ids,vector_ids):
        if len(ids)!=len(set(ids)):raise ValueError('Duplicate candidates in ranking')
        for rank,id in enumerate(ids,1):scores[id]=scores.get(id,0)+1/(RRF_K+rank)
    return sorted(scores.items(),key=lambda pair:(-pair[1],pair[0]))


def run(artifact):
    notes,cases,identity=experiment_inputs();validate_artifact(artifact,identity)
    vectors=artifact['vectors'];docs={row['id']:vectors[row['key']] for row in identity['documents']}
    keys={(q['split'],q['case_id'],q['variant']):q['key'] for q in identity['queries']}
    lexical=BM25Index([(n.id,format_chunk_text(n)) for n in notes]);sets={}
    for split,rows in cases.items():
        sets[split]={}
        for variant in ('question','question_card'):
            results=[]
            for case in rows:
                key=keys[(split,case.case_id,variant)]
                ranked=vector_rank(docs,vectors[key]);scores={r['id']:r['vector_score'] for r in ranked}
                lex=lexical.rank(query_text(case,include_card=variant=='question_card'),limit=10)
                fused=fuse([r.note_id for r in lex],[r['id'] for r in ranked[:10]])
                candidates=[{'id':id,'rrf_score':score,'vector_score':scores[id]} for id,score in fused]
                row=result_row(case,candidates,score_key='vector_score',threshold=VECTOR_MIN_SIMILARITY)
                row['query_sha256']=key;results.append(row)
            sets[split][variant]={'summary':summarize(results,ranking=True),'results':results}
    return {'status':'provider_diagnostic_completed' if artifact['origin']=='openai_provider' else 'synthetic_test_only',
            'configuration':{'rrf_k':RRF_K,'per_source_candidates':10,'selected_candidate_min_cosine':VECTOR_MIN_SIMILARITY},
            'experiment_sha256':fingerprint(identity),'vectors_sha256':artifact['vectors_sha256'],'sets':sets,
            'limits':['Post-baseline exploratory experiment on already-inspected development/challenge cases.',
                      'RRF scores are not confidence; cosine gating is inherited, not tuned for fusion.',
                      'No additional provider calls and no serving changes.']}


def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--artifact',required=True,type=Path);parser.add_argument('--output',required=True,type=Path)
    args=parser.parse_args(argv)
    if args.artifact.resolve()==args.output.resolve():raise ValueError('Artifact and output must differ')
    report=run(json.loads(args.artifact.read_text()));write_json(args.output,report)
    for split,arms in report['sets'].items():
        for arm,result in arms.items():print(split,arm,result['summary'])


if __name__=='__main__':main()
