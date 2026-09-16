# Serving-path completion and validation protocol

## Scope and changes

Fix the actual English freeform tutor: scope before context, exact source units tied to the requested linguistic distinction, and backend-provided coverage disclosure. Keep one verifier call, top five candidates, 24 KB input budget, 384 output tokens, eight-second deadline and no serving retries. The candidate uses pinned GPT-4.1; model cost and correlated judge errors must be reported. Structured output validity alone is not semantic correctness. [Official model documentation](https://developers.openai.com/api/docs/models/gpt-4.1).

The user requested completion after reviewing the previous failed offline candidates. This branch integrates the candidate into the real handler; merging is not a substitute for passing evaluation. No production promotion is performed automatically.

## Stages fixed before execution

1. Run 16 development cases: the prior 12 cases plus four contrasts for card-resolved context, valid medical wording, investment advice with a distracting card, and genuinely missing alternatives. Use the real handler, live read-only retrieval and bounded generation. Freeze code, labels, corpus, model snapshots, budgets and targets before execution. Keep every attempt and failure. Development failures may motivate a new version, never rewriting a prior result.
2. After development acceptance, freeze a separate 24-case synthetic test covering 12 supported requests, four uncovered English requests, four missing-context requests and four out-of-scope requests. Do not inspect model outputs on that set until code and labels are frozen. Run once; do not tune against it or relabel observed failures. Same-author synthetic labels and shared grammatical families are not independent expert validation or a user-traffic distribution.
3. Run offline tests, historical-source replay and CI including disposable PostgreSQL. Keep old failed experiments intact. Record final model cost, tokens and stage timings, and update the interview guide privately.

## Fixed acceptance criteria

Use the existing answer judge without prompt changes: mean correctness at least 3/4, sentence-unit faithfulness at least 0.90 when applicable, judged hallucinated-answer rate at most 0.10, teaching usefulness at least 4/5, scope pass at least 0.90, request failures at most 0.02, zero failed judgments. Also require source precision at least 0.90, end-to-end positive source recall at least 0.80, negative false retrieval at most 0.10, all required clarification/redirect routes correct, and zero inappropriate clarification on answerable requests. Criteria are diagnostic portfolio release gates, not statistical certification.

Report exact numerators/denominators and Wilson intervals for source precision, source recall and false references. Failures never count as correct abstention; source recall and routing gates retain all expected cases. Compare raw hybrid source selection on the same retrieved candidates, but do not claim this establishes an answer-quality advantage over a non-RAG baseline. Historical four-arm answer comparisons remain separate evidence.

## Measurement and reproducibility

Generation uses the existing GPT-4o-mini snapshot. Verifier and judge share GPT-4.1 and therefore may share mistakes; record this explicitly. One bounded optional rate-limit retry exists only in the offline judge. A conservative 5,000-token verifier reservation plus the judge's own reservation share a 24,000-token/minute evaluation pacer; waiting occurs outside tutor timing and is reported separately. Report token-based cost estimates, not an invoice or production load benchmark. No private learner history is used or uploaded; cases are public synthetic text.

Old plans fingerprint old serving code. Replay their original source through `scripts/replay_historical_routing.py` (versions 2–5) and `scripts/replay_frozen_answer.py` instead of changing old hashes to bless new code. Release code and dataset fingerprints must match at replay. No provider calls are made by CI replay.

## Development amendment 2 (before repeat execution)

The first serving-path run completed all 16 requests and judgments. All eight positive sources were correct, but `release_dev_16` inferred an ordered alternative list from the card's prompt/answer fields and answered instead of clarifying. This also caused the precision, false-reference, clarification and faithfulness gates to fail. Preserve v1 unchanged, including the conservative missing-context label; the prompt/answer pair makes this an adversarial role-interpretation case, not an obviously empty context.

The application contract is now explicit: ordinal references require an actual ordered list, while a reference to the card answer can use that answer. The verifier prompt adds this general rule; no question-specific pattern matcher, corpus rule, model or label is changed. Freeze a v2 plan and rerun every development case, not just the failure. The unexecuted fresh test remains untouched by provider outputs.


## Development amendment 3 (before repeat execution)

The v2 prompt-only amendment repeated the same ordinal-context failure. Preserve both failed runs. Add a narrow backend contract: an English reference to the first/second/third/last/former/latter option, alternative or choice requires two explicitly labelled or quoted alternatives together in one input field. Never assemble an ordering from separate prompt/answer roles. Scope redirection takes precedence. Unrecognized alternative formats may cause an extra clarification turn; this conservative English-only guard is not a complete coreference resolver. Unit tests cover supplied alternatives, unrelated second-conditional questions and scope priority. Freeze v3 and rerun the unchanged development set before opening the fresh test.
