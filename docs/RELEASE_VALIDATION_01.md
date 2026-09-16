# Historical serving-path validation: fresh-v1 failed

This is the preserved first fresh test, now retired to regression. Its source snapshot is recorded in `agent/runs/release-fresh-v1-plan.json`. Use `scripts/replay_release_snapshot.py` to replay it after source changes; the direct current-code command below describes the collection-time checkout. See [current release results](RELEASE_VALIDATION_RESULTS.md) for the follow-up.

## Outcome and scope

This evaluation exercises the current English Study freeform handler with live read-only pgvector, real query embeddings, one source-verification call and bounded answer generation. It is a **small AI-authored synthetic test**, not independent expert validation or production traffic. The evaluator instruments provider calls and disables optional cloud tracing; it does not exercise the public HTTP proxy, browser or every selectable generator model. Its embedding adapter uses a 12-second timeout/no retry and its generation adapter uses 18 seconds/500 tokens/no retry. Production provider wrappers use different defaults under the existing 20-second generation deadline. Routing, prompts, source policy and disclosure are shared, but these timings/failures do not certify the exact production provider configuration.

**Fresh-test acceptance: FAIL.** 24/24 requests returned answers; 24/24 answers received valid automated judgments. Release criteria were fixed before execution. No automatic production promotion is performed.

## Problem, change and preserved development failures

The original retrieval holdout produced 16 false references among 31 negatives. Similarity could identify a related card topic without supporting the question. Earlier gate candidates improved precision at the cost of valid-source recall or excessive clarification.

The serving change separates scope, context sufficiency and source support in one pinned GPT-4.1 call. Only explanation/example/boundary units are selectable; the backend restores source text by ID. A general English question with no supporting note receives help and a backend-provided coverage disclosure. Absent learner text receives clarification; non-language tasks receive a fixed redirect. A narrow ordinal-option contract prevents card prompt/answer fields from becoming invented alternatives. Provider failures remain errors.

| Unchanged 16-case development set | Correct positive sources | False references / negatives | Correct clarifications | Request / judge errors | Accepted |
|---|---:|---:|---:|---:|---|
| v1 | 8/8 | 1/8 | 2/3 | 0 / 0 | No |
| v2 | 8/8 | 1/8 | 2/3 | 0 / 0 | No |
| v3 | 7/8 | 0/8 | 3/3 | 1 / 1 | No |
| v4 | 8/8 | 0/8 | 3/3 | 0 / 0 | Yes |

v1 and v2 both answered an ordinal comparison without supplied ordered alternatives. The prompt-only amendment did not fix it. v3 adds a tested backend context contract; it deliberately clarifies unrecognized alternative formats. That run had an embedding InternalServerError and a judge timeout, so it failed reliability despite passing retrieval/routing gates. v4 is one predeclared complete repeat of unchanged code and labels; no failed row was replaced. A clean repeat does not erase the observed failures or establish a production reliability rate. Earlier results, labels and provider outputs remain unchanged. These are development iterations, not independent test sets.

## Fresh test: retrieval and routing

24 newly authored questions were frozen before their provider execution: 12 supported, four uncovered English, four missing-context and four out-of-scope. Labels are corpus-aware, share grammatical families with development and have no independent expert validation. The fresh test was executed once after development acceptance; its outputs were not used to tune this revision.

| Metric | Result | Definition |
|---|---:|---|
| Source precision | 11/12 (91.7%) | Valid source among selected sources |
| End-to-end valid-source recall | 11/12 (91.7%) | Valid source among all labelled positive requests |
| False retrieval | 1/12 (8.3%) | Selected source on a labelled negative |
| Negative abstention accuracy | 91.7% | No source on valid negative requests |
| Abstention precision | 91.7% | Truly negative among source abstentions |
| recall@1 | 0.1944 (n=12) | Fraction of all labelled acceptable notes retrieved |
| recall@3 | 0.5833 (n=12) | Fraction of all labelled acceptable notes retrieved |
| recall@5 | 0.9167 (n=12) | Fraction of all labelled acceptable notes retrieved |
| hit@1 | 0.3333 (n=12) | Any acceptable note retrieved |
| hit@3 | 0.7500 (n=12) | Any acceptable note retrieved |
| hit@5 | 0.9167 (n=12) | Any acceptable note retrieved |
| mrr@5 | 0.5694 (n=12) | Rank of first acceptable note |
| Clarification | 3/4 | Required missing-context route |
| Scope redirect | 4/4 | Required out-of-scope route |
| Wrong clarification | 0/16 | Clarification on answerable English requests |

