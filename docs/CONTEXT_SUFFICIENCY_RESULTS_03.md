# Context-sufficiency development results 03

## Decision

**Context routing improved on the exposed development set, but no variant passed the frozen acceptance gate. Do not promote any variant.** The strongest final probe recovered five of six labelled sources and eliminated the five unnecessary clarifications from v2, but selected one wrong source and returned one invalid policy result. Following the preregistered gate, no new full-answer run was performed.

All three probes use the same 12 exposed questions and cached top-five references from the prior candidate run. They make one verifier call per case, with no retries: **36 calls total**. These are development experiments, not new held-out evaluations, live retrieval tests, or evidence of better teaching answers. The historical paired v2 counts below are a descriptive reference, not a contemporaneous model-only control.

## Routing and selection

| Metric | Prior v2 | v3 context categories | v4 substantive evidence | v5 model-only change |
|---|---:|---:|---:|---:|
| Verifier | GPT-4o mini | GPT-4o mini | GPT-4o mini | GPT-4.1 mini |
| Wrong clarification / 8 answerable | 5/8 | 0/8 | 0/8 | 0/8 |
| Correct source / 6 supported | 3/6 | 5/6 | 5/6 | 5/6 |
| Correct source / selected source | 3/3 | 5/7 | 5/8 | 5/6 |
| False reference / 6 negative | 0/6 | 2/6 | 2/6 | 0/6 |
| Required clarification / 2 | 2/2 | 2/2 | 2/2 | 2/2 |
| Required redirect / 2 | 2/2 | 1/2 | 2/2 | 1/2 |
| Verification errors / 12 | 0/12 | 1/12 | 0/12 | 1/12 |
| Frozen probe gate | Not applicable | Fail | Fail | Fail |

Errors remain in all expected-case denominators. In v5, zero false references does **not** mean six successful negative abstentions: five negatives were handled correctly and one failed verification. The old v2 full-answer diagnostic gate also failed; its perfect source precision concealed lost coverage.

## What changed and what failed

1. **V3 separates context from coverage.** Explicit categories distinguish general rules, self-contained questions, card-resolved references and genuinely missing text. A short task summary precedes classification. This recovered all eight answerable routes and preserved both missing-context routes. However, two selected quotations were `When to use` metadata, one supported case was withheld, and one output failed validation.
2. **V4 excludes metadata from evidence.** Only complete Explanation, Examples and Boundary paragraphs can be selected. Incorrect examples remain attached to their warnings. Non-language tasks have a non-applicable context category. The model still attributed absent grammar rules to generic vocabulary/register notes. It also selected `en_formal_register_precision` on the formal rewrite case, outside the frozen acceptable alternatives. This may warrant future label review, but the original gold labels and score were not changed after observation.
3. **V5 changes only the verifier model.** A test verifies byte-identical policy source after replacing the model constant. It correctly abstained on both uncovered English questions and recovered the labelled formal rewrite source. However, it selected a participle-clause note for the passive rewrite case. On the antibiotic question, it classified the task as language and supplied a non-exact missing-reference quote; validation rejected it. The raw invalid result is retained. No fallback silently treats that failure as a valid abstention.

The change from binary context flag to categories is bundled with a prompt/order change, so the experiment does not isolate which component caused the improvement. V4-v5 isolates the model constant, but one sequential run on 12 tuned cases is too small to establish a general model ranking. Final-answer scope, factual correctness, teaching usefulness and hallucination were **not rerun** because no probe passed.

## Engineering trade-offs

| Verifier-only measurement, 12 calls | v3 | v4 | v5 |
|---|---:|---:|---:|
| Recorded input tokens | 32,418 | 23,131 | 23,131 |
| Recorded output tokens | 554 | 864 | 1,350 |
| Local verifier p95 | 2,577 ms | 3,382 ms | 3,666 ms |
| Estimated provider cost | $0.00519510 | $0.00398805 | $0.01141240 |

These measurements exclude embedding, database retrieval, answer generation, public HTTP and judge time. p95 over 12 observations is unstable. All calls returned token usage, including structurally rejected outputs. Prices use the repository's existing per-million-token assumptions; cache breakdown was not recorded, so all input is priced uncached. Costs are estimates, not invoices. V5 costs about 2.86 times v4 in this run, partly because it emits more explanation tokens; this did not buy a passing result.

All candidates remain in the offline evaluation package. The serving router continues importing `retrieval.evidence_gate`; its model, prompt, number of calls and responses were not changed. Frozen versions are kept separate so historical replay remains possible. The known missing coverage disclosure in generated general-knowledge answers remains open.

## Validation and reproducibility

- 236 local agent tests passed; six disposable-pgvector integration tests skipped locally.
- All three new reports replay identically with the existing absolute numerical tolerance of 1e-12; old v2 and original answer-pilot reports also reproduce.
- Tests check missing-reference quote identity, empty-card rejection, routing precedence, metadata exclusion, negative-example boundaries, failed-request denominators, replay consistency, and the model-only comparison.
- All plans were committed before their respective provider calls. No result file was overwritten, no failed run was dropped, and labels remained fixed.

From `agent/`, for version 3, 4 or 5:

```sh
python -m evals.routing_v5.probe replay --plan runs/context-probe-v5-plan.json --records runs/context-probe-v5-records.jsonl --output /tmp/context-v5-replay.json
python ../scripts/compare_eval_reports.py runs/context-probe-v5-results.json /tmp/context-v5-replay.json
```

## Remaining work

The next candidate must reliably distinguish a finite tense-preserving rewrite from a related participle rule and classify substantive advice requests before trying to resolve their missing context. Add balanced development contrasts (including legitimate technical wording questions), preserve the no-extra-call budget, and pass the development gate before freezing a fresh test. Do not keep tuning only these 12 exposed cases or present them as generalization evidence.

[Protocol and amendments](CONTEXT_SUFFICIENCY_PROTOCOL_03.md) · [v3 result](../agent/runs/context-probe-v3-results.json) · [v4 result](../agent/runs/context-probe-v4-results.json) · [v5 result](../agent/runs/context-probe-v5-results.json)
