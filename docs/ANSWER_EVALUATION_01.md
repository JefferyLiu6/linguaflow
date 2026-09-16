# Three-layer RAG answer pilot 01

## Outcome

**The evaluation pipeline ran; no arm passed the diagnostic quality gate. Nothing was merged or deployed to production.**

The frozen pilot contains 12 public synthetic questions across four arms: 48 successful handler responses, comprising 46 model generations and two fixed routing replies. There were 24 live query-embedding calls, 24 read-only pgvector queries, 12 verifier calls and 48 answer-judge calls. Nine judge outputs failed (three rate-limit rejections and six validation failures), leaving 39 scored responses. These missing scores are not random: four occur in the full-corpus arm. Do not rank systems from conditional averages alone.

Questions were reused from exposed retrieval scenarios. Reference answers and rubrics were frozen before answer generation in commit `805c50e` (plan v3). This is a small AI-authored pilot, not an untouched retrieval test, expert annotation or production-traffic benchmark. The `verified` arm uses the current GPT-4o mini evidence gate, not the unmerged GPT-4.1 mini recall experiment.

## Answer quality: automated estimates

Scores use GPT-4.1 as a custom rubric judge, with exact claim/evidence-quote checks. A value followed by `(n=...)` shows its actual denominator. Teaching applies to eight in-scope teaching questions per arm; faithfulness requires supplied reference context and substantive claims. No-context faithfulness is N/A, not zero or a perfect score.

| Arm | Judged / requests | Correctness /4 | Faithfulness | Hallucinated answers | Teaching /5 | Scope pass |
|---|---:|---:|---:|---:|---:|---:|
| card_only | 12/12 | 3.17 (n=12) | N/A | 8.3% (n=12) | 4.12 (n=8) | 75.0% (n=12) |
| full_corpus | 8/12 | 3.50 (n=8) | 62.5% (n=8) | 0.0% (n=8) | 4.75 (n=8) | 87.5% (n=8) |
| hybrid | 10/12 | 2.80 (n=10) | 53.3% (n=5) | 20.0% (n=10) | 4.43 (n=7) | 60.0% (n=10) |
| verified | 9/12 | 3.00 (n=9) | 66.7% (n=5) | 11.1% (n=9) | 4.33 (n=6) | 66.7% (n=9) |

Additional report fields include required-fact coverage, judged factual-claim accuracy, claim-level hallucination rate, and scope error categories. “Hallucination” means a judged incorrect or fabricated claim, not simply a claim absent from retrieved context. Teaching scores are uncalibrated estimates; they are not evidence that learners improved.

End-to-end correct-and-in-scope rates count every request and treat absent judgments as non-success: card_only 66.7%, full_corpus 50.0%, hybrid 41.7%, verified 41.7%. This is a conservative measured-success rate, not a claim that every unjudged answer was wrong.

## Retrieval

Ranking is identical between hybrid and verified because verification acts after candidate generation. On six positive questions: standard Recall@1 = 66.7%, Hit@1 = 83.3%, Recall@3/5 = 100%, Hit@3/5 = 100%, MRR@5 = 0.917. Multiple acceptable references explain the difference between Recall and Hit. Earlier any-acceptable-note “Recall@5” reports should be read as Hit@5.

| Arm | Source precision | Positive source recall | Negative false retrieval | Negative abstention accuracy | Abstention precision |
|---|---:|---:|---:|---:|---:|
| hybrid | 42.9% | 50.0% | 66.7% | 33.3% | 40.0% |
| verified | 62.5% | 83.3% | 33.3% | 66.7% | 100.0% |

Card-only and full-corpus are context baselines, so source-selection metrics are N/A. A good candidate rank does not guarantee correct selection, grounding or final scope handling.

## Latency, tokens and cost

Local handler pipeline timing includes actual embedding, database, verification and generation as applicable. It excludes the judge and public HTTP/browser hops. Sequential execution and 12 observations per arm do not establish production p95 or load capacity. Parent and child spans overlap and must not be summed. Full-corpus benefits from observed prompt caching in this run.

