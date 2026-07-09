-- 0026 — Index process_executions.machine_id (Phase 7 QA follow-up)
--
-- The performance advisor flagged process_executions.machine_id as an unindexed
-- foreign key (INFO level). It's joined on every job card detail load and every
-- Job Card PDF generation (Operations/Routing table), so it's worth indexing now
-- rather than leaving it to grow unindexed.
--
-- Rollback:
--   drop index if exists public.idx_pe_machine_id;

create index if not exists idx_pe_machine_id
  on public.process_executions (machine_id)
  where machine_id is not null;
