# RAG data audit — quality, consistency, and sufficiency

> **Historical v1 baseline.** The defects and counts below describe the pre-repair snapshot. See [dataset v2](DATASET_CARD.md) and [the change ledger](DATA_CHANGELOG.md) for current data and verification. The original evidence is retained unchanged.

**Date:** 2026-09-15. **Verdict:** adequate raw volume for a narrow prototype; not ready to treat as a trusted teaching corpus or independent RAG benchmark. Repair correctness and relationships before expanding volume.

This audit covers all 31 English contrast notes, their 73 examples, links to the 171 built-in English drills, and all 56 retrieval evaluation cases. The English drill catalog was checked for structural/link consistency and selected content defects, not exhaustively certified for linguistic quality. Other languages, generated/user-authored drills, the deployed database, and live embeddings were not audited.

The [machine-readable evidence](../agent/runs/data-audit.json) contains file digests, counts, comparisons, evaluation conflicts, and two retrieval probes. Findings marked as editorial judgments are distinct from deterministic schema/link checks. No corpus, drill answers, or evaluation labels were changed during this audit.

## 1. Inventory and what the counts mean

| Measure | Observed | Interpretation |
| --- | ---: | --- |
| Contrast notes | 31 | Small, inspectable concept corpus |
| Examples | 73 | Average 2.35 per note; seven notes have only one |
| Canonical embedding tokens | 4,118 total | Entire corpus is a credible prompt baseline |
| Tokens per note | 100–180; median 129 | Chunk length itself is not the immediate problem |
| Unique note/concept IDs | 31 / 31 | No duplicate identities |
| Duplicate normalized note explanations | 0 | Does not rule out overlapping concepts |
| Built-in English drill IDs | 171, all unique | Application coverage is broader than the references |
| Drills named by authoring links | 70/171 (40.9%) | Explicit linkage only, not proven semantic coverage |
| Notes tagged `formal_register` | 19/31 (61.3%) | Strong bias toward register/formality |
| Nonblank example source IDs | 67, all resolve | Referential existence passes, meaning often does not |
| Blank example source IDs | 6 | Across three standalone notes; needs explicit provenance type |
| Structured evaluation | 27 positives + 4 negatives | Regression set, not a robust quality estimate |
| Freeform evaluation | 22 positives + 3 negatives | Small development set with fixture inconsistencies |
| Notes used as gold in either evaluation | 24/31 | Seven concepts have no positive gold coverage |

Methods: notes loaded through the repository's Pydantic loader; English arrays extracted from `lib/drills.ts`; chunk tokens measured with `cl100k_base`. Lexical comparisons lowercase and normalize punctuation/spacing. They flag potential differences, not automatic language errors. Blank JSONL lines are accepted by the loader and are not a defect.

## 2. Blocking issue: source IDs exist but describe different exercises

Of 67 examples with a nonblank source ID, 39 have a nonidentical normalized prompt. Some are harmless shortened excerpts or contraction differences. After reviewing them, **24 links across 14 notes clearly refer to different exercises**. This is a conservative confirmed subset, not a claim that every lexical mismatch is wrong.

| Source ID | Corpus example | Actual drill |
| --- | --- | --- |
| `en_sp6` | Player moves around a defender → dribbles | “win (verb)” → “triumph” |
| `en_sp7` | Team gets more points → outscored opponents | “lose (verb, competition)” → “concede” |
| `en_sp8` | Runner finishes well → personal best | “practice session” → “training session” |
| `en_t3` | System checks identity → authenticates | “make faster” → “optimize” |
| `en_w6` | Information shared → data disseminated | “fire (verb, employment)” → “terminate” |
| `en_ed6` | Results prove a theory → findings support it | “I failed the test” → formal assessment wording |
| `en_he6` | Recovery faster than expected | Persistent fatigue |
| `en_ed9` | Teacher asks students to work in groups | “I got a bad grade” |

Full reviewed pairs are retained under `manually_confirmed_different_exercise_links` in the JSON report.

**Why this matters:** `source_item_id` drives exclusion of the current card's example. Incorrect linkage makes that filter unreliable and misrepresents example lineage. `authoring_item_ids` separately contribute a strong retrieval score. Merely checking that an ID exists cannot validate either relationship.

**Repair:** if an example is adapted from a real drill, derive/check it against that drill. If independently authored, give it its own example ID, a nullable source-drill reference, and a provenance type. Do not attach a convenient existing ID. Review authoring links separately for concept relevance; a different example can still illustrate the right concept, but must not be labeled as the same exercise.

## 3. Blocking issue: evaluation identities are inconsistent

