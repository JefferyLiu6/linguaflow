# Evidence verification: precision recovered, recall gate failed

## Release decision

Do not promote the recall-study branch. The user selected further recall work instead of releasing the conservative candidate. PR #6 was found already merged at `3e8e3a04a25749bbbfb4cbcfcf14569644591620`; this report does not establish which revision is running in production. Follow-up experiments are isolated on `codex/evidence-recall-study`.

## Frozen 64-case evaluation

The dataset, labels, prompt and implementation were committed in `8649863` before execution. The verifier was `gpt-4o-mini-2024-07-18`. This is an AI-authored, corpus-aware synthetic evaluation, not a representative sample of learner traffic.

| Metric | Existing hybrid | With verification |
|---|---:|---:|
| Valid-source recall | 23/32 (71.9%) | 20/32 (62.5%) |
| False retrieval on negatives | 23/32 (71.9%) | 2/32 (6.3%) |
| Source precision | 23/54 (42.6%) | 20/22 (90.9%) |
| Wrong source on positive questions | 8/32 | 0/32 |
| Withheld source on positive questions | 1/32 | 12/32 |
| Candidate recall at five | 100% | 100% |
| Missing-context clarification recall | 0/6 | 3/6 |
| Distractor-card contamination | 8/8 | 0/8 |
| Infrastructure failures | 0/64 | 0/64 |

**The joint gate failed:** precision >=90%, valid-source recall >=80%, negative false retrieval <=10%, infrastructure errors <=2%. Improving precision by withholding useful references is a product tradeoff, not a complete fix.

The accepted reference was available among the five candidates for every positive case. This localizes the lost recall to verification/selection for this set, rather than an embedding candidate-recall failure. It does not prove candidate generation is sufficient on other distributions.

Precision's Wilson 95% interval is 72.2–97.5%; recall's is 45.2–77.1%; negative false retrieval's is 1.7–20.2%. The small synthetic sample does not establish population performance. Verifier-only latency was p50 1,139 ms / p95 1,693 ms at concurrency three; this excludes embedding, database, generation and deployed-network latency. Usage: 64 requests, 127,426 input tokens and 4,700 output tokens.

## Original 93-case set: regression only

All original 16 false negative-case retrievals were eliminated (0/31 now). However, valid-source recall fell from 52/62 to 41/62 (66.1%). Precision rose to 41/42 (97.6%). These exposed cases are regression evidence, not another untouched holdout. Keep both outcomes when discussing the change.

## Metrics and evidence

Full reports include Wilson intervals, source precision, recall, negative false-retrieval rate, specificity, positive over-abstention, wrong-source rate, coverage, selective risk, F0.5, balanced accuracy, candidate recall/MRR, clarification recall, routing accuracy, paired card contamination, infrastructure errors, token usage and verifier timing.

- `agent/runs/gate-fresh-v2-{results.json,records.jsonl,vectors.json.gz}`
- `agent/runs/gate-regression-v1-{results.json,records.jsonl,vectors.json.gz}`
- Protocol: [EVIDENCE_GATE_PROTOCOL_02.md](EVIDENCE_GATE_PROTOCOL_02.md)

Replay the original gate reports at commit `8649863` using `python -m retrieval.gate_eval replay` with the corresponding plan, artifact, records and a new output path. Frozen source hashes reject incompatible implementations. The raw verdicts reproduce recorded decisions; rerunning a hosted model may differ.

## Next experiment

Compare a pinned GPT-4.1 mini verifier on the historical 68 development cases with identical prompt, candidates, labels, timeout and token cap. `retrieval.gate_model_eval` changes the model only inside the offline CLI; the serving configuration remains unchanged. Its own source is included in the frozen plan's code hashes. Cached embeddings are reused with explicit provenance, not recollected.

Select using development results. Do not relabel exposed failures or tune on the 64-case test and describe it as untouched. A candidate that passes development still needs a new pre-run frozen test. Answer correctness, citation faithfulness and production load performance remain unmeasured.
