# LinguaFlow RAG engineering update plan

**Semantic comparison:** [Experiment 02](RETRIEVAL_EXPERIMENT_02.md) now provides bounded embedding collection and offline replay across metadata, BM25, exact-vector, and hybrid arms. Provider run completed: nine requests, 8,589 input tokens. Hybrid with card context selected 26/31 challenge positives with 4/12 false positives; offline replay matched exactly. No serving policy was changed.


**Index update:** [Atomic publication and version checks](INDEX_PUBLICATION.md) are implemented locally. The full Python suite passed against a disposable PostgreSQL/pgvector database: **146 tests, zero skips**. No application database migration or provider-backed reindex has run.


**Retrieval experiment update:** [Experiment 01](RETRIEVAL_EXPERIMENT_01.md) now provides a fixed BM25 baseline, paired rankings, threshold sensitivity, and a pending relevance-review packet. The data corpus and serving policy are unchanged.


**Status:** data-side v2 implemented locally; atomic index publication verified on a disposable database; the provider-backed exact-search comparison is complete; AI-assisted answer evaluation and deployed endpoint testing remain pending. This is a staged plan, not a completed production release.
**Objective:** turn the existing RAG prototype into a reproducible, testable engineering project whose data lifecycle, retrieval decisions, failure behavior, and measured limitations can be demonstrated from a clean checkout.  
**Scope:** one engineer, existing Next.js/FastAPI/PostgreSQL stack, existing English teaching corpus.  
**Planning estimate:** 15–22 focused engineering days, excluding deployment access. Estimates are provisional and should be revised after the first milestone.

## Data-side progress — 2026-09-15

Completed: canonical shared drills, 99 documented editorial revisions, 31 expanded/reference-linked notes, explicit provenance and coverage, repaired evaluation identities, 43 new challenge cases, deterministic validation, failure tests, CI reports, and indexing failure guards. See [dataset card](DATASET_CARD.md). M1 data contracts are implemented; AI-assisted evaluation and a pinned dependency lock remain open. M2 now includes atomic publication, a corpus/configuration manifest, concurrent-publisher checks, and reader version checks; real pgvector integration passed locally; controlled release remains pending. M3 has better development/challenge fixtures, but no independent held-out set.

The historical findings below explain the original priorities. Use the dataset card for current counts and behavior.

## Data audit prerequisite — historical baseline

The [data audit](RAG_DATA_AUDIT.md) found 24 confirmed example-to-drill mismatches, inconsistent reuse of real IDs in evaluation fixtures, meaning-changing rewrites, and incomplete concept coverage. **Repair the data before expanding the corpus or tuning retrieval.** M1 must include the audit's repair gate: corrected relationships/content, explicit disposition of the 171 English drills, repaired evaluation identities, and a new versioned baseline. Data repair/editorial review was not included in the original 15–22-day estimate; re-estimate after triage. The ID ablation also removes ID-derived taxonomy, so do not interpret it as isolating only the direct +8 lookup signal.

## 1. Product contract

For a learner asking about a drill, select a relevant teaching reference and produce a short, useful explanation. Preserve the distinction the exercise is teaching, and make it visible when an answer has no supporting corpus reference.

The upgrade should demonstrate five capabilities:

1. Maintain validated, reproducible knowledge data.
2. Publish a complete, internally consistent search index.
3. Choose retrieval using comparative evidence rather than tool count.
4. Measure retrieval and generated-answer quality separately.
5. Operate the demo with explicit service failures, bounded work, and reproducible setup.

**Non-goals for this release:** more languages, a large scraped corpus, fine-tuning, a new vector database, multi-agent orchestration, comprehensive UI redesign, or claims of production scale or improved learner outcomes. Existing unrelated data-model backlog items remain separate.

## 2. Starting evidence and priority

The [case study](RAG_ENGINEERING_CASE_STUDY.md) records the implementation audit. The current local changes add an offline benchmark, ID ablation, evaluation failure handling, CI artifacts, and documentation. They are a starting point for review, not proof that the entire pipeline is hardened.

