# 200-note paired evaluation results

Completed 2026-11-16: **100 frozen synthetic questions, 200 successful pipeline responses, 199 graded answers, US$1.21996354 recorded token cost**. Verification improved source selection and judged answer quality over raw hybrid retrieval. Source errors and judge mistakes remain; this is not production certification.

## Design and evidence

Both arms used the same 200-note corpus and questions: 60 supported, 15 uncovered English, 15 missing-context and 10 out-of-scope cases. Arm order alternated by case. Models: `text-embedding-3-small`, generator `gpt-4o-mini-2024-07-18`, verifier/judge `gpt-4.1-2025-04-14`. No model upgrade was made.

Questions and labels were AI-authored with knowledge of the corpus. Exact historical duplicates were excluded, but this is not an independently authored or human-validated test. Acceptable-source labels are not exhaustive. No prompts, labels or scores were retuned after collection.

- [Frozen protocol](EXPANSION_EVALUATION_100.md) and [plan](../agent/runs/expansion-fresh-v1-plan.json).
- [Raw answers, sources, usage and judgments](../agent/runs/expansion-fresh-v1-records.jsonl).
- [Full results](../agent/runs/expansion-fresh-v1-results.json), [offline replay](../agent/runs/expansion-fresh-v1-replayed.json) and [supplemental audit](../agent/runs/expansion-fresh-v1-audit.json).

Replay exactly reproduces summaries, paired differences, per-case outcomes and diagnostic gates without provider calls. Corpus fingerprint: `1c26b8f08c966f2ac64b57093d3d2c6fc7d48cae32c141152080ee2bd9e417d6`. The disposable local pgvector database was removed. Production and hosting were unchanged; the 200-note production index is not published.

## Results

Answer-quality values are automated judge scores, subject to the audit below. Source scores use frozen note-ID labels.

| Measure | Raw hybrid | Verified |
|---|---:|---:|
| Mean correctness, 0–4 | 3.374 (99 answers) | 3.980 (100 answers) |
| Required-fact coverage | 80.5% (99) | 98.5% (100) |
| Teaching usefulness, 1–5 | 4.627 (75) | 4.960 (75) |
| Answers judged to contain hallucination | 14/99 | 1/100 |
| Mean sentence-unit faithfulness | 57.2% (90 applicable answers) | 98.7% (59 applicable answers) |
| Selected-source precision against labels | 32/90 = 35.6% | 51/59 = 86.4% |
| Supported questions receiving an accepted source | 32/60 = 53.3% | 51/60 = 85.0% |
| False references: uncovered English | 12/15 | 1/15 |
| False references: missing context | 15/15 | 1/15 |
| False references: out of scope | 4/10 | 0/10 |
| Pipeline failures / timeouts | 0/100 / 0/100 | 0/100 / 0/100 |
| Judge failures | 1/100 | 0/100 |
| Local pipeline p50 / p95 | 1.50 s / 2.22 s | 2.36 s / 3.20 s |
| Mean pipeline token cost per question | $0.000113 | $0.004072 |

Faithfulness applies to answers with reference contexts; the arms have different applicable populations. The difference between those marginal averages is not a paired treatment effect. Local timings exclude browser/public HTTP, hosting cold starts, evaluation pacing and judging; they are not production latency percentiles.

Candidate rankings were identical: hit@1 53.3%, hit@3 78.3%, hit@5 86.7%, MRR@5 0.664 over 60 supported questions. Verification improves selection and abstention after retrieval; it does not repair candidate ranking.

The 95% Wilson interval for verified source precision is 75.5–93.0%; for supported-source coverage it is 73.9–91.9%. Small negative buckets give wide uncertainty: even 0/10 out-of-scope false references has an upper bound of 27.8%. All counts and intervals remain in the full report.

## Paired differences and diagnostic gates

Verified minus hybrid, using the frozen paired bootstrap (2,000 resamples):

| Measure | Mean difference | 95% interval | Pairs |
|---|---:|---:|---:|
| Correctness, 0–4 | +0.606 | +0.394 to +0.840 | 99 |
| Required-fact coverage | +18.0 percentage points | +12.1 to +24.6 | 99 |
| Faithfulness, jointly applicable answers | +23.7 percentage points | +13.4 to +34.9 | 58 |
| Teaching usefulness, 1–5 | +0.333 | +0.187 to +0.500 | 75 |
| Pipeline latency | +694 ms | +557 to +831 ms | 100 |

