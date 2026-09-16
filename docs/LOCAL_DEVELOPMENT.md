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

The sync CLI expects process environment variables; it does not load `agent/.env` automatically. Sync creates embeddings and atomically publishes the 31-note index. See [index publication](INDEX_PUBLICATION.md) for version checks and failure behavior.

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
