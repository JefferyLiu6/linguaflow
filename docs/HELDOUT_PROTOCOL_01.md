# Frozen retrieval evaluation 01 — protocol written before execution

## Question and scope

Does the unchanged deployed freeform retrieval policy select an applicable teaching
note for new English-learning scenarios, and avoid attaching a note when this
corpus cannot answer the question? Compare metadata, BM25, exact cosine vector
search, and the existing hybrid policy. This evaluates retrieval, not generated
answer correctness, learner improvement, security, or production capacity.

This is an **AI-authored, corpus-aware synthetic holdout**: the questions and
labels are new and frozen before execution. The assistant writing it has seen the
corpus and historical development findings. It is held out from retrieval runs
and parameter selection, not from its author's knowledge. No independent human
review, unseen document generalization, or real-user sampling is claimed.

## Cases and labels

- 93 English queries: 62 positives (two distinct scenarios for each of 31 notes)
  and 31 negatives.
- Each concept has one question without a card and one with a novel card. No
  original drill IDs, taxonomy metadata, or known authoring-item boosts are used.
- Negative slices: 12 unsupported language topics; 10 requests for domain advice
  or facts; four insufficient-context questions; five out-of-scope requests
  paired with the same misleading passive-voice card.
- A negative means **none of the teaching notes answers the actual question**,
  not that an LLM must refuse all help. General English questions may be answered
  from general knowledge without claiming a retrieved source.
- Labels include a primary note, predeclared acceptable alternative notes where
  rules overlap, and a rationale. Primary-note accuracy is a stricter secondary
  metric; it avoids hiding the effect of permissive alternative labels.
- Labels were checked by the same AI assistant against note text before runs.
  They remain fallible and are not independent ground truth.
- Reject duplicate IDs, invalid sources, taxonomy shortcuts, and token-Jaccard
  question overlap >= 0.70 with historical development/challenge questions or
  earlier new cases. Publish the nearest overlap per question. This lexical
  audit does not prove semantic independence or absence of model-training overlap.

## Locked comparison

Use the production `format_query_from_question` for BM25, vector and hybrid.
Unlike the earlier diagnostic's unlabelled raw concatenation, this includes the
actual `Question:` and `Card ...:` labels. Metadata sees the card only, as a
card-based baseline. Every arm has the same available card; metadata deliberately
does not interpret the user's freeform query. All notes are single chunks.

- Embedding: `text-embedding-3-small`, 1,536 dimensions.
- BM25: existing tokenizer, k1=1.2, b=0.75, select top result only above zero.
- Vector: exact cosine across all 31 notes, top ten, select if cosine >= 0.30.
- Hybrid: invoke the current serving function using replayed query embeddings
  and exact-vector candidates; alpha=0.6, metadata cap=20, top ten, threshold=0.30
  applied to the top reranked candidate's vector score, exactly as serving does.
- Metadata: unchanged structured retriever, existing threshold and tagger.
- No threshold sweeps, prompt/model changes, document edits, exclusion of failures,
  label repairs based on predictions, or selecting the best system after the run.
- Whole-corpus prompting is an important answer-generation baseline, but it is
  not a source-selection baseline: supplying all documents trivially covers
  every positive and also every negative. No RAG-versus-whole-context answer
  quality claim follows from this experiment.

## Metrics and decision rule

Primary: accepted top-one source accuracy on 62 positives and false-positive
retrieval rate on 31 negatives, shown separately. Also show strict primary-source
accuracy, positive misses, wrong sources, source precision among non-abstained
queries, coverage, Recall@5 before abstention, and balanced accuracy (mean of
positive accuracy and negative abstention rate). Metadata's Recall@5 is limited
to its single returned candidate, not a full metadata ranking.

Before execution, set project targets for the **current hybrid** to positive
accuracy >= 80% and negative false-positive rate <= 10%. These are exploratory
project targets, not industry standards. A failed target remains a failure; do
not rename it a passed quality gate or change thresholds to make it pass.

Show Wilson 95% intervals for proportions as descriptive summaries. For paired
hybrid-minus-baseline balanced accuracy, resample positive concept groups and
negative scenario groups separately, 2,000 draws with seed 73193. Group the five
misleading-card negatives together. Report paired bootstrap intervals rather
than declaring significance from point estimates. Designed sampling, label
uncertainty, shared linguistic templates and small slice counts limit inference.

## Freeze, budget and reproducibility

`heldout_v1.lock.json` records dataset, corpus, historical fixture, protocol and
retrieval/evaluation code hashes, parameters, timestamp and parent Git revision.
Commit and push the freeze before any embedding collection or scoring. The
runner rejects drift and refuses to overwrite an existing artifact/report.
After the first results are inspected, use the set only as a fixed regression
suite. A future tuned-system generalization claim needs a new untouched set.

Bounded collection: at most seven embedding API requests, batches of 20, at most
100,000 total UTF-8 input bytes, no automatic retries, no generation calls. Save
successful batches if later requests fail; incomplete artifacts cannot be scored.
This is an input/request cap, not a dollar guarantee. Record billed tokens.
Publish the compressed vectors for offline replay; they contain only authored
benchmark questions and public corpus notes, no user submissions or credentials.
Artifact origin is metadata, not cryptographic attestation by the provider.

```bash
cd agent
python -m retrieval.heldout_eval freeze
# Commit the freeze before the next command. Supply OPENAI_API_KEY securely.
python -m retrieval.heldout_eval collect \
  --artifact runs/heldout-v1-vectors.json.gz --output runs/heldout-v1-results.json
python -m retrieval.heldout_eval replay \
  --artifact runs/heldout-v1-vectors.json.gz --output /tmp/heldout-replay.json
# Optional read-only production pgvector parity check; requires DATABASE_URL.
python -m retrieval.heldout_eval database-check \
  --artifact runs/heldout-v1-vectors.json.gz --output runs/heldout-v1-database.json
```

The optional database check runs the same queries with cached embeddings through
the current pgvector index and serving retrieval function. Infrastructure errors
invalidate it rather than becoming abstentions. It does not generate answers,
call the public HTTP endpoint, bypass public rate limits, or measure load.
