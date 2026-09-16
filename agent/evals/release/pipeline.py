"""Sequential offline adapters around the real study-assist handler.

Live, read-only pgvector plus bounded provider calls. Baseline context injection is
benchmark-only. Do not use process-wide patching in a concurrent server.
"""
import importlib
from types import SimpleNamespace
from unittest.mock import patch
from contextlib import nullcontext, ExitStack
from fastapi import HTTPException
from retrieval import hybrid
from study_assist import source_policy as evidence_gate
from retrieval.db import query_by_vector
from retrieval.loader import load_contrast_docs
from retrieval.embeddings import EMBED_MODEL, EMBED_DIM
from study_assist.schemas import StudyAssistRequest, StudyItem
from evals.rag.telemetry import span, openai_usage
from evals.rag.metrics import ranking

GENERATION_MODEL = 'gpt-4o-mini-2024-07-18'
ARMS = ('card_only','full_corpus','hybrid','verified')
router = importlib.import_module('study_assist.router')


def empty_debug():
    return {'hit':False,'note':None,'score':0,'matched_tags':[], 'safe_examples':[],
            'reason':'not_covered','latency_ms':0,'top_candidates':[]}


async def run_pipeline(case, arm):
    if arm not in ARMS:
        raise ValueError('Unknown arm')
    spans = []; contexts = []; seen = {}; embedding_vectors = []
    docs = load_contrast_docs('en')
    original_block = router._build_retrieval_block

    def embed(text):
        from openai import OpenAI
        try:
            with span(spans, 'embedding', EMBED_MODEL) as s:
                with OpenAI(timeout=12, max_retries=0) as client:
                    response = client.embeddings.create(model=EMBED_MODEL, input=[text], dimensions=EMBED_DIM)
                s['usage'] = openai_usage(response.usage)
                if len(response.data) != 1 or len(response.data[0].embedding) != EMBED_DIM:
                    raise ValueError('Invalid embedding response')
                vector = response.data[0].embedding
                embedding_vectors.append(vector)
                return vector
        except Exception:
            return None

    def query(*args, **kwargs):
        with span(spans, 'database'):
            return query_by_vector(*args, **kwargs)

    async def retrieve(question, *, language, current_item):
        debug = empty_debug()
        if arm in ('hybrid','verified'):
            with span(spans, 'retrieval'):
                # Sequential by design; sync database reads have their own timeouts.
                debug = hybrid.retrieve_for_freeform_question(question, language=language, current_item=current_item)
                seen['raw_selected_source_ids']=[debug['note'].id] if debug.get('note') else []
                if arm == 'verified' and debug['reason'] in ('matched','freeform_below_threshold'):
                    verdict = await evidence_gate.verify_evidence(question,current_item,evidence_gate.references_for(debug))
                    spans.append({'stage':'verification','model':evidence_gate.MODEL,'status':'ok' if verdict['decision']!='verification_unavailable' else 'error',
                        'elapsed_ms':verdict['elapsed_ms'],
                        'usage':{'input_tokens':verdict['input_tokens'],'output_tokens':verdict['output_tokens'],'cached_input_tokens':verdict.get('cached_input_tokens')} if 'input_tokens' in verdict else None})
                    seen['verification'] = verdict
                    debug = evidence_gate.apply_decision(debug, verdict)
        seen['debug'] = debug
        return debug

    def context_block(note, examples):
        selected = docs if arm == 'full_corpus' else ([note] if note else [])
        blocks = []
        for n in selected:
            block = original_block(n, n.examples[:2] if arm == 'full_corpus' else examples)
            contexts.append({'id':n.id,'text':block})
            blocks.append(block)
        return '\n'.join(blocks)

    class MeasuredLLM:
        async def ainvoke(self, messages):
            from openai import AsyncOpenAI
            with span(spans, 'generation', GENERATION_MODEL) as s:
                payload = [{'role':'system' if m.type=='system' else 'user','content':m.content} for m in messages]
                if sum(len(m['content'].encode()) for m in payload)>90000:
                    raise ValueError('Generation input budget exceeded')
                async with AsyncOpenAI(timeout=18,max_retries=0) as client:
                    response = await client.chat.completions.create(model=GENERATION_MODEL,temperature=.2,max_tokens=500,messages=payload)
                s['usage'] = openai_usage(response.usage)
                if response.model!=GENERATION_MODEL or response.choices[0].finish_reason!='stop' or not response.choices[0].message.content:
                    raise ValueError('Incomplete generation')
                return SimpleNamespace(content=response.choices[0].message.content)

    req = StudyAssistRequest(action='freeform_help',model='openai/'+GENERATION_MODEL,language='en',
        current_item=StudyItem(**case['current_item']),question=case['question'],request_id='offline-'+case['case_id']+'-'+arm)
    result = {'case':case,'arm':arm,'status':'error','answer':None,'spans':spans,'contexts':contexts}
    try:
        with ExitStack() as stack:
            stack.enter_context(patch.object(router,'retrieve_for_freeform_question',retrieve))
            stack.enter_context(patch.object(router,'_build_retrieval_block',context_block))
            stack.enter_context(patch.object(router,'get_llm',return_value=MeasuredLLM()))
            stack.enter_context(patch.object(router,'tutor_retrieval_trace',return_value=nullcontext(SimpleNamespace(record=lambda **kw:None))))
            stack.enter_context(patch.object(hybrid,'embed_text',embed))
            stack.enter_context(patch.object(hybrid,'query_by_vector',query))
            with span(spans, 'pipeline_total'):
                response = await router.study_assist(req)
            result.update(status='ok',answer=response.assistant_message)
    except Exception as exc:
        result['error_type'] = type(exc).__name__
        if isinstance(exc,HTTPException):result['http_status']=exc.status_code
    debug=seen.get('debug',empty_debug())
    reason=debug['reason']
    result.update(selected_source_ids=[debug['note'].id] if debug['note'] else [],
        ranked_candidates=debug.get('top_candidates',[]),routing_reason=reason,
        retrieval_status='error' if reason in ('verification_unavailable','embeddings_unavailable','db_unavailable') or str(reason).startswith('index_') else 'ok',
        ranking=ranking([c['id'] for c in debug.get('top_candidates',[])],case['acceptable_note_ids']),
        verification=seen.get('verification'),query_vectors=embedding_vectors,raw_selected_source_ids=seen.get('raw_selected_source_ids',[]))
    return result
