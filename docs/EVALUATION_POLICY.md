# Evaluation policy

Human review is optional, not a project or release requirement. Current evaluation uses deterministic checks, author evaluation and explicitly labeled AI-assisted evaluation.

- Keep factual correctness, meaning preservation, teaching usefulness, scope handling and claim support separate.
- An English-teacher perspective and an AI-engineer perspective may expose different problems. They are simulated roles, not two independent human reviewers.
- Record evaluator ID, evaluation kind, actual model identifier for AI evaluation, rubric scores and rationale. Keep uncertainty explicit and do not fill missing ratings with passing scores.
- Corpus/source provenance and historical reports remain intact. Removing a gate does not turn unreviewed examples into expert-validated data.
- Scenario grouping, leakage checks, fixed test splits and deployment performance gates remain. Author/AI-assisted labels limit the strength of generalization claims.

Existing answer packets may omit `evaluation_kind` and `model`; add them when completing ratings. The scoring tool rejects missing provenance. Historical run summaries are retained unchanged for reproducibility.

Validation: **177 tests passed**, including real pgvector integration. The suite checks that a project author can freeze labeled data without external reviewers and that AI-assisted evaluations cannot omit model provenance. Evidence: `agent/runs/evaluation-policy-validation.json`.

## Frozen synthetic holdout

The [93-case retrieval holdout](HELDOUT_EVALUATION_01.md) is AI-authored and corpus-aware. Its protocol, labels and code hashes were committed before execution. The first-run results failed the abstention target and show no hybrid improvement over vector-only. Preserve this result. This set is now a regression suite; tuning against its failures requires a fresh untouched set for the next generalization claim. It does not replace independent label review or held-out answer-quality evaluation.
