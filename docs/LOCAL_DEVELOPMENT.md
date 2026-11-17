# Local development

[Back to the project overview](../README.md)

## 1. Guest web app

Requires Node.js 20+ and pnpm (the version is pinned in `package.json`).

```bash
pnpm install
pnpm dev
```

Open [localhost:3000](http://localhost:3000). Guest drills work without a database or authentication setup. AI features require the agent below.

## 2. Python agent

Requires Python 3.11+.

```bash
cd agent
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Fill in `agent/.env`, then start the agent:

```bash
uvicorn main:app --port 8000 --reload
```

The app loads this environment file at startup. Check health at `http://localhost:8000/health`. The web app defaults to this local agent; set `AGENT_URL` in `.env.local` to use another address.

Generation supports several providers. **English freeform RAG requires `OPENAI_API_KEY`** for query embeddings and source verification, even when a different generation provider is selected. It also needs the database/index configuration in section 4.

## 3. Authentication and persistence

Copy the root `.env.example` to `.env.local` and configure:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public client key |
| `DATABASE_URL` | Pooled PostgreSQL connection for the web app |
| `DIRECT_URL` | Migration connection: direct URL or compatible session pooler |
| `AGENT_URL` | Agent base URL; defaults to `http://localhost:8000` |

Use your development database and follow the [deployment runbook](DEPLOYMENT.md) for Supabase authentication settings and migration connection requirements. From the repository root:

```bash
npx prisma migrate deploy
```

Keep real credentials in local environment files, never in Git.

## 4. Freeform retrieval index

After applying migrations, add a compatible `DATABASE_URL` to the agent environment. The agent and web app are separate processes; configuring the web environment alone does not configure the agent.

From `agent/`, with `DATABASE_URL` and `OPENAI_API_KEY` exported in your shell:

```bash
python -m retrieval.validate_corpus
python -m retrieval.sync_embeddings
```

The sync CLI expects process environment variables; it does not load `agent/.env` automatically. Sync creates embeddings and atomically publishes the 200-note index. Coordinate application and index versions when deploying this expansion; see [the rollout plan](CORPUS_EXPANSION_200.md). See [index publication](INDEX_PUBLICATION.md) for version checks and failure behavior.

**Freeform database, embedding or index failures return service errors.** They do not silently fall back to metadata retrieval. Card-based metadata actions remain a separate path. A successful search with no supporting reference permits general English help with an explicit disclosure.

## 5. Tests and saved evaluation replay

From the repository root:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm test
pnpm build
pnpm test:e2e
```

Browser tests cover the guest flow; authenticated tests require their documented environment variables. See [the CI workflow](../.github/workflows/ci.yml) for build environment values and job configuration.

From `agent/`, with the virtual environment activated:

```bash
python -m pytest tests/ -q
```

The ordinary agent suite skips six database integration tests unless a disposable database is configured. To run the full suite with an isolated pgvector container, start Docker and run from the repository root using the agent's Python environment:

```bash
python scripts/check_retrieval_index.py --all
```

This script creates and removes its own test container; it does not use the application database.

The [evaluation report](RELEASE_VALIDATION_RESULTS.md#reproduce-and-inspect) provides commands to replay saved judgments and metrics without paid provider calls. Live evaluations and embedding sync use provider services and incur usage.

## Other useful entry points

- [Environment template: web](../.env.example) / [agent](../agent/.env.example)
- [Web API routes](../app/api) and [agent entry point](../agent/main.py)
- [Data model and schema trade-offs](CASE_STUDY_DATA_MODEL.md)
- [Deployment, demo-account setup and operations](DEPLOYMENT.md)
- `npx tsx scripts/feedback-report.ts` — report helpfulness feedback with a configured database.

## Refresh the README recording

Requires Google Chrome, ffmpeg and the project's installed Playwright package. Start the app and agent, then run:

```bash
DEMO_GIF_BASE_URL=http://localhost:3000 pnpm demo:gif
```

The recorder follows **landing → one-question English practice → correct feedback → saved session → Study → select a passive-voice card → reveal → Explain this card**. It types a canonical sample answer through the UI and makes one real card-explanation request. It does not mock responses or inject session history.

Outputs in `docs/demo/` include an H.264 MP4, a smaller looping GIF, WebVTT captions, desktop/mobile screenshots and scene metadata. It records actual browser motion as native 2× high-quality JPEG frames with measured timing and types at a readable pace. MP4 and GIF exports are 2560 × 1800, including a caption strip. Desktop screenshots are 2560 × 1600; mobile screenshots are 780 pixels wide. Capture targets 20 fps; both MP4 and GIF exports run at 20 fps. Actual capture throughput is recorded in the metadata. Still screenshots remain lossless PNGs. Editorial captions sit below the app; the product design stays unchanged. Long loading gaps are cut, so the result is not latency evidence. Publication occurs only after the expected reference, console/overflow checks and both encoders succeed. A failed run retains temporary capture files for recovery and leaves previous published assets intact.

The recorder defaults to a macOS Arial font. Set `DEMO_FONT` to an installed font file on another platform. Google Chrome, the installed Playwright package and ffmpeg must be available. No browser dependency installation is part of this command.

Pointing the command at a deployed URL uses that deployment's provider budget and rate limits. It does not establish that unpublished backend or corpus changes are deployed. See the [demo assets and walkthrough](demo/README.md).

## Narrated product and AI engineering walkthroughs

The existing local `ai-video-pipeline` supplies Qwen3-TTS narration and Whisper alignment. Its cached models and installed audio environment are required; no packages are installed or models downloaded by these scripts. The engineering tour uses repository evidence and custom diagrams, rather than generative video of a simulated product.

After refreshing the product capture, run from this repository:

```bash
python scripts/narrate-demos.py \
  --pipeline-root /path/to/ai-video-pipeline \
  --work-dir /tmp/linguaflow-narrated-demos
```

The orchestrator reads `docs/demo/narration-script.json`, renders 2× engineering visuals, synthesizes or reuses narration, aligns subtitles, and composes both MP4s. It uses the pipeline's existing English voice configuration and model cache. GPU access may be required on macOS. Edit narration in that JSON; edit technical visuals in `scripts/render-ai-walkthrough.mjs`. Inspect transcripts in the final metadata and rerun any garbled segment before publishing.

`english-study-silent.mp4` preserves the source capture so repeated narration exports do not stack edits. The final product video replaces `english-study-demo.mp4`; the technical tour is `ai-system-walkthrough.mp4`. Both have AAC narration, subtitles burned below the content, and embedded chapters. WebVTT files are also saved. The GIF remains silent, uses 20 fps, and retains the shorter capture timing. Refresh the guide's chapter table after changing narration or pacing.

Use the saved `--work-dir` to reuse TTS and Whisper caches. All composition is local. The technical tour documents the saved evaluation, not a production deployment or a new paid model run.
