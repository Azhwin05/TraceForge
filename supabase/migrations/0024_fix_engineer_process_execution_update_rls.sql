-- 0024 — Fix engineer RLS on process_executions (silent status-update failure)
--
-- Bug: the "process_engineer_update" policy (from 0003) required
--   current_role_name() = 'engineer' AND assigned_to = auth.uid()
-- This dates from the pre-routing model, where each execution row was personally
-- assigned to one engineer. With the routing model (0021+), "Generate Routing"
-- (seed_process_operations) creates operations with assigned_to = NULL, so the
-- condition was never true for any engineer. The UPDATE matched 0 rows, PostgREST
-- returned HTTP 200 with an empty body (no error), and the app reported a false
-- "Status updated" while the row stayed in its old status.
--
-- Fix: an engineer may update any process_execution row (role check only).
-- This matches the app layer (requireRole(['admin','engineer'])) and is safe
-- because operation ordering is already enforced by the enforce_operation_sequence
-- trigger (0022), and admins retain full control via process_admin_all.
--
-- Rollback:
--   drop policy if exists "process_engineer_update" on public.process_executions;
--   create policy "process_engineer_update" on public.process_executions
--     for update using (current_role_name() = 'engineer' and assigned_to = auth.uid())
--     with check (current_role_name() = 'engineer' and assigned_to = auth.uid());

drop policy if exists "process_engineer_update" on public.process_executions;
create policy "process_engineer_update" on public.process_executions
  for update using (current_role_name() = 'engineer')
  with check (current_role_name() = 'engineer');