| Finding | Consequence | Priority |
| --- | --- | --- |
| Text can change while a failed embedding update preserves an old vector | Search can select against different content than generation uses | P0: index correctness |
| Rebuild/version/hash behavior is incomplete | Index updates are not reliably reproducible | P0: data lifecycle |
| Embedding responses are consumed without strong batch-shape validation | Missing/misaligned vectors could silently drop or corrupt records | P0: ingestion contract |
| ID removal lowers positive exact match from 27/27 to 19/27 | Current perfect score depends on known-item signals | P1: honest retrieval evaluation |
| Freeform metadata gets 15/22 positives and 0/3 negative abstentions | Card context alone does not answer question relevance | P1: fair question-aware baselines |
| Structured hybrid helper is not wired into structured handlers | Documentation and actual request paths must stay aligned | P1: integration contract |
| No live hybrid or generated-answer quality evidence | Cannot claim RAG or hybrid superiority | P1: controlled experiments |
| Optional tracing is mocked; dependencies use broad bounds | A passing offline suite does not prove a reproducible operational demo | P1: environment and smoke tests |

## 3. Delivery sequence

| Milestone | Estimated effort | Deliverable | Depends on |
| --- | ---: | --- | --- |
| M1. Reproducible environment and corpus validation | 2–3 days | Clean setup, validation CLI, corpus manifest | Existing audit |
| M2. Correct index lifecycle | 3–4 days | Safe incremental sync, versioned publication, rollback test | M1 |
| M3. Independent evaluation contract | 3–4 days | Reviewed dev/test data and common retrieval harness | M1; live execution needs M2 |
| M4. Retrieval experiment and integration | 2–3 days | Baseline comparison, decision record, tested live call paths | M2 + M3 |
| M5. Answer quality and failure policy | 3–4 days | Grounding evaluation, honest fallback behavior, adversarial tests | M4 |
| M6. Operational verification and release evidence | 2–4 days | Bounded requests, live smoke test, runbook, demo evidence | M2–M5 |

Implement sequentially in small reviewable PRs. M3 dataset authoring can proceed while M2 is being tested, but do not tune retrieval on test labels. Keep actual status in this document or linked issues; do not label planned metrics as achieved.

## 4. M1 — Reproducible environment and corpus validation

### Changes

- Select one supported Python version consistent with CI and pin the tested dependency environment. Verify the actual Langfuse client API instead of assuming an installed SDK matches the tracing code.
- Add `python -m retrieval.validate_corpus` with machine-readable diagnostics and a nonzero exit on invalid input.
- Validate unique/nonempty IDs, required teaching text, language/kind/route values, example structures, and supported metadata vocabulary. Check authoring/example references against the known drill catalog where available; report deliberately external references separately.
- Preserve instructional punctuation, capitalization, negation, and casual/formal wording. Normalize metadata only according to documented rules.
- Detect exact duplicates; flag near-duplicate or overlapping concepts for editorial review. Do not automatically merge adjacent teaching concepts.
- Add a manifest containing corpus digest, record count, schema/formatter versions, and provenance/review fields that distinguish known facts from unknown history.
- Record chunk token statistics and fail on inputs exceeding the chosen encoder's allowed size. Keep one note per chunk until an experiment supports changing it.

### Acceptance gate

- A clean environment installs and runs the existing Python suite and offline benchmark.
- The current 31-note corpus validates; any newly discovered issue is corrected with an explicit diff and rationale.
- Fixtures cover duplicate IDs, blank teaching text, broken references, malformed JSON, and preservation of meaningful language examples.
- Validation and dry-run make zero embedding calls and zero database writes.
- The same source produces the same manifest digest and formatted chunks.

**Main files:** `agent/requirements.txt`, `agent/retrieval/loader.py`, `embeddings.py`, new validator/manifest modules and tests, `.github/workflows/ci.yml`.

## 5. M2 — Make indexing correct before improving search

### Changes

