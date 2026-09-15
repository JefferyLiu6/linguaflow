# Data release 2.0.0 — 2026-09-15

## What changed and why

The baseline audit found mismatched example links, contradictory fixtures, thin concepts, and rewrites that could change meaning. This release repairs the authored data model before increasing corpus volume.

- Consolidated all 171 English drills into shared JSON used by the app and validation; preserved stable IDs.
- Editorially revised 99 drills with a before/after ledger. Examples: `en_em4` no longer accepts cardiac arrest as heart attack; `en_sc8` no longer invents statistical significance; `en_t6` no longer turns creation into deployment; `en_he3` avoids equating all dizziness with vertigo.
- Rewrote all 31 notes; replaced 73 loosely linked examples with 93 original examples and 28 exact canonical adaptations, plus 31 explained counterexamples.
- Added 11 reference records, per-note selection rationale and source scope, explicit AI-assisted/human-pending review status, and a 171-item coverage map.
- Moved evaluation into inspectable JSON, repaired canonical fixture fields and synthetic identities, and added 43 challenge cases. All 31 concepts now have positive labels across the 99 development/challenge cases.
- Added bundle validation and corruption tests to CI; tightened metadata eligibility so structural/domain tags alone cannot establish concept relevance.
- Protected indexing against invalid embedding batches, made rebuild effective, prevented deactivation after failed writes, and packaged shared data in the agent container build.

## Evidence and compatibility

See [the dataset card](DATASET_CARD.md) for decisions, source links, exact scope, reproduction commands, and limitations, and [data-validation.json](../agent/runs/data-validation.json) for the bundle fingerprint. [retrieval-evidence.json](../agent/runs/retrieval-evidence.json) contains current case-level predictions. [The original audit](RAG_DATA_AUDIT.md) remains a historical baseline.

English drill IDs and `getDB()` remain stable. Original examples now have null `source_item_id`; callers must not interpret that field as a bibliographic citation. Counterexamples carry an explicit incorrect-example label. Chunk format changed to v2; a live index rebuild/verification and coordinated app release are still required. Existing stored learner sessions may contain earlier prompt/answer snapshots; their history was not migrated or overwritten.

Local validation: 136 Python tests passed; the TypeScript drill module compiled and runtime checks confirmed all 171 app records match the canonical file, representative answer corrections, and four-card selection. These checks do not substitute for independent editorial review, the full Next.js build, a container build, or a live database/embedding integration test.

All revisions remain local and uncommitted pending review. Private interview study notes are excluded through the local Git exclude file.
