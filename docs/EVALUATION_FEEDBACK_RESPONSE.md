# Closing the evidence gap

The project solves a narrow problem: explain why two English expressions differ, using a consistent teaching policy while preserving the learner's intended meaning. RAG is a hypothesis, not a requirement. With 31 teaching notes, supplying the entire corpus may be simpler and better. The release decision must compare answer quality and operating cost, not the number of architectural components.

## What the feedback changes

| Suggestion | Implementation / evidence | Remaining work |
| --- | --- | --- |
| Compare answers, not just retrieved IDs | Seven-arm paired pilot, fixed model/prompt, 8 development cases and 56 requests; `agent/retrieval/answer_study.py` | Provider run complete: 56/56 valid outputs; AI-assisted ratings remain pending |
| Compare against simpler alternatives | Card only, whole corpus, metadata, BM25, vector, current hybrid, and gold context | Accept whole corpus or metadata if quality is comparable and cost/latency acceptable |
| Independent evaluation data | `agent/retrieval/reviewed_dataset.py` checks 240 reviewed cases and freezes grouped 120/120 splits | Author/AI-assisted labels are accepted with provenance; the 240-case dataset is not yet collected |
| Try lexical + semantic fusion | Cached-vector RRF experiment completed, without new provider calls | Fixed RRF did not improve the current hybrid; no serving change |
| Evaluate claim support | Blinded packet and scoring command; separate citation-ID validity from claim support | Evaluation must inspect all assertions, including claims the model omitted from its list |
| Measure operational behavior | Pilot records generation latency, usage and estimated cost when executed | [600-query local database benchmark completed](OPERATIONS_EXPERIMENT_01.md); deployed end-to-end measurements remain pending |

The earlier provider-backed retrieval comparison is already complete; see [Experiment 02](RETRIEVAL_EXPERIMENT_02.md). Also, the index has **one atomic active publication**, with version checks. It does not retain immutable historical snapshots for instant rollback.

## Answer pilot protocol

The eight cases are deliberately selected development examples (six positive, two scope negatives). They exercise formal register, voice, clauses, coverage gaps and scope. They are too few, and too familiar, to establish generalization or production p95.

Every arm receives the same question, card, instruction and output schema. Only supplied reference context varies. Model: `gpt-4o-mini-2024-07-18`, temperature 0, maximum 650 output tokens. Request order is shuffled with a recorded seed. The whole-corpus arm receives all 31 notes; gold context is an oracle diagnostic, not a deployable retriever. Empty gold context for a negative does not imply that every such question requires refusal: general English knowledge can be appropriate.

The preflight in `agent/runs/answer-study-plan.json` contains the exact outbound messages. The 56-request budget estimates an upper cost below $0.09 using recorded standard token prices; this is an estimate, not a bill. Raw responses and the unblinding key default to `.private/`. Public summaries retain usage and structural results; quality metrics remain null until reviewed.

From `agent/`, using the project Python environment:

```sh
python -m retrieval.answer_study plan --output runs/answer-study-plan.json
# Only after approval, with OPENAI_API_KEY loaded into the process:
python -m retrieval.answer_study collect --output runs/answer-study-summary.json --review-output runs/answer-review-blinded.json
python -m retrieval.answer_study score --review-input runs/answer-review-blinded.json --output runs/answer-study-reviewed.json
```

Collection checkpoints every response, disables automatic retries, and refuses to overwrite an existing run. After a partial failure, inspect the saved run before deciding whether a new run is worth its cost. Scoring rejects unreviewed dimensions and altered answer/evidence content. Evaluation requires an explicit author/ai_assisted kind and an evaluator ID; AI evaluations must name their model.

Rubric: 0 = major failure, 1 = partly satisfactory, 2 = fully satisfactory for factual correctness, meaning preservation, teaching usefulness and scope handling. Use explicit `not_applicable` where appropriate. Judge every factual assertion separately for factual correctness and support from cited material, with a rationale. Uncertain judgments must remain null and be explained. A valid source ID is not evidence that a claim is supported. Reviewers should not receive the raw run or unblinding key; citation style may still partially reveal the arm.

## Evaluation data intake and freeze

Obtain 240 new cases: 160 answerable by the corpus and 80 negative/unsupported. Collect varied learner formulations, ambiguous questions, tempting near-matches, meaning-changing rewrites and legitimate requests needing no reference. Consent is required for learner-contributed questions; remove identifying details before intake. Do not generate AI examples and describe them as independent learner evidence.

Each case has this shape (illustrative only; not approved data):

```json
{
  "case_id": "new-unique-id",
  "scenario_group": "shared-scenario-id",
  "question": "A newly authored learner question",
  "current_item": {},
  "origin": "ai_assisted",
  "author_id": "author-pseudonym",
  "expected_note_ids": [],
  "reviews": [
    {"reviewer_id": "teacher-perspective", "evaluation_kind": "ai_assisted", "model": "record-actual-model", "approved": false, "relevant_note_ids": [], "rationale": "Pending"},
    {"reviewer_id": "engineer-perspective", "evaluation_kind": "ai_assisted", "model": "record-actual-model", "approved": false, "relevant_note_ids": [], "rationale": "Pending"}
  ]
}
```

At least one documented author or AI-assisted evaluation is required; external people are not required. An evaluator may be the case author. Record all relevant notes (multiple allowed; empty means none), evaluation kind and rationale; AI evaluation also requires a model identifier. If multiple perspectives disagree, resolve or preserve the disagreement before freezing labels. Keep first-pass labels and adjudication history alongside the intake. Group related scenarios before splitting. The validator rejects overlap with inspected freeform/challenge questions and cross-group lexical near-duplicates; this heuristic cannot prove semantic independence.

