# Evidence-verification fix: development and fresh-test protocol

The first 93-case holdout exposed 16/31 false retrievals. It is now a regression
set, not untouched validation. The fix adds a question-first semantic evidence
check over the existing top five candidates. No embedding model, corpus, cosine
threshold, metadata weight or document index is changed. A verified candidate may
be selected even when the old cosine cutoff rejected it: support is checked by a
model plus source-ID and verbatim-evidence validation, not by similarity alone.

The verifier uses `gpt-4o-mini-2024-07-18`, temperature zero, at most 300 output
tokens, an eight-second deadline, and no retries. It sees the question, card and
five public notes. This additional data flow was explicitly approved by the
project owner. Reference quotes are validated against the supplied note text.
Exact quotation is a structural check, not proof that the model's support
judgment is correct. Routing labels are supported, needs_context, out_of_scope,
and not_covered. Provider/validation errors return a separate unavailable state.
The app returns a clarification or scope response without generation where
appropriate; a verifier outage yields HTTP 503, never an unverified citation.
For uncovered English questions the tutor may use general knowledge but must
state that the reference notes do not cover the question.

## Development, selection and provenance

Two prompt variants were tried only on the existing 68 development/challenge
fixtures. The first was overly restrictive; the second makes clear that asking
about the meaning of professional vocabulary is English tutoring, and supplies
existing examples/counterexamples to support general-rule application. Both
runs are retained. Existing single-source labels were not expanded to improve
scores. A metrics-only None-handling bug was corrected by rescoring the saved
first-run outputs, with explicit amended plan and unchanged predictions.

Variant two retains zero negative false retrievals in development while reducing
positive over-abstention. Its source precision against the old single-ID labels
is still below the 90% target. This limitation is retained, not a reason to edit
labels or select a new prompt against the fresh test. After choosing variant two,
freeze its code and all new cases before running them. Do not change the fix in
response to fresh-test outcomes. If it fails, report the failure and require a
new untouched set before another final claim.

The new dataset is **64 AI-authored, corpus-aware synthetic cases**: 32 positives,
10 unsupported English questions, six missing-context questions, and eight
out-of-scope questions each with and without an unrelated card (16 negatives).
Labels and alternative acceptable sources are written before scoring. The author
knows the corpus and first-test failures; this is not independent human evidence.
The verifier supplies predictions, not the gold labels used to score itself.

The eight repeated questions are deliberate paired interventions. Their shared
scenario group must remain together. The distractor card is also shared across
pairs; uncertainty intervals do not establish robustness across all card types.
The lexical overlap audit excludes within-pair repetitions. It checks historical
questions and the first holdout but cannot establish semantic independence.

## Metrics matched to the problem

| Need | Metric and denominator |
|---|---|
| Avoid misleading references | Source precision = accepted selected sources / all selected sources |
| Cover valid teaching questions | Positive source recall = accepted selected sources / scored positives |
| Abstain when the corpus cannot answer | Negative false-retrieval rate = selected sources / scored negatives; specificity is its complement |
| Avoid solving precision by refusing everything | Over-abstention = positives with no selected source / scored positives; coverage = selections / scored requests |
| Expose wrong-source positives | Wrong-source rate = incorrect selections / scored positives |
| Balance precision and useful coverage | F0.5 over source precision and positive recall; precision is weighted more |
| Describe risk at actual operating point | Selective risk = 1 - source precision; harmful-source rate = wrong selections / all requests |
| Ask when the referent is missing | Clarification recall on expected needs_context cases; inappropriate-clarification rate on all others |
| Isolate card contamination | For eight negative pairs, count absent-card abstention becoming a selection with a distractor; also report paired false-retrieval difference |
| Identify candidate versus verification problems | Candidate Recall@5 and MRR@5, prior to verification |
| Distinguish outages from good abstention | Infrastructure-error rate; conditional quality excludes errors; end-to-end positive source rate keeps errored positives in its denominator |
| Measure operational cost | Verifier calls, input/output tokens, p50/p95 call duration at local evaluation concurrency three |

Also report routing accuracy, decision counts and per-slice metrics. Wilson 95%
intervals accompany proportions; paired stratified group bootstrap intervals
compare balanced accuracy using the existing 2,000-resample procedure. Small,
constructed samples and fallible labels limit interpretation. Verifier latency
is not deployed endpoint latency. Source precision is not generated-answer
faithfulness; groundedness, answer correctness and learner outcomes remain
unmeasured by this retrieval experiment.

Predeclared fresh-test point-estimate targets: source precision >=90%, positive
source recall >=80%, negative false retrieval <=10%, verifier infrastructure
errors <=2%. Report all, even if the joint target fails.

## Freeze and bounded execution

The `gate-fresh-v2-plan.json` captures exact cases, code fingerprints, model,
parameters, targets and provider budgets. Commit/push that plan before collecting.
At most 64 verifier calls plus five embedding batches for the fresh test; at most
93 additional verifier calls for the old regression set, reusing old embeddings.
No answer-generation calls in these evaluations. Save every verifier result and
refusal/error. Replays use stored embeddings and outputs without API calls.

```bash
cd agent
python -m retrieval.gate_eval run --plan runs/gate-fresh-v2-plan.json \
  --artifact runs/gate-fresh-v2-vectors.json.gz \
  --records runs/gate-fresh-v2-records.jsonl --output runs/gate-fresh-v2-results.json
python -m retrieval.gate_eval replay --plan runs/gate-fresh-v2-plan.json \
  --artifact runs/gate-fresh-v2-vectors.json.gz \
  --records runs/gate-fresh-v2-records.jsonl --output /tmp/gate-fresh-replay.json
```

Provider nondeterminism means a new online run need not reproduce stored outputs.
Offline replay reproduces the recorded decisions, not the stochastic provider.
The full Python suite and live source/clarification/refusal smoke are separate
release checks. Model availability/cost is an added dependency; broader traffic,
latency/cost benchmarking and independent answer-quality review remain future work.

API contract: [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).
