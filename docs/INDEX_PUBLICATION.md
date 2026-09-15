# Atomic retrieval index publication

## Problem and implemented contract

The previous sync committed each note separately. A later database failure could leave new text/vectors alongside older notes, while the app joined candidate IDs to newer local content. Embedding-batch validation alone could not prevent a partial database publication.

The supported publisher now commits all contrast notes for one language, removed-note deactivation, and a manifest in **one PostgreSQL transaction**. An exception rolls back that transaction. Query-time reads verify that the manifest matches the app's loaded corpus and embedding configuration and that active-row counts are complete. The same SQL statement checks state and selects candidates, avoiding a separate check/read race.

**Status:** verified locally against a disposable **PostgreSQL 16.15 / pgvector 0.8.6** database. The full suite passed: **146 tests, zero failures, zero skips**. [Machine-readable environment/source evidence](../agent/runs/index-integration.json) and [JUnit test results](../agent/runs/index-integration.xml) are retained. This supersedes the earlier unit-only run with two integration skips. The run used synthetic vectors, not an embedding provider. No migration, reindex, or deployment was executed against the application database.

## Release identity

`manifest_for()` hashes a deterministic serialization of:

- All note fields, including examples, counterexamples, authoring links, routing, and teaching cautions.
- Canonical embedding text for each note.
- Embedding model name, dimensions, and chunk-format version.

Notes are ordered by stable ID before hashing. A metadata or prompt-only change therefore changes the release identity even if vector text would otherwise remain the same. The manifest also stores language, note count, configuration, generation UUID, and publication time. Every published row carries `indexVersion`, matching the corpus fingerprint.

The fingerprint describes local knowledge/configuration, not the provider's unobservable internal model revision. It is separate from the broader data-bundle fingerprint, which also includes drills, sources, and evaluation fixtures. Equal vector dimensions alone do not establish compatibility.

## Prepare, publish, read

1. Validate the complete local data bundle; reject empty/unsupported corpora. A dry run stops here and prints the planned fingerprint without reading the database.
2. Read the current manifest and active/vector coverage. An unchanged, complete snapshot skips all embedding and publication work unless `--rebuild` is requested.
3. Prepare all embeddings outside the write transaction. Validate batch cardinality, finite values, expected dimensions, and nonzero vectors. Provider response indices are checked and sorted to preserve text/vector alignment.
4. Reload local notes and reject a corpus changed during preparation.
5. Acquire a transaction-scoped advisory lock for the language. Compare the stored generation with the one observed before embedding. If another publisher finished first, abort with `index_publication_conflict`; retry from a fresh state.
6. Upsert the full set, deactivate removed contrast notes, verify active vector coverage, and write the new manifest. Commit once; on any exception, roll back and close the connection.
7. At read time, check manifest identity and active/valid row counts in the same statement that selects vector candidates. Reject unversioned legacy indexes, mismatched local content/configuration, and incomplete rows.

Connections have bounded connection, statement, and lock timeouts. External embedding calls do not hold publication locks. The transaction is scoped to one language and contrast-note kind; ID collisions with another language/kind abort rather than overwrite it.

## Failure behavior

| Condition | Behavior |
| --- | --- |
| Invalid source or empty corpus | Fail before publication; empty-corpus retirement requires a separate deliberate procedure |
| Missing DB before preparation | Fail without paying for document embeddings |
| Invalid or missing embedding batch | Publish nothing |
| Source changes while embedding | Abort and retry from a stable checkout |
| Concurrent publisher wins first | Reject stale generation; no overwrite |
| SQL error during publication | Roll back rows, deactivation, and manifest together |
| Missing migration or inaccessible DB | `db_unavailable` |
| No manifest | `index_missing` |
| Local corpus/model differs from published identity | `index_version_mismatch` |
| Active rows or vectors are incomplete | `index_incomplete` |

