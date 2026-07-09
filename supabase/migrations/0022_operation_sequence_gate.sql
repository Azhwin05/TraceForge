-- 0022 — Operation sequence gate (Phase 3 of the Process Flow enterprise update)
--
-- Enforces the client's "no skipping mandatory steps unless authorized" rule at
-- the operation level:
--   * An operation cannot move to in_progress/completed until every earlier
--     operation (lower sequence_no) for the same job is completed or skipped.
--   * Non-admins are blocked (raised exception). Admin may force the transition;
--     the override is recorded on override_by / override_reason.
--   * Enforced in the DB trigger here AND mirrored in the server action so users
--     get a readable message instead of a raw exception.
--
-- Also:
--   * Adds a 'skipped' operation status (authorized N/A step).
--   * Ties routing into the job-card status machine: in_process -> process_complete
--     is blocked until all routed operations are completed or skipped.
--
-- Additive: the status CHECK only GAINS a value ('skipped') — no existing row
-- violates it. All other objects are new.
--
-- Rollback:
--   drop trigger if exists trg_enforce_operation_sequence on public.process_executions;
--   drop function if exists public.enforce_operation_sequence();
--   alter table public.process_executions drop constraint if exists process_executions_status_check;
--   alter table public.process_executions add constraint process_executions_status_check
--     check (status in ('assigned','in_progress','completed'));
--   (and restore the previous job_card_gate_blockers body)

-- ── 1. Allow 'skipped' status ────────────────────────────────────────────────
alter table public.process_executions drop constraint if exists process_executions_status_check;
alter table public.process_executions add constraint process_executions_status_check
  check (status in ('assigned','in_progress','completed','skipped'));

-- ── 2. Sequence-enforcement trigger ──────────────────────────────────────────
create or replace function public.enforce_operation_sequence()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_is_admin boolean;
  v_blocker  text;
begin
  -- Only guard forward transitions on routed operations.
  if new.operation_type is null or new.sequence_no is null then
    return new;
  end if;
  if new.status not in ('in_progress','completed') then
    return new;
  end if;
  -- No re-check when the status isn't actually advancing (e.g. editing qty).
  if old.status = new.status then
    return new;
  end if;

  select string_agg(operation_type || ' (#' || sequence_no || ')', ', ' order by sequence_no)
    into v_blocker
    from public.process_executions
   where job_card_id = new.job_card_id
     and sequence_no is not null
     and sequence_no < new.sequence_no
     and status not in ('completed','skipped');

  if v_blocker is not null then
    select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin')
      into v_is_admin;
    if not v_is_admin then
      raise exception
        'Operation "%" (step %) cannot start until earlier steps are completed: %',
        new.operation_type, new.sequence_no, v_blocker;
    end if;
    -- Admin override: record who/why.
    if new.override_reason is null then
      new.override_reason := 'Admin out-of-order override';
    end if;
    new.override_by := auth.uid();
  end if;

  return new;
end; $$;

revoke all on function public.enforce_operation_sequence() from public;

drop trigger if exists trg_enforce_operation_sequence on public.process_executions;
create trigger trg_enforce_operation_sequence
  before update on public.process_executions
  for each row execute function public.enforce_operation_sequence();

-- ── 3. Tie routing into the job-card status gate ─────────────────────────────
-- Re-create job_card_gate_blockers with an added process_complete branch.
-- Body is otherwise identical to the live version.
create or replace function public.job_card_gate_blockers(p_job_card_id uuid, p_new_status text)
returns text[]
language plpgsql
stable security definer
set search_path to 'public'
as $$
declare
  v_blockers text[] := '{}';
  v_process_type text[];
  v_is_welding boolean;
  v_pwht_required boolean;
  v_has_approved_report boolean;
begin
  select process_type into v_process_type from public.job_cards where id = p_job_card_id;
  if v_process_type is null then
    return array['Job card not found'];
  end if;
  v_is_welding := v_process_type && array['welding','cladding','overlay'];

  -- (Phase 3) All routed operations must be finished before process_complete.
  if p_new_status = 'process_complete' then
    if exists (select 1 from public.process_executions
                where job_card_id = p_job_card_id
                  and operation_type is not null
                  and status not in ('completed','skipped')) then
      v_blockers := array_append(v_blockers,
        'All routed operations must be completed or skipped before marking process complete');
    end if;
  end if;

  if p_new_status in ('reports_complete','dispatch_ready','dispatched') and v_is_welding then
    select exists (select 1 from public.pmi_reports where job_card_id = p_job_card_id and pmi_status in ('approved','submitted'))
        or exists (select 1 from public.dimension_reports where job_card_id = p_job_card_id and dimension_status in ('approved','submitted'))
        or exists (select 1 from public.overlay_welding_reports where job_card_id = p_job_card_id and report_status in ('approved','submitted'))
      into v_has_approved_report;
    if not v_has_approved_report then
      v_blockers := array_append(v_blockers, 'At least one approved inspection report (PMI, Dimension or Overlay) is required');
    end if;
  end if;

  if p_new_status in ('dispatch_ready','dispatched') then
    if v_is_welding and not exists (
      select 1 from public.wps_qualifications where job_card_id = p_job_card_id and approval_status = 'approved'
    ) then
      v_blockers := array_append(v_blockers, 'An approved WPS qualification is required');
    end if;

    select coalesce(bool_or(wm.pwht_required), false) into v_pwht_required
      from public.wps_qualifications wq
      join public.wps_master wm on wm.id = wq.wps_master_id
     where wq.job_card_id = p_job_card_id;

    if v_pwht_required and not exists (
      select 1 from public.pwht_run_jobs prj
        join public.pwht_runs pr on pr.id = prj.pwht_run_id
       where prj.job_card_id = p_job_card_id and pr.approval_status = 'approved'
    ) then
      v_blockers := array_append(v_blockers, 'PWHT is required for this job (per WPS): an approved heat treatment run must be linked');
    end if;
  end if;

  if p_new_status = 'closed' and not exists (
    select 1 from public.dispatches where job_card_id = p_job_card_id
  ) then
    v_blockers := array_append(v_blockers, 'Job cannot close without a dispatch record');
  end if;

  return v_blockers;
end; $$;
