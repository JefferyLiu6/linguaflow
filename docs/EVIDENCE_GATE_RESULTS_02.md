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

## Development model/prompt selection

| Variant (same 68 cases) | Correct / all 53 positives | Source precision | False retrieval | Verification errors |
|---|---:|---:|---:|---:|
| GPT-4o mini, original prompt | 42/53 | 42/50 (84.0%) | 0/15 | 1/68 |
| GPT-4.1 mini, original prompt | 34/53 | 34/40 (85.0%) | 0/14 scored | 13/68 |
| GPT-4.1 mini, explicit semantic applicability + exact short quote | 48/53 | 48/53 (90.6%) | 0/15 | 0/68 |

The first model swap failed; conditional recall excluded 12 positive verification errors. Those failures were validation errors, not measured network outages. The saved error record does not distinguish quote mismatch from other response validation failures, so a precise causal attribution is unavailable. The second prompt trial clarifies that learners need not use grammatical category names and instructs a short contiguous quote from the rule field, with a rationale under 35 words. These two instructions changed together; the run does not isolate their individual effects.

The revised trial passed development targets. Verifier-only p50/p95 were 1,329/1,752 ms; usage 142,040 input and 4,988 output tokens across 68 calls. At the published uncached GPT-4.1 mini rates ($0.40/$1.60 per million input/output tokens), this is about $0.065 of verifier tokens, excluding embeddings and any other work. This is an estimate, not a billing receipt. [Official model documentation](https://developers.openai.com/api/docs/models/gpt-4.1-mini).

## Fresh v3 pre-run protocol

Select the second GPT-4.1 mini trial without inspecting v3 predictions. Freeze 65 AI-authored cases: 31 positives, 12 unsupported English questions, 6 missing-context requests, and 8 out-of-scope questions tested both without a card and with one unrelated card. Labels include predeclared overlapping alternatives. All labels and rationale are in `agent/knowledge/evaluation/gate-fresh-v3.json`; maximum token Jaccard overlap with prior sets or other nonpaired cases is 0.625. This does not establish semantic independence.

Keep the original joint targets (precision >=90%, recall >=80%, negative false retrieval <=10%, verification errors <=2%). No revisions based on v3 outcomes. Freeze the wrapper source, underlying serving code, corpus, embedding inputs and labels in `gate-fresh-v3-plan.json` and Git before provider execution. Budget: 65 verifier requests, concurrency three, 300 output tokens/request, eight-second verifier deadline, up to seven embedding requests. No generated answers or live learner inputs. Results remain an offline candidate regardless of outcome; this branch is not to be merged or deployed in this task.
