# Answer experiment 03: AI-assisted evaluation

## Design and provenance

Eight development questions, seven context arms, 56 responses from the pinned `gpt-4o-mini-2024-07-18` model. Questions, cards, system prompt and output schema were paired; context differed. Generation cost was approximately $0.0184. Teacher and skeptical-engineer perspectives evaluated the saved answers in the Codex session, with **no additional provider calls**. These are two simulated perspectives from the same model/session, not independent reviewers. The exact evaluator model snapshot was not exposed and is recorded as unavailable rather than invented.

The session inspected all 56 answers and cited reference texts before assigning ratings, then used the private key to group results by arm. Prior corpus and experiment knowledge existed; this was not a preregistered blind experiment. Ratings and reasons are retained in `agent/runs/answer-review-ai-teacher.json` and `answer-review-ai-engineer.json`; per-arm summaries are in `answer-scores-ai-*.json`.

## Results

Scores range from 0 (major failure) to 2 (satisfactory). Factual correctness excludes the medication case because clinical correctness was not assessed (7 scored answers per arm); meaning preservation excludes medication and a/an (6 per arm). Usefulness and scope each cover all 8. Means below are descriptive, not accuracy percentages or statistically significant differences.

| Arm | Correctness | Meaning | Teacher usefulness | Engineer usefulness | Scope |
| --- | --- | --- | --- | --- | --- |
| card_only | 1.57 | 1.50 | 1.38 | 1.12 | 1.75 |
| whole_corpus | 1.71 | 1.67 | 1.62 | 1.38 | 1.75 |
| metadata | 1.71 | 1.83 | 1.62 | 1.38 | 1.75 |
| bm25 | 1.71 | 1.83 | 1.62 | 1.38 | 1.75 |
| vector | 1.71 | 1.83 | 1.62 | 1.38 | 1.75 |
| hybrid | 1.71 | 1.83 | 1.62 | 1.38 | 1.75 |
| gold | 1.71 | 1.83 | 1.62 | 1.38 | 1.75 |

The perspectives deliberately use different strictness for teaching usefulness while sharing identified factual issues. Their agreement is not independent judge validation. Claim-support judgments cover the entire visible answer as a conjunction: false means at least one material assertion is unsupported or needs qualification. They are **not atomic-claim precision/recall**. Uncited general knowledge uses not-applicable support, not an automatic failure.

## Failures that matter

1. **Scope failure in every arm:** each medication answer declines medical advice but then lists medicines in response to a personal treatment question. The tutoring scope policy fails regardless of context. Clinical recommendations were not evaluated for accuracy.
2. **Register misconception:** several answers suggest sophisticated words improve precision, credibility or respect. The relevant notes say wording depends on audience and meaning; longer is not inherently better. Even whole-corpus context does not reliably enforce this.
3. **Passive-voice imprecision:** the example is correct, but “flip subject and object” should be clarified. Passive promotes the active object to subject; the original agent becomes an optional by-phrase, not the new patient.
4. **Unsupported additions:** one no-reference answer introduces a p-value example without an actual supplied result; another adds “shortly after” when only temporal order is known.
5. **Annotation fidelity:** some generated claim lists contain rules absent from the displayed answer, such as agent omission or prohibiting “that”. Citation-ID validity therefore does not establish faithful annotations or a complete claim audit.

## Decision and resulting changes

The small pilot does not establish a quality advantage for complex retrieval over metadata, and shared generation failures remain even with gold context. Keep the current serving retriever rather than selecting a new winner from eight familiar cases. Retain card-only and whole-corpus baselines in future work. The whole-corpus arm consumed substantially more input tokens without a demonstrated benefit on this pilot.

Study serving prompts now explicitly address register, meaning preservation and tutoring scope. Learner questions, cards and retrieved text are passed in the user message rather than concatenated into the system policy. These are evaluation-driven fixes verified for message construction and failure behavior by tests; their answer-quality impact has **not** been measured in a new provider run. The saved pilot measures the original experiment prompt, not the updated serving prompt.

A fresh, frozen evaluation set and repeated generations would be needed for stronger generalization claims. The proposed 240-case intake is implemented but remains uncollected; do not describe the portfolio as having 240 held-out cases.
