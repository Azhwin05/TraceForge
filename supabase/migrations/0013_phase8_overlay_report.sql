-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 8 — Overlay Welding Report Module
-- New table: overlay_welding_reports
-- Auto-fills from job_card, wps, process_execution, nde_record, pwht, dimensions
-- ═══════════════════════════════════════════════════════════════════════════

create table public.overlay_welding_reports (
  id uuid primary key default gen_random_uuid(),
  job_card_id uuid not null references public.job_cards (id) on delete cascade,

  -- ── Header ───────────────────────────────────────────────────────────────
  report_number          text,
  report_date            date,
  vendor_name            text,
  vendor_number          text,
  customer_name          text,
  po_number              text,
  nbdn_number            text,
  material_code          text,
  drawing_number         text,
  wps_number             text,
  item_description       text,
  quantity               text,
  base_material_grade    text,
  heat_number            text,
  test_coupon_number     text,
  dimension_report_number text,

  -- ── Welding / Consumable ─────────────────────────────────────────────────
  welder_name                 text,
  visual_examination          text,
  process                     text,
  job_card_number             text,
  job_card_date               date,
  deposit_material            text,
  aws_class_number            text,
  consumable_make             text,
  consumable_batch_number     text,
  date_of_welding             date,
  heat_treatment_chart_number text,
  hardness_required           text,
  hardness_actual             text,
  deposit_thickness_condition text,
  deposit_thickness_required  text,
  deposit_thickness_actual    text,

  -- ── LPT / NDE ────────────────────────────────────────────────────────────
  lpt_procedure_ref    text,
  type_of_penetrant    text,
  stage_of_test        text,
  penetrant_application text,
  penetrant_removal    text,
  evaluation_of_dp_test text,
  temperature_of_part  text,
  penetrant_dwell_time text,
  surface_condition    text,
  developer_application text,
  post_cleaning        text,
  developer_dwell_time text,
  -- Array of { chemical_type, chemical_name, manufacturer, batch_no, expiry_date }
  chemicals_used_json  jsonb,
  result_status        text check (result_status in ('accepted','rejected','hold')),

  -- ── Remarks / Sign-off ───────────────────────────────────────────────────
  remarks       text,
  inspected_by  text,
  approved_by   text,
  rejection_reason text,

  -- ── Lifecycle ────────────────────────────────────────────────────────────
  report_status          text not null default 'draft'
    check (report_status in ('draft','approved','rejected','submitted')),
  generated_pdf_path     text,
  submitted_to_customer  boolean not null default false,
  submitted_at           timestamptz,
  approved_at            timestamptz,

  -- ── Audit ────────────────────────────────────────────────────────────────
  created_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.overlay_welding_reports enable row level security;

-- Admin: full access
create policy "overlay_admin_all" on public.overlay_welding_reports
  for all
  using (current_role_name() = 'admin')
  with check (current_role_name() = 'admin');

-- QA: select all, insert, update non-submitted
create policy "overlay_qa_select" on public.overlay_welding_reports
  for select
  using (current_role_name() = 'qa');

create policy "overlay_qa_insert" on public.overlay_welding_reports
  for insert
  with check (current_role_name() = 'qa');

create policy "overlay_qa_update" on public.overlay_welding_reports
  for update
  using (current_role_name() = 'qa' and report_status <> 'submitted')
  with check (current_role_name() = 'qa');

-- Everyone else: read-only
create policy "overlay_others_select" on public.overlay_welding_reports
  for select
  using (current_role_name() not in ('admin','qa'));

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index idx_overlay_job_card on public.overlay_welding_reports (job_card_id);
create index idx_overlay_status   on public.overlay_welding_reports (report_status);

-- ── updated_at trigger ────────────────────────────────────────────────────────
-- Reuse existing set_updated_at() function defined in migration 0002
create trigger overlay_set_updated_at
  before update on public.overlay_welding_reports
  for each row execute function public.set_updated_at();
