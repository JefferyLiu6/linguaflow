# Serving-path release validation

## Outcome and scope

This evaluation exercises the current English Study freeform handler with live read-only pgvector, real query embeddings, one source-verification call and bounded answer generation. It is a **small AI-authored synthetic test**, not independent expert validation or production traffic. The evaluator instruments provider calls and disables optional cloud tracing; it does not exercise the public HTTP proxy, browser or every selectable generator model. Its embedding adapter uses a 12-second timeout/no retry and its generation adapter uses 18 seconds/500 tokens/no retry. Production provider wrappers use different defaults under the existing 20-second generation deadline. Routing, prompts, source policy and disclosure are shared, but these timings/failures do not certify the exact production provider configuration.

**Fresh-test acceptance: PASS.** 24/24 requests returned answers; 24/24 answers received valid automated judgments. Release criteria were fixed before execution. No automatic production promotion is performed.

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

24 newly authored questions were frozen before their provider execution: 12 supported, four uncovered English, four missing-context and four out-of-scope. Labels are corpus-aware, share grammatical families with development and have no independent expert validation. Fresh-v2 was executed once after the documented cached routing regression and full test suite; its outputs were not used to tune this revision. Fresh-v1 remains a separate failed result and is not pooled into a passing score.

| Metric | Result | Definition |
|---|---:|---|
| Source precision | 11/11 (100.0%) | Valid source among selected sources |
| End-to-end valid-source recall | 11/12 (91.7%) | Valid source among all labelled positive requests |
| False retrieval | 0/12 (0.0%) | Selected source on a labelled negative |
| Negative abstention accuracy | 100.0% | No source on valid negative requests |
| Abstention precision | 92.3% | Truly negative among source abstentions |
| recall@1 | 0.4444 (n=12) | Fraction of all labelled acceptable notes retrieved |
| recall@3 | 0.8056 (n=12) | Fraction of all labelled acceptable notes retrieved |
| recall@5 | 0.8611 (n=12) | Fraction of all labelled acceptable notes retrieved |
| hit@1 | 0.5833 (n=12) | Any acceptable note retrieved |
| hit@3 | 0.8333 (n=12) | Any acceptable note retrieved |
| hit@5 | 0.9167 (n=12) | Any acceptable note retrieved |
| mrr@5 | 0.7292 (n=12) | Mean reciprocal rank of first acceptable note |
| Clarification | 4/4 | Required missing-context route |
| Scope redirect | 4/4 | Required out-of-scope route |
| Wrong clarification | 0/16 | Clarification on answerable English requests |

Wilson 95% intervals (small samples, not performance guarantees):

- source_precision_wilson95: 74.1%–100.0%.
- end_to_end_source_recall_wilson95: 64.6%–98.5%.
- negative_false_reference_wilson95: 0.0%–24.2%.

The raw hybrid source selector on the **same retrieved candidates** had 41.2% precision, 58.3% recall and 50.0% negative false retrieval. This is a paired source-selection comparison only: it does not compare generated answers against a no-RAG or whole-corpus baseline. The historical 16/31 figure uses a different dataset and is not a paired before/after result for these 24 cases.

### Preserved fresh-v1 failure and development follow-up

The [first fresh test](RELEASE_VALIDATION_01.md) returned 11/12 valid positive sources and 1/12 false references. It failed the required-clarification gate (3/4), even though aggregate answer and source thresholds passed. A missing word pair received generic register advice. Another question missed the participle rule in its top-five candidates and received an incorrect fallback explanation. Both remain visible; neither label was changed.

That set is now exposed regression data. The follow-up adds a conservative deictic-text guard and changes disclosure from an assertion about the entire corpus to “I could not find a supporting reference.” Eight supplied/missing-text contrasts and cached deterministic routing checks over 40 exposed cases pass. Those cached checks reuse saved verifier decisions: they are not a new live model/answer evaluation. The fresh-v2 test reported here uses new scenarios in known families after that change. Its construction is adaptive, so neither it nor its confidence intervals establish independent user-population performance. The candidate-recall failure found in v1 is not claimed to be fixed.

The remaining fresh-v2 miss is `release_fresh2_01`: a negative future-tense passive rewrite. The passive note is absent from its five candidates; the selected candidates are register/rephrasing notes. The verifier declines them, and the general-knowledge answer is judged correct with the revised disclosure. This still counts as failed source recall.

## Answer quality

These are custom indexed GPT-4.1 rubric judgments, not independent people or built-in Ragas/DeepEval algorithm results. The generator is GPT-4o-mini-2024-07-18; verifier and judge both use GPT-4.1-2025-04-14 and may make correlated errors. Sentence/line units are not atomic claims. Metrics below are means across applicable answers, not globally pooled claim counts. Non-applicable answers are omitted with their denominators shown.

| Metric | Mean | Applicable answers |
|---|---:|---:|
| correctness_0_4 | 4.0000 | 24 |
| required_fact_coverage | 1.0000 | 24 |
| hallucinated_answer | 0.0000 | 24 |
| teaching_usefulness_1_5 | 4.9375 | 16 |
| scope_pass | 1.0000 | 24 |
| sentence_unit_faithfulness | 1.0000 | 11 |
| judged_factual_unit_accuracy | 1.0000 | 24 |
| hallucinated_unit_rate | 0.0000 | 24 |

End-to-end correctness ≥3/4 and scope pass: 100.0%, denominator all 24 requests. Request failures: 0; judge failures: 0. No failure is credited as successful abstention.

Breakdown by expected behavior (to expose easy static replies in the overall averages):