Wilson 95% intervals (small samples, not performance guarantees):

- source_precision_wilson95: 64.6%–98.5%.
- end_to_end_source_recall_wilson95: 64.6%–98.5%.
- negative_false_reference_wilson95: 1.5%–35.4%.

The raw hybrid source selector on the **same retrieved candidates** had 25.0% precision, 33.3% recall and 58.3% negative false retrieval. This is a paired source-selection comparison only: it does not compare generated answers against a no-RAG or whole-corpus baseline. The historical 16/31 figure uses a different dataset and is not a paired before/after result for these 24 cases.

### Observed residual failure

`release_fresh_02` asks about a dangling participle (“Having submitted the form, the confirmation email arrived”). The acceptable participle note is absent from the final top five candidates; several formal-register notes rank ahead of it. The verifier correctly declines those unrelated references, but the generator explains the problem as a causal ambiguity instead of identifying the missing subject alignment. The judge scores correctness 2/4. Source filtering does not repair a candidate-recall miss or guarantee a correct fallback answer.

The fixed coverage sentence says the reference notes do not cover the question; operationally it describes the retrieved evidence, not an exhaustive search of every corpus rule. This false-negative case shows that wording's limit. Both the miss and the answer are retained unchanged. A future change should evaluate candidate selection and more precise fallback wording on development data, then use a new test set; do not silently tune this frozen test or relabel the failed case.

## Answer quality

These are custom indexed GPT-4.1 rubric judgments, not independent people or built-in Ragas/DeepEval algorithm results. The generator is GPT-4o-mini-2024-07-18; verifier and judge both use GPT-4.1-2025-04-14 and may make correlated errors. Sentence/line units are not atomic claims. Metrics below are means across applicable answers, not globally pooled claim counts. Non-applicable answers are omitted with their denominators shown.

| Metric | Mean | Applicable answers |
|---|---:|---:|
| correctness_0_4 | 3.7917 | 24 |
| required_fact_coverage | 0.9375 | 24 |
| hallucinated_answer | 0.0833 | 24 |
| teaching_usefulness_1_5 | 4.8750 | 16 |
| scope_pass | 0.9583 | 24 |
| sentence_unit_faithfulness | 0.9722 | 12 |
| judged_factual_unit_accuracy | 0.9792 | 24 |
| hallucinated_unit_rate | 0.0625 | 24 |

End-to-end correctness ≥3/4 and scope pass: 91.7%, denominator all 24 requests. Request failures: 0; judge failures: 0. No failure is credited as successful abstention.

Breakdown by expected behavior (to expose easy static replies in the overall averages):

| Expected behavior | Requests | Valid judgments | Mean correctness / 4 | Judged hallucinated answers |
|---|---:|---:|---:|---:|
| answer | 12 | 12 | 3.833 | 1/12 |
| answer_with_disclosure | 4 | 4 | 4.000 | 0/4 |
| clarify | 4 | 4 | 3.250 | 1/4 |
| redirect | 4 | 4 | 4.000 | 0/4 |

## Engineering measurements

Sequential local-handler timings include live network/provider and database calls. They exclude evaluation pacing, judge calls, public HTTP/browser, cold starts and concurrent load. p95 from 24 requests is descriptive, not a production SLA. Stage durations overlap (retrieval includes embedding/database/verification), so do not sum their percentiles.

| Stage | n | p50 ms | p95 ms |
|---|---:|---:|---:|
| database | 24 | 702.3 | 839.3 |
| embedding | 24 | 311.2 | 988.4 |
| evaluation_queue | 24 | 2109.5 | 37633.9 |
| generation | 17 | 1047.4 | 4366.7 |
| judge | 24 | 1739.4 | 3634.9 |
| judge_queue | 24 | 1130.0 | 38146.3 |
| pipeline_total | 24 | 3330.3 | 6056.7 |
| retrieval | 24 | 2488.6 | 3660.3 |
| verification | 24 | 1267.0 | 2564.0 |

