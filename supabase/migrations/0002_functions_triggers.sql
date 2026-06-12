-- ValveTrack — Phase 1: functions & triggers
-- RULE 1: job_cards.status state machine
-- RULE 2: auto audit log on every status change (SECURITY DEFINER —
--         this is the ONLY path that may write to audit_log; see 0003 RLS)

-- ─────────────────────────────────────────────────────────────
-- generic updated_at maintenance
-- ─────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_job_cards_updated_at
  before update on public.job_cards
  for each row execute function public.set_updated_at();

create trigger trg_accounts_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- RULE 1 — status state machine
-- Allowed transitions only. Also stamps stage_entered_at whenever
-- status actually changes, which the ageing engine depends on.
-- ─────────────────────────────────────────────────────────────
create or replace function public.enforce_job_card_status_transition()
returns trigger
language plpgsql
as $$
declare
  is_admin boolean;
  allowed boolean := false;
begin
  if new.status = old.status then
    return new;
  end if;

  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ) into is_admin;

  -- ANY → on_hold, and on_hold → ANY (resume), are admin-only escape
  -- hatches that bypass the fixed transition table below. The spec
  -- doesn't track which stage a job was held from, so resuming to any
  -- valid status is left to the admin's judgment.
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

  new.stage_entered_at := now();
  return new;
end;
$$;

create trigger trg_enforce_job_card_status_transition
  before update of status on public.job_cards
  for each row execute function public.enforce_job_card_status_transition();

-- ─────────────────────────────────────────────────────────────
-- RULE 2 — auto audit log on job_cards.status changes
-- SECURITY DEFINER: runs as the function owner (postgres), bypassing
-- RLS, so it remains the *only* writer to audit_log regardless of the
-- calling user's role. No role is granted direct INSERT (see 0003).
-- ─────────────────────────────────────────────────────────────
create or replace function public.log_job_card_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into public.audit_log (entity_type, entity_id, action, old_value, new_value, performed_by)
    values (
      'job_card',
      new.id,
      'status_change',
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status),
      auth.uid()
    );
  end if;
  return new;
end;
$$;

create trigger trg_log_job_card_status_change
  after update of status on public.job_cards
  for each row execute function public.log_job_card_status_change();

-- ─────────────────────────────────────────────────────────────
-- accounts.due_date = dispatches.dispatch_date + 60 days
-- Derived automatically whenever an accounts row is linked/updated,
-- by reading the job's dispatch record (keeps it tamper-proof and
-- avoids relying on app code to compute it).
-- ─────────────────────────────────────────────────────────────
create or replace function public.set_accounts_due_date()
returns trigger
language plpgsql
as $$
declare
  v_dispatch_date date;
begin
  select dispatch_date into v_dispatch_date
  from public.dispatches
  where job_card_id = new.job_card_id
  order by created_at desc
  limit 1;

  if v_dispatch_date is not null then
    new.due_date := v_dispatch_date + 60;  -- date + integer days = date
  end if;

  return new;
end;
$$;

create trigger trg_accounts_set_due_date
  before insert or update on public.accounts
  for each row execute function public.set_accounts_due_date();

-- ─────────────────────────────────────────────────────────────
-- accounts.payment_status = 'received' → job_cards.status = 'closed'
-- ─────────────────────────────────────────────────────────────
create or replace function public.close_job_on_payment_received()
returns trigger
language plpgsql
as $$
begin
  if new.payment_status = 'received'
     and (old.payment_status is distinct from new.payment_status) then
    update public.job_cards
    set status = 'closed'
    where id = new.job_card_id
      and status = 'accounts_processing';
  end if;
  return new;
end;
$$;

create trigger trg_close_job_on_payment_received
  after update of payment_status on public.accounts
  for each row execute function public.close_job_on_payment_received();
