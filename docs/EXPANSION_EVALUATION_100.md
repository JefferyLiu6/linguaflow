# Paired evaluation of the 200-note English corpus

Status: implementation and offline preparation. No live results are claimed by this protocol.

## Frozen question set

[expansion-fresh-v1.json](../agent/evals/datasets/expansion-fresh-v1.json) contains 100 newly authored public synthetic questions: 60 supported, 15 uncovered English, 15 missing-context and 10 outside the tutor's scope. The supported subset contains 12 original-curriculum cases and six from each of the eight added topic groups. Relevant cards, distracting cards, absent text, unnumbered alternatives and role-override requests exercise different input conditions.

The questions, reference answers, required facts, acceptable notes and expected routes are fixed before collecting outputs. Labels were authored with access to the corpus and historical examples. This is fresh wording in known grammatical families, not independent expert validation or a user-traffic sample. Human review remains pending. Acceptable-note sets are not guaranteed exhaustive: report recall against these labels, not absolute corpus relevance recall.

The offline audit checks normalized question duplication against historical evaluation files and records nearest lexical overlaps. High overlap is visible for review; it does not automatically rewrite a question or tune retrieval. No fresh-set retrieval quality score is collected during preparation. Corpus-aware editorial review of negative cases confirms that generic advice does not supply their missing idiom, word meaning or construction.

The label sources for supported cases reuse the note registry. Uncovered cases use dictionary/grammar sources without adding that content to the runtime corpus. Sources checked through indexed official excerpts are distinguished from directly opened pages in the dataset's review metadata. Missing-context and scope labels come from the application contract, not a grammar authority.

## Comparison

Run each question through the existing sequential release adapter twice:

- `verified`: the current source/context policy, then generation when appropriate.
- `hybrid`: the same candidate retrieval and generation handler, with the verifier bypassed by the benchmark adapter.

Alternate the first arm on successive cases. Both arms retrieve independently against the same version-checked index. Do not claim an identical cached candidate set or production load test. The verified arm can return a fixed clarification or redirection without generation; this difference is part of the measured policy.

Models remain `text-embedding-3-small`, `gpt-4o-mini-2024-07-18` for generation and `gpt-4.1-2025-04-14` for verification and judging. The verifier and judge can have correlated errors. The existing sentence-unit rubric stays unchanged. Judge prompts do not include arm names.

The local adapter uses 12-second embedding, 18-second generation and 8-second verifier timeouts; generation is capped at 500 output tokens. The judge has a 30-second timeout and 2,000-token output cap. Shared evaluation pacing waits outside measured handler latency. Production provider defaults differ, and these measurements exclude browser/public HTTP hops and cold starts.

## Metrics

Report both arms separately and paired verified-minus-hybrid differences:

| Layer | Outputs |
|---|---|
| Candidate ranking | Hit@1/3/5, label recall@1/3/5 and MRR@5; supported questions only. |
| Sources | Selected-source precision; end-to-end supported-source coverage; false-reference and successful-no-reference rates separately for uncovered, missing-context and scope buckets. |
| Routing | Judged action accuracy for every expected case and by bucket; answer-with-disclosure requires an actual answer and the disclosure. Failures and missing judgments are not correct routes. |
| Answer quality | Correctness 0–4, sentence-unit faithfulness, required-fact coverage, teaching usefulness 1–5 and hallucinated-unit/answer rates. |
| Reliability | Request failures, timeouts, failed judgments and evaluation coverage. |
| Latency | p50/p95 per stage, including total local handler latency; judge and evaluation queue times separately. |
| Resources | Token usage, request count, known pipeline cost, judge cost and unknown-cost coverage. |
| Paired effects | Quality, routing/request success, pipeline latency and cost deltas with counts and 2,000 scenario-cluster bootstrap draws (seed 20261116). |

Quality deltas use pairs where both scores are available and applicable; never replace missing judgments with perfect scores. Routing and request success retain all expected cases. Source rates include exact counts and Wilson 95% intervals. Small negative buckets remain statistically uncertain. An incomplete collection produces a partial-status artifact, not a passing comparison; replay rejects missing, duplicate or relabeled records.

