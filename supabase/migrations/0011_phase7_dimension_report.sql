-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 7 — Dimension Inspection Report Module
-- Extends dimension_reports with Phase 7 fields and lifecycle columns.
-- Old columns (required_dimensions, tolerances, sample_readings, overall_result,
-- visual_result, approved_by_name) are kept intact for backward compatibility.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.dimension_reports
  -- ── Report header ────────────────────────────────────────────────────────
  add column if not exists report_number       text,
  add column if not exists report_date         date,
  add column if not exists vendor_name         text,
  add column if not exists description         text,
  add column if not exists drawing_number      text,
  add column if not exists drawing_revision    text,
  add column if not exists po_number           text,
  add column if not exists material_code       text,
  add column if not exists sample_number       text,
  add column if not exists heat_number         text,
  add column if not exists mp_dp_number        text,
  -- ── Inspection ───────────────────────────────────────────────────────────
  add column if not exists visual_satisfactory boolean,
  add column if not exists gauge_used          text,
  add column if not exists approved_by         text,
  -- ── Lifecycle ────────────────────────────────────────────────────────────
  add column if not exists dimension_status    text not null default 'draft'
    check (dimension_status in ('draft','approved','rejected','submitted')),
  add column if not exists result_status       text
    check (result_status in ('accepted','rejected','hold')),
  add column if not exists generated_pdf_path  text,
  add column if not exists submitted_to_customer boolean not null default false,
  add column if not exists submitted_at        timestamptz,
  add column if not exists approved_at         timestamptz,
  add column if not exists rejection_reason    text,
  -- ── Canonical dimension rows ──────────────────────────────────────────────
  -- Array of: { dimension_name, required_dimension, tolerance, actual_value_1,
  --             actual_value_2, actual_value_3, pass_fail, remarks }
  -- Replaces the fragmented required_dimensions/tolerances/sample_readings JSONB
  -- for new reports; old columns kept for backward compat.
  add column if not exists dimensions          jsonb;

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- QA can update non-submitted reports (draft / approved / rejected).
-- dimension_qa_insert already exists from migration 0003.
drop policy if exists "dimension_qa_update" on public.dimension_reports;
create policy "dimension_qa_update" on public.dimension_reports
  for update
  using (current_role_name() = 'qa' and dimension_status <> 'submitted')
  with check (current_role_name() = 'qa');

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists idx_dim_status   on public.dimension_reports (dimension_status);
create index if not exists idx_dim_job_card on public.dimension_reports (job_card_id);
