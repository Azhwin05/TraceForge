-- 0057 — cover the three unindexed FKs on rework_records
--
-- Flagged by the Supabase performance advisor right after 0055 landed. Low
-- severity on a table this size today, but free to fix and avoids a
-- sequential scan on the profiles joins (identified_by/performed_by/created_by)
-- as rework volume grows.

create index if not exists idx_rework_created_by    on public.rework_records (created_by);
create index if not exists idx_rework_identified_by on public.rework_records (identified_by);
create index if not exists idx_rework_performed_by  on public.rework_records (performed_by);
