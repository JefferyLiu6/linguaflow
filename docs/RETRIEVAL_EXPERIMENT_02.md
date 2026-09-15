# Experiment 02: a paired semantic-retrieval comparison

**Status: provider experiment completed on 2026-09-15.** All nine requests succeeded using `text-embedding-3-small` at 1,536 dimensions, with **8,589 provider-reported input tokens**. Offline replay reproduced the entire report exactly without another API call. [Full paired results](../agent/runs/retrieval-comparison.json) and [verification record](../agent/runs/provider-experiment-verification.json) are preserved. The [preflight](../agent/runs/retrieval-comparison-plan.json) remains the original pre-run estimate.

**Decision:** keep the current serving policy unchanged. The semantic arms improve several results, but remaining false positives and unreviewed single-gold labels do not justify a production-quality claim.

## Question and decision rule

Does semantic retrieval improve relevance over a question-aware BM25 baseline enough to justify the dependency, and does adding card metadata help or hurt final selection?

Experiment 01 found useful BM25 candidate coverage but many false positives on unsupported questions. This experiment keeps its 25 development and 43 challenge cases and the 31-note corpus fixed. It changes the retrieval method. Do not promote a method because its positive accuracy alone increases; inspect false positives, ambiguity, candidate recall, and per-case disagreements. Independent label review and a genuinely untouched test set remain necessary.

## Measured results

All values below use the original fixed thresholds: BM25 score above zero and vector cosine at least 0.30. No corpus, questions, labels, weights, or thresholds were changed after the run.

| Arm | Development correct positives | Development false positives | Challenge correct positives | Challenge false positives |
| --- | ---: | ---: | ---: | ---: |
| Metadata | 14/22 | 0/3 | 0/31 | 0/12 |
| BM25 question | 8/22 | 2/3 | 21/31 | 10/12 |
| Vector question | 10/22 | 0/3 | 23/31 | 4/12 |
| Hybrid question, no card metadata | 10/22 | 0/3 | 23/31 | 4/12 |
| BM25 question + card | 15/22 | 2/3 | 14/31 | 10/12 |
| Vector question + card | 17/22 | 2/3 | 26/31 | 5/12 |
| Hybrid question + card | 20/22 | 1/3 | 26/31 | 4/12 |

### What improved

- On question-only challenge inputs, vector selection adds two correct positive selections over BM25 and reduces false positives from ten to four. The improvement is specific to these fixtures, not a general model-quality estimate.
- With card context, hybrid improves over BM25 by five correct development selections and twelve challenge selections. Paired analysis shows **5 wins / 0 losses** on development positives and **13 wins / 1 loss** on challenge positives.
- Both vector variants contain every positive gold note within their ten candidates. On challenge data, every gold note appears within the top three before abstention. This suggests a useful candidate-generation baseline; it does not establish that final selection or generation is correct.
- Question-only hybrid matches vector ordering, as expected when no card metadata is supplied. This is a useful control for the experiment.

### Where it still fails

1. **Adjacent concepts:** the passive-voice question selects single-verb phrasing at cosine 0.344 versus 0.342 for the gold note. Defining/non-defining relative clauses also remain confused. Close scores are diagnostic evidence, not calibrated confidence.
2. **Threshold misses:** the outage-causality and implementation-versus-deployment questions have the gold note ranked first, but scores of 0.294 and 0.257 fall below 0.30. Consequently question-only challenge recall@1 is 25/31 before abstention, while correct selected positives are 23/31.
3. **Unsupported grammar:** article choice, irregular verbs, and agreement can retrieve general language notes despite lacking the requested lesson. The article-choice question reaches cosine 0.458 against a synonym note. High similarity alone does not establish answerability.
4. **Label overlap:** profit/receipts and synonym-precision questions can select a different note that teaches a related boundary. Independent adjudication must distinguish a retrieval error from an incomplete single-gold label.
5. **Context effects:** adding card context improves positive selection here but also introduces negative errors. The older development negatives number only three; a change of one case is not a stable false-positive estimate.

### Threshold tradeoff, not a tuned release

For hybrid with card context:

| Minimum cosine | Development correct / false positives | Challenge correct / false positives |
| --- | --- | --- |
| 0.30 | 20/22; 1/3 | 26/31; 4/12 |
| 0.40 | 20/22; 0/3 | 20/31; 1/12 |
| 0.50 | 14/22; 0/3 | 7/31; 0/12 |

Raising the threshold to 0.40 removes some unsupported selections but loses six correct challenge selections. At 0.50 it abstains on all twelve challenge negatives but retains only seven correct positives. No new threshold was selected or deployed. These already-inspected cases cannot subsequently be called held out.

The [semantic relevance-review packet](../agent/runs/semantic-relevance-review.json) preserves disagreements, original questions/card context, predictions, and empty reviewer decisions. It does not overwrite the earlier lexical review packet or the evaluation labels.

## Paired arms and input controls

| Arm | Information used | Candidate/selection policy |
| --- | --- | --- |
| Metadata | Existing card fields; ignores question | Existing local metadata policy |
| BM25 question | Question text only | Fixed BM25 settings; select top score above zero |
| Vector question | Exactly the same question string | Exact cosine; retain ten candidates; top selection requires cosine at least 0.30 |
| Hybrid question | Same question vector; empty card metadata | Existing reranking formula; expected to agree with vector ordering without metadata |
| BM25 question + card | Question, instruction, prompt, answer | Same lexical settings |
| Vector question + card | Exactly the same concatenated string | Same cosine policy |
| Hybrid question + card | Same vector candidates plus card metadata | Existing 60/40 vector/metadata formula by default; selected candidate must still meet vector threshold |

