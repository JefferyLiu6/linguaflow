# Operational experiment 01: local retrieval and failure guards

## Question and decision

Can the current 31-note database read path return correct results under modest concurrency, and do missing/incomplete indexes fail explicitly rather than masquerading as successful abstentions?

**Result:** all 600 measured requests behaved as expected. Keep the current read path; these measurements do not justify adding caching, connection pooling or another search service yet. They also do not establish production capacity. Measure the deployed endpoint before deciding whether connection setup or query work is the bottleneck.

## Method

- Disposable localhost-only Docker PostgreSQL 16.15 and pgvector 0.8.6; exact image digest and platform recorded in `agent/runs/operations-validation.json` and `operations-benchmark.json`.
- Actual migrations, actual `publish_corpus` and `query_by_vector`; unique test schema, removed after the run. The container was also removed.
- 31 real note records with distinct orthogonal synthetic 1,536-dimensional vectors. Queries rotate through these vectors and verify the top result. No provider embeddings or generated answers are involved.
- Three scenarios, each 100 requests at concurrency 1 and 100 at concurrency 5: missing manifest, complete index, and a published index with one embedding removed.
- Ten untimed warmup queries precede the complete-index measurements. Each request uses a fresh connection, matching the current implementation; the test additionally sets the isolated schema search path.
- A bounded worker pool completes 100 queries. Per-request latency starts when a worker begins execution, excluding executor queue time. Throughput includes the entire scenario wall time. This is a closed-loop concurrency experiment, not an open-loop arrival-rate or saturation test.
- Query timing includes local corpus loading/fingerprinting, connection setup, fixture schema setup, SQL and result conversion. It excludes HTTP, query embedding, reranking and generation.

## Results

| Scenario | Concurrency | Requests | p50 ms | p95 ms | Completed requests/sec | Unexpected results |
| --- | --- | --- | --- | --- | --- | --- |
| missing_index | 1 | 100 | 8.31 | 10.26 | 117.9 | 0 |
| missing_index | 5 | 100 | 11.61 | 15.70 | 400.7 | 0 |
| warm_complete_index | 1 | 100 | 8.93 | 10.48 | 112.3 | 0 |
| warm_complete_index | 5 | 100 | 11.20 | 15.79 | 420.7 | 0 |
| incomplete_index | 1 | 100 | 7.97 | 9.82 | 123.3 | 0 |
| incomplete_index | 5 | 100 | 12.52 | 18.36 | 373.8 | 0 |

The 200 complete-index queries returned the expected top result. The 200 missing-index queries returned `index_missing`; the 200 incomplete-index queries returned `index_incomplete`. Expected guard failures are counted separately from successful retrieval. Their request rates are not successful-answer throughput.

The first query after publication took 7.79 ms. This is a descriptive observation, **not a cold-start benchmark**: the Python process and database had already performed work, and publication may have warmed caches.

## Reproduce

With Docker running, use the project's Python environment from the repository root:

```sh
python scripts/check_retrieval_index.py --all \
  --output agent/runs/operations-validation.xml \
  --operations-output agent/runs/operations-benchmark.json \
  --image pgvector/pgvector:pg16@sha256:ccc6e83d6e35e931dc7c5def2022729d5a6c370318d099181995567ff1fb4d6b
```

Choose new output paths to preserve this recorded run. The runner removes application database and OpenAI credentials from the test environment and creates its own localhost database. It makes no paid provider requests.

Raw per-request samples and source fingerprints are retained. The complete suite passed **170 tests**, with no skips and one dependency deprecation warning. This is implementation evidence, not answer-quality evidence.

## Limits and next experiment

The dataset is tiny; orthogonal vectors make correctness assertions deterministic but do not model semantic retrieval quality. One local run cannot characterize variance across machines or the deployed network. No production load, provider outage, HTTP timeout, cold-process distribution, or concurrent publication load was measured here.

The next performance gate is an authenticated deployed tutor endpoint experiment with a fixed case mix, independently timed retrieval and generation, and a separate provider budget. Run warm scenarios with at least 100 requests at concurrency 1 and 5; measure end-to-end p50/p95, errors, tokens and cost. For cold measurements, define exactly which process, connections and caches reset and retain individual samples. Do not label this local run or the eight-request-per-arm answer pilot as production p95.

AI-assisted answer evaluation and a genuinely untouched evaluation set remain separate gates. Neither more load-test requests nor lower latency can substitute for them.
