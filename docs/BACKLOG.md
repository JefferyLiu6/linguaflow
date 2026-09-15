# Backlog

## RAG engineering release

The prioritized [RAG update plan](RAG_UPDATE_PLAN.md) defines milestones, acceptance gates, experiments, and release evidence. Start with corpus validation and index correctness; keep the unrelated data-model work below separate.

## Next hardening steps

- [ ] Capture live planner and Study screenshots from the deployed app and replace the temporary README note.
- [ ] Normalize `DrillSession.results` into relational per-item tables.
- [ ] Normalize `CustomList.items` into `CustomListItem`.
- [ ] Add aggregate read models for planner and dashboard queries.
- [ ] Add a migration/backfill plan for session-history data after the normalized schema is finalized.
- [ ] Add before/after latency and query-count measurements once the read model work lands.