| Arm | Pipeline p50 / p95 (ms) | Pipeline input / output tokens | Pipeline cost, 12 requests | Recorded judge cost |
|---|---:|---:|---:|---:|
| card_only | 1046 / 1819 | 3,876 / 781 | $0.001050 | $0.046566 |
| full_corpus | 1296 / 3226 | 77,784 / 919 | $0.006939 | $0.168558 |
| hybrid | 2149 / 2838 | 5,575 / 860 | $0.001322 | $0.051776 |
| verified | 3866 / 4362 | 29,420 / 1,758 | $0.005438 | $0.054144 |

All pipeline token usage was recorded; the verifier lacks a cached-input breakdown and is priced at uncached rates. Three full-corpus judge rate-limit rejections have no returned token usage: recorded judge cost is incomplete, not a complete invoice. Frozen per-token rates exclude hosting. Generator and judge costs are kept separate. The JSON report retains all stage durations and usage.

## Concrete failures

- On “Which of those two options changes the meaning?”, both hybrid arms invented a defining-relative-clause comparison instead of asking for the absent alternatives. A relevant-looking grammar note contaminated the answer.
- For a linked-list programming request, raw hybrid described an implementation approach while presenting it as wording help. The verified arm correctly returned a fixed English-help redirect in this case.
- The judge occasionally produced evidence quotes absent from supplied context or violated grounding applicability rules. These were rejected, not repaired into passing scores. Three larger-context judge calls were rejected by the provider rate limit.

## Judge checks, replay and integration status

- Two GPT-4.1 mini judge-development attempts passed 3/4 and 2/4 checks. Both failed artifacts and unused pilot plans remain in Git.
- The selected GPT-4.1 judge passed four authored contrast checks, including an injected grading instruction. This is a smoke check, not independent calibration; later pilot failures demonstrate the limitation.
- Saved-record replay reproduced the entire report byte for byte without provider or database calls.
- DeepEval 4.2.3 custom-metric adapters reproduced 125 applicable saved scores without extra model calls. These are custom rubric adapters, not the built-in GEval/Faithfulness implementation.
- Offline agent suite: 208 passed, six disposable-database tests skipped. CI now replays the frozen report and compares it with the committed result.
- Langfuse numeric-summary export is implemented and contract-tested, but no local Langfuse credentials are configured; no cloud export/dashboard verification is claimed. Raw questions, answers and contexts are excluded from this export.

## Decision and limits

Keep the candidate unmerged. This pilot does not establish a RAG accuracy advantage over the no-reference baseline, nor that all-corpus prompting is best. Differential judge failures, tiny synthetic slices, model-related evaluator bias and unchanged scope-routing defects prevent that conclusion. The engineering value is a reproducible comparison that exposes these failures and the real additional latency/token cost.

Next evaluation work should improve judge validity and missing-context/scope behavior before enlarging a fresh answer test. Do not tune against this pilot and then call its rerun held out. Production load testing, live HTTP latency and learning outcomes remain unmeasured.

## Evidence

- [Protocol and commands](ANSWER_EVALUATION_PROTOCOL_01.md)
- Dataset: `agent/evals/datasets/answer-pilot-v1.json`
- Frozen plan: `agent/runs/answer-pilot-v3-plan.json`
- Raw answers, contexts, verdicts, spans and query vectors: `agent/runs/answer-pilot-v3-records.jsonl`
- Metrics: `agent/runs/answer-pilot-v3-results.json`
- Judge development: `agent/runs/answer-judge-checks-v1.json`, `v2.json`, `v3.json`

### Cross-version replay check

The first CI replay failed a byte comparison because Python 3.11 and local Python 3.13 summed floating-point costs slightly differently (for example, `0.006939000000000001` versus `0.006939`). Downloaded CI artifacts confirmed identical decisions and metrics apart from floating-point rounding. CI now compares every field with absolute numeric tolerance `1e-12`, zero relative tolerance, and exact booleans, integer counts, keys, hashes and strings. Tests reject material numeric drift, changed decisions, missing keys and non-finite values. No provider outputs, labels, gates or frozen metric code were changed.
