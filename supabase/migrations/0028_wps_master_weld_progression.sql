-- 0028 — WPS Master: weld_progression column (missed in 0027)
--
-- QW-405 Position has two fields on the paper form: "Position of Groove" (already
-- captured by wps_master.position) and "Weld Progression", which had no column.
--
-- Rollback:
--   alter table public.wps_master drop column if exists weld_progression;

alter table public.wps_master
  add column if not exists weld_progression text;

comment on column public.wps_master.weld_progression is
  'QW-405 Position: Weld Progression (e.g. Uphill/Downhill/N.A)';