Verified passes this protocol's frozen answer-quality diagnostic gates. Hybrid fails faithfulness, hallucination, scope and judge-completion diagnostics. These gates do not establish production readiness: this protocol does not include the historical release's 90% source-precision gate, and verified source-label precision is only 86.4%.

## Audit findings

1. **The judge credited disclosures that were absent.** Verified case 064 explains “under the weather” and attaches a generic health-language note, without saying the idiom lacks a supporting reference. The judge nevertheless credits that disclosure and grounding. Hybrid cases 063, 068 and 072 have similar disclosure errors. The raw automated routing score of 100/100 versus 80/100 is overly generous and must not be advertised as perfect routing. The application's literal disclosure marker appears in 14/15 verified uncovered answers and 3/15 hybrid uncovered answers; this marker check is narrower than a full semantic audit.
2. **Verifier decisions and final-answer behavior differ.** On missing-context cases the verifier returns `needs_context` 13/15 times. Case 084 returns `not_covered`; case 085 returns `matched` and unnecessarily attaches a concision note. Both generated answers still request the missing text. All ten out-of-scope verified cases take the explicit out-of-scope route.
3. **Verification can accept related but insufficient evidence.** In case 015, a question-tag note is accepted for the base-form-after-`did` rule even though that rule is absent. The judge also accepts the grounding. A shared verifier/judge model can make correlated mistakes.
4. **Correct retrieval does not guarantee correct generation.** In case 019, the answer incorrectly describes emphatic “Who did unlock…” as doubled past marking. The selected note allows emphatic `do`; the judge catches this error.
5. **Strict source labels have limits.** Cases 003 and 016 select plausible alternative notes outside the frozen accepted sets. Other mismatches reflect genuinely insufficient evidence. Labels were not expanded after seeing results, so 86.4% remains a strict label-match diagnostic rather than independently adjudicated semantic precision.
6. **One baseline answer could not be graded.** Hybrid case 093 responds to an out-of-scope coding request and exceeds the judge's 12-unit limit. The error occurs before a paid judge call. It remains a judge failure and routing failure; quality means exclude that ungraded answer. No retry was purchased.

These are AI-assisted audit findings, not independent human review. Automated scores do not demonstrate learner outcomes or real-traffic performance. Prioritize evidence-selection errors, judge disclosure checks and independent review before a production-quality claim. Tuning against these cases makes them development data and requires another fresh evaluation for generalization claims.

## Actual cost by step

Costs use recorded usage and frozen prices, including cached-input discounts. These estimate token charges, not a billing invoice. Input totals include cached tokens.

| Step | Calls | Input tokens | Output tokens | Cost (USD) |
|---|---:|---:|---:|---:|
| Embed the 200-note local index | 10 | 30,998 | 0 | $0.00061996 |
| Embed paired queries | 200 | 4,594 | 0 | $0.00009188 |
| Verify references and route | 100 | 173,212 | 6,549 | $0.39881600 |
| Generate answers | 177 | 89,798 | 10,210 | $0.01959570 |
| Judge answers | 199 | 279,796 | 31,044 | $0.80084000 |
| **Total** | **686** | **578,398** | **47,803** | **$1.21996354** |

Judging used 4,736 cached input tokens. The conservative budget ledger ignores cache discounts and accounts for $1.22706754 including indexing, below the approved $5.01 ceiling. No usage was unknown. The earlier typical estimate was $1.58238989; this run used fewer output tokens.

The verified pipeline costs about $4.07 per 1,000 questions at this case mix, versus $0.11 for raw hybrid: approximately $3.96 extra. These extrapolations exclude judging, hosting, retries, price changes and different question lengths. Evaluation judging is a development expense, not part of a normal user response.

## Validation and replay

The full Python suite passed **312 tests with zero skipped**, including disposable pgvector integration. Tests use mocked model responses and establish software behavior, not answer quality. Saved preflight and offline-test artifacts describe the pre-collection state; completed results supersede their historical “not run” status.

From `agent/`, replay without paid calls:

```bash
python -m evals.expansion.runner replay --plan runs/expansion-fresh-v1-plan.json --records runs/expansion-fresh-v1-records.jsonl --output /tmp/expansion-replay.json
```

Original 31-note release evidence remains separate and unchanged. Deployment requires coordinated application and index publication; see [rollout instructions](CORPUS_EXPANSION_200.md#live-publication-and-rollback).
