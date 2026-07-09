-- ═══════════════════════════════════════════════════════════════════════════
-- 0019 — Remaining paper Job Card fields
--
-- Closes the last gaps found by field-by-field comparison against the physical
-- Job Card form:
--   1. Specific welding process (SAW/PTAW/GTAW/GMAW/SMAW/FCAW) — header level.
--   2. "Ring" field (material/type) — distinct from existing ring_heat_no.
--   3. Planned ("As per WPS") counterparts for the welding parameters that only
--      had a single (actual) column — mirrors the existing amps_required/
--      amps_actual + volts_required/volts_actual split. Existing columns keep
--      holding the ACTUAL value; new *_planned columns hold the WPS target.
--   4. "Other Details" / general remarks — distinct from punching/dispatch.
--
-- Entirely additive, idempotent (add column if not exists).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── job_cards — welding process, ring, other details ────────────────────────
alter table public.job_cards
  add column if not exists welding_process text,
  add column if not exists ring            text,
  add column if not exists other_details   text;

-- ── process_executions — planned ("As per WPS") counterparts ────────────────
-- The existing pre_heat_temp / inter_pass_temp / post_heat_temp / travel_speed
-- / gas_flow_rate / consumable_feed_rate / polarity / weld_qty_actual columns
-- continue to hold the ACTUAL values. These *_planned columns hold the WPS
-- target so the paper form's two-row (As-per-WPS / Actual) layout is captured.
alter table public.process_executions
  add column if not exists weld_qty_planned            numeric,
  add column if not exists pre_heat_temp_planned        numeric,
  add column if not exists inter_pass_temp_planned      numeric,
  add column if not exists post_heat_temp_planned       numeric,
  add column if not exists travel_speed_planned         numeric,
  add column if not exists gas_flow_rate_planned        numeric,
  add column if not exists consumable_feed_rate_planned numeric,
  add column if not exists polarity_planned             text;
