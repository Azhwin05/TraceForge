-- 0027 — WPS Master: full PQR/WPS field capture (ASME IX QW-482/QW-483 parity)
--
-- The client's paper PQR/WPS (WPS/RE/301) captures far more than the current
-- wps_master schema: joint geometry, base-metal specification detail, filler-metal
-- F-No/A-No, PWHT cooling/loading/unloading, per-pass welding parameters (root vs.
-- subsequent pass), and tensile test results. This migration adds a home for all of
-- it, following the existing convention on this table (scalar columns for
-- single-value fields, JSONB for grouped/repeating data — same pattern as the
-- existing gas_json / electrical_params_json / technique_json).
--
-- New scalar columns:
--   date_of_welding         — QW header "Date of Welding"
--   preheat_other           — QW-406 "Others"
--   pwht_cooling_method     — QW-407 "Cooling"
--   pwht_rate_of_heating    — QW-407 "Rate of heating/cooling"
--   pwht_loading_temp       — QW-407 "Loading" temperature
--   pwht_unloading_temp     — QW-407 "Unloading" temperature
--
-- New JSONB columns (grouped fields, same convention as gas_json etc.):
--   joint_json         — QW-402: root_gap, root_face, groove_angle, groove_length,
--                         groove_width, backing, retainer
--   base_metal_json     — QW-403: material_spec, type_grade, p_no, heat_no,
--                         test_coupon_thickness, test_coupon_diameter
--   filler_metal_json   — QW-404: sfa_spec, f_no, a_no, feed_rate, weld_metal_thickness
--
-- New JSONB array columns (repeating tables):
--   weld_passes_json    — QW-409/410 per-pass table (root pass, subsequent pass/layer):
--                         each row { pass_label, process, filler_classification,
--                         filler_diameter, current_type_polarity, amps_range,
--                         volts_range, travel_speed_range, heat_input }
--   tensile_tests_json  — QW-150 tensile test results: each row { specimen_no, width,
--                         thickness, area, ultimate_load, ultimate_stress,
--                         failure_type_location }
--
-- gas_json / electrical_params_json / technique_json are extended with additional
-- keys (current_type, tungsten_electrode_size, trailing, composition, flow_rate,
-- multi_single_layer, multi_single_electrode, contact_tube_distance,
-- orifice_gas_cup_size, cleaning_method, electrode_spacing, change_of_process,
-- peening, transfer_mode, torch_orifice_dia, filler_metal_delivery,
-- use_of_thermal_process) — no migration needed since these are JSONB, but noted
-- here so the full field list is documented in one place.
--
-- Fully additive: new nullable columns only, no existing row is affected.
--
-- Rollback:
--   alter table public.wps_master
--     drop column if exists date_of_welding, drop column if exists preheat_other,
--     drop column if exists pwht_cooling_method, drop column if exists pwht_rate_of_heating,
--     drop column if exists pwht_loading_temp, drop column if exists pwht_unloading_temp,
--     drop column if exists joint_json, drop column if exists base_metal_json,
--     drop column if exists filler_metal_json, drop column if exists weld_passes_json,
--     drop column if exists tensile_tests_json;

alter table public.wps_master
  add column if not exists date_of_welding      date,
  add column if not exists preheat_other        text,
  add column if not exists pwht_cooling_method   text,
  add column if not exists pwht_rate_of_heating  text,
  add column if not exists pwht_loading_temp     text,
  add column if not exists pwht_unloading_temp   text,
  add column if not exists joint_json            jsonb,
  add column if not exists base_metal_json       jsonb,
  add column if not exists filler_metal_json     jsonb,
  add column if not exists weld_passes_json      jsonb,
  add column if not exists tensile_tests_json    jsonb;

comment on column public.wps_master.joint_json is
  'QW-402 Joints: root_gap, root_face, groove_angle, groove_length, groove_width, backing, retainer';
comment on column public.wps_master.base_metal_json is
  'QW-403 Base Metals: material_spec, type_grade, p_no, heat_no, test_coupon_thickness, test_coupon_diameter';
comment on column public.wps_master.filler_metal_json is
  'QW-404 Filler Metals: sfa_spec, f_no, a_no, feed_rate, weld_metal_thickness';
comment on column public.wps_master.weld_passes_json is
  'QW-409/410 per-pass table (array): pass_label, process, filler_classification, filler_diameter, current_type_polarity, amps_range, volts_range, travel_speed_range, heat_input';
comment on column public.wps_master.tensile_tests_json is
  'QW-150 tensile test results (array): specimen_no, width, thickness, area, ultimate_load, ultimate_stress, failure_type_location';
