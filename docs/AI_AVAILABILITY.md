# English learning and AI availability

## Application behavior

- New visitors start in English. Explicit language choices persist across Today, Practice, Library and Study. Existing preferences and historical sessions retain their original languages.
- The public sample is an English exercise. The first session contains five questions. Screens explain that AI coaching is available in English; other languages retain exercises and flashcards.
- Study, tutor streaming, exercise generation and planning use bounded client requests with manual retries. Failed questions remain in the input. A dropped stream is an error, never a completed answer.
- HTTP 429 responses honor `Retry-After`. The UI disables retries until the countdown ends. `/api/ai-limits` supplies configured limits; these are allowances, not remaining balances. Daily actor counts are shared between AI features, and IP/global limits can apply earlier.
- Generation and tutor streaming proxy deadlines are 55 seconds inside a 60-second function limit. Study already has this deadline. A deadline is recovery behavior, not a fix for sleeping infrastructure.

## Database rollout

Apply `20261116000001_default_learning_language` through the existing migration process. It changes only the default for new `UserSettings` rows to English; it does not rewrite anyone's saved language. The application also returns English for a missing preference.

## Hosting: retain Free plan

The existing Render service was inspected with authorized account access on November 16, 2026. No hosting or billing changes were saved.

- Service: `linguaflow-demo` (`srv-d7o2vu3rjlhs73arlik0`), Oregon, Python 3, currently Free (0.1 CPU / 512 MB RAM).
- Source: `JefferyLiu6/linguaflow`, branch `main`, root directory `agent`. The dashboard reports live revision `06ef44cd5a0be31035d117d5311f18945669c8e7`.
- Build: `pip install -r requirements.txt`. Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`.
- Health check: `/health` is already configured. The dashboard reports the service as live; no live AI request was run during this inspection.
- The user declined the paid upgrade. The unsaved upgrade selection was canceled, and the dashboard confirmed the existing $0/month plan. Do not upgrade hosting without a new explicit request.
- Free instances still sleep after inactivity. Loading messages, preserved questions and manual retries help users recover but do not eliminate cold starts.
- Recent metrics showed no data captured in the past 48 hours, so memory headroom has not been verified.

Remaining rollout:

1. Keep the Free plan, existing provider/database secrets and `/health` health check. A successful health check alone does not prove retrieval works.
2. Deploy the reviewed web and Python revisions as needed. Apply the language-default migration through the existing database migration process.
3. Run the four synthetic source-policy checks in `DEPLOYMENT.md` within the existing request budget. Record deployed revisions and response times. Verify recovery after inactivity; do not infer always-on hosting from one warm response.

References: [Render pricing](https://render.com/pricing), [free-service behavior](https://render.com/docs/free), [health checks](https://render.com/docs/health-checks).
