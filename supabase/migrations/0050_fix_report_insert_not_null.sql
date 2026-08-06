-- 0050 — Fix: creating a Dimension report always failed
--
-- `dimension_reports.overall_result` was NOT NULL with no default, but no code
-- path has ever set it: it's a legacy column superseded by `result_status`
-- ('accepted'/'rejected'/'hold'), and appears nowhere in the app except the
-- generated types — which already declare it nullable. So every single
-- "Create Dimension Report" insert died on:
--     null value in column "overall_result" ... violates not-null constraint
-- Reproduced directly against the live schema before this migration.
--
-- Dropping NOT NULL (rather than defaulting it to 'pass') is deliberate: this
-- is a QA/compliance record, and auto-asserting a passing result for a report
-- nobody has evaluated would be a false statement in an inspection document.
alter table public.dimension_reports alter column overall_result drop not null;

-- Same class of landmine on the remaining legacy NOT NULL columns. These only
-- work today because the insert paths happen to pass '{}' explicitly; a
-- default means no future insert path can trip over them.
alter table public.dimension_reports alter column required_dimensions set default '{}'::jsonb;
alter table public.dimension_reports alter column sample_readings     set default '{}'::jsonb;
alter table public.pmi_reports       alter column readings            set default '{}'::jsonb;