The field comparison checks nonempty fixture `prompt`, `instruction`, `type`, `topic`, and `answer` against the real card bearing the same ID. It flags **4/24** structured fixtures reusing real IDs and **12/17** freeform fixtures reusing real IDs. These counts include small instruction differences and therefore are review flags, not all equally severe defects.

Several are unequivocally different tasks:

- `freeform_voice_002` uses `en11` for a passive-voice question. Real `en11` is a participle-combination drill.
- `freeform_clause_001` uses `en07` for sentence combination. Real `en07` is a single-verb substitution.
- `freeform_domain_004` uses `en_sc1` for a scientific sentence rewrite. Real `en_sc1` is a vocabulary drill.

IDs are not inert labels: retrieval uses both authoring-ID matches and an ID-indexed taxonomy. These fixtures inject contradictory signals and can distort metadata-versus-vector comparisons.

**Repair:** use real cards unchanged for integration evaluation; use clearly separate `eval_*` IDs for synthetic cards. Intentionally conflicting metadata belongs in an explicitly labeled challenge set. Re-run all baselines after repairs; previous rates are historical fixture results, not estimates on the corrected dataset.

**Correction to the earlier ablation interpretation:** removing item IDs removes both the +8 authoring match and taxonomy tags inferred from the ID in `tagger.py`. The 27/27 → 19/27 change measures dependence on **all ID-derived information**, not direct lookup alone. To isolate effects, compare direct-match removal while preserving taxonomy, taxonomy removal while preserving direct links, and both removed.

## 4. Content quality: useful structure, unreliable teaching in places

### Strengths

The notes have clear identities, usage descriptions, teaching cautions, and compact examples. Active/passive, relative clauses, and nominalization provide a useful foundation. The consistent schema makes repair practical. One concept per short note remains a reasonable chunking strategy.

### Editorial defects and review priorities

| Note / location | Finding | Recommended repair |
| --- | --- | --- |
| `en_sport_vocabulary_precision` | “finished ... well” → “personal best” introduces an unsupported performance claim; “got more points” → “outscored opponents” introduces a comparison | Preserve the stated result, or add the missing context before asking for the specific term |
| `en_formal_rewrite_sentence` and real drill `en_t6` | “added a new feature” → “implemented and deployed” asserts deployment not present in the prompt | Remove unsupported deployment, or explicitly make deployment part of the source task |
| `en_academic_formal_register` | “We think” → “Evidence suggests” adds an evidential basis not supplied; broad impersonal-style framing | Preserve evidence strength; explain audience/journal variation |
| `en_science_formal_register` | Claims scientific findings are reported without personal pronouns and frames passive voice as required | Present active/passive as a rhetorical choice; avoid a universal ban on first person |
| `en_participle_clause_combination` | Too shallow: omits the usual shared-subject constraint and distinction between simultaneous and completed actions | Add the constraint, a dangling-participle counterexample, and time-relation guidance |
| `en_relative_clause_combination` | Example introduces a restrictive reading without discussing how it differs from parenthetical information | Contrast restrictive/nonrestrictive alternatives and their meaning |
| `en_precise_synonym_choice` | “use” → “utilize” is presented as increased precision without context proving a distinction | Separate register preference from precision; do not teach longer words as intrinsically better |
| `en_work_formal_register` | Treats impersonal phrasing and removal of hedging as general professional requirements | Specify audience/purpose; preserve justified uncertainty |
| `en_health_formal_register` | “cephalic pain” replaces an already clear “headache”; differs from the actual drill answer | Prefer audience-appropriate plain terminology; obtain domain editorial review before treating terminology as authoritative |
| `en_general_vocabulary_precision` | Context-free synonym pairs cannot establish interchangeability; academic examples are fifth/sixth and excluded from the four-example embedding text | Add contextual restrictions and representative embedded examples |

The semantic-addition judgments above compare the information in the actual sentence pairs; they are not automated correctness scores.

