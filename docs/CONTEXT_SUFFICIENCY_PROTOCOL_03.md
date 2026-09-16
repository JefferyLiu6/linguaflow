# Context-sufficiency development protocol 03

## Hypothesis

The v2 policy wrongly requested context for 5/8 answerable questions. Separate a general-rule question, a self-contained question, a card-resolved reference and a genuinely missing referent. Lack of a reference rule must not mean missing learner context. This is a hypothesis to test, not an established cause.

The same GPT-4o-mini snapshot makes one bounded call (8 seconds, 300 output tokens, no retry). The structured fields start with a short task summary, then context category, a quoted missing reference if applicable, scope and evidence ID. Backend validation rejects absent/invalid IDs and invented missing-reference quotations; scope/context still override source selection. Quote validation checks text identity, not semantic correctness. The model must still determine whether that referent is actually unresolved.

Structured output key order follows schema order ([OpenAI documentation](https://developers.openai.com/api/docs/guides/structured-outputs#key-ordering)). A task summary before classification is an experimental prompt choice, not a claim that ordering guarantees correctness. No model upgrade or additional serving call is introduced.

## Frozen stages

1. Cached retrieval development probe: all 12 exposed cases and their original top-five reference notes. Freeze code, inputs and labels before calling the candidate. At most 12 provider calls. Pass requires zero provider errors, false references and unnecessary clarifications; all six supported sources, two clarifications and two redirects must be correct. This does not measure live retrieval or final-answer quality.
2. If the probe passes, freeze a new paired end-to-end plan on the same 12 cases, using legacy vs v3 and the unchanged indexed judge from v2. At most 72 pipeline calls and 48 judge calls including bounded temporary-rate-limit retries. Preserve both arms and every failure. This remains development regression, not held-out testing.

Old code, plans, raw records and scores remain unchanged. New candidate code lives only in `evals/routing_v3`; the serving router does not import it. Keep draft/unmerged. Changes after observing a result require a new version/plan, never overwriting the previous run. Fresh testing and broader regression remain necessary before promotion. The known uncovered-answer disclosure issue is separate and remains visible in end-to-end scores.

## Version 4 amendment (before new calls)

V3 recovered context routing (0/8 wrong clarifications; 2/2 required clarifications), but selected two unsupported notes using their `When to use` metadata, missed one positive and produced one invalid policy response. Its probe failed; no end-to-end run is authorized by that gate. Preserve all v3 artifacts.

V4 removes retrieval metadata from selectable evidence, retaining complete Explanation, Examples and Boundary paragraphs. Incorrect examples remain attached to their warning/explanation. A short evidence justification precedes selection. Out-of-scope requests use a non-applicable context category and cannot fail solely because their irrelevant context assessment lacks a quote. Language requests still require validated context fields. The same 12 cached cases and exact acceptance criteria are rerun under a separately frozen source version. No case labels or model change. Full-answer evaluation proceeds only if v4 passes.

## Version 5 model-only probe amendment (before new calls)

V4 again gave 0/8 wrong clarifications and 2/2 correct clarifications, with no provider failures, but still falsely selected two unsupported notes. It also chose an unlabelled alternative on the formal rewrite case; labels remain frozen and unchanged. Its probe failed, so no full-answer run follows v4.

V5 changes only the verifier snapshot to `gpt-4.1-mini-2025-04-14`; prompt, schema, evidence formatting, timeout, output cap and the 12-case acceptance criteria remain identical to v4. This final development variant tests model capacity, retaining higher cost and possible latency trade-offs. [Official model snapshot documentation](https://developers.openai.com/api/docs/models/gpt-4.1-mini). Existing repository price assumptions remain estimates. Serving stays on the original verifier. If v5 passes the probe, the same unchanged indexed judge compares legacy versus v5 end to end. That full-pipeline comparison combines model and policy changes; only v4-v5 probes isolate the model change. No fresh-test claim is permitted.
