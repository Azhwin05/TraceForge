-- ═══════════════════════════════════════════════════════════════════════════
-- 0018 — Full paper Job Card capture
--
-- Closes the gap between the physical Job Card form and the digital record:
--   • Re-applies (idempotently) the content of the never-applied
--     0007_phase4_traceability.sql and 0010_phase6_production_traveller.sql —
--     these were written but never run against the live DB, so job_cards
--     advanced/sign-off fields and consumable/chemical batch+expiry columns
--     may not exist live yet. All statements use IF NOT EXISTS so this is
--     safe to run whether or not that's already true.
--   • Adds new columns for welding qty-actual/welder ID, PWHT process name +
--     loading/unloading time, richer NDE (test coupon, deposit thickness,
--     hardness requirement, NDE number, duration, observer, per-use chemical
--     batch/manufacturer/expiry), machining (machine name, operator, drawing
--     size, weld deposit thickness before/after), and job card punching
--     details.
--   • Adds a new air_test_records table (pressure test section — did not
--     exist in any form previously).
--
-- Entirely additive — no existing column/table is altered or dropped.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── job_cards — advanced product/material details (from archived 0010) ──────
alter table public.job_cards
  add column if not exists product_group          text,
  add column if not exists buyer                  text,
  add column if not exists material_code          text,
  add column if not exists valve_size_class       text,
  add column if not exists valve_type_component   text,
  add column if not exists base_material          text,
  add column if not exists overlay_material       text,
  add column if not exists base_material_grade    text,
  add column if not exists regularization         text,
  add column if not exists ring_heat_no           text,
  add column if not exists mpi_rt_no              text;

-- ── job_cards — production sign-off columns (from archived 0010) ────────────
alter table public.job_cards
  add column if not exists production_checked_by   text,
  add column if not exists production_checked_date date,
  add column if not exists qc_checked_by           text,
  add column if not exists qc_checked_date         date,
  add column if not exists stores_checked_by       text,
  add column if not exists stores_checked_date     date;

-- ── job_cards — punching details (new) ───────────────────────────────────────
alter table public.job_cards
  add column if not exists punching_details text;

-- ── nde_records — 4th chemical slot (from archived 0010) ────────────────────
alter table public.nde_records
  add column if not exists chemical_4_id uuid references public.chemical_master(id);

-- ── nde_records — richer NDE + per-use chemical capture (new) ───────────────
alter table public.nde_records
  add column if not exists test_coupon_number  text,
  add column if not exists deposit_thickness   text,
  add column if not exists hardness_requirement text,
  add column if not exists nde_number          text,
  add column if not exists duration            text,
  add column if not exists observer            text,
  add column if not exists chemicals_used_json jsonb;

-- ── consumable_master / chemical_master — batch + expiry (from archived 0007) ─
alter table public.consumable_master
  add column if not exists batch_no            text,
  add column if not exists manufacturing_date  date,
  add column if not exists expiry_date         date;

alter table public.chemical_master
  add column if not exists batch_no    text,
  add column if not exists expiry_date date;

-- ── process_executions — weld metal grade/type (from archived 0010) ─────────
alter table public.process_executions
  add column if not exists weld_metal text;

-- ── process_executions — actual weld qty + welder ID (new) ──────────────────
alter table public.process_executions
  add column if not exists weld_qty_actual numeric,
  add column if not exists welder_id       text;

-- ── pwht_runs — process name + loading/unloading time (new) ─────────────────
alter table public.pwht_runs
  add column if not exists process_name   text,
  add column if not exists loading_time   integer,
  add column if not exists unloading_time integer;

-- ── dimension_reports — machining header fields + deposit thickness (new) ───
alter table public.dimension_reports
  add column if not exists machine_name                    text,
  add column if not exists operator                        text,
  add column if not exists drawing_size                    text,
  add column if not exists weld_deposit_thickness_before    text,
  add column if not exists weld_deposit_thickness_after     text;

-- ── RLS — engineer and QA can update job_cards (from archived 0010) ─────────
-- Admin already has full access via job_cards_admin_all.
drop policy if exists "job_cards_engineer_update" on public.job_cards;
create policy "job_cards_engineer_update" on public.job_cards
  for update
  using     (current_role_name() = 'engineer')
  with check (current_role_name() = 'engineer');

drop policy if exists "job_cards_qa_update" on public.job_cards;
create policy "job_cards_qa_update" on public.job_cards
  for update
  using     (current_role_name() = 'qa')
  with check (current_role_name() = 'qa');


-- ═══════════════════════════════════════════════════════════════════════════
-- AIR TEST RECORDS — new table
-- Air / hydro pressure test section from the paper Job Card. Did not exist
-- in any form previously.
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.air_test_records (
  id           uuid primary key default gen_random_uuid(),
  job_card_id  uuid not null references public.job_cards (id) on delete cascade,
  tester_name  text,
  pressure     text,
  duration     text,
  result       text not null default 'pending'
                 check (result in ('pending', 'pass', 'fail')),
  notes        text,
  created_by   uuid references public.profiles (id),
  created_at   timestamptz not null default now()
);

comment on table public.air_test_records is
  'Air / hydro pressure test records per job card — from the paper Job Card "Air Testing & Inspection" section.';

create index if not exists idx_air_test_job_card on public.air_test_records (job_card_id);

alter table public.air_test_records enable row level security;

drop policy if exists "air_test_records_select_authenticated" on public.air_test_records;
create policy "air_test_records_select_authenticated" on public.air_test_records
  for select
  to authenticated
  using (true);

drop policy if exists "air_test_records_admin_all" on public.air_test_records;
create policy "air_test_records_admin_all" on public.air_test_records
  for all
  using     (current_role_name() = 'admin')
  with check (current_role_name() = 'admin');

drop policy if exists "air_test_records_engineer_insert" on public.air_test_records;
create policy "air_test_records_engineer_insert" on public.air_test_records
  for insert
  with check (current_role_name() = 'engineer');

drop policy if exists "air_test_records_engineer_update" on public.air_test_records;
create policy "air_test_records_engineer_update" on public.air_test_records
  for update
  using     (current_role_name() = 'engineer')
  with check (current_role_name() = 'engineer');

drop policy if exists "air_test_records_qa_insert" on public.air_test_records;
create policy "air_test_records_qa_insert" on public.air_test_records
  for insert
  with check (current_role_name() = 'qa');

drop policy if exists "air_test_records_qa_update" on public.air_test_records;
create policy "air_test_records_qa_update" on public.air_test_records
  for update
  using     (current_role_name() = 'qa')
  with check (current_role_name() = 'qa');
