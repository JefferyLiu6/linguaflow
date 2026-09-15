# English teaching data — dataset card v2.0.0

**Index update:** [Atomic publication and version checks](INDEX_PUBLICATION.md) are implemented locally. Real pgvector integration is configured in CI and remains pending; no application database migration or live reindex has run.


**Retrieval experiment update:** [Experiment 01](RETRIEVAL_EXPERIMENT_01.md) now provides a fixed BM25 baseline, paired rankings, threshold sensitivity, and a pending relevance-review packet. The data corpus and serving policy are unchanged.


## Decision and intended use

LinguaFlow helps a learner understand **why a particular English rewrite or word choice fits a drill**, then transfer that distinction to another example. A fluent answer can still teach the wrong thing: a casual sentence can be grammatical, a formal synonym can change meaning, and a scientific rewrite can invent certainty. The reference corpus supplies explicit teaching distinctions, applicability conditions, examples, and boundaries for the tutor.

We chose the existing application curriculum as the starting population because its drills are concrete product inputs with stable identities. The reference unit is a reusable teaching concept, not an exercise answer. This makes relevance inspectable and lets several drills use the same explanation. RAG provides selection and traceability of this local teaching policy. It is not needed because general English facts are absent from the response model or because this corpus is too large for a prompt.

**Sufficiency:** 31 concepts are enough for a narrow, inspectable RAG prototype and comparative retrieval experiments. They are not enough for a general English tutor, and the supplied evaluation is not enough to claim job-ready production accuracy. Increase coverage only after observing missing concepts in target questions and obtaining review; adding documents just to make the dataset look large would dilute the task.

## Inventory and coverage

| Asset | v2 contents | Interpretation |
| --- | ---: | --- |
| Canonical English drills | 171 | Existing stable IDs; 99 records editorially revised |
| Teaching notes | 31 | Retained concepts; all rewritten with explicit scope |
| Positive examples | 121 | 93 original examples and 28 exact canonical drill adaptations |
| Counterexamples | 31 | One incorrect/boundary example with a reason per note |
| Reference records | 11 | Primary educational/institutional references; support is bounded |
| Evaluation cases | 99 | 31 structured development, 25 freeform development, 43 challenge |
| Positive gold concept coverage | 31/31 | At least one labeled query per concept; not validated generalization |
| Direct drill linkage | 70/171 | Explicit authoring relationship to a note |
| Generic guidance only | 90/171 | Related writing guidance, not necessarily a complete answer |
| Unsupported | 11/171 | Unlinked medical/emergency vocabulary without sufficient specialist guidance |

[coverage.json](../agent/knowledge/en/coverage.json) gives every drill a disposition and reason. These are AI-assisted editorial judgments awaiting human review. **This mapping is diagnostic; it is not an enforced runtime router or a promise of coverage.** Domain contexts do not establish domain expertise. Register/formality remains overrepresented; pronunciation, general grammar, and other languages are outside this corpus.

## Why these references

Selection criteria: identifiable institutional author, a directly relevant teaching principle, publicly inspectable evidence, and a narrow claim we can check. References are linked rather than scraped wholesale. Examples and explanations were written for this project with AI assistance; they are not copied source exercise sets. A reference does not endorse the app or independently validate every answer.

