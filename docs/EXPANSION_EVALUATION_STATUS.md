# 200-note evaluation status

Completed on 2026-11-16 after explicit approval of the US$5.01 ceiling. **100 questions, 200 pipeline responses, 199 graded answers; recorded token cost US$1.21996354.** See the [results and audit findings](EXPANSION_EVALUATION_RESULTS.md).

- [100 labeled synthetic cases](../agent/evals/datasets/expansion-fresh-v1.json): 60 supported, 15 uncovered, 15 missing-context and 10 out-of-scope.
- [Frozen plan](../agent/runs/expansion-fresh-v1-plan.json): paired configurations, model snapshots, prices, corpus and code hashes. Its original pre-run status is preserved.
- [Completed results](../agent/runs/expansion-fresh-v1-results.json) and [200 raw records](../agent/runs/expansion-fresh-v1-records.jsonl).
- [Offline replay](../agent/runs/expansion-fresh-v1-replayed.json): exact equality for summaries, paired differences, per-case outcomes and diagnostic gates.
- [Supplemental audit](../agent/runs/expansion-fresh-v1-audit.json): source errors, judge disclosure mistakes, routing decisions and per-stage costs. Frozen scores are unchanged.
- [Offline test evidence](../agent/runs/expansion-evaluation-offline-checks.json): **312 passed, zero skipped**, including disposable pgvector integration. This pre-collection snapshot uses mocked provider responses and is not answer-quality evidence.
- [Frozen protocol](EXPANSION_EVALUATION_100.md): metrics, uncertainty, spending controls and replay behavior.

The disposable local index contained all 200 notes and was removed after collection. Only public synthetic questions and authored teaching notes were sent to the provider. Production, hosting and the live database remain unchanged. No hosting or model upgrade was made.

One baseline grading failure remains recorded. Judge errors mean the raw perfect routing score must not be treated as proven perfect behavior. Independent human review of labels and judge calibration remains pending. Historical 31-note results and the 169-question BM25 development diagnostic are separate evidence.
