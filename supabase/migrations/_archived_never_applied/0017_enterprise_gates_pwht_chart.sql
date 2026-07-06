-- ValveTrack — 0017: Enterprise hardening
--
-- 1. REPAIR 0016 — its multi-column `ALTER TABLE ... ADD COLUMN IF NOT EXISTS (...)`
--    is invalid Postgres syntax and its idx_pwht_runs_job_status referenced a
--    pwht_runs.job_card_id column that has never existed (link is via pwht_run_jobs).
--    Everything from 0016 is re-declared here correctly and idempotently.
-- 2. PWHT CHART RECORDER — time-series temperature readings per PWHT run,
--    plus component identification / WPS number / cycle window on the run itself.
-- 3. WORKFLOW GATES — document-approval preconditions enforced inside the status
--    transition trigger. "No document → No progress" now holds at the database,
--    regardless of which application code path performs the update.
-- 4. INTEGRITY — unique DC/invoice numbers, missing FK indexes, updated_at
--    maintenance on report/dispatch tables.
-- 5. log_admin_action() — SECURITY DEFINER RPC so privileged app flows (e.g.
--    admin force-close) can write audit entries; direct audit_log inserts are
--    blocked by RLS and were silently failing.
-- 6. Dossier email tracking columns for the automated-documentation module.

-- ═════════════════════════════════════════════════════════════════════════════
-- SECTION 1 — repair 0016: pwht_runs approval workflow columns
-- ═════════════════════════════════════════════════════════════════════════════
alter table public.pwht_runs add column if not exists approval_status text not null default 'draft';
alter table public.pwht_runs add column if not exists approved_by uuid references public.profiles(id) on delete set null;
alter table public.pwht_runs add column if not exists approved_at timestamptz;
alter table public.pwht_runs add column if not exists rejected_by uuid references public.profiles(id) on delete set null;
alter table public.pwht_runs add column if not exists rejected_at timestamptz;
alter table public.pwht_runs add column if not exists rejection_reason text;
alter table public.pwht_runs add column if not exists submitted_by uuid references public.profiles(id) on delete set null;
alter table public.pwht_runs add column if not exists submitted_at timestamptz;
alter table public.pwht_runs add column if not exists submitted_to_customer boolean not null default false;
alter table public.pwht_runs add column if not exists submitted_to_customer_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'pwht_runs_approval_status_check'
      and conrelid = 'public.pwht_runs'::regclass
  ) then
    alter table public.pwht_runs
      add constraint pwht_runs_approval_status_check
      check (approval_status in ('draft','submitted','approved','rejected'));
  end if;
end $$;

create index if not exists idx_pwht_runs_status on public.pwht_runs (approval_status);
drop index if exists idx_pwht_runs_job_status;  -- referenced a column that never existed
create index if not exists idx_pwht_runs_submitted_to_customer
  on public.pwht_runs (submitted_to_customer);

-- 0016's approval-timestamp + immutability + audit triggers, re-declared correctly
create or replace function public.set_pwht_approval_timestamps()
returns trigger
language plpgsql
as $$
begin
  if new.approval_status = 'approved' and old.approval_status is distinct from 'approved' then
    new.approved_at := now();
    new.approved_by := auth.uid();
  end if;
  if new.approval_status = 'rejected' and old.approval_status is distinct from 'rejected' then
    new.rejected_at := now();
    new.rejected_by := auth.uid();
  end if;
  if new.approval_status = 'submitted' and old.approval_status is distinct from 'submitted' then
    new.submitted_at := now();
    new.submitted_by := auth.uid();
  end if;
  if new.submitted_to_customer and not old.submitted_to_customer then
    new.submitted_to_customer_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_pwht_approval_timestamps on public.pwht_runs;
create trigger trg_set_pwht_approval_timestamps
  before update on public.pwht_runs
  for each row execute function public.set_pwht_approval_timestamps();

create or replace function public.prevent_modify_submitted_pwht()
returns trigger
language plpgsql
as $$
begin
  if old.submitted_to_customer and
     (new.approval_status is distinct from old.approval_status or
      new.chart_number    is distinct from old.chart_number or
      new.furnace_id      is distinct from old.furnace_id) then
    raise exception 'Cannot modify heat treatment record after customer submission';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_modify_submitted_pwht on public.pwht_runs;
create trigger trg_prevent_modify_submitted_pwht
  before update on public.pwht_runs
  for each row execute function public.prevent_modify_submitted_pwht();

