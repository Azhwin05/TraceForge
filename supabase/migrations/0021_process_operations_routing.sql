-- 0021 — Process operations routing (Phase 2 of the Process Flow enterprise update)
--
-- Turns process_executions into the per-job operation routing/traveller by adding:
--   operation_type  — the specific shop step (pre_machining … deburring)
--   sequence_no     — order of the step within the job
--   machine_id      — the machine the step ran on (→ public.machines)
--   planned/completed/rejected_qty — quantity tracking per step
--   override_by / override_reason  — reserved for the Phase 3 out-of-order gate
--
-- Also adds seed_process_operations(job_card_id): builds the ordered routing from
-- the job's process_type. Canonical order:
--   Pre-Machining → Welding → Final Machining → Milling → Slitting → Deburring
-- Machining steps are seeded when the job includes 'machining'; the Welding step
-- when it includes any of welding/cladding/overlay. A machining-only job therefore
-- skips Welding; a welding-only job gets just the Welding step.
--
-- Fully additive. Existing process_executions rows are untouched (operation_type
-- stays null — they render as legacy/unrouted records). Welding parameter columns
-- are unchanged.
--
-- Rollback:
--   drop function if exists public.seed_process_operations(uuid);
--   alter table public.process_executions
--     drop column if exists operation_type, drop column if exists sequence_no,
--     drop column if exists machine_id, drop column if exists planned_qty,
--     drop column if exists completed_qty, drop column if exists rejected_qty,
--     drop column if exists override_by, drop column if exists override_reason;

alter table public.process_executions
  add column if not exists operation_type   text
    check (operation_type in
           ('pre_machining','welding','final_machining','milling','slitting','deburring')),
  add column if not exists sequence_no      integer,
  add column if not exists machine_id       uuid references public.machines (id) on delete set null,
  add column if not exists planned_qty      numeric,
  add column if not exists completed_qty    numeric,
  add column if not exists rejected_qty     numeric,
  add column if not exists override_by      uuid references public.profiles (id),
  add column if not exists override_reason  text;

comment on column public.process_executions.operation_type is
  'Shop operation this record represents. Null = legacy/unrouted record (pre-0021).';
comment on column public.process_executions.sequence_no is
  'Order of this operation within the job routing (1-based). Null for legacy rows.';

create index if not exists idx_pe_job_sequence
  on public.process_executions (job_card_id, sequence_no)
  where sequence_no is not null;

-- ── Routing seeder ───────────────────────────────────────────────────────────
-- SECURITY DEFINER so job creators (admin/operator/…) can seed the routing even
-- though direct process_executions insert is engineer/admin-only under RLS.
-- Idempotent: does nothing if the job already has routed operations.
create or replace function public.seed_process_operations(p_job_card_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_process_type text[];
  v_qty          numeric;
  v_is_welding   boolean;
  v_is_machining boolean;
  v_seq          int := 0;
  v_count        int := 0;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select process_type, quantity into v_process_type, v_qty
    from public.job_cards where id = p_job_card_id;
  if v_process_type is null then
    raise exception 'Job card not found';
  end if;

  -- idempotent guard: never double-seed routed operations
  if exists (select 1 from public.process_executions
             where job_card_id = p_job_card_id and operation_type is not null) then
    return 0;
  end if;

  v_is_welding   := v_process_type && array['welding','cladding','overlay'];
  v_is_machining := 'machining' = any(v_process_type);

  if v_is_machining then
    v_seq := v_seq + 1;
    insert into public.process_executions
      (job_card_id, process_type, operation_type, sequence_no, status, planned_qty)
      values (p_job_card_id, 'machining', 'pre_machining', v_seq, 'assigned', v_qty);
    v_count := v_count + 1;
  end if;

  if v_is_welding then
    v_seq := v_seq + 1;
    insert into public.process_executions
      (job_card_id, process_type, operation_type, sequence_no, status, planned_qty)
      values (p_job_card_id, 'welding', 'welding', v_seq, 'assigned', v_qty);
    v_count := v_count + 1;
  end if;

  if v_is_machining then
    v_seq := v_seq + 1;
    insert into public.process_executions
      (job_card_id, process_type, operation_type, sequence_no, status, planned_qty)
      values (p_job_card_id, 'machining', 'final_machining', v_seq, 'assigned', v_qty);
    v_seq := v_seq + 1;
    insert into public.process_executions
      (job_card_id, process_type, operation_type, sequence_no, status, planned_qty)
      values (p_job_card_id, 'machining', 'milling', v_seq, 'assigned', v_qty);
    v_seq := v_seq + 1;
    insert into public.process_executions
      (job_card_id, process_type, operation_type, sequence_no, status, planned_qty)
      values (p_job_card_id, 'machining', 'slitting', v_seq, 'assigned', v_qty);
    v_seq := v_seq + 1;
    insert into public.process_executions
      (job_card_id, process_type, operation_type, sequence_no, status, planned_qty)
      values (p_job_card_id, 'machining', 'deburring', v_seq, 'assigned', v_qty);
    v_count := v_count + 4;
  end if;

  return v_count;
end; $$;

revoke all on function public.seed_process_operations(uuid) from public;
grant execute on function public.seed_process_operations(uuid) to authenticated;
