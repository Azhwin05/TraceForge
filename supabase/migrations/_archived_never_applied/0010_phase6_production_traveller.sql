-- ═════════════════════════════════════════════════════════════════════════════
-- 0010 — Phase 6: Production Traveller
--   • job_cards  — add advanced details + sign-off columns
--   • nde_records — add chemical_4_id (remover chemical slot)
--   • process_executions — add weld_metal text field
--   • RLS — allow engineer + qa to update job_cards
-- ═════════════════════════════════════════════════════════════════════════════

-- ── job_cards — advanced product/material details ────────────────────────────
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

-- ── job_cards — production sign-off columns ──────────────────────────────────
alter table public.job_cards
  add column if not exists production_checked_by   text,
  add column if not exists production_checked_date date,
  add column if not exists qc_checked_by           text,
  add column if not exists qc_checked_date         date,
  add column if not exists stores_checked_by       text,
  add column if not exists stores_checked_date     date;

-- ── nde_records — 4th chemical slot (remover) ────────────────────────────────
alter table public.nde_records
  add column if not exists chemical_4_id uuid references public.chemical_master(id);

-- ── process_executions — weld metal grade/type ───────────────────────────────
alter table public.process_executions
  add column if not exists weld_metal text;

-- ── RLS — engineer and QA can update job_cards ───────────────────────────────
-- Admin already has full access via job_cards_admin_all.
-- These policies allow engineer (process/material fields) and QA (QC sign-off)
-- to update via server actions which enforce column-level restrictions.
create policy if not exists "job_cards_engineer_update" on public.job_cards
  for update
  using     (current_role_name() = 'engineer')
  with check (current_role_name() = 'engineer');

create policy if not exists "job_cards_qa_update" on public.job_cards
  for update
  using     (current_role_name() = 'qa')
  with check (current_role_name() = 'qa');
