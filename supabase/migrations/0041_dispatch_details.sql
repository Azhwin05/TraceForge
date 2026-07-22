-- 0041 — Extra dispatch (delivery-challan) details
--
-- Adds the common who's-carrying-it / how-to-track-it fields to a dispatch.
-- All optional; only the vehicle number is enforced (in the app layer).
-- vehicle_details stays as-is (relabelled "Vehicle Number" in the UI).

alter table public.dispatches
  add column driver_name      text,
  add column driver_phone     text,
  add column transporter_name text,
  add column lr_number        text;