The metadata arm has card information even when question-only arms do not. That is an explicit information ablation, not a claim that every arm has identical features. Within each question variant, BM25 and vector receive byte-identical text; query hashes in every row verify this. Item IDs and expected labels are excluded from query text. Hybrid card metadata retains the existing synthetic evaluation IDs; they do not match real authoring links.

This experiment reuses the existing hybrid reranker. It uses raw query strings from the lexical experiment, so it is **not identical to the live freeform formatter**, which adds field labels. Live end-to-end parity remains a later check.

## Why exact search first

At 31 notes, exact in-memory cosine is small enough to evaluate without introducing a database or approximate-nearest-neighbor configuration into the relevance comparison. The pgvector publication path has already passed separate real-database tests. Keeping these experiments separate helps distinguish a ranking-policy problem from an index/deployment problem.

Cosine uses explicit normalization and deterministic ID tie-breaking. The model remains `text-embedding-3-small` at 1,536 dimensions; this is the existing starting configuration, not a model-selection winner. The implementation follows the [official embedding guide](https://developers.openai.com/api/docs/guides/embeddings) for model inputs and cosine comparison. No larger model or alternate provider is silently substituted.

## Budget and artifacts

The current preflight schedules **166 unique inputs in 9 requests**: 31 document texts and two query variants for each of 68 cases, with duplicate text deduplicated. Total input is **43,478 UTF-8 bytes**, with a maximum of **1,285 bytes per input**.

Defaults permit at most ten requests and 100,000 input bytes; each input is capped at 8,000 bytes and each batch at 20 inputs. Byte counts are conservative token upper bounds, not actual billed usage. The provider reports actual token usage per successful batch. This is an input/request ceiling, not a fixed dollar price. Consult current provider pricing before a paid run.

Collection uses no automatic SDK retries and a 45-second request timeout. It validates the returned model, response indices, dimensions, finite values, and nonzero vectors. Failed or partial collection produces no completed vector artifact; a retry may incur charges again for earlier successful batches. Partial-batch resume and exact cost accounting after failed requests are not implemented.

A complete artifact binds corpus/configuration and query/label identity, carries per-batch usage and timing, and hashes the stored vectors. Replay rejects missing vectors, checksum changes, or a different current experiment. Checksums detect changes; they do not prove that a user-edited artifact genuinely originated from a provider. Synthetic artifacts are explicitly labeled `synthetic_test_only`.

Store embeddings under the locally excluded `.private/` directory to keep large vector arrays out of commits. A public report contains rankings, configuration, hashes, and usage, not API keys or embedding arrays. Replaying an existing artifact makes no API or database calls. Collection refuses to overwrite an existing artifact.

## Run it

From `agent/`, using the agent virtual environment:

```sh
# Offline: validate inputs and inspect the planned request/input budget.
python -m retrieval.retrieval_comparison plan --output runs/retrieval-comparison-plan.json

# Configure OPENAI_API_KEY in the local process environment first.
# This command makes bounded paid embedding requests, then evaluates the artifact.
python -m retrieval.retrieval_comparison collect \
  --artifact ../.private/embedding-experiment-02.json \
  --output runs/retrieval-comparison.json

# Offline replay of the exact same artifact.
python -m retrieval.retrieval_comparison replay \
  --artifact ../.private/embedding-experiment-02.json \
  --output runs/retrieval-comparison-replay.json
```

Keep credentials in local environment/secret management, not in Git or chat. The CLI does not automatically load `.env` files. The live collector is not run in ordinary CI: CI runs offline preflight and mocked/synthetic contract tests only.

## What the saved report contains

- Paired positive selection accuracy and unsupported-question false positives.
- Gold-note recall at 1/3/5, mean reciprocal rank at 5, and vector candidate recall at 10.
- Per-case selected notes, scores, query hashes, and candidate lists.
- Fixed vector-threshold sensitivity at 0.2/0.3/0.4/0.5/0.6; no threshold is selected from these results automatically.
- Corpus/query/source/vector fingerprints and provider batch usage/timing.

Ranking metrics include candidates below the selection threshold; a high candidate recall does not imply safe final selection. Hybrid thresholds apply to the reranked winner's cosine score, not its combined score, matching the existing freeform selection condition.

The nine successful batches total 7,523 ms of observed embedding-call time. This includes batches of different sizes; they are not production query p50/p95 latency. This report does not measure generated-answer faithfulness, teaching quality, pgvector service latency, learning outcomes, or independent held-out generalization. Current single-gold labels may omit acceptable alternatives; preserve disagreement cases for review.

## Verification and next step

Unit checks cover budgets, missing credentials, vector corruption/configuration mismatch, response alignment, cosine normalization/ties, paired query identity, synthetic-result labeling, and replay without a provider. The full suite passed with disposable pgvector integration enabled: **156 passed, zero skipped**. See the [environment and source report](../agent/runs/comparison-validation.json) and [JUnit results](../agent/runs/comparison-validation.xml).

Next: independently adjudicate the relevance-review packet, freeze new scenario-grouped test queries, and compare answer quality under card-only, full-corpus, retrieved-context, and gold-context conditions. Separately verify the live freeform formatter and pgvector path; this exact-search experiment is not a live-serving benchmark. Do not expand the embedding-model comparison until the failure analysis shows which remaining problem a new model is expected to solve.
