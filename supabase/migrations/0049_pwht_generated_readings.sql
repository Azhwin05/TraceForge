-- 0049 — Allow 'generated' as a pwht_chart_readings source
--
-- Raghav Engineering's furnace uses a mechanical pen-on-paper chart recorder —
-- there's no digital data logger, so the existing CSV-import path
-- (source = 'import') doesn't apply. Instead, staff enter the same cycle
-- parameters printed on the chart's stamp (loading/soaking/unloading temps,
-- rate of heating/cooling, soaking time) and the app computes the trapezoid
-- graph from those numbers. 'generated' keeps the audit trail honest about
-- which points were hand-logged, bulk-imported from a real recorder, or
-- mathematically derived from entered parameters.

alter table public.pwht_chart_readings
  drop constraint pwht_chart_readings_source_check;

alter table public.pwht_chart_readings
  add constraint pwht_chart_readings_source_check
  check (source in ('manual', 'import', 'generated'));