The existing diagnostic quality thresholds remain: correctness >=3, applicable faithfulness >=0.90, hallucinated-answer rate <=0.10, usefulness >=4, scope pass >=0.90, request failures <=0.02 and zero failed judgments. They are portfolio diagnostics, not proof of product safety or authorization to deploy. A result does not establish superiority without inspecting the paired differences, coverage and cases. Any tuning after examining this set retires it to development data.

## Cost controls and index prerequisite

The default frozen collection ceiling is **US$5**, not a predicted bill or permission to spend. There are 200 pipeline jobs, at most 500 pipeline provider calls and at most 400 judge attempts, with a global 900-request ceiling. Actual cost depends on inputs and outputs. The SDK wrapper reserves a conservative input/output cost before each request, disables automatic SDK retries, then reconciles recorded usage at uncached input rates. Missing usage retains its reservation and halts collection. A provider response exceeding its reserved token bound also stops further requests. Ordinary metric reports account for observed cached tokens separately.

The rates were checked against [official API pricing](https://developers.openai.com/api/docs/pricing) on 2026-11-16. The budget is a token-cost estimate, not an invoice or account-wide billing limit. Embedding all 200 documents for an evaluation index is separate and has not been performed by this runner.

Live preflight reads the database manifest before any provider client is created. A missing, incomplete or incompatible index blocks collection. The runner never publishes embeddings, changes hosting or deploys code. Use a separately prepared staging index or coordinate publication as described in [the corpus rollout](CORPUS_EXPANSION_200.md); do not publish the new index underneath an old live application merely to run this experiment.

The optional `scripts/run_expansion_eval_local.py` wrapper creates its own localhost-only disposable pgvector container and publishes the notes there, then uses the same evaluation runner. It overrides any application database URL for that process and never loads a database URL from a dotenv file. Index embedding has a separate **US$0.01 / 10-request ceiling**, making the combined default ceiling **US$5.01**. It saves the index receipt and collection results before removing its own container. This tests provider-backed retrieval and generation with a local database, not the deployed service.

## Commands

From `agent/`, with dependencies installed:

```bash
# Offline: a new path is required; existing plans are never overwritten.
python -m evals.expansion.runner freeze \
  --dataset evals/datasets/expansion-fresh-v1.json \
  --plan runs/expansion-fresh-v1-plan.json --max-usd 5
python -m evals.expansion.runner preflight --plan runs/expansion-fresh-v1-plan.json

# Read-only database check, with DATABASE_URL explicitly configured.
python -m evals.expansion.runner preflight \
  --plan runs/expansion-fresh-v1-plan.json --check-index

# Paid collection: requires authorization, API credentials and the matching index.
python -m evals.expansion.runner run --allow-paid \
  --plan runs/expansion-fresh-v1-plan.json \
  --records runs/expansion-fresh-v1-records.jsonl \
  --output runs/expansion-fresh-v1-results.json

# Offline replay of a complete saved run.
python -m evals.expansion.runner replay \
  --plan runs/expansion-fresh-v1-plan.json \
  --records runs/expansion-fresh-v1-records.jsonl \
  --output runs/expansion-fresh-v1-replayed.json
```

Alternatively, from the repository root with `OPENAI_API_KEY` configured and Docker running:

```bash
python scripts/run_expansion_eval_local.py --allow-paid \
  --plan agent/runs/expansion-fresh-v1-plan.json \
  --records agent/runs/expansion-fresh-v1-records.jsonl \
  --output agent/runs/expansion-fresh-v1-results.json
```

Freeze binds code, protocol, labels, model IDs, prices and corpus fingerprint. Changes require a new versioned plan; never replace old hashes to make drift pass. Saved per-request records retain outputs, judgments, timing and budget checkpoints. Source references and metric choices follow task-specific evaluation principles in the [official evaluation guidance](https://developers.openai.com/api/docs/guides/evaluation-best-practices); automated judges still require human calibration.
