# Routing and indexed-judge development regression 02

## Decision

**Do not promote the routing candidate.** It removes false references on these exposed cases but wrongly asks for context on five of eight answerable questions. Preserve it as an offline experiment; the serving router still imports the legacy policy. Both policies fail the frozen diagnostic gates.

This is a **12-case development regression**, two policies, 24 local-handler responses. Questions and labels reuse the exposed answer pilot. It is not a new held-out result, a significance test, or a production load benchmark. Both policies use GPT-4o mini; the same indexed GPT-4.1 judge evaluates both. No expert validation is claimed.

## Paired results

| Metric | Legacy | Candidate |
|---|---:|---:|
| Pipeline / judge successes | 12/12 / 12/12 | 12/12 / 12/12 |
| Judge first-attempt successes | 12/12 | 12/12 |
| Judge retries | 0 | 0 |
| Source precision | 5/8 (62.5%) | 3/3 (100%) |
| Source recall | 5/6 (83.3%) | 3/6 (50%) |
| Negative false retrieval | 2/6 (33.3%) | 0/6 (0%) |
| Negative abstention accuracy | 4/6 (66.7%) | 6/6 (100%) |
| Wrong clarification on answerable cases¹ | 0/8 | 5/8 |
| Missing-context route selected¹ | 0/2 | 2/2 |
| Out-of-scope redirect selected¹ | 2/2 | 2/2 |
| Correctness / 4 (n=12) | 3.167 | 2.750 |
| Required-fact coverage (n=12) | 77.8% | 58.3% |
| Judged sentence-unit faithfulness | 87.5% (n=8 answers) | 100% (n=3 answers) |
| Judged hallucinated answers | 2/12 | 0/12 |
| Teaching usefulness / 5 (n=8) | 4.375 | 3.125 |
| Answer scope pass | 9/12 | 7/12 |
| End-to-end correct and in scope | 8/12 | 7/12 |
| Pipeline p95 | 8.341 s | 3.478 s |
| Pipeline estimated cost, 12 requests | $0.00543743 | $0.00526058 |
| Judge estimated cost, 12 judgments | $0.050332 | $0.037876 |

¹ Descriptive route counts derived from saved policy decisions and frozen expected behaviors; no additional release threshold was chosen after observing them. Routing and final-answer behavior differ: one legacy answer asked for clarification despite its policy selecting a reference.

Both arms have standard Recall@1 = 66.7%, Recall@3/@5 = 100%; Hit@1 = 83.3%, Hit@3/@5 = 100%, MRR@5 = 0.917 across six supported questions. The failures occur after candidate retrieval. Token counts, all stage timings, queue times, and individual verdicts are in the saved report/records. Verifier cache usage is unavailable and input is priced at the uncached rate; cost is an estimate, not an invoice.

## What this establishes

- The indexed judge produced 24 valid judgments with no retry in this run. The earlier 9/48 failed judgments used a different judge representation and four arms; this is not a controlled statistical estimate of the reliability improvement.
- The candidate handled the two missing-context requests without inventing options. It also misclassified complete passive, formal-register, nominalization, article and fewer/less questions as incomplete.
- Higher conditional precision and faithfulness conceal lost coverage: only three candidate answers receive references. Zero judged hallucinations partly reflects more refusals/clarifications; it is not proof of a better tutor.
- Candidate latency is lower partly because it generated only three teaching answers versus ten legacy generations. Do not present this as an equivalent-work speedup.
- Sentence/line scoring replaces model-extracted atomic claims. Compare the two policies within this run; do not directly compare its faithfulness percentages with the v1 pilot.
- Both uncovered-English cases failed scope expectations under both policies. Legacy generated English help without the required explicit coverage disclosure; candidate requested unnecessary context. This remains an open issue.

## Validation

The indexed judge passed all four existing authored contrast checks: correct grounded, incorrect, correct unsupported, and missing-context grading injection. [Saved checks](../agent/runs/indexed-judge-dev-v2-checks.json). These are development sanity checks, not expert calibration. Local offline agent tests: 222 passed, six disposable-pgvector tests skipped. Both new and historical saved reports replay successfully; CI runs these replay checks without provider credentials.

## Reproduce

```sh
cd agent
python -m evals.rag_v2.runner replay --plan runs/routing-answer-dev-v2-plan.json --records runs/routing-answer-dev-v2-records.jsonl --output /tmp/routing-replay.json
python ../scripts/compare_eval_reports.py runs/routing-answer-dev-v2-results.json /tmp/routing-replay.json
```

Code frozen at `bc21a12`; plan committed at `809b726` before execution. All records are retained. Replay requires no API/database credentials. The historical answer pilot is separately replayed through `scripts/replay_frozen_answer.py`.

## Next release gate

Improve context sufficiency on development cases without losing missing-context protection; enforce coverage disclosure in the final answer; then freeze a fresh test and run broader retrieval regression. Do not spend a fresh test set while this candidate already fails development acceptance. Keep the PR draft and unmerged.

[Protocol](ROUTING_ANSWER_PROTOCOL_02.md) · [Plan](../agent/runs/routing-answer-dev-v2-plan.json) · [Raw records](../agent/runs/routing-answer-dev-v2-records.jsonl) · [Results](../agent/runs/routing-answer-dev-v2-results.json)
