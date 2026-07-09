-- 0025 — Job Card full-capture fields (paper Job Card parity, single-form entry)
--
-- The client wants the Job Card entry screen to mirror the paper Job Card:
-- header/identity + consumable data + welding details + closing block, all on
-- one form. Most fields already exist on job_cards (0018/0019) or on the welding
-- process_executions row. These remaining paper fields had no home yet:
--   * WPS No (distinct from Regularization on the paper)
--   * Consumable Data block (brand / AWS class / size / batch / mfg date)
--   * Weld Deposit Thickness (before) + After-M/C Weld Deposit Thickness
--   * Despatch Details (DC No + Date) — kept as plain paper fields here, separate
--     from the dispatches workflow table so JC entry does not create a dispatch
--     record (which would trip the close gate).
--
-- All additive, nullable text/date — no existing row is affected.

alter table public.job_cards
  add column if not exists wps_no                        text,
  add column if not exists consumable_brand              text,
  add column if not exists consumable_aws_class          text,
  add column if not exists consumable_size               text,
  add column if not exists consumable_batch_no           text,
  add column if not exists consumable_mfg_date           date,
  add column if not exists weld_deposit_thickness_before text,
  add column if not exists weld_deposit_thickness_after  text,
  add column if not exists despatch_dc_no                text,
  add column if not exists despatch_date                 date;
