# Held-out retrieval evaluation 01

## Outcome

The frozen current hybrid policy found an accepted source on **52/62 positives
(83.9%)**, but attached an irrelevant source on **16/31 negatives (51.6%)**.
It **failed** the predeclared abstention target. Vector-only produced the same
selected source or abstention on all 93 cases. This experiment supports semantic
retrieval over the fixed lexical baseline for these cases, but does not establish
an advantage from hybrid reranking or production-ready source selection.

This is a **corpus-aware, AI-authored synthetic holdout**, not an independent
human-authored or real-user test. Its questions were held out from execution and
parameter selection until the pre-run freeze. Known concepts and documents were
visible to the author. After this first run, this set is a regression suite; it
must not be reused as an untouched test for a tuned successor.

## What was fixed before looking at results

[Protocol](HELDOUT_PROTOCOL_01.md), labels, 93 queries, relevance alternatives,
source code, corpus and parameters were frozen and pushed in commit
[`b970703`](https://github.com/JefferyLiu6/linguaflow/commit/b970703).
The complete lock is `agent/knowledge/evaluation/heldout_v1.lock.json`.
The target was >=80% accepted-source accuracy on positives **and** <=10%
false retrieval on negatives. No threshold sweep, corpus edits or serving
changes followed the result. The positive target passed; the joint gate failed.
These point-estimate targets are project decisions, not statistically established
population guarantees.

Cases cover all 31 notes with two new scenarios each: one without a card and one
with a novel card. Thirty-one negatives cover unsupported English topics,
domain requests, insufficient context and misleading cards. No original drill
IDs or taxonomy metadata give the system an exact authoring-item match.
Every case has a primary source, predeclared acceptable alternatives and a label
rationale. A lexical duplicate audit was completed before freeze. Semantic
similarity to old tests of the same teaching concepts remains a limitation.

## Results

| Fixed arm | Accepted source /62 | Strict primary /62 | False retrieval /31 negatives | Recall@5, positives | Balanced accuracy |
|---|---:|---:|---:|---:|---:|
| Card metadata | 0 (0.0%) | 0 (0.0%) | 5 (16.1%) | 0.0% | 41.9% |
| BM25, score >0 | 33 (53.2%) | 26 (41.9%) | 31 (100%) | 83.9% | 26.6% |
| Exact vector, cosine >=0.30 | 52 (83.9%) | 49 (79.0%) | 16 (51.6%) | 95.2% | 66.1% |
| Current hybrid | 52 (83.9%) | 49 (79.0%) | 16 (51.6%) | 95.2% | 66.1% |

Balanced accuracy averages positive accepted-source accuracy and negative
abstention rate. It is not answer accuracy. Recall@5 is measured before
abstention, so it can be high even when the system attaches an irrelevant source.
Hybrid has two positive abstentions and eight wrong-source selections under the
frozen labels. Only **52/76 selected sources (68.4%)** are accepted positives.

The metadata baseline cannot understand a freeform query; it sees only a card
without the normal drill taxonomy. Its zero positive score reflects that boundary,
not a claim that metadata fails on the supported structured-drill workload.
BM25's existing threshold of zero is deliberately unchanged and poorly suited to
abstention. This does not prove vector search beats a separately tuned lexical
system. Vector-only is the strongest simplicity comparison here, and hybrid
shows no improvement over it.

### Uncertainty

Hybrid's descriptive Wilson 95% interval is **72.8–91.0%** for accepted-source
accuracy and **34.8–68.0%** for negative false retrieval. The sample is too small
and deliberately constructed to treat these as real-traffic performance bounds.

Paired, stratified group bootstrap intervals for balanced-accuracy differences
(2,000 draws; concept groups for positives; shared distractor card grouped):

| Comparison | Difference | 95% bootstrap interval |
|---|---:|---:|
| Hybrid minus metadata | +24.2 percentage points | +12.1 to +33.9 |
| Hybrid minus BM25 | +39.5 percentage points | +27.4 to +53.2 |
| Hybrid minus vector | 0.0 percentage points | 0.0 to 0.0 |

The zero interval reflects identical correctness outcomes on this sample, not
proof that the systems are equivalent on all inputs. Label uncertainty, synthetic
authorship, template correlations and sampling choices are not erased by intervals.

## Failure analysis

| Hybrid slice | Observation | Engineering implication |
|---|---|---|
| Positive, no card | 26/31 accepted | Some implicit grammar questions are missed |
| Positive, with card | 26/31 accepted | Aggregate parity is not a paired proof that cards help |
| Unsupported English topics | 7/12 false retrievals | Broad linguistic similarity is mistaken for source coverage |
| Domain requests, no card | 0/10 false retrievals | These ten successes do not establish general scope safety |
| Insufficient context | 4/4 false retrievals | Missing referents need a clarification decision |
| Out-of-scope request + grammar card | 5/5 false retrievals | Card content overwhelms what the learner actually asked |

Concrete examples:

- **Implicit grammar:** “Nobody has watered the orchids…” receives no source;
  the passive rule is missed. The dangling participle about a taxi carrying a
  cello is also missed. Similarity thresholds can reject valid paraphrases.
- **Domain distractor:** a question about combining calibration and recording
  in time order selects scientific register instead of participle clauses.
- **Missing evidence:** a semicolon question selects participle clauses. Being
  about clauses does not make that note an answer to semicolon punctuation.
- **Missing context:** “What does the highlighted bit refer to?” retrieves a
  relative-clause note even though no highlighted text was provided.
- **Context dominance:** a train-fare request alongside a passive-voice card
  retrieves the passive note. The same happens for a medication request; this
  is a retrieval failure, **not an observed medication recommendation**, because
  this experiment did not call answer generation.

Labels themselves have limits. For `heldout_p06_2`, the selected workplace note
says professional writing need not be impersonal; it may partly answer the
passive-wording question despite being outside the frozen accepted set. This is
an adjudication candidate, not a post-hoc score correction. All published scores
retain the original labels. An independent label review could change estimates.
See the [complete failure ledger](HELDOUT_FAILURES_01.md).

## Interpretation and next development work

1. **Do not claim hybrid superiority.** Retain vector-only as the simpler
   candidate; justify additional metadata only on workloads with useful metadata.
2. **Separate answerability from ranking.** Develop clarification and unsupported-
   question handling on development data; a cosine threshold is not calibrated
   evidence of whether a note answers the question.
3. **Test query versus card relevance separately.** A development ablation should
   compare question-only and card-conditioned retrieval for topic changes.
4. **Improve evidence support checks before increasing top-k.** Returning more
   vaguely related notes can worsen misleading citations. Recall@5 already exceeds
   selected-source accuracy substantially.
5. **Do not fix this test until it passes.** Any new policy needs development data
   and another frozen set. Keep this first result as the baseline regression report.
6. **Evaluate answers separately.** Card-only and whole-corpus prompting are
   essential answer-quality baselines for a 31-note corpus; this retrieval study
   cannot establish that RAG improves final explanations or learning outcomes.

## Reproduction and evidence

- Frozen cases: `agent/knowledge/evaluation/heldout_v1.json`.
- Raw predictions, slices and metrics: `agent/runs/heldout-v1-results.json`.
- Public compressed embeddings: `agent/runs/heldout-v1-vectors.json.gz` (~0.85 MB).
- Read-only pgvector parity results: `agent/runs/heldout-v1-database.json`.
- Validation summary: `agent/runs/heldout-v1-validation.json`.

Collection used **7 embedding requests / 8,645 billed embedding tokens**, with
no generated-answer calls. Saved embeddings allow replay without an API key.
An offline replay exactly reproduced every selection, metric, slice, paired
interval and target decision. Follow the commands in the protocol.

The database check matched **93/93 selected sources or abstentions** using cached
query embeddings through production pgvector and the serving retrieval function.
Its first attempt aborted at `heldout_n26` with `db_unavailable`; that attempt is
recorded separately as invalid and no fallback was scored. After connectivity
recovered, the entire unchanged set was rerun successfully. It is not a public-endpoint or load benchmark.
No production retrieval parameters were changed by this evaluation.
