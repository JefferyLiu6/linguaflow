# Deployment Runbook

This document covers deploying LinguaFlow from scratch: Vercel (web app),
Supabase (auth + Postgres), and Render (Python agent). It also covers the
migration sequence, embedding sync, and reviewer-account seeding.

---

## Stack overview

| Layer | Service | Notes |
|---|---|---|
| Web app | Vercel | Next.js App Router; edge-compatible |
| Auth + DB | Supabase | Auth + Postgres (pooled + direct URLs) |
| Python agent | Render | FastAPI; separate service from the web app |
| Vector search | Supabase Postgres + pgvector | Required for freeform RAG |
| LLM | OpenAI (default) | Swap via `DEFAULT_MODEL` env var |
| Tracing | Langfuse (optional) | Fail-open; no effect if not configured |

---

## 1. Supabase setup

1. Create a new Supabase project.
2. Under **Authentication → Providers**, ensure email/password is enabled.
3. Under **Authentication → Email**, disable "Confirm email" for the v1 demo
   flow (otherwise new registrations block on a confirmation step).
4. Copy the following values from **Project Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
5. Copy the Postgres connection strings from **Project Settings → Database**:
   - **Connection pooling** (Transaction mode) → `DATABASE_URL`
   - **Direct connection** → `DIRECT_URL`

---

## 2. Prisma migrations