```sh
python -m retrieval.reviewed_dataset --input ../.private/reviewed-intake.json --output ../.private/frozen-evaluation.json
```

The freeze requires exactly 80 positive and 40 negative cases in each split without splitting a scenario. It records hashes and refuses overwrite. A separate custodian should retain the test split; do not inspect it while tuning. The tool writes both splits in one artifact, so access control and separate distribution are procedural requirements. Fix configuration on development data, then run test once. Further tuning after seeing test results requires a new untouched set.

## Fusion result and decision

Fixed reciprocal-rank fusion combines the top 10 BM25 and vector candidates with `1 / (60 + rank)`, then applies the existing 0.30 cosine eligibility threshold to the winner. It uses cached provider embeddings and exactly the existing queries; there is no additional API spend. Results in `agent/runs/fusion-experiment.json` are exploratory, not held out.

| Arm / query | Development correct / 22 | Development false positive / 3 | Challenge correct / 31 | Challenge false positive / 12 |
| --- | --- | --- | --- | --- |
| RRF, question only | 9 | 0 | 21 | 3 |
| RRF, question + card | 16 | 2 | 22 | 5 |
| Current hybrid, question + card | 20 | 1 | 26 | 4 |

This RRF configuration does not justify replacing the current hybrid. It does not prove all fusion configurations are worse. A cross-encoder reranker remains a later experiment, warranted only if reviewed failure analysis identifies candidate-ordering errors that simpler methods cannot resolve.

## Local operational evidence and remaining endpoint benchmark

[Operational experiment 01](OPERATIONS_EXPERIMENT_01.md) completed 600 local database queries at concurrency 1 and 5, with no unexpected results. Warm-query p95 was 10.48 ms and 15.79 ms respectively. These synthetic-vector measurements exclude embedding, HTTP and generation; they do not complete the end-to-end gate.

### Endpoint benchmark still required

Before claiming production performance, run at least 100 requests per warm scenario at concurrency 1 and 5, with fixed case mix, model/index versions and environment. Record end-to-end p50/p95, retrieval and generation time separately, errors, timeout rate, tokens and estimated cost. Report cache-hit behavior explicitly. Cold measurements require isolated fresh processes/connections and clearly stated cache conditions; a first query after publication is not proof of a fully cold system. Run provider outages, incomplete indexes and timeouts as separate failure scenarios. Local database timings and eight-call generation percentiles are not substitutes for this benchmark.

## Release decision

Promote RAG only if reviewed answers improve meaning preservation, factuality or useful teaching over simpler arms enough to justify measured latency and cost. Report paired wins/losses and concrete failure categories, not just one aggregate percentage. Keep the gold arm to separate missing/retrieved evidence failures from generation failures. Public claims stay limited to completed evidence; AI-assisted answer evaluation and deployed operational measurements are unfinished gates.


## Completed answer-generation pilot

The approved 56-request run completed on 2026-09-15 with **56 structurally valid outputs and zero invalid citation IDs**. Exact messages matched the saved preflight plan, all responses matched the pinned model, and the public summary was reproduced offline. These are structural checks, not correctness or faithfulness scores.

Provider-reported usage: **87,368 input tokens**, **8,845 output tokens**, zero cached input tokens. Estimated generation cost: **$0.0184122** using the recorded token prices. This excludes the earlier embedding experiment and any deployment costs.

| Arm | Valid / 8 | Input tokens | Output tokens | Generation median (ms) | Generation p95 (ms) | Estimated USD |
| --- | --- | --- | --- | --- | --- | --- |
| card_only | 8 | 2745 | 1186 | 1459 | 2490 | 0.001123 |
| whole_corpus | 8 | 62881 | 1299 | 1850 | 2185 | 0.010212 |
| metadata | 8 | 3526 | 1241 | 1612 | 1714 | 0.001273 |
| bm25 | 8 | 4764 | 1294 | 1782 | 2370 | 0.001491 |
| vector | 8 | 4718 | 1311 | 1580 | 1936 | 0.001494 |
| hybrid | 8 | 4485 | 1272 | 1546 | 2094 | 0.001436 |
| gold | 8 | 4249 | 1242 | 1566 | 1822 | 0.001383 |

Each arm has only eight sequential requests. These interpolated timing summaries exclude retrieval, are sensitive to network/provider variation, and do not establish production p95 or causal latency differences. Whole-corpus context used more input tokens; whether its answers justify that cost is still unmeasured. No quality winner is declared.

Artifacts:

- `agent/runs/answer-study-summary.json`: per-arm usage, timing and pending quality fields.
- `agent/runs/answer-study-verification.json`: plan identity, structural checks and artifact hashes.
- `agent/runs/answer-review-blinded.json`: 56 answers with empty reviewer ratings, ready for author/AI-assisted evaluation.
- `.private/answer-pilot.json` and `.private/answer-review-key.json`: ignored raw run and unblinding key. Do not give these to reviewers during initial scoring.

The next action is clearly labeled AI-assisted evaluation of the blinded packet. Do not rerun paid collection merely to produce better-looking responses. Keep the original evidence and record any future changes as separate experiments.

## Implementation validation

The full Python suite passed **169 tests, zero skips**, including real disposable PostgreSQL/pgvector integration. Evidence: `agent/runs/feedback-validation.json` and `.xml`. This verifies implementation behavior, not human answer quality. The run emitted one dependency deprecation warning.

## Current release gate status

See [release evidence status](RELEASE_EVIDENCE_STATUS.md) for the failed deployed smoke check, tested local generation deadline, and two private reviewer packets. External human review is no longer a requirement. AI-assisted evaluation and the 240-case intake remain unfinished; deployed load testing requires a working, permitted staging target.