1. Separate the embedding fingerprint from the full document fingerprint. The former covers canonical embedding text, formatter version, model, and dimensions; the latter includes metadata used for selection and generation.
2. Fetch stored fingerprints before embedding. Reuse unchanged vectors while still publishing metadata-only edits and active-state changes.
3. Validate response count, association with input indices, dimensions, numeric finiteness, and nonzero vectors. Abort publication on incomplete or malformed batches.
4. Give `--rebuild` an explicit force-recompute contract and test it. Failed embeddings must never publish new text with stale vectors.
5. Use an immutable index version plus an active-version pointer within the existing database. Stage a complete version, validate it, and switch the pointer in one transaction. Keep the previous version for rollback.
6. Ensure a request gets candidate scores and note content from the same version. Prefer reading content from that index snapshot on vector paths; retain a separately identified local metadata fallback.
7. Define empty-corpus and missing-source behavior: a missing file or accidental empty corpus must not silently erase/deactivate the active index.
8. Serialize competing publication attempts or use a compare-and-swap check so concurrent syncs cannot accidentally publish over a newer version.

### Acceptance gate

Use a disposable PostgreSQL database with pgvector, not mocks alone:

- Second unchanged sync: **zero document-embedding requests** and unchanged active content.
- Metadata-only edit: new metadata visible, vector reused.
- One changed chunk: only that chunk is embedded during incremental sync.
- Force rebuild or changed model/formatter: required vectors regenerated into a separate version.
- Failed/short/malformed embedding batch: nonzero exit; active version unchanged.
- Removed/reintroduced note: correct visibility after publication.
- Reader during publication: sees one complete version, never mixed content.
- Rollback: previous version and predictions restored on a fixed smoke dataset.

### Migration and rollback

Add new schema alongside existing rows. Build and validate the first version before enabling versioned reads. Retain the old read path behind configuration during rollout; do not drop legacy rows in this release. A rollback must restore a compatible reader and index, not merely change an environment variable.

**Main files:** `sync_embeddings.py`, `db.py`, `embeddings.py`, a new database migration, integration fixtures. Existing tests that explicitly permit stale-vector behavior must be replaced with correctness assertions.

## 6. M3 — Build an evaluation that can change a decision

### Dataset contract

Keep the current 31 structured and 25 freeform cases as regression/development evidence. Add a target of **240 reviewed cases**, split into **120 development and 120 held-out test cases**. Per split, target 80 supported positives and 40 out-of-domain negatives; include hard adjacent-concept examples within positives. Also maintain a separately labeled challenge set for ambiguity, multi-concept questions, and malicious instructions rather than forcing every ambiguous input into a binary label.

Cover paraphrases, new drill IDs, short underspecified questions, misleading card context, and domain-register distinctions. Group related paraphrases/source scenarios before splitting. Label relevant note IDs, reason, query type, and allowed response behavior. Permit multiple relevant IDs when appropriate.

Use documented author or AI-assisted label checks with rationale. AI-generated cases and labels must retain their provenance. External reviewers are not required; these labels are developmental evidence rather than independently validated ground truth.

### Harness changes

- Common case format and retrieval interface for every arm.
- Capture ranked candidate IDs/scores, selected note, retrieval status, stage timing, and index/configuration fingerprints.
- Report recall@1/3/5/10, reciprocal rank, positive top-1 accuracy, negative false-positive rate, missed coverage, and per-bucket counts. Define how multiple gold IDs are scored.
- Keep unavailable infrastructure separate from no-match judgments. Write an invalid-run artifact and return nonzero rather than publishing a success summary.
- Store complete paired predictions; summarize uncertainty rather than interpreting a few cases as conclusive.

### Acceptance gate

- No duplicate IDs or near-duplicate scenario groups crossing splits; all gold references resolve to the frozen corpus.
- Tests cover wrong-note hits, valid no-match results, multiple gold IDs, ties, missing candidates, and infrastructure failure.
- Deterministic arms reproduce predictions for the same inputs/configuration.
- Test data is frozen before M4 selection. Once inspected to drive tuning, it becomes development data and a new held-out set is required.

**Outputs:** dataset card, JSONL cases, manifest, evaluator CLI, per-case JSON report and Markdown summary.

## 7. M4 — Compare simple alternatives and ship the supported choice

### Experiment order

1. Keep direct/metadata lookup as the known-drill baseline.
2. For freeform queries, compare question-aware lexical retrieval, vector-only, and existing weighted hybrid using identical query/card information, corpus, and candidate budgets.
3. Ablate question-only versus question-plus-card context to measure context distraction.
4. Inspect candidate recall before tuning final ranking. If recall is poor, fix candidate generation or corpus coverage; a reranker cannot recover missing evidence.
5. Tune candidate count, score weight, and abstention threshold on development data. Apply eligibility consistently before selection and test what happens when the highest-ranked candidate is ineligible.
6. Compare an alternative embedding configuration only if error analysis suggests semantic representation is the limiting factor. Do not bundle a model swap with unrelated chunk/query changes.