Independent writing references support the main editorial direction: UNC explains that active voice and first person can be acceptable in scientific reports, contrary to a universal prohibition. [UNC Writing Center](https://writingcenter.unc.edu/tips-and-tools/scientific-reports/). British Council guidance explains the shared-subject pattern and the completion relation expressed by perfect participles. [British Council](https://learnenglish.britishcouncil.org/free-resources/grammar/c1/participle-clauses). Professional clarity should be matched to audience rather than indiscriminate vocabulary elevation. [Digital.gov plain-language principles](https://digital.gov/guides/plain-language/principles).

No external source/reviewer history is recorded in the note schema. These references are audit checks, not a claim that the existing corpus was derived from them. A second qualified English-language reviewer is still warranted before calling the content validated.

## 5. Coverage and concept boundaries

Six populated English drill topics have **zero topic-tagged notes and zero explicit authoring links**: family, nature, culture, politics, shopping, and emergency—nine drills each. Food has 2/9 linked drills, health 3/9, and science 2/9. Generic notes may apply across these topics, so this is a mapping/coverage gap requiring review, not proof that every such drill is unsupported.

A larger note count is not automatically the answer. Academic and education register notes have identical tag sets. Several formal-rewrite/domain notes overlap without enough guidance about when to prefer one over another. A single reference with domain-specific examples may be better than several nearly interchangeable notes; truly distinct rules need explicit decision boundaries and counterexamples.

Seven notes never appear as the expected positive label in either evaluation: education formal register, food formal register, formal conditional, money vocabulary precision, nominalization, sport formal sentence, and work vocabulary precision.

Seven notes have only one example. If that example belongs to the current drill, the safety filter leaves none. The three standalone notes use six blank source IDs; with a blank current item ID, the current equality-based filter can exclude those independent examples as well. These are representation/filter issues, not reasons to manufacture more linked examples.

## 6. The negative cases are too easy to establish scope control

Two additional offline probes use fresh IDs with ordinary card metadata:

| Question/task | Selected note | Score |
| --- | --- | ---: |
| Correct subject–verb agreement: “She go to school.” | Everyday/formal wording | 14 |
| Explain past simple versus present perfect | Active/passive voice | 14 |

Neither selected note supports the requested distinction. Shared `type`, `category`, and `topic` metadata can yield a high score without concept relevance. Both scores also exceed the structured hybrid helper's shortcut threshold, though that helper is not currently wired into structured handlers.

These two probes demonstrate specific false positives, not an estimated population error rate. Add them to a repaired challenge set. The existing four structured and three freeform negatives are insufficient to establish reliable abstention, especially when adjacent grammar questions are missing.

## 7. Is the amount good enough?

| Intended claim | Assessment |
| --- | --- |
| Demonstrate end-to-end retrieval mechanics | 31 notes are enough after repairing correctness |
| Demonstrate a narrow formal-writing tutor | Plausible with reviewed content, explicit scope, and sufficient examples |
| Support the entire 171-drill English experience consistently | Not established; mapping and semantic coverage need review |
| Demonstrate broad English tutoring | Current topic/concept coverage is inadequate |
| Prove hybrid quality, calibrated abstention, or generalization | Current evaluation size and independence are inadequate |
| Demonstrate large-scale vector-search engineering | 31 vectors do not support that claim; a separate representative scale experiment would be needed |

**Recommended quantity strategy:** keep the current corpus small while correcting it. Aim for at least three distinct, reviewed examples plus one contrast/counterexample for each retained concept, subject to pedagogical value; these are authoring targets, not magic statistical requirements. Do not put all examples into the vector text automatically—evaluate representation separately.

For the portfolio release, the planned ~240 development/test cases are a reasonable starting workload, not a guarantee of significance. Require positive coverage for every retained concept across dev/test, multiple unseen phrasings, and a meaningful negative set. Expand cases when confidence intervals or subgroup counts are too weak for the intended claim. Corpus and evaluation must not be scaled by copying near-duplicate templates.

Only add notes when the coverage matrix identifies a distinct missing learning objective. If the product remains a focused formal-writing tutor, 30–50 strong concepts may be plenty; that range is a planning hypothesis, not a requirement. If broad English tutoring is the goal, define the curriculum first and size the corpus against it.

## 8. Immediate decision and order of work

**Pause corpus expansion and model tuning.** Insert a data-repair gate ahead of the implementation plan:

1. Repair the 24 confirmed source mismatches and review all authoring links.
2. Correct meaning-changing rewrites and overgeneralized guidance in both notes and affected drill answers. Do not automatically replace gold labels merely to preserve scores.
3. Separate synthetic evaluation IDs from real cards; isolate deliberately conflicting cases.
4. Define boundaries for overlapping concepts and record independent-example provenance.
5. Build a reviewed drill-to-concept coverage matrix, distinguishing supported, generic support, ambiguous, and unsupported.
6. Add missing positive gold coverage, realistic negative cases, and independent reviewed examples.
7. Re-run metadata/ID ablations and publish a new baseline with dataset version and changed-label rationale.

**Exit gate:** no unresolved confirmed ID collisions, no known unsupported semantic additions in released examples, explicit disposition of all 171 drills, positive evaluation coverage for every released concept, and a separately reviewed sample of the repaired content. Independent reviewer availability remains an external dependency; disclose when that review has not happened.

The strongest interview story is that the data audit uncovered misleading references and evaluation contamination, followed by a documented repair and a fresh benchmark. Increasing the chunk count before those repairs would make the project larger without making the evidence stronger.
