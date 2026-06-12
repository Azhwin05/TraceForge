-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 7 Cleanup
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Relax overall_result on dimension_reports ─────────────────────────────
--
-- overall_result was the original (Phase 0) result field: NOT NULL ('pass'|'fail').
-- Phase 7 replaced it with result_status ('accepted'|'rejected'|'hold').
-- No frontend code reads overall_result — it is superseded.
-- Making it nullable removes the need to inject a misleading "pass" default
-- on every new Phase 7 report insert.
--
-- Existing rows are unaffected (they have a real value already).
-- The column and its CHECK constraint are kept for backward compat — not dropped.

alter table public.dimension_reports
  alter column overall_result drop not null;

-- ── 2. document_category — no change required ────────────────────────────────
--
-- document_category CHECK constraint already enforces ('uploaded','generated').
-- Both PMI and Dimension PDF generation consistently write 'generated'.
-- document_type ('pmi_report' | 'dimension_report') + source_module distinguish
-- the report type within 'generated'.
-- This is the correct two-level filtering scheme for the future Document Center
-- and Customer Submission Dossier — no rename needed.
