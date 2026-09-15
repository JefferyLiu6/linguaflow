# Experiment 01: does reading the question help retrieval?

**Decision:** retain current serving behavior. Add BM25 as a reproducible experimental baseline; do not promote it on these results. Question-aware retrieval recovers concepts missed by metadata, but weak keyword matches produce many unsupported references.

## Hypothesis and controls

Metadata only reads card fields. A learner's question can express a concept absent from those fields. Test whether a simple lexical ranker can recover relevant notes before attributing the problem to the embedding model.

The experiment compares metadata, BM25 using only the question, and BM25 using the question plus card instruction/prompt/answer. All arms use the same unmodified 25 freeform development cases and 43 challenge cases. No labels, corpus wording, or stopwords were adjusted after observing results. No embedding or response-model calls were made. This is an offline experiment, separate from the application's vector path.

## Implementation decisions

- Index the same complete note text as the vector formatter: explanation, examples, labeled counterexample, and tags. Exclude item IDs and expected labels from lexical queries.
- Use BM25 with fixed `k1=1.2`, `b=0.75`; these are initial settings, not optimized winners. BM25 combines term rarity, frequency saturation, and document length normalization. [Stanford IR textbook](https://nlp.stanford.edu/IR-book/html/htmledition/okapi-bm25-a-non-binary-model-1.html).
- Explicit positive IDF variant: `log(1 + (N - df + 0.5) / (df + 0.5))`. Each distinct query term contributes once. The exact formula is covered by a hand-calculated unit test.
- Unicode casefold/tokenization and a fixed function-word list; retain negation. No stemming or synonym expansion. Thus `implementing` does not automatically match `implemented`, and low-information words can remain. These are documented baseline limitations.
- Rank up to five candidates with deterministic ID tie-breaking. Default selection requires a score above zero. A BM25 score is not calibrated confidence.
- Report positive exact-match counts, negative false positives, recall at 1/3/5, and mean reciprocal rank at 5. Recall@5 asks whether the labeled note was anywhere among the five candidates; it does not establish that the answer generator used it correctly.

## Results

| Set / arm | Correct positive selection | False positives | Gold in top 5 |
| --- | ---: | ---: | ---: |
| Development: metadata | 14/22 | 0/3 | Not available |
| Development: question BM25 | 8/22 | 2/3 | 15/22 |
| Development: question + card BM25 | 15/22 | 2/3 | 21/22 |
| Challenge: metadata | 0/31 | 0/12 | Not available |
| Challenge: question BM25 | 21/31 | 10/12 | 30/31 |
| Challenge: question + card BM25 | 14/31 | 10/12 | 31/31 |

These are paired development diagnostics, not independent held-out estimates. A one-case advantage on 22 positives is not evidence of a reliable improvement. The challenge was authored with knowledge of the concepts; its phrasing may favor lexical matches.

### Selection threshold sensitivity

Question-only BM25 on challenge data:

| Require score greater than | Correct positives | False positives |
| --- | ---: | ---: |
| 0 | 21/31 | 10/12 |
| 2 | 21/31 | 8/12 |
| 4 | 21/31 | 2/12 |
| 8 | 16/31 | 0/12 |
| 12 | 10/31 | 0/12 |

These five thresholds were specified before the first run. A stricter threshold reduces irrelevant references but eventually loses relevant ones. No threshold was selected for serving. The apparent zero false-positive result has only 12 negatives and must not be presented as a reliable safety rate. Scores also depend on query length and corpus configuration; one global threshold may be unsuitable.

## Failure analysis

1. **Coverage versus overlap:** a medicine question retrieves a symptom-writing note through “headache.” A past-tense question retrieves conditional inversion through “past.” Matching a term does not establish that the corpus answers the question.
2. **Adjacent concepts:** defining versus non-defining relative clauses share vocabulary. Several wrong top results have the expected note at rank two. Candidate recall is stronger than selection quality.
3. **Possible label ambiguity:** the implementation-versus-deployment question targets technical vocabulary, but the general rewrite note also explicitly teaches that boundary. Some single-gold errors may have acceptable alternatives; a reviewer must adjudicate them before changing labels.
4. **Card context can distract:** it helps the older contextual development set but harms top-1 challenge results. Even the challenge's generic “Answer the learner question” instruction changes term matching. Context inclusion is a decision to test, not an automatic improvement.
5. **Morphology and common words:** unstemmed word forms and remaining low-information words can dominate the wrong match. Do not add ad hoc query-specific rules to make these known cases pass.

## Review packet and next decision

[relevance-review.json](../agent/runs/relevance-review.json) contains all cases where any arm disagrees with the current label, full predictions, candidate scores/matched terms, and empty reviewer decisions. Inspect the original fixture and full notes; record all sufficient notes, no coverage, or unresolved ambiguity. Preserve these baseline results when revising labels. The packet is not blinded because it displays predictions and existing gold labels.

Next gates:

1. Obtain independent relevance review; distinguish wrong ranking, missing coverage, ambiguous query, and incomplete gold labels. Keep review-driven fixture revisions separate from retrieval tuning.
2. Create new scenario-grouped development/test queries. Freeze the test set before selecting retrieval settings. Do not call this challenge set held out after using its failures to design changes.
3. Establish a version-consistent disposable vector index, then compare vector-only and hybrid on the same inputs and corpus as these lexical arms. Measure candidate recall and abstention independently.
4. Promote a policy only after reviewed relevance and answer-quality evidence, including unsupported questions, justify the added complexity. Current live app behavior is unchanged.

## Reproduce

From `agent/` in the tested Python environment:

```sh
python -m retrieval.lexical_benchmark --output runs/lexical-evidence.json --review-output runs/relevance-review.json
python -m pytest tests/ -q
```

[The saved report](../agent/runs/lexical-evidence.json) includes corpus bundle, case, and source fingerprints, exact configuration, per-case rankings, and threshold sensitivity for both splits/lexical arms. CI retains both report and review packet. The diagnostic exits nonzero for invalid inputs; low quality remains visible in the report and is not relabeled as a passing quality gate.

Validation: 143 Python tests passed, including formula, ties, unknown terms, empty input, query leakage checks, ranking-versus-selection metrics, paired cases, and unresolved review status. No live vector evaluation, response-quality study, or deployment was performed.