### Promotion criteria

These are **proposed engineering targets**, to be agreed and frozen before examining the new test results, not measured performance:

- Positive top-1 accuracy ≥85% on the held-out supported queries.
- Observed negative false-positive rate ≤5%; with 40 negatives, report the actual count and uncertainty because two errors already equal 5%.
- A more complex arm should improve positive selection by at least 5 percentage points on development data without breaching the negative constraint. Confirm direction on the held-out set; do not imply statistical significance without supporting evidence.
- Preserve existing known-drill regression behavior unless a reviewed label/error analysis justifies a change.
- Report latency and token use. If the extra quality is negligible or uncertain, retain the simpler arm and document that decision.

### Integration gate

Wire only the selected policy into intended request handlers. Endpoint-level tests verify actual calls for Tutor explain/clarify, Study buttons, freeform questions, and no-retrieval routes. A helper unit test is insufficient proof of integration. Update the architecture diagram to match what runs.

**Outputs:** experiment report, comparison table, failed-case analysis, architecture decision record, and configuration-based rollback to the previous policy.

## 8. M5 — Prove the answer layer and define honest fallback

### Product behavior

Define separate states for grounded answers, out-of-scope questions, ambiguous questions needing clarification, and temporary retrieval unavailability. For this reference-focused demo, propose a brief scope message for clearly unsupported questions and a visible ungrounded label for any permitted card-only fallback. Preserve useful tutoring without presenting a fallback as source-backed.

Separate user input and reference data from application instructions in prompt construction. Do not treat prompt wording as a complete injection defense. Add cases where user/reference text requests instruction overrides or unsupported assertions.

### Answer experiment

Use a reviewed development subset to refine prompts, then a separate held-out subset for final reporting. Fix response model, prompt version, sampling configuration, and case inputs across:

- Card-only/no-RAG.
- Whole-corpus context.
- Selected retrieved context.
- Gold relevant context, to isolate generation quality from retrieval errors.

Score factual correctness, support for individual claims, citation relevance, teaching usefulness, and appropriate scope handling. Review answers blind to arm where practical. Report disagreements and use repeated generations on a small stability subset. Use explicitly labeled AI-assisted judging and disclose correlated errors and judge bias; do not claim human calibration.

### Acceptance gate

- Reference labels correspond to notes actually supplied to generation; no source attribution is emitted for an ungrounded fallback.
- No fabricated note IDs or unauthorized instruction-following in the defined adversarial regression set.
- Proposed target: ≥90% of reviewed factual claims supported in grounded answers, with claim/answer counts and uncertainty disclosed. This target is not a claim of universal factual accuracy.
- RAG benefits are reported only if comparative answer evidence supports them. If full-corpus prompting matches or beats retrieval at acceptable cost, document that result and choose accordingly.

**Main files:** Tutor prompt assembly, Study assistant router/schemas, source/fallback UI, new answer-evaluation fixtures and report.

## 9. M6 — Operate and demonstrate the result

### Engineering work

- Explicit embedding and database timeouts within an overall request deadline; bounded retries only for appropriate transient failures. Do not stack retries beyond the deadline.
- Verify blocking embedding/DB work does not stall concurrent async requests; use the appropriate async client or offloading boundary with a concurrency limit.
- Structured diagnostic fields: request ID, route, query type, index version, model/config fingerprint, selected source, failure category, stage timings, and token usage when available.
- Avoid raw learner text in default logs. Define access and retention for any sampled traces used for review.
- Live Langfuse smoke test plus graceful behavior when tracing is disabled/unavailable.
- Report p50/p95 latency for cold and warm runs at concurrency 1 and 5 on documented hardware/service configuration. Include at least 100 requests per chosen scenario where budget permits.
- Measure stage timings first, then freeze a realistic demo latency budget before the release run. Record the target, observed distribution, timeouts, and failure count; do not invent a production SLA.

### Budget control

