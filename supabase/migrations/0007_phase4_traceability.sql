-- ═════════════════════════════════════════════════════════════════════════════
-- 0007 — Phase 4 cleanup: traceability fields for consumable_master and
--         chemical_master (batch tracking required by client documents).
-- ═════════════════════════════════════════════════════════════════════════════

-- ── consumable_master ────────────────────────────────────────────────────────
alter table public.consumable_master
  add column if not exists batch_no            text,
  add column if not exists manufacturing_date  date,
  add column if not exists expiry_date         date;

-- ── chemical_master ──────────────────────────────────────────────────────────
alter table public.chemical_master
  add column if not exists batch_no    text,
  add column if not exists expiry_date date;
