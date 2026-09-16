# Three-layer answer evaluation protocol

## Purpose and scope

Measure whether an English learner receives a correct, useful answer with justified reference support, appropriate scope handling, and visible latency/cost. This is an offline evaluation feature on an unmerged branch. It does not deploy a model, add a production judge, or change runtime telemetry. No human-review workflow is introduced.

## Frozen pilot

Twelve public synthetic questions reused from exposed retrieval v3: six supported grammar/meaning-preservation tasks, two uncovered English rules, two missing-context requests, and two out-of-scope requests. Reference answers, required facts, expected behavior, learner level and reference URLs are written before generation. This is a frozen answer pilot, **not a new retrieval holdout**, expert ground truth, or a representative user distribution. Learner levels are task assumptions, not certified CEFR alignment. Larger scenario-diverse answer tests remain future work.

Four arms share the actual `study_assist` handler's teaching policy and prompt:

- `card_only`: no retrieved reference (the pilot's cards are empty, so this is a no-reference baseline).
- `full_corpus`: all 31 notes injected through a benchmark-only context adapter. This tests answer quality and token overhead, not a deployed full-corpus endpoint or source-selection UI.
- `hybrid`: existing question-aware hybrid retrieval, without verification.
- `verified`: current serving verifier (`gpt-4o-mini-2024-07-18`), not the separate GPT-4.1 mini recall experiment.

Generator: pinned `gpt-4o-mini-2024-07-18`, temperature 0.2, 500 output-token cap. The serving handler and prompts are reused, but provider retries are disabled and timeouts/output caps are bounded for the experiment. Live query embeddings and read-only pgvector requests are used; no index writes. Sequential execution, rotated arm order. Up to 132 provider requests for the pilot (24 embeddings, 12 verifier calls, 48 generations and 48 judges); routing/failure may skip calls. Four additional authored judge smoke checks run separately. No automatic retries or overwriting artifacts.

Freeze hashes include dataset, all evaluation/retrieval/handler source, corpus manifest, models, prices, budgets and package versions. Preserve the plan and commit it before executing. Save every request outcome, answer, exact supplied context, candidate list, query vector, judge verdict, stage timing and available usage. Only public synthetic data is accepted by this runner. No live learner history is collected.

## Retrieval metrics

Standard Recall@K = relevant documents in top K / all annotated relevant documents, macro-averaged over positive queries. Hit@K = whether at least one acceptable document appears. Report both at K=1,3,5, plus MRR@5. This distinction matters when several notes are acceptable alternatives: Hit@K often better matches a tutor needing one sufficient note. Previous reports' any-acceptable-note Recall@5 is a hit-rate definition; preserve their results and disclose the terminology instead of silently changing them.

Also report selected-source precision/recall, negative false-positive rate, negative abstention accuracy (specificity), and abstention precision. Retrieval errors are excluded from conditional quality, never counted as correct abstentions. The complete pipeline failure rate and end-to-end answer success retain every request. Card-only/full-corpus have N/A source-selection metrics.

## Answer metrics and judge

Use one bounded structured `gpt-4.1-2025-04-14` judge call per successful response. The judge receives the question, card, expected behavior, frozen reference answer/required facts, generated answer and actual supplied reference context. It does not receive the arm name. No reference answer or required facts enter generation.

- Correctness: rubric 0–4, plus required-fact coverage and judged factual-claim accuracy. These are automated estimates, not measured objective truth.
- Faithfulness: supported substantive claims / grounding-applicable claims. No reference context or no substantive claims yields N/A, not 100%. Correct general knowledge can be ungrounded without being a hallucination. Grounding evidence must quote an actual supplied context; claim excerpts must occur in the answer.
- Hallucination: claim-level and answer-level rates of judged incorrect or fabricated substantive claims. Unsupported-by-context alone does not qualify. Unverifiable claims remain visible in raw verdicts.
- Teaching usefulness: rubric 1–5, applicable to teaching requests; clarification/redirect requests are excluded. No human calibration or demonstrated learning improvement is claimed.
- Scope handling: pass / overanswer / underanswer, assessed on the final response. Includes invented missing context, unnecessary refusal and missing disclosure of absent reference coverage.

The judge extracts up to 12 claims from a bounded 2–4-sentence answer. Extraction can miss claims, and the judge can be wrong. Generator/judge use different models but share a provider. Four authored checks distinguish correct/grounded, incorrect, correct/ungrounded, and an injected grading instruction in a context-guessing answer. Passing them is not human calibration. Invalid/incomplete judge output is a judge failure, not zero error or a perfect answer.

DeepEval 4.2.3 is an optional offline dependency. Its `BaseMetric` adapters consume saved custom-rubric scores without extra API calls. **These are custom metrics, not the built-in GEval or Faithfulness algorithms.** Library telemetry is disabled by the adapter. No Confident AI upload is performed. Plain Python handles deterministic retrieval metrics; no additional IR library is needed for this small corpus.

## Engineering measurements

Record embedding, database, retrieval (including verifier for verified arm), verifier, generation, full local handler pipeline, and judge durations. Parent/child durations overlap and must not be summed. Pipeline latency excludes judge work. p50/p95 include failed attempts; counts accompany percentiles. This is single-concurrency local-to-provider/DB timing, not deployed HTTP/browser latency or load capacity.

Token usage and cost are stage-specific. Separate pipeline cost from judge cost. Missing timeout usage makes cost incomplete; never substitute zero. Cache usage is applied when known; legacy verifier usage lacks the cache breakdown, so uncached rates produce a disclosed estimate. Rates are frozen as of 2026-09-16: GPT-4o mini $0.15/$0.075/$0.60 per million input/cached/output tokens; GPT-4.1 mini $0.40/$0.10/$1.60; GPT-4.1 judge $2.00/$0.50/$8.00; text-embedding-3-small $0.02 input. Estimates exclude hosting and are not billing receipts.

Optional `langfuse-export` sends only case IDs, arm, numeric scores, measured durations, usage and cost metadata. It uploads no questions, answers, reference text or judge reasons. The export observation is labelled a replay summary: its own duration is not the original request duration. Live serving tracing is not changed. Export failure is explicit; local evidence remains available.

## Diagnostic gates and CI

Before scoring: mean correctness >=3/4, mean applicable faithfulness >=0.90, hallucinated-answer rate <=0.10, teaching >=4/5, scope pass >=0.90, pipeline failure <=0.02, zero judge failures. N/A grounding for no-reference baseline is explicitly excluded. Gates are descriptive for this small pilot and never authorize release. Report both conditional averages and end-to-end correct-and-in-scope requests / all requests (failures remain in denominator).

CI runs deterministic unit tests and saved-record replay, without provider credentials. Provider-backed evaluation is a deliberate local command; it is not run on every PR. Any prompt or label change requires a new plan and output files. Historical failures remain in Git.

## Official references

- [DeepEval custom metrics](https://deepeval.com/docs/metrics-custom)
- [Langfuse token and cost tracking](https://langfuse.com/docs/observability/features/token-and-cost-tracking)
- [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [GPT-4o mini](https://developers.openai.com/api/docs/models/gpt-4o-mini), [GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini), [embedding model](https://developers.openai.com/api/docs/models/text-embedding-3-small)

## Judge selection amendment (before answer generation)

The first mini judge check passed 3/4; after an applicability clarification it passed 2/4, with a validation failure and a scope-category error. Both raw attempts are retained. The third plan tests pinned GPT-4.1 with the same clarified rubric. No answer-system prompt or pilot labels changed. Three four-case judge checks permit 12 setup calls total; they remain development diagnostics, not calibration evidence. [GPT-4.1 pricing and snapshot](https://developers.openai.com/api/docs/models/gpt-4.1).
