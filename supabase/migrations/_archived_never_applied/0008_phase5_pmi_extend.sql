-- ═════════════════════════════════════════════════════════════════════════════
-- 0008 — Phase 5: Extend pmi_reports with full customer submission fields
--         and add QA update policy so QA can edit their own drafts.
-- ═════════════════════════════════════════════════════════════════════════════

-- ── pmi_reports — add Phase 5 header fields ──────────────────────────────────
alter table public.pmi_reports
  add column if not exists report_number           text,
  add column if not exists report_date             date,
  add column if not exists customer                text,
  add column if not exists quantity                text,
  add column if not exists order_number            text,
  add column if not exists item_no                 text,
  add column if not exists valve_size_class        text,
  add column if not exists valve_type_component    text,
  add column if not exists base_material           text,
  add column if not exists overlay_material        text,
  add column if not exists drawing_number          text,
  add column if not exists procedure_ref           text,
  add column if not exists heat_no                 text,
  add column if not exists annotated_drawing_path  text,
  add column if not exists pmi_status              text not null default 'draft'
                              check (pmi_status in ('draft','approved','rejected','submitted')),
  add column if not exists approved_by_name        text,
  add column if not exists approved_at             timestamptz,
  add column if not exists rejection_reason        text,
  add column if not exists submitted_to_customer   boolean not null default false,
  add column if not exists submitted_at            timestamptz,
  add column if not exists generated_pdf_path      text,
  add column if not exists inspected_by            text;

-- ── RLS — allow QA to update pmi_reports (their own, while in draft) ─────────
-- The existing pmi_qa_insert only allows INSERT; add UPDATE for draft rows.
create policy if not exists "pmi_qa_update" on public.pmi_reports
  for update
  using     (current_role_name() = 'qa' and pmi_status = 'draft')
  with check (current_role_name() = 'qa');

-- ── Index on report_number for fast lookups ───────────────────────────────────
create index if not exists idx_pmi_reports_job_card
  on public.pmi_reports (job_card_id);

create index if not exists idx_pmi_reports_status
  on public.pmi_reports (pmi_status);