Pipeline token-cost estimate: **$0.104106 total**, **$0.004338/request**. Separate evaluation judge estimate: **$0.092622**. Usage was complete for 24/24 pipeline requests. Prices and model snapshots are frozen in the plan; these are estimates, not invoices.

| Stage | Input tokens | Output tokens | Cached input tokens |
|---|---:|---:|---:|
| embedding | 552 | 0 | 0 |
| generation | 8743 | 980 | 0 |
| judge | 31147 | 3791 | 0 |
| verification | 44874 | 1556 | 0 |

## Case-level evidence

| Case | Expected route | Observed route | Selected reference | Correctness / 4 |
|---|---|---|---|---:|
| release_fresh_01 | answer | matched | en_passive_vs_active_voice | 4 |
| release_fresh_02 | answer | not_covered | None | 2 |
| release_fresh_03 | answer | matched | en_relative_clause_combination | 4 |
| release_fresh_04 | answer | matched | en_non_restrictive_relative_clause | 4 |
| release_fresh_05 | answer | matched | en_formal_conditional | 4 |
| release_fresh_06 | answer | matched | en_formal_conditional | 4 |
| release_fresh_07 | answer | matched | en_nominalization | 4 |
| release_fresh_08 | answer | matched | en_science_formal_register | 4 |
| release_fresh_09 | answer | matched | en_sport_formal_sentence | 4 |
| release_fresh_10 | answer | matched | en_health_formal_register | 4 |
| release_fresh_11 | answer | matched | en_tech_vocabulary_precision | 4 |
| release_fresh_12 | answer | matched | en_formal_register_precision | 4 |
| release_fresh_13 | answer_with_disclosure | not_covered | None | 4 |
| release_fresh_14 | answer_with_disclosure | not_covered | None | 4 |
| release_fresh_15 | answer_with_disclosure | not_covered | None | 4 |
| release_fresh_16 | answer_with_disclosure | not_covered | None | 4 |
| release_fresh_17 | clarify | needs_context | None | 4 |
| release_fresh_18 | clarify | needs_context | None | 4 |
| release_fresh_19 | clarify | needs_context | None | 4 |
| release_fresh_20 | clarify | matched | en_formal_register_precision | 1 |
| release_fresh_21 | redirect | out_of_scope | None | 4 |
| release_fresh_22 | redirect | out_of_scope | None | 4 |
| release_fresh_23 | redirect | out_of_scope | None | 4 |
| release_fresh_24 | redirect | out_of_scope | None | 4 |

## Reproduce and inspect

Artifacts under `agent/runs/` retain plans, public synthetic request/answer text, candidate rankings, source verdicts, query vectors, indexed judgments, usage and timings. The fresh dataset is `agent/evals/datasets/release-fresh-v1.json`.

```bash
cd agent
python -m evals.release.runner replay   --plan runs/release-fresh-v1-plan.json   --records runs/release-fresh-v1-records.jsonl   --output /tmp/linguaflow-release-replay.json
python ../scripts/compare_eval_reports.py   runs/release-fresh-v1-results.json /tmp/linguaflow-release-replay.json
```

Use a new output path; existing evidence is never overwritten. Current replay checks code/corpus fingerprints; replaying an older revision uses `scripts/replay_release_snapshot.py` with its recorded commit. Historical pre-release probes use their original snapshot helpers. Replay recomputes scores from saved outputs; it does not reproduce stochastic provider generations.

Local verification: **260 Python tests passed, zero skips**, including disposable pgvector integration. See `agent/runs/release-integration-validation.json`. CI also checks web lint/types/tests/build/guest E2E and offline report reproduction. Check the PR's exact commit status for remote CI results. Optional Langfuse cloud delivery and a production load benchmark are not verified. New source-policy deployment must be established by a separate revision-specific smoke check; historical production evidence does not certify this revision.
