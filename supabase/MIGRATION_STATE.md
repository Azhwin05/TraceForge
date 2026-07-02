# Migration State — source of truth

**Last reconciled: 2026-07-02** (against the live Supabase project `axwxpjbzdhaevoimagiz`).

The local `supabase/migrations/*.sql` files and the **remote** migration history had
drifted. This document is the authoritative map. To materialise exact remote SQL into
local files, run `supabase db pull` (needs the DB password / CLI login).

## Remote migration history (what is actually applied)

| Version | Name | Notes |
|---|---|---|
| 20260608102151 | 0001_schema | core schema |
| 20260608131345 | 0002_functions_triggers | status trigger, audit |
| 20260608131620 | 0003_rls_policies | base RLS |
| 20260611013540 | production_hardening | (local file not tracked by name) |
| 20260611073630 | performance_indexes | |
| 20260611160108 | atomic_jc_number | generate_jc_number() |
| 20260612012022 | phase1_schema | == local 0004 |
| 20260612012058 | phase1_rls | == local 0005 |
| 20260612013631 | phase2_documents_extend | == local 0006 |
| 20260625081132 | 0013_phase8_overlay_report | |
| 20260625081156 | 0014_phase10_dossier | |
| 20260628035745 | oes_schema | **unrelated app** sharing this DB — leave alone |
| 20260628035800 | oes_storage | **unrelated app** |
| 20260702120642 | fix_rls_authenticated_all_bypass | 🔴 removed blanket `authenticated_all` RLS (priv-esc) |
| 20260702120739 | enterprise_gates_pwht_chart_recorder | approval cols, PWHT chart recorder, gate fn, integrity |
| 20260702120910 | fix_gate_blockers_array_append | fix malformed-array bug in gate fn |
| 20260702121019 | harden_rpc_execute_grants_and_search_path | RPC grants + NULL-role fail-closed |
| 20260702121057 | revoke_anon_execute_new_functions | revoke anon EXECUTE |
| 20260702121723 | require_auth_for_all_selects | 🔴 SELECT policies → authenticated-only (anon data leak) |
| 20260702121918 | tighten_remaining_select_policies | master tables authenticated-only |
| 20260702______ | customer_portal_role_and_rls | 'customer' role + client-scoped RLS for the portal |

## Local files that were NEVER applied remotely (do NOT run as-is)

These phase files exist in `supabase/migrations/` but are **not** in the remote history.
Their intended columns were re-created (idempotently, matching real schema) by the
2026-07-02 `enterprise_gates_pwht_chart_recorder` migration:

- `0007_phase4_traceability.sql`
- `0008_phase5_pmi_extend.sql`  → `pmi_reports.pmi_status` now added live
- `0009_phase5_pmi_cleanup.sql`
- `0010_phase6_production_traveller.sql`
- `0011_phase7_dimension_report.sql` → `dimension_reports.dimension_status` now added live
- `0012_phase7_cleanup.sql`
- `0015_expand_document_types.sql` → document_type CHECK expanded live
- `0016_pwht_approval_workflow.sql` → ⚠️ **contains invalid SQL** (`ADD COLUMN IF NOT EXISTS (...)`
  multi-column form + index on a non-existent `pwht_runs.job_card_id`). Superseded live;
  never run this file.
- `0017_enterprise_gates_pwht_chart.sql` → a local draft; the **live** version differs
  (PWHT-required reads from `wps_master`, not `job_cards`). The applied SQL is the remote
  `enterprise_gates_pwht_chart_recorder` migration.

## Key schema facts confirmed against the live DB (2026-07-02)

- `pwht_required` lives on **`wps_master`** (via `wps_qualifications.wps_master_id`), NOT on `job_cards`.
- `pmi_reports` / `dimension_reports` have **no** `report_number` or `generated_pdf_path` columns
  (the phase-5/7 migrations that would have added them were never applied). Any app code
  referencing `pmi_reports.generated_pdf_path` will fail until reconciled — see the PMI/dimension
  generate routes.
- All ValveTrack tables have RLS enabled; SELECT is authenticated-only; customer role is client-scoped.

## Recommended next step

Run `supabase db pull` to snapshot the live schema into a fresh baseline migration, then
delete/relocate the never-applied phase files above so the folder is trustworthy again.
