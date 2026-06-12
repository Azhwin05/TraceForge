-- ValveTrack — Phase 1: core schema (tables + indexes)
-- Mirrors master_prompt.md "DATABASE SCHEMA" section, with the audit fixes:
--   * job_cards.nbdn_number is UNIQUE NOT NULL
--   * job_cards.process_type stores lowercase values: welding/machining/cladding/overlay
--   * job_card_status enum includes 'on_hold'

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null,
  role        text not null check (role in ('admin','operator','engineer','qa','accounts','management')),
  phone       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- clients
-- ─────────────────────────────────────────────────────────────
create table public.clients (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  contact_name  text,
  contact_email text,
  contact_phone text,
  address       text,
  created_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- job_cards (MASTER TABLE — single source of truth)
-- ─────────────────────────────────────────────────────────────
create table public.job_cards (
  id                uuid primary key default gen_random_uuid(),
  jc_number         text not null unique,
  client_id         uuid not null references public.clients (id),
  nbdn_number       text not null unique,
  po_number         text,
  description       text not null,
  drawing_number    text,
  heat_number       text,
  part_number       text,
  quantity          integer not null default 1 check (quantity > 0),
  process_type      text[] not null check (
                      process_type <@ array['welding','machining','cladding','overlay']
                      and array_length(process_type, 1) > 0
                    ),
  received_date     date not null default current_date,
  status            text not null default 'created' check (status in (
                      'created','wps_pending','wps_uploaded','wps_approved',
                      'process_assigned','in_process','process_complete',
                      'reports_pending','reports_complete','dispatch_ready',
                      'dispatched','accounts_processing','closed','on_hold'
                    )),
  stage_entered_at  timestamptz not null default now(),
  created_by        uuid references public.profiles (id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- wps_qualifications
-- ─────────────────────────────────────────────────────────────
create table public.wps_qualifications (
  id                uuid primary key default gen_random_uuid(),
  job_card_id       uuid not null references public.job_cards (id) on delete cascade,
  wps_number        text not null,
  revision          text,
  doc_url           text,
  approval_status   text not null default 'pending' check (approval_status in ('pending','approved','rejected')),
  approved_by       uuid references public.profiles (id),
  approved_at       timestamptz,
  rejection_reason  text,
  uploaded_by       uuid references public.profiles (id),
  uploaded_at       timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- pmi_reports
-- ─────────────────────────────────────────────────────────────
create table public.pmi_reports (
  id                uuid primary key default gen_random_uuid(),
  job_card_id       uuid not null references public.job_cards (id) on delete cascade,
  readings          jsonb not null,
  instrument_name   text,
  instrument_serial text,
  calibration_due   date,
  result            text check (result in ('acceptable','not_acceptable')),
  doc_url           text,
  uploaded_by       uuid references public.profiles (id),
  created_at        timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- dimension_reports
-- ─────────────────────────────────────────────────────────────
create table public.dimension_reports (
  id                  uuid primary key default gen_random_uuid(),
  job_card_id         uuid not null references public.job_cards (id) on delete cascade,
  required_dimensions jsonb not null,
  tolerances          jsonb,
  sample_readings     jsonb not null,
  overall_result      text not null check (overall_result in ('pass','fail')),
  instrument_used     text,
  visual_result       text,
  inspected_by        text,
  approved_by_name    text,
  doc_url             text,
  created_by          uuid references public.profiles (id),
  created_at          timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- process_executions
-- ─────────────────────────────────────────────────────────────
create table public.process_executions (
  id                uuid primary key default gen_random_uuid(),
  job_card_id       uuid not null references public.job_cards (id) on delete cascade,
  process_type      text not null check (process_type in ('welding','machining','cladding','overlay')),
  welder_name       text,
  amps_required     text,
  amps_actual       numeric(10,2),
  volts_required    text,
  volts_actual      numeric(10,2),
  travel_speed      numeric(10,2),
  gas_flow_rate     numeric(10,2),
  pre_heat_temp     numeric(10,2),
  inter_pass_temp   numeric(10,2),
  polarity          text check (polarity in ('DCRP','DCSP','AC')),
  consumable_batch  text,
  weld_height       numeric(10,2),
  notes             text,
  assigned_to       uuid references public.profiles (id),
  started_at        timestamptz,
  completed_at      timestamptz,
  status            text not null default 'assigned' check (status in ('assigned','in_progress','completed'))
);

-- ─────────────────────────────────────────────────────────────
-- pwht_runs / pwht_run_jobs
-- ─────────────────────────────────────────────────────────────
create table public.pwht_runs (
  id                uuid primary key default gen_random_uuid(),
  chart_number      text not null,
  furnace_id        text not null,
  loading_temp      numeric(10,2),
  soaking_temp      numeric(10,2),
  soaking_time      numeric(10,2),
  rate_of_heating   numeric(10,2),
  operator_name     text,
  date_of_cycle     date,
  doc_url           text,
  created_by        uuid references public.profiles (id),
  created_at        timestamptz not null default now()
);

create table public.pwht_run_jobs (
  id            uuid primary key default gen_random_uuid(),
  pwht_run_id   uuid not null references public.pwht_runs (id) on delete cascade,
  job_card_id   uuid not null references public.job_cards (id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending','passed','failed')),
  is_final      boolean not null default false,
  unique (pwht_run_id, job_card_id)
);

-- ─────────────────────────────────────────────────────────────
-- dispatches
-- ─────────────────────────────────────────────────────────────
create table public.dispatches (
  id              uuid primary key default gen_random_uuid(),
  job_card_id     uuid not null references public.job_cards (id) on delete cascade,
  dc_number       text not null,
  dispatch_date   date not null,
  vehicle_details text,
  remarks         text,
  doc_url         text,
  created_by      uuid references public.profiles (id),
  created_at      timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- accounts
-- ─────────────────────────────────────────────────────────────
create table public.accounts (
  id              uuid primary key default gen_random_uuid(),
  job_card_id     uuid not null references public.job_cards (id) on delete cascade,
  po_number       text,
  po_value        numeric(12,2),
  invoice_number  text,
  invoice_date    date,
  invoice_value   numeric(12,2),
  grn_status      text not null default 'pending' check (grn_status in ('pending','received','held')),
  grn_date        date,
  payment_status  text not null default 'pending' check (payment_status in ('pending','partial','received')),
  payment_date    date,
  payment_amount  numeric(12,2),
  -- due_date is derived from dispatch_date; see migration 0002 trigger `set_accounts_due_date`
  due_date        date,
  tally_reference text,
  notes           text,
  updated_by      uuid references public.profiles (id),
  updated_at      timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- alerts
-- ─────────────────────────────────────────────────────────────
create table public.alerts (
  id                uuid primary key default gen_random_uuid(),
  job_card_id       uuid not null references public.job_cards (id) on delete cascade,
  alert_type        text not null,
  stage             text not null,
  hours_overdue     numeric(10,2),
  sent_at           timestamptz,
  acknowledged_at   timestamptz,
  acknowledged_by   uuid references public.profiles (id)
);

-- ─────────────────────────────────────────────────────────────
-- audit_log (IMMUTABLE — see migration 0003 for the lockdown policy)
-- ─────────────────────────────────────────────────────────────
create table public.audit_log (
  id            bigserial primary key,
  entity_type   text not null,
  entity_id     uuid not null,
  action        text not null,
  old_value     jsonb,
  new_value     jsonb,
  performed_by  uuid references public.profiles (id),
  performed_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- indexes
-- ─────────────────────────────────────────────────────────────
create index idx_jc_status        on public.job_cards (status);
create index idx_jc_client        on public.job_cards (client_id, status);
create index idx_jc_nbdn          on public.job_cards (nbdn_number);
create index idx_jc_po            on public.job_cards (po_number);
create index idx_jc_drawing       on public.job_cards (drawing_number);
create index idx_jc_heat          on public.job_cards (heat_number);
create index idx_jc_part          on public.job_cards (part_number);
create index idx_jc_stage_entered on public.job_cards (stage_entered_at);
create index idx_audit_entity     on public.audit_log (entity_type, entity_id);

create index idx_jc_fts on public.job_cards using gin (
  to_tsvector('english',
    coalesce(jc_number, '') || ' ' ||
    coalesce(nbdn_number, '') || ' ' ||
    coalesce(po_number, '') || ' ' ||
    coalesce(drawing_number, '') || ' ' ||
    coalesce(heat_number, '') || ' ' ||
    coalesce(part_number, '') || ' ' ||
    coalesce(description, '')
  )
);