Run migrations against the direct URL (or Supabase session pooler on port 5432
when direct IPv6 access is unavailable) before deploying the web app. Do not use
the transaction pooler on port 6543 for Prisma migrations. See the
[Supabase Prisma guide](https://supabase.com/docs/guides/database/prisma).

```bash
# From the repo root
DIRECT_URL=<direct-url> DATABASE_URL=<pooled-url> npx prisma migrate deploy
```

Migrations (in order):
1. `20260424213703_init_supabase` — application schema
2. `20260425000001_add_retrieval_docs` — pgvector document store
3. `20260426000001_add_ai_response_feedback` — RAG helpfulness feedback
4. `20260915000001_retrieval_publication_manifest` — atomic corpus publication and version checks

After deployment, confirm with:

```bash
DIRECT_URL=<direct-url> DATABASE_URL=<pooled-url> npx prisma migrate status
```

---

## 3. Python agent on Render

1. Create a new **Web Service** on Render and point it at the `agent/` directory.
2. Set the runtime to Python 3.11.
3. Set the **Build Command**: `pip install -r requirements.txt`
4. Set the **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add required environment variables (see §6 below).
6. After deploying, confirm the health endpoint responds:
   ```
   curl https://<your-agent>.onrender.com/health
   ```

The agent URL (`https://<your-agent>.onrender.com`) becomes the value of
`AGENT_URL` in the web app's Vercel environment.

---

## 4. Next.js on Vercel

1. Import the repo into Vercel.
2. Set the **Root Directory** to the repo root (not a subdirectory).
3. Add all environment variables listed in §6.
4. Deploy. The build runs `pnpm install && pnpm build`.

Vercel does not run Prisma migrations automatically. Run them manually (§2)
before the first deployment or after adding new migrations.

---

## 5. Retrieval embedding sync (hybrid RAG)

Document embeddings are prepared offline; freeform requests create a query embedding. Run the sync after deploying
a new corpus or after updating `knowledge/en/contrasts.jsonl`:

```bash
# From the agent directory, with DATABASE_URL + OPENAI_API_KEY set:
python -m retrieval.sync_embeddings

# Preview without writing:
python -m retrieval.sync_embeddings --dry-run

# Full reindex (re-embed all rows, ignoring hash cache):
python -m retrieval.sync_embeddings --rebuild
```

Output: `inserted N  updated N  skipped N  failed N  deactivated N`

Structured card actions can use local metadata when the database is unavailable.
Freeform help returns HTTP 503 for unavailable embedding, database, index or source
verification. Only a successfully verified English request with no supporting note
receives general-knowledge help, with a backend-provided coverage disclosure.
A healthy `/health` response or successful card action does not prove that RAG works. Configure `DATABASE_URL` on **Render as well as Vercel**,
apply the manifest migration, and publish the corpus before verifying a known
positive freeform question returns `retrievalHit: true` and the expected source.

On 2026-09-15, the deployed Render service lacked `DATABASE_URL`; a passive-voice
freeform smoke returned no source even though card retrieval succeeded. Adding
the connection, applying the manifest migration, and publishing all 31 notes
resolved this issue; the repeated freeform smoke returned the expected source.
See [release evidence](RELEASE_EVIDENCE_STATUS.md).

---

## 6. Environment variables

### Web app (Vercel)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon/publishable key |
| `DATABASE_URL` | Yes | Pooled Postgres URL (Prisma runtime) |
| `DIRECT_URL` | Yes | Direct Postgres URL (Prisma CLI / migrations) |
| `AGENT_URL` | Yes | Python agent base URL, e.g. `https://your-agent.onrender.com` |
| `UPSTASH_REDIS_REST_URL` | Recommended | Redis for cross-instance rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Recommended | Upstash token |

### Python agent (Render)

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes (default model) | OpenAI key for `openai/gpt-4o-mini` |
| `DEFAULT_MODEL` | No | Override default model, e.g. `anthropic/claude-3-5-haiku` |
| `DATABASE_URL` | Yes for freeform RAG | Postgres URL; configure separately on Render |
| `LANGFUSE_PUBLIC_KEY` | No | Langfuse tracing public key |
| `LANGFUSE_SECRET_KEY` | No | Langfuse tracing secret key |
| `LANGFUSE_HOST` | No | Langfuse host (default: `https://cloud.langfuse.com`) |
| `HYBRID_STRONG_HIT_THRESHOLD` | No | Metadata score above which vector path is skipped (default: 8) |
| `HYBRID_ALPHA` | No | Blend weight for hybrid reranking (default: 0.6) |

---

## 7. Reviewer / demo account

The shared reviewer account lets anyone test the authenticated features
(planner, RAG coaching, Study helper, helpfulness feedback) without creating
their own account.

### Creating the account

1. Register via `/register` on the deployed app with the demo credentials.
2. Note the Supabase user UUID (visible in the Supabase dashboard under
   **Authentication → Users**, or by calling `GET /api/auth/me`).

### Seeding the account

Run the seed script with the user UUID:

```bash
DATABASE_URL=<pooled-url> npx tsx scripts/seed-demo-account.ts <userId>
```

This creates:
- **Language preference**: English
- **12 drill sessions** spanning 14 days (substitution, transformation, phrase,
  vocab, money, sport, tech) — enough for the planner to produce recommendations
  immediately on the Results screen
- **1 custom list** with 8 items demonstrating the custom-list workflow

The script is **fully idempotent**: existing reviewer data is wiped and
re-created on each run.

### Resetting a drifted account

If shared use has accumulated unwanted data:

```bash
DATABASE_URL=<pooled-url> npx tsx scripts/seed-demo-account.ts <userId>
```

Same command — re-running it restores the account to the known baseline.

### Reviewer credentials

Store the demo email and password in your deployment notes. Add them to
the README's reviewer path section once the deployment is live.

---

## 8. Post-deploy verification checklist

- [ ] `GET /` loads without errors (guest mode)
- [ ] `GET /api/auth/me` returns `{ "user": null }` for unauthenticated requests
- [ ] Sign in with the reviewer account → redirects to `/dashboard`
- [ ] Dashboard shows Training Results (session history from seed)
- [ ] Run a drill session in English → Results screen shows planner card
- [ ] Ask the tutor "Explain this" → coach panel shows "Coach reference" label and 👍/👎 controls
- [ ] Visit Study tab on an English card → "Explain" action shows "Study reference" and 👍/👎 controls
- [ ] Click 👍 → feedback saves and shows "Saved"
- [ ] `GET https://<agent>.onrender.com/health` → `{ "status": "ok" }`
- [ ] `python -m pytest tests/ -q` passes 110+ tests (run locally or in CI)

---

## 9. Ops scripts reference

| Script | Purpose |
|---|---|
| `scripts/seed-demo-account.ts` | Seed or reset the reviewer demo account |
| `scripts/feedback-report.ts` | Print helpfulness rates by surface, mode, and source note |
| `python -m retrieval.sync_embeddings` | Sync corpus embeddings to pgvector |
| `python -m retrieval.eval_runner` | Run retrieval eval harness (metadata or hybrid) |
| `python -m retrieval.eval_runner --arm freeform` | Run freeform eval + head-to-head comparison |

## Serving source-policy release

Study freeform uses one pinned `gpt-4.1-2025-04-14` verification call before answer generation. It checks task scope, missing learner context and substantive support in the top five notes. It permits at most 24 KB of input, 384 output tokens, an eight-second verifier deadline and no verifier retries. Generation retains its existing deadline and selectable model. The release evaluation pins GPT-4o-mini generation; other model choices are not covered by those scores.

No new database migration or index publication is needed for this source-policy-only change: the corpus and embedding configuration are unchanged. Deploy the Python agent revision as well as the web app; a Vercel preview alone does not update the Render backend. New code has not been production-verified merely because CI or the local evaluation passed.

After deployment, verify four small public-synthetic smoke requests within the existing demo rate limits: a complete passive rewrite selects the passive source; an uncovered article question has no source and starts with the coverage disclosure; missing alternatives trigger clarification; a medication-dose request redirects without a recommendation. Record the deployed revision, source IDs and HTTP outcomes. Do not interpret these smoke checks as held-out quality or a load benchmark.

Historical evaluation reproduction uses `scripts/replay_historical_routing.py` for old routing snapshots and `scripts/replay_release_snapshot.py` for recorded release plans. These run saved outputs offline and require the repository's committed history (`fetch-depth: 0` in CI).