Freeform retrieval exposes the failure reason and returns no corpus reference. Structured hybrid can retain its existing local metadata fallback with the index failure reason. Live freeform evaluation rejects `index_*` failures, so infrastructure problems cannot inflate correct-abstention scores. Existing structured Tutor/Study actions still use local metadata; BM25 remains experimental.

## Migration and verification

The local Prisma migration `20260915000001_retrieval_publication_manifest` adds nullable `retrieval_doc.indexVersion` and the manifest table. Existing rows remain unversioned intentionally. RLS is enabled on the manifest with no browser-facing policy; the server's DB owner/service connection must have appropriate access. The application has not run this migration automatically.

### Repeat the verified local run

Start Docker Desktop and use the agent virtual environment's Python from the repository root:

```sh
python scripts/check_retrieval_index.py --all
```

The runner creates a unique container bound only to localhost, waits for PostgreSQL, runs the complete suite with integration enabled, records Docker/PostgreSQL/pgvector versions and source fingerprints, and removes its container in `finally`. It does not read the application's database URL or call an embedding provider. It retains `agent/runs/index-integration.xml` and the adjacent JSON environment report. Omit `--all` to run only the five real-database tests.

The recorded run used image `pgvector/pgvector:pg16@sha256:ccc6e83d6e35e931dc7c5def2022729d5a6c370318d099181995567ff1fb4d6b`; pass `--image` to select a specific compatible image. The default tag may change, so compare the captured image digest and source hashes when reproducing evidence. CI uses the same runner and retains both artifacts.

If you already have a disposable pgvector database, explicitly set `RETRIEVAL_TEST_DATABASE_URL` and run `python -m pytest tests/test_index_integration.py -q` from `agent/`. The fixture creates a unique schema, applies both retrieval migrations, and drops that schema afterward. It never implicitly uses application `DATABASE_URL`.

### Verified behaviors

- Initial publication and version-compatible search against real pgvector.
- A late SQL error rolls back earlier writes and preserves the prior manifest.
- A second connection sees the old complete snapshot until publication commits.
- Removed notes deactivate with the publication.
- Two simultaneous publishers produce exactly one winner; the stale generation is rejected.
- Distinct synthetic vectors produce the expected cosine ranking.
- A missing vector causes explicit rejection; sync repairs the incomplete index.
- An unchanged complete index makes no embedding calls; forced rebuild does.
- Republishing the prior corpus restores compatibility with its app revision.

These checks establish behavior in the tested disposable environment; they do not validate hosted database permissions, production concurrency/latency, or semantic relevance.

For a controlled release, use the project's normal Prisma migration process in a controlled environment, publish with `python -m retrieval.sync_embeddings --rebuild`, verify a matching app/index pair, and run the same freeform fixtures used by the lexical experiment. Deploying the new app before a compatible index is available causes explicit vector fallback/unavailability; plan that transition deliberately.

## Tradeoffs and remaining work

- **Full snapshot rebuild:** changed releases embed all 31 notes. This is simple and auditable at current scale; no per-document cache is claimed. Unchanged complete releases skip provider calls entirely.
- **One active version:** transactions preserve the previous snapshot on failure, but successful publications overwrite it. There is no retained snapshot history or instant rollback pointer. Rollback requires restoring the prior corpus/configuration and republishing, with the matching app revision.
- **Generation guard:** prevents a publisher that prepared against an older observed generation from winning later. It cannot identify which Git branch the operator intended to publish; pin the release checkout operationally.
- **Version mismatch:** an older app does not consume a newer index; it falls back explicitly. Serving several app versions concurrently without degraded retrieval requires retained versioned snapshots or coordinated deployment.
- **Integrity boundary:** checks assume the supported publisher owns writes. Direct SQL modifications, admin tampering with hashes, and independent legacy writers are outside the contract; restrict write permissions operationally.
- **No live relevance evidence yet:** synthetic-vector integration cannot establish embedding quality, threshold suitability, answer faithfulness, or end-to-end latency.

Next: obtain independent relevance-label review and perform vector-only/hybrid comparisons against the preserved BM25 evidence on a version-matched disposable index.
