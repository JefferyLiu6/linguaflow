# Release and deployment evidence

## Latest source-policy validation

The current branch changes the actual freeform handler and adds reproducible three-layer validation. See [release results](RELEASE_VALIDATION_RESULTS.md) and the [frozen protocol](RELEASE_VALIDATION_PROTOCOL.md). A successful local/provider evaluation or PR check does not establish that Render runs this revision. The historical production observations below apply only to their named commit. No new migration or embedding rebuild is needed for the source-policy change.

## Historical deployment check: production RAG verified

Vercel and Render deployed commit `1c50fcdc7321c3c66983804af692d788d5ebba6d`
from merged PR #4. Its checks passed, including web tests/build, guest browser
tests, Python tests, and real pgvector integration.

Production repair completed: configured Render's missing database connection,
applied `20260915000001_retrieval_publication_manifest` through the session
pooler, and atomically published all 31 teaching notes. The database manifest
is complete and its fingerprint matches the deployed corpus. No application
records were reset. See `agent/runs/production-index-publication.json`.

After publication, the live web endpoint returned HTTP 200 for all three checks:

| Request | Result | Endpoint duration |
|---|---|---|
| English `en03` similar examples | Expected `en_formal_register_precision` source | 390 ms |
| Passive-voice freeform question | Expected `en_passive_vs_active_voice` source | 2,720 ms |
| Medication advice question | Scope refusal without medicines or a retrieved source | 1,980 ms |

See `agent/runs/production-rag-smoke.json` for requests and responses. These are
three smoke observations, not a load benchmark, held-out evaluation, or latency
percentiles. Previously, the positive freeform request returned no source while
metadata retrieval succeeded: a healthy card path did not prove database RAG
was configured. The missing connection and manifest/index are now repaired.

Render uses its free instance tier, which explicitly warns of idle spin-down and
startup delays of 50 seconds or more. Earlier evidence records a 42.5-second
health request followed by a successful 1.29-second warm Study request
(`agent/runs/deployment-recheck.json`). The deployed proxy allows 55 seconds
inside a 60-second function duration; this does not eliminate cold-start risk.

No deployed load benchmark has been completed. A future benchmark needs a
dedicated permitted environment and documented request/token budget. The public
demo defaults (six Study requests/minute, 30 per actor/day, global AI 120/day)
do not permit a 200-request endpoint benchmark. Do not bypass these limits.
Report cold-start, warm endpoint, and local database timings separately.

## Local generation reliability: implemented and tested

Study generation now has a **20-second async deadline** for both metadata and freeform generation. Timeout returns HTTP 504; other provider failures return HTTP 502 without copying provider exception details into the response. Tests verify both routes and cancellation of a slow mocked provider.

The deadline covers the generation await only. It does not bound synchronous embedding/retrieval before generation, replace the frontend's 55-second timeout, or guarantee that cancellation prevents a provider from billing already-started work. The deployed smoke checks above confirm successful responses, but do not simulate provider outages or prove a worst-case latency bound.

The full suite passed **178 Python tests**, including disposable pgvector integration, with one dependency deprecation warning. Evidence: `agent/runs/reliability-validation.json` and `.xml`. The new provider failure tests use controlled mocks, not induced outages at a paid provider.

## Evaluation workflow: author and AI-assisted

External human review is not a release requirement. Evaluate answers using documented author checks or clearly labeled AI-assisted perspectives (for example, English teacher and skeptical AI engineer). Two styles from one model are not independent people or evidence of independent validation.

Use the blinded packet and existing scoring command. Every scored answer must include `evaluation_kind` (`author` or `ai_assisted`) and `reviewer_id`; AI-assisted ratings also require `model`. Preserve claim-level rationale, uncertainty, and original answer text. Existing unfilled packets need these provenance fields added before scoring. The two AI-assisted evaluations are now complete; see [Answer experiment 03](ANSWER_EXPERIMENT_03.md). Scores cover the existing development pilot, not an independent test set.

The dataset intake accepts project-author or AI-assisted cases and one documented evaluation, including the author checking their own case. It still enforces label agreement, scenario grouping, duplicate checks, and the fixed split sizes. A separate [93-case frozen synthetic retrieval holdout](HELDOUT_EVALUATION_01.md) is now complete. It failed the abstention target: 52/62 accepted positives and 16/31 false retrievals on negatives, with no hybrid improvement over vector-only. This is corpus-aware AI-authored evidence, not independent human validation. The originally proposed 240-case set is not collected. A frozen test set must remain untouched after configuration selection; AI labels are not independently validated ground truth.

Historical raw reports and corpus provenance still record the status at collection time. A historical pending human-review field is not a current release gate and must not be rewritten to imply completed validation.

## Historical completion summary

Completed: AI-assisted pilot evaluation, publication, passing CI, deployment verification, migration and complete index publication, warm card retrieval, positive freeform retrieval with the expected source, and a deployed scope-refusal smoke. Free-tier cold starts remain an operational limitation. The 93-case synthetic retrieval holdout is complete and its failed abstention target is reported. The larger 240-case set and permitted endpoint load benchmark remain uncollected; do not infer independent generalization or production latency percentiles. New synthetic answer-test evidence is reported separately in the latest release results. No external reviewer recruitment is required.