create or replace function public.log_pwht_approval_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.approval_status is distinct from old.approval_status or
     new.submitted_to_customer is distinct from old.submitted_to_customer then
    insert into public.audit_log (entity_type, entity_id, action, old_value, new_value, performed_by)
    values (
      'pwht_run',
      new.id,
      'status_change',
      jsonb_build_object('approval_status', old.approval_status,
                         'submitted_to_customer', old.submitted_to_customer),
      jsonb_build_object('approval_status', new.approval_status,
                         'submitted_to_customer', new.submitted_to_customer,
                         'rejection_reason', new.rejection_reason),
      auth.uid()
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_log_pwht_approval_change on public.pwht_runs;
create trigger trg_log_pwht_approval_change
  after update on public.pwht_runs
  for each row execute function public.log_pwht_approval_change();

-- ═════════════════════════════════════════════════════════════════════════════
-- SECTION 2 — PWHT chart recorder
-- ═════════════════════════════════════════════════════════════════════════════
alter table public.pwht_runs add column if not exists component_identification text;
alter table public.pwht_runs add column if not exists wps_number text;
alter table public.pwht_runs add column if not exists cycle_start timestamptz;
alter table public.pwht_runs add column if not exists cycle_end timestamptz;
alter table public.pwht_runs add column if not exists rate_of_cooling numeric(10,2);
alter table public.pwht_runs add column if not exists notes text;

create table if not exists public.pwht_chart_readings (
  id             uuid primary key default gen_random_uuid(),
  pwht_run_id    uuid not null references public.pwht_runs (id) on delete cascade,
  channel        text not null default 'TC1',
  recorded_at    timestamptz not null,
  temperature_c  numeric(7,2) not null,
  source         text not null default 'manual' check (source in ('manual','import')),
  created_by     uuid references public.profiles (id),
  created_at     timestamptz not null default now(),
  unique (pwht_run_id, channel, recorded_at)
);

create index if not exists idx_pwht_readings_run
  on public.pwht_chart_readings (pwht_run_id, recorded_at);

alter table public.pwht_chart_readings enable row level security;

drop policy if exists pwht_readings_select on public.pwht_chart_readings;
create policy pwht_readings_select on public.pwht_chart_readings
  for select using (auth.role() = 'authenticated');

drop policy if exists pwht_readings_write on public.pwht_chart_readings;
create policy pwht_readings_write on public.pwht_chart_readings
  for insert
  with check (
    (select role from public.profiles where id = auth.uid()) in ('admin','engineer','qa')
  );

drop policy if exists pwht_readings_delete on public.pwht_chart_readings;
create policy pwht_readings_delete on public.pwht_chart_readings
  for delete
  using (
    (select role from public.profiles where id = auth.uid()) in ('admin','engineer')
  );

-- Chart data is evidence: once the parent run is approved or has gone to the
-- customer, readings are frozen.
create or replace function public.prevent_modify_locked_pwht_readings()
returns trigger
language plpgsql
as $$
declare
  v_status text;
  v_submitted boolean;
begin
  select approval_status, submitted_to_customer
    into v_status, v_submitted
    from public.pwht_runs
   where id = coalesce(new.pwht_run_id, old.pwht_run_id);

  if v_status = 'approved' or v_submitted then
    raise exception 'Chart readings are locked: the PWHT run is approved or submitted to customer';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_lock_pwht_readings on public.pwht_chart_readings;
create trigger trg_lock_pwht_readings
  before insert or update or delete on public.pwht_chart_readings
  for each row execute function public.prevent_modify_locked_pwht_readings();

-- ═════════════════════════════════════════════════════════════════════════════
-- SECTION 3 — workflow gates inside the status transition trigger
-- ═════════════════════════════════════════════════════════════════════════════
-- Computes the list of document blockers for a proposed transition.
-- SECURITY DEFINER so it sees all rows regardless of the caller's RLS view —
-- gates must be judged on the true state of the data.
create or replace function public.job_card_gate_blockers(
  p_job_card_id uuid,
  p_new_status  text
) returns text[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_blockers      text[] := '{}';
  v_process_type  text[];
  v_pwht_required boolean;
  v_is_welding    boolean;
  v_has_approved_report boolean;
begin
  select process_type, pwht_required
    into v_process_type, v_pwht_required
    from public.job_cards where id = p_job_card_id;

  if v_process_type is null then
    return array['Job card not found'];
  end if;

  v_is_welding := v_process_type && array['welding','cladding','overlay'];

  -- Gate: entering reports_complete requires at least one APPROVED inspection
  -- report for welding-family jobs.
  if p_new_status in ('reports_complete','dispatch_ready','dispatched') and v_is_welding then
    select exists (
      select 1 from public.pmi_reports
       where job_card_id = p_job_card_id and pmi_status in ('approved','submitted')
    ) or exists (
      select 1 from public.dimension_reports
       where job_card_id = p_job_card_id and dimension_status in ('approved','submitted')
    ) or exists (
      select 1 from public.overlay_welding_reports
       where job_card_id = p_job_card_id and report_status in ('approved','submitted')
    ) into v_has_approved_report;

    if not v_has_approved_report then
      v_blockers := v_blockers ||
        'At least one approved inspection report (PMI, Dimension or Overlay) is required';
    end if;
  end if;

  -- Gates: entering dispatch_ready / dispatched
  if p_new_status in ('dispatch_ready','dispatched') then
    -- Approved WPS (welding-family jobs)
    if v_is_welding and not exists (
      select 1 from public.wps_qualifications
       where job_card_id = p_job_card_id and approval_status = 'approved'
    ) then
      v_blockers := v_blockers || 'An approved WPS qualification is required';
    end if;

    -- Approved PWHT when the job requires heat treatment
    if v_pwht_required and not exists (
      select 1
        from public.pwht_run_jobs prj
        join public.pwht_runs pr on pr.id = prj.pwht_run_id
       where prj.job_card_id = p_job_card_id
         and pr.approval_status = 'approved'
    ) then
      v_blockers := v_blockers ||
        'PWHT is required for this job: an approved heat treatment run must be linked';
    end if;
  end if;

  -- Gates: closing
  if p_new_status = 'closed' then
    if not exists (
      select 1 from public.dispatches where job_card_id = p_job_card_id
    ) then
      v_blockers := v_blockers || 'Job cannot close without a dispatch record';
    end if;
  end if;

  return v_blockers;
end;
$$;

grant execute on function public.job_card_gate_blockers(uuid, text) to authenticated;

-- Payment gate is separate so the app can distinguish "hard" document blockers
-- (never overridable) from the payment gate (admin-overridable with a reason).
create or replace function public.job_card_payment_blocker(p_job_card_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (
      select 1 from public.accounts
       where job_card_id = p_job_card_id and payment_status = 'received'
    ) then null
    else 'Payment has not been received'
  end;
$$;

grant execute on function public.job_card_payment_blocker(uuid) to authenticated;

-- Rewire the transition trigger: legal-path validation (unchanged) PLUS gates.
create or replace function public.enforce_job_card_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  allowed boolean := false;
  v_blockers text[];
  v_payment text;
begin
  if new.status = old.status then
    return new;
  end if;

  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ) into is_admin;

  -- ANY → on_hold, and on_hold → ANY (resume), remain admin-only escape hatches
  -- for the PATH check — but document gates below still apply to the target.
  if new.status = 'on_hold' or old.status = 'on_hold' then
    if not is_admin then
      raise exception 'Only admin can place a job card on hold or resume it from hold (attempted % → %)', old.status, new.status;
    end if;
    allowed := true;
  else
    allowed := (old.status, new.status) in (
      ('created',           'wps_pending'),
      ('wps_pending',       'wps_uploaded'),
      ('wps_uploaded',      'wps_approved'),
      ('wps_uploaded',      'wps_pending'),         -- re-upload after rejection
      ('wps_approved',      'process_assigned'),
      ('process_assigned',  'in_process'),
      ('in_process',        'process_complete'),
      ('process_complete',  'reports_pending'),
      ('reports_pending',   'reports_complete'),
      ('reports_complete',  'dispatch_ready'),
      ('dispatch_ready',    'dispatched'),
      ('dispatched',        'accounts_processing'),
      ('accounts_processing','closed')
    );
  end if;

  if not allowed then
    raise exception 'Invalid job card status transition: % → % is not permitted', old.status, new.status;
  end if;

  -- Document gates — apply to EVERYONE, including admin and on_hold resumes.
  v_blockers := public.job_card_gate_blockers(new.id, new.status);
  if array_length(v_blockers, 1) > 0 then
    raise exception 'Transition to % blocked: %', new.status, array_to_string(v_blockers, '; ');
  end if;

  -- Payment gate on closure — admin may override (the app records the reason
  -- via log_admin_action; the audit trail on status change fires regardless).
  if new.status = 'closed' and not is_admin then
    v_payment := public.job_card_payment_blocker(new.id);
    if v_payment is not null then
      raise exception 'Transition to closed blocked: %', v_payment;
    end if;
  end if;

  new.stage_entered_at := now();
  return new;
end;
$$;

-- (trigger trg_enforce_job_card_status_transition from 0002 still points at
--  this function; no re-create needed.)

-- ═════════════════════════════════════════════════════════════════════════════
-- SECTION 4 — integrity: uniqueness, FK indexes, updated_at
-- ═════════════════════════════════════════════════════════════════════════════
-- DC numbers and invoice numbers must be unique when present.
create unique index if not exists uq_dispatches_dc_number
  on public.dispatches (dc_number);
create unique index if not exists uq_accounts_invoice_number
  on public.accounts (invoice_number) where invoice_number is not null;

-- Missing FK / query indexes
create index if not exists idx_pe_job_card        on public.process_executions (job_card_id);
create index if not exists idx_dispatch_job_card  on public.dispatches (job_card_id);
create index if not exists idx_accounts_job_card  on public.accounts (job_card_id);
create index if not exists idx_accounts_payment   on public.accounts (payment_status);
create index if not exists idx_accounts_po        on public.accounts (po_number);
create index if not exists idx_prj_job_card       on public.pwht_run_jobs (job_card_id);
create index if not exists idx_wpsq_job_card      on public.wps_qualifications (job_card_id);

-- updated_at maintenance on tables that previously had none
alter table public.pmi_reports       add column if not exists updated_at timestamptz not null default now();
alter table public.dimension_reports add column if not exists updated_at timestamptz not null default now();
alter table public.dispatches        add column if not exists updated_at timestamptz not null default now();

drop trigger if exists trg_pmi_reports_updated_at on public.pmi_reports;
create trigger trg_pmi_reports_updated_at
  before update on public.pmi_reports
  for each row execute function public.set_updated_at();

drop trigger if exists trg_dimension_reports_updated_at on public.dimension_reports;
create trigger trg_dimension_reports_updated_at
  before update on public.dimension_reports
  for each row execute function public.set_updated_at();

drop trigger if exists trg_dispatches_updated_at on public.dispatches;
create trigger trg_dispatches_updated_at
  before update on public.dispatches
  for each row execute function public.set_updated_at();

-- Operators create job cards and often need to register the client at the same
-- time; the server action allows it but RLS only allowed admin. Align them.
drop policy if exists clients_operator_insert on public.clients;
create policy clients_operator_insert on public.clients
  for insert
  with check (
    (select role from public.profiles where id = auth.uid()) in ('admin','operator')
  );

-- ═════════════════════════════════════════════════════════════════════════════
-- SECTION 5 — log_admin_action: audited privileged operations
-- ═════════════════════════════════════════════════════════════════════════════
-- audit_log RLS blocks direct inserts by design; privileged app flows call this
-- instead. Only admins may invoke it, and the action namespace is constrained.
create or replace function public.log_admin_action(
  p_entity_type text,
  p_entity_id   uuid,
  p_action      text,
  p_payload     jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select role from public.profiles where id = auth.uid()) <> 'admin' then
    raise exception 'Only admin may record privileged actions';
  end if;
  if p_action not in ('force_close','payment_override','document_email_sent','admin_note') then
    raise exception 'Unknown privileged action: %', p_action;
  end if;

  insert into public.audit_log (entity_type, entity_id, action, new_value, performed_by)
  values (p_entity_type, p_entity_id, p_action, p_payload, auth.uid());
end;
$$;

grant execute on function public.log_admin_action(text, uuid, text, jsonb) to authenticated;

-- Same idea for non-admin roles, restricted to customer-communication logging
-- (QA sends dossiers/MDBs). Kept separate so admin-only actions stay admin-only.
create or replace function public.log_document_dispatch(
  p_entity_type text,
  p_entity_id   uuid,
  p_payload     jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select role from public.profiles where id = auth.uid()) not in ('admin','qa') then
    raise exception 'Only admin or QA may record document dispatch';
  end if;
  insert into public.audit_log (entity_type, entity_id, action, new_value, performed_by)
  values (p_entity_type, p_entity_id, 'document_email_sent', p_payload, auth.uid());
end;
$$;

grant execute on function public.log_document_dispatch(text, uuid, jsonb) to authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- SECTION 6 — dossier email tracking (automated documentation module)
-- ═════════════════════════════════════════════════════════════════════════════
alter table public.customer_dossiers add column if not exists email_sent_to text;
alter table public.customer_dossiers add column if not exists email_sent_at timestamptz;
alter table public.customer_dossiers add column if not exists email_sent_by uuid references public.profiles(id) on delete set null;

comment on table public.pwht_chart_readings is
  'Time-series temperature readings captured from the PWHT chart recorder (manual entry or CSV import). Frozen once the parent run is approved or submitted to customer.';
comment on function public.job_card_gate_blockers(uuid, text) is
  'Returns document-approval blockers for a proposed job card status transition. Called by the transition trigger — the canonical "No document → No progress" enforcement point.';
