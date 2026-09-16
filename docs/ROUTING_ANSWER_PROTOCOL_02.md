# Routing and answer evaluation v2

## Decision and development protocol

The previous 12-case pilot exposed invented missing context and nine failed judgments. This candidate separates task scope, missing learner context, and supporting evidence in one existing GPT-4o-mini call. Backend precedence is scope → context → evidence. Supplied evidence IDs replace model-copied quotations. The serving router remains unchanged while this offline candidate is evaluated. No production promotion is authorized.

First run: paired **development regression**, reusing all 12 exposed cases in `answer-pilot-v1.json`. This is not a fresh held-out test. Run each case once with legacy policy and once with the candidate, rotating order; both use the same generator and new judge. Freeze source hashes, corpus, labels, budgets and diagnostic targets before execution. Preserve all attempts and failures; never overwrite results. No threshold tuning or rerunning selected failures to improve the reported result.

## Judge change and trade-offs

The backend splits answers into sentence/line units and supplies evidence IDs. The judge labels every unit; backend restores exact quotations and determines teaching applicability and scope compliance. Unit-level correctness/faithfulness is **not directly comparable** with the previous model-extracted atomic-claim metrics. Multiple facts in one unit must all be correct/supported; a single selected evidence unit may under-credit answers combining multiple rules. This reduces quote-copy failures but does not validate the judge's semantic accuracy. Labels and references are AI-authored; there is no expert calibration.

Use the same GPT-4.1 judge for both policies. Reserve at most 24,000 estimated judge tokens per rolling minute; report queue time separately from tutor latency. Retry at most once, only for a temporary 429 with an explicit Retry-After of at most 60 seconds; never retry invalid judgments or billing/quota failures. Retain first-attempt success and retry counts. This is offline evaluation behavior; serving has one verifier call and no retry.

## Evidence and promotion

Report source recall/precision, false retrieval, abstention, ranking, per-route behavior, correctness, fact coverage, sentence-unit faithfulness, hallucination, teaching, pipeline latency, tokens, costs and failures. Diagnostic targets are recorded in each plan, not guarantees. Passing this small development regression is insufficient for promotion: a separately frozen fresh test and broader retrieval regression remain required.

Historical pilot replay uses `python scripts/replay_frozen_answer.py /tmp/answer-replay.json` from the repository root. It checks out the original committed source into a temporary directory through git archive, retaining the original scoring implementation. It makes no provider calls.

The indexed judge also reruns the four already-authored contrast checks from v1 (correct grounded, incorrect, correct unsupported, missing-context grading injection) through `scripts/check_indexed_judge.py`. Their expectations remain unchanged. These are development sanity checks, not an independent assessment or human calibration.