Before live evaluation, dry-run the case/arm/token counts and estimate cost from verified provider pricing. Set a configurable run ceiling and maximum request count. Cache reusable document embeddings by configuration fingerprint. Keep paid evaluations separate from default PR CI; use explicit manual or controlled scheduled runs with credentials.

### CI layers

| Layer | Trigger | Required evidence |
| --- | --- | --- |
| Unit tests, corpus validation, offline regressions | Every PR | No external credentials; reports retained on failure |
| Disposable pgvector integration | PRs affecting indexing/search | Migration, sync, publication, rollback, and query correctness |
| Live provider/tracing smoke | Controlled credentialed run | Availability, response shape, correct index/model, trace delivery |
| Full retrieval/answer benchmark | Release candidate or deliberate experiment | Frozen dataset/config, budget, predictions, quality and timing reports |

### Release gate

A fresh checkout can follow a documented setup path, validate the corpus, build a disposable index, run offline and integration tests, and execute one authenticated demo request. The release evidence includes:

- Architecture and actual request paths.
- Data/index manifest and validation report.
- Held-out retrieval and answer comparisons, including failures.
- Dependency/configuration versions and execution environment.
- Latency/cost measurements and remaining limitations.
- Index/policy rollback instructions tested against the release candidate.

## 10. Review and release discipline

Each PR describes the concrete failure, changed behavior, validation, and rollback implications. Keep formatting/UI cleanup out of indexing and evaluation changes. Never tune the benchmark solely to keep a green badge.

Before public release, review the diff and update README claims using only the new evidence. Personal interview notes remain outside the tracked changes. Publication, commits, and deployment are separate actions from preparing this plan.

## 11. Risks and decision rules

| Risk | Response |
| --- | --- |
| Small corpus makes RAG unnecessary | Compare whole-corpus and direct lookup; accept the simpler outcome |
| Better scores come from shared labels/IDs | Independent scenario groups, ID ablation, reviewed held-out set |
| Corpus lacks the needed concept | Treat as coverage/scope failure before changing embedding model |
| Hybrid adds latency without useful gain | Keep the better simple arm; no automatic reranker upgrade |
| Index code remains complex for 31 notes | Keep one database and small versioned snapshots; avoid distributed ingestion infrastructure |
| Live APIs unavailable | Continue offline work; mark live results unavailable, not passed |
| Review/time budget is insufficient | Reduce experiment breadth; preserve correctness and label-quality gates |

## 12. Minimum credible release and immediate next step

If time is constrained, prioritize M1, M2, M3, one fair retrieval comparison from M4, and explicit fallback/source behavior from M5. Mark unmeasured answer/operational claims as pending. This is a useful intermediate release, not completion of the full plan.

**Current next steps:** the provider-backed retrieval comparison and cached rank-fusion experiment are complete. The seven-arm answer pilot has completed 56/56 valid outputs at an estimated generation cost of $0.0184. Perform AI-assisted answer evaluation and prepare the grouped 240-case intake with explicit author/model provenance. Then freeze a genuinely untouched test set and measure end-to-end cold/warm behavior at concurrency 1 and 5. See [the feedback response](EVALUATION_FEEDBACK_RESPONSE.md) for commands, evidence, and remaining gates. These gates are not completed by the existing development retrieval scores.

**Local operational evidence:** [600 requests across complete, missing and incomplete indexes](OPERATIONS_EXPERIMENT_01.md) passed at concurrency 1 and 5. The full suite now passes 170 tests. Deployed endpoint latency, cold-start distributions and provider-failure behavior remain unmeasured.

**Release-gate update:** [Deployment check and evaluation workflow](RELEASE_EVIDENCE_STATUS.md). The public Study smoke failed with 502; staging/deployment access is needed before load testing. Local generation timeout/error handling passes the expanded 175-test suite. Reviewer packets are prepared with no fabricated ratings.

**Latest evidence:** AI-assisted evaluation of all 56 pilot answers is complete ([Experiment 03](ANSWER_EXPERIMENT_03.md)). Local serving policy and Study timeout fixes are tested. A warm deployed Study smoke passes following a slow agent startup. Deployment verification and a permitted end-to-end benchmark remain; the proposed 240-case dataset is still uncollected.
