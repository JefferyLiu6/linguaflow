# English corpus expansion to 200 notes

Corpus revision: `2026-11-16.200`. Schema version remains `2.0.0`.

The repository contains 200 notes: the original 31, unchanged, plus 169 focused grammar and usage notes. This expansion is locally validated, not yet published to the live vector index. The [100-question provider-backed local evaluation](EXPANSION_EVALUATION_RESULTS.md) is complete; production publication remains pending. Hosting remains unchanged.

## Content and provenance

- [Browse all 200 titles and IDs](../agent/knowledge/en/README.md).
- [Canonical note content](../agent/knowledge/en/contrasts.jsonl): rule, usage boundary, three original examples, an explained counterexample and source references per addition.
- [Reference registry](../agent/knowledge/references.json): 114 records, including the original 11. New references include British Council, Cambridge, Purdue OWL and APA Style. Verification records distinguish opened pages from indexed official-page excerpts. Links support named principles, not endorsement of every authored example.
- [Development questions](../agent/knowledge/evaluation/expansion-v3.json): one original synthetic positive probe for each addition. These were authored with the notes and are not held out. A target label is not an exhaustive list of all relevant notes.

| Added area | Notes |
|---|---:|
| Tense and aspect | 26 |
| Questions and modals | 23 |
| Nouns and determiners | 24 |
| Pronouns and agreement | 16 |
| Adjectives and adverbs | 20 |
| Prepositions and verb patterns | 24 |
| Clauses and reporting | 22 |
| Writing and usage | 14 |
| **Total added** | **169** |

Notes stay concise rather than being padded to a word quota. Source checks were AI-assisted; independent human review remains pending. No external exercise collection was copied. The new notes have no invented drill IDs: the existing 171-drill coverage map still describes the original curriculum relationships.

## Completed offline checks

- Bundle validation: 200 notes, 628 examples, 114 references and 268 development/challenge cases. Every note has positive gold coverage.
- Full Python suite: **312 passed, zero skipped**, including publication, rollback, incomplete-index repair and concurrency tests against disposable local PostgreSQL/pgvector. Synthetic vectors establish database behavior, not semantic retrieval quality.
- Embedding dry run: 200 notes, zero provider calls or database writes.
- Original metadata regression: passed. It exercises the original structured curriculum, not the expansion's freeform coverage.
- Historical fresh-v2 release replay: matches the saved report. Its 24-question scores still apply only to the original 31-note corpus.

The [saved question-only BM25 diagnostic](../agent/runs/corpus-expansion-200-development.json) measures exact target ranking over the 169 new development probes:

| Metric | Result |
|---|---:|
| Hit@1 | 56.2% |
| Hit@3 | 74.0% |
| Hit@5 | 82.2% |
| MRR@5 | 0.663 |

BM25 is an offline experimental baseline, not the production vector/hybrid retriever. These results do not measure answer correctness, generalization or learning gains. No quality gate was inferred from them. Misses remain visible in the artifact; questions were not rewritten to inflate scores.

Reproduce without credentials from `agent/`:

```bash
python -m retrieval.validate_corpus --output /tmp/corpus-validation.json
python -m retrieval.expansion_benchmark --output /tmp/expansion-development.json
python -m retrieval.sync_embeddings --dry-run
python -m pytest tests/ -q
```

For disposable database checks, run `python scripts/check_retrieval_index.py --all` from the repository root with Docker available. CI runs both suites. Larger offline provider-comparison planning limits do not change the collection command's default spending guards.

## Completed local provider-backed evaluation

The [100-question paired evaluation](EXPANSION_EVALUATION_RESULTS.md) completed with 200 responses and 199 graded answers for approximately US$1.22, within the approved US$5.01 ceiling. Verified source-label precision was 51/59 (86.4%) versus 32/90 (35.6%) for raw hybrid. Automated correctness averaged 3.98/4 versus 3.37/4; the audit records source errors, judge mistakes and one baseline grading failure.

The [frozen protocol](EXPANSION_EVALUATION_100.md), plan, records and exact offline replay remain preserved. Cases cover 60 supported questions, 15 uncovered English questions, 15 missing-context and 10 out-of-scope requests. This is a sampled, corpus-aware synthetic evaluation, not one question per note or independently validated user research. No model or hosting upgrade was made.

The temporary local index was removed after collection. Production remains unchanged. Future tuning against these cases requires a new fresh evaluation for generalization claims.

## Live publication and rollback

The serving reader requires the code's corpus fingerprint to match the active database manifest. Deploying 200-note code against the old 31-note index returns `index_version_mismatch`; publishing the new index while old code is serving also creates a mismatch. Atomic database publication protects against partial writes but does not provide a two-version application rollout.

1. Finish review and freeze the content. Record the currently deployed revision and index manifest, and retain the old corpus and embeddings for rollback.
2. Coordinate an AI-service maintenance window or a separate staging deployment/index. Publish the full 200-note snapshot using the existing sync tool and deploy the matching application revision in the same window. The sync command makes paid embedding calls and needs the intended database credentials; it has not been run against production. The evaluation used only a disposable local database.
3. Check a complete 200-note manifest and matching fingerprint. Smoke-test original and new supported questions, uncovered questions, clarification, scope and explicit infrastructure errors before restoring traffic.
4. Retain the completed local evaluation evidence and report deployment smoke checks separately. If content or behavior changes, validate the new configuration with an appropriate fresh evaluation.
5. If rollout fails, restore both the previous application revision and its matching index snapshot. Reverting code alone is insufficient after publishing new content.

No database schema change is required. A coordinated index publication is required before treating the expansion as live.