| Expected behavior | Requests | Valid judgments | Mean correctness / 4 | Judged hallucinated answers |
|---|---:|---:|---:|---:|
| answer | 12 | 12 | 4.000 | 0/12 |
| answer_with_disclosure | 4 | 4 | 4.000 | 0/4 |
| clarify | 4 | 4 | 4.000 | 0/4 |
| redirect | 4 | 4 | 4.000 | 0/4 |

## Engineering measurements

Sequential local-handler timings include live network/provider and database calls. They exclude evaluation pacing, judge calls, public HTTP/browser, cold starts and concurrent load. p95 from 24 requests is descriptive, not a production SLA. Stage durations overlap (retrieval includes embedding/database/verification), so do not sum their percentiles.

| Stage | n | p50 ms | p95 ms |
|---|---:|---:|---:|
| database | 24 | 724.9 | 943.2 |
| embedding | 24 | 330.4 | 494.0 |
| evaluation_queue | 24 | 2352.5 | 42909.4 |
| generation | 16 | 871.4 | 1614.4 |
| judge | 24 | 1885.1 | 3353.4 |
| judge_queue | 24 | 946.2 | 42143.8 |
| pipeline_total | 24 | 3382.1 | 4604.4 |
| retrieval | 24 | 2565.1 | 3358.0 |
| verification | 24 | 1442.0 | 2031.0 |

Pipeline token-cost estimate: **$0.103879 total**, **$0.004328/request**. Separate evaluation judge estimate: **$0.089712**. Usage was complete for 24/24 pipeline requests. Prices and model snapshots are frozen in the plan; these are estimates, not invoices.

| Stage | Input tokens | Output tokens | Cached input tokens |
|---|---:|---:|---:|
| embedding | 505 | 0 | 0 |
| generation | 8152 | 871 | 0 |
| judge | 30036 | 3705 | 0 |
| verification | 44962 | 1525 | 0 |

The verifier accounts for approximately **98.3% of the measured pipeline token cost** ($0.102124 of $0.103879). This is a real quality/cost trade-off, particularly for a 31-note corpus where whole-corpus prompting is feasible. No current experiment establishes that the added verifier cost produces better answers than that alternative.

## Case-level evidence

| Case | Expected route | Observed route | Selected reference | Correctness / 4 |
|---|---|---|---|---:|
| release_fresh2_01 | answer | not_covered | None | 4 |
| release_fresh2_02 | answer | matched | en_passive_vs_active_voice | 4 |
| release_fresh2_03 | answer | matched | en_participle_clause_combination | 4 |
| release_fresh2_04 | answer | matched | en_non_restrictive_relative_clause | 4 |
| release_fresh2_05 | answer | matched | en_relative_clause_combination | 4 |
| release_fresh2_06 | answer | matched | en_formal_conditional | 4 |
| release_fresh2_07 | answer | matched | en_nominalization | 4 |
| release_fresh2_08 | answer | matched | en_academic_formal_register | 4 |
| release_fresh2_09 | answer | matched | en_health_formal_register | 4 |
| release_fresh2_10 | answer | matched | en_tech_vocabulary_precision | 4 |
| release_fresh2_11 | answer | matched | en_formal_register_precision | 4 |
| release_fresh2_12 | answer | matched | en_sport_formal_sentence | 4 |
| release_fresh2_13 | answer_with_disclosure | not_covered | None | 4 |
| release_fresh2_14 | answer_with_disclosure | not_covered | None | 4 |
| release_fresh2_15 | answer_with_disclosure | not_covered | None | 4 |
| release_fresh2_16 | answer_with_disclosure | not_covered | None | 4 |
| release_fresh2_17 | clarify | needs_context | None | 4 |
| release_fresh2_18 | clarify | needs_context | None | 4 |
| release_fresh2_19 | clarify | needs_context | None | 4 |
| release_fresh2_20 | clarify | needs_context | None | 4 |
| release_fresh2_21 | redirect | out_of_scope | None | 4 |
| release_fresh2_22 | redirect | out_of_scope | None | 4 |
| release_fresh2_23 | redirect | out_of_scope | None | 4 |
| release_fresh2_24 | redirect | out_of_scope | None | 4 |

## Reproduce and inspect

Artifacts under `agent/runs/` retain plans, public synthetic request/answer text, candidate rankings, source verdicts, query vectors, indexed judgments, usage and timings. The fresh dataset is `agent/evals/datasets/release-fresh-v2.json`.

```bash
cd agent
python -m evals.release.runner replay   --plan runs/release-fresh-v2-plan.json   --records runs/release-fresh-v2-records.jsonl   --output /tmp/linguaflow-release-replay.json
python ../scripts/compare_eval_reports.py   runs/release-fresh-v2-results.json /tmp/linguaflow-release-replay.json
```

Use a new output path; existing evidence is never overwritten. Current replay checks code/corpus fingerprints; replaying an older revision uses `scripts/replay_release_snapshot.py` with its recorded commit. Historical pre-release probes use their original snapshot helpers. Replay recomputes scores from saved outputs; it does not reproduce stochastic provider generations.

Local verification: **269 Python tests passed, zero skips**, including disposable pgvector integration. See `agent/runs/release-final-integration-validation.json`. CI also checks web lint/types/tests/build/guest E2E and offline report reproduction. Check the PR's exact commit status for remote CI results. Optional Langfuse cloud delivery and a production load benchmark are not verified. New source-policy deployment must be established by a separate revision-specific smoke check; historical production evidence does not certify this revision.