| Reference | Supports | Deliberate limit |
| --- | --- | --- |
| [Cambridge English Grammar Today](https://dictionary.cambridge.org/uk/grammar/british-grammar/informal-and-formal-language) | Formal/informal register depends on context | Formal wording is not automatically clearer or more correct; direct fetch returned 403, indexed official page checked |
| [Digital.gov plain-language principles](https://digital.gov/guides/plain-language/principles) and [writing guidance](https://digital.gov/guides/plain-language/writing) | Audience, clarity, and avoiding unnecessary nominalizations | Balances the curriculum's preference for formal rewrites; not a synonym dictionary |
| British Council: [passives](https://learnenglish.britishcouncil.org/free-resources/grammar/b1-b2/passives), [participle clauses](https://learnenglish.britishcouncil.org/free-resources/grammar/c1/participle-clauses), [defining relatives](https://learnenglish.britishcouncil.org/free-resources/grammar/b1-b2/relative-clauses-defining-relative-clauses), [non-defining relatives](https://learnenglish.britishcouncil.org/free-resources/grammar/b1-b2/relative-clauses-non-defining-relative-clauses), [conditional inversion](https://learnenglish.britishcouncil.org/free-resources/grammar/c1/inversion-conditionals) | Specific grammatical distinctions and conditions | Source level labels do not certify this dataset's CEFR level |
| [Manchester Academic Phrasebank](https://www.phrasebank.manchester.ac.uk/using-cautious-language/) | Match strength of language to strength of evidence | Does not justify inserting uncertainty or certainty absent from the original |
| [UNC Writing Center](https://writingcenter.unc.edu/tips-and-tools/scientific-reports/) | Scientific reporting and interpretation | Does not validate scientific facts in invented examples |
| [American Heart Association](https://www.heart.org/en/health-topics/heart-attack/about-heart-attacks/heart-attack-or-sudden-cardiac-arrest-how-are-they-different) | Correction separating heart attack from cardiac arrest | Terminology correction only; no medical advice or specialist corpus claim |

[references.json](../agent/knowledge/references.json) records publisher, title, URL, supported principle, check date, verification method, use, and limits. Each note names reference IDs and states its own reference scope. The medical correction links to its reference in the revision ledger. Availability was checked on 2026-09-15; no automatic link monitoring is implemented. External source content retains its own rights; this release does not import those lessons under the repository license.

## Selection and cleaning protocol

1. **Inventory before acquisition.** Audit existing notes, canonical drill IDs, source links, examples, and evaluation fixtures. Preserve the original findings in [the baseline audit](RAG_DATA_AUDIT.md).
2. **Correct meaning before style.** Review instructions, target answers, and accepted variants together. Remove alternatives that change an event, strength of evidence, or intended referent. Constrain an ambiguous vocabulary task with a definition instead of pretending all synonyms are interchangeable.
3. **Separate provenance.** An original example has its own `example_id`, `origin: original`, and null `source_item_id`. An adaptation names a real drill and must exactly match the canonical prompt-to-answer rendering. The old loose source-ID associations were replaced, not treated as citations.
4. **Preserve linguistic evidence.** Do not lowercase or strip punctuation from teaching text; negation, clause commas, and capitalization can be the lesson. Reject duplicate/blank IDs, duplicate/untrimmed tags, broken references, and invalid fields. Similar concepts need editorial comparison; automatic semantic deduplication is not implemented.
5. **Add positive and negative boundaries.** Each concept has three original examples and a counterexample explaining why a tempting rewrite is wrong. Counterexamples are explicitly labeled in retrieval text and generation context.
6. **Make changes reviewable.** [english-drill-revisions.json](../data/english-drill-revisions.json) records 99 changed drills, before/after values, and reasons. Stable IDs preserve app linkage. These revisions are not independent expert certification.
7. **Validate the whole bundle.** Check notes, shared drills, source registry, coverage, revision ledger, and evaluation fixtures together. Reject malformed relationships before external embedding calls; fingerprint the bundle and retain the report in CI.

No user conversations, personal profiles, or learner answers were collected for this dataset. This is an authored curriculum workflow, not a demonstrated web/PDF extraction pipeline. No claim of automatic PII detection, semantic deduplication, or quarantine infrastructure is made.

## Representation and chunking

The web app and validator read the same [canonical English JSON](../data/english-drills.json). Notes remain JSONL so each concept is independently inspectable. Provenance and review status live beside teaching text, instead of being inferred from file names.

One complete note forms one embedding chunk: title, applicability, explanation, up to four positives, one labeled counterexample and its reason, and tags. The v2 snapshot contains **6,265 tokens total; 175–243 per note, median 200**, measured with `cl100k_base`. There is no overlap. Splitting these short teaching units risks separating a rule from its conditions. The validator enforces a conservative 8,000 UTF-8 byte maximum, not an exact model token limit.

Counterexamples may help distinguish adjacent concepts but can also attract queries containing incorrect wording. That is a hypothesis to evaluate, not a measured improvement. Full-corpus prompting remains a credible comparator at this size. External URLs, review status, and authoring IDs stay structured; a retrieved note label is distinct from a verified citation supporting every generated claim.

## Evaluation design and current evidence

Canonical structured cases must reproduce the current drill fields, including target answer. Synthetic cases use `eval_` IDs so they do not silently inherit real-item taxonomy or authoring boosts. The challenge set adds one independently worded question per concept and 12 scope negatives. All sets were written during development with knowledge of the corpus; **none is independently held out**.

| Offline arm | Correct positive note | Correct abstention on negatives |
| --- | ---: | ---: |
| Structured metadata regression | 27/27 | 4/4 |
| Same inputs without item IDs | 17/27 | 4/4 |
| Freeform development, metadata only | 14/22 | 3/3 |
| Question-focused challenge, metadata only | 0/31 | 12/12 |

The challenge deliberately supplies little informative card metadata. The metadata baseline ignores question text, so its zero positive matches expose a known capability limit. This is not a live vector failure measurement. The broader abstention check also reduces ID-removed recall: a wrong reference and a missing reference have different costs. The regression gate remains on the existing structured arm; challenge failures are reported visibly without weakening or relabeling them.

Before claiming quality, obtain a second person's labels for realistic learner questions, group paraphrases of the same scenario into the same split, freeze an untouched test set, and compare direct lookup, question-aware lexical search, vector-only, hybrid, no-RAG generation, and whole-corpus generation. Report retrieval relevance separately from answer correctness, meaning preservation, teaching usefulness, citation support, latency, and cost. Do not tune on the final test set.

## Reproduce and publish safely

From the repository root, after installing `agent/requirements.txt` into a virtual environment:

```sh
cd agent
python -m retrieval.validate_corpus --output runs/data-validation.json
python -m pytest tests/ -q
python -m retrieval.benchmark --output runs/retrieval-evidence.json
python -m retrieval.sync_embeddings --dry-run
# Controlled environment with configured DB and embedding credentials:
python -m retrieval.sync_embeddings --rebuild
python -m retrieval.eval_runner --arm freeform --challenge
```

The first four commands are offline. The last two make external calls and were **not run against a live index for this release**. Build the agent container from the repository root with `docker build -f agent/Dockerfile.agent .`; it includes the shared `data/` directory and uses a Dockerfile-specific ignore file that excludes local secrets/private notes.

Indexing validates the bundle and batches, skips unchanged complete snapshots before embedding, and publishes rows/deactivation/manifest in one transaction. Readers reject incompatible or incomplete versions. See [the publication contract](INDEX_PUBLICATION.md) for migration requirements, failure behavior, and tradeoffs. Real pgvector integration remains pending; the earlier per-row publication gap is addressed in code, not yet verified against a live database.

## Maintenance and review gates

- For each changed drill, review meaning, grammar, variants, and the before/after ledger; update affected adaptations and canonical eval fixtures together.
- For each new note, record the learner need, source principle, limits, three original examples, counterexample, coverage mapping, and a positive/adjacent-negative query.
- A second reviewer should mark individual notes reviewed only after checking sources and examples. Keep unresolved notes pending; do not bulk relabel review status.
- On a source change or broken link, record the new check result and revisit only dependent notes. On a model or chunk-format change, rebuild and verify a separate index before switching.
- Expand by observed missing concepts and documented coverage, with an evaluation cost budget. Raw document count is not an acceptance metric.

**Known limitations:** no independent human review, no held-out scores, no learning-outcome study, no full app/container deployment test, and no live vector/answer comparison. The release improves data integrity and auditability; it does not establish production readiness.
