# Remaining release gates

## Deployment check: warm path works; startup latency observed

On 2026-09-15 the documented homepage returned HTTP 200. One non-generative `show_similar_examples` request to `/api/study-assist` returned **HTTP 502 after 31.114612 seconds**, with an agent-unavailable-or-timeout error. See `agent/runs/deployment-smoke.json`.

A subsequent direct agent health check succeeded after 42.5 seconds; the web Study request then succeeded in 1.29 seconds with the expected note. See `agent/runs/deployment-recheck.json`. Slow startup is consistent with the initial timeout, but the Render service configuration still needs verification. The local Study proxy now permits 55 seconds inside an explicit 60-second function duration and returns a user-facing retry message. This change has not been deployed by these checks.

This establishes that the frontend was reachable and its Study path initially failed, then succeeded after the agent became healthy. It does not identify whether the cause was agent health, configuration, cold startup, network routing or another deployment issue. The Vercel production revision is `3fc033e`; the agent revision is not yet verified. Do not claim current local changes are running in production.

Required next steps once deployment access is available:

1. Identify the frontend and agent deployments and their deployed commits. Inspect the failed request in deployment logs; do not publish credentials or raw sensitive headers.
2. Check the configured agent origin and agent `/health` from the frontend's network, then repeat the same non-generative Study request. A homepage check alone is insufficient.
3. Verify migrations and the active corpus/model manifest before a freeform smoke request. Do not reindex or change a production database merely to obtain a passing benchmark.
4. Use a dedicated staging deployment with a documented request/token budget and permitted load. Local defaults allow six Study requests/minute and 30 per actor/day, with a global AI limit of 120/day; deployed overrides have not been inspected. A 200-request benchmark does not fit those defaults. Do not rotate identities or bypass limits.
5. Record deployment versions, model snapshot, case mix, cache/process conditions, and real error counts. Run at least 100 warm requests at concurrency 1 and 5. Separate generation, retrieval and endpoint timing where instrumentation permits; unavailable component timings must remain unavailable.
6. Define a separate cold-start procedure that actually restarts the intended process/connection/cache state. Do not equate the first request after publication with cold start.

No deployed load benchmark or additional paid generation batch has been run as part of this gate.

## Local generation reliability: implemented and tested

Study generation now has a **20-second async deadline** for both metadata and freeform generation. Timeout returns HTTP 504; other provider failures return HTTP 502 without copying provider exception details into the response. Tests verify both routes and cancellation of a slow mocked provider.

The deadline covers the generation await only. It does not bound synchronous embedding/retrieval before generation, replace the frontend's 55-second timeout, or guarantee that cancellation prevents a provider from billing already-started work. It is not a fix proven against the failed deployment.

The full suite passed **178 Python tests**, including disposable pgvector integration, with one dependency deprecation warning. Evidence: `agent/runs/reliability-validation.json` and `.xml`. The new provider failure tests use controlled mocks, not induced outages at a paid provider.

## Evaluation workflow: author and AI-assisted

External human review is not a release requirement. Evaluate answers using documented author checks or clearly labeled AI-assisted perspectives (for example, English teacher and skeptical AI engineer). Two styles from one model are not independent people or evidence of independent validation.

Use the blinded packet and existing scoring command. Every scored answer must include `evaluation_kind` (`author` or `ai_assisted`) and `reviewer_id`; AI-assisted ratings also require `model`. Preserve claim-level rationale, uncertainty, and original answer text. Existing unfilled packets need these provenance fields added before scoring. The two AI-assisted evaluations are now complete; see [Answer experiment 03](ANSWER_EXPERIMENT_03.md). Scores cover the existing development pilot, not an independent test set.

The dataset intake accepts project-author or AI-assisted cases and one documented evaluation, including the author checking their own case. It still enforces label agreement, scenario grouping, duplicate checks, and the fixed split sizes. The 240-case set is not yet collected. A frozen test set must remain untouched after configuration selection; AI labels are not independently validated ground truth.

Historical raw reports and corpus provenance still record the status at collection time. A historical pending human-review field is not a current release gate and must not be rewritten to imply completed validation.

## Completion criteria

Completed: AI-assisted pilot evaluation and a successful warm deployed Study smoke. Remaining release gates: publish and verify the local changes, resolve the deployed startup tradeoff, and run the permitted endpoint benchmark. The larger frozen evaluation set remains uncollected and is required before claiming held-out performance. No external reviewer recruitment is required. Report automated quality findings as developmental evidence and avoid claims of expert validation or demonstrated learning outcomes.
