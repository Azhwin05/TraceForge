# Migration State — source of truth

**Last reconciled: 2026-07-04**, against the live Supabase project `axwxpjbzdhaevoimagiz`
via `list_migrations` / `list_tables` (Supabase MCP). CLI-based `supabase db pull` was not
possible in this pass (`supabase login` needs an interactive browser flow) — see
**"How to finish this properly"** below.

## Remote migration history (authoritative — this is what is actually applied, in order)

| Version | Name |
|---|---|
| 20260608102151 | 0001_schema |
| 20260608131345 | 0002_functions_triggers |
| 20260608131620 | 0003_rls_policies |
| 20260611013540 | production_hardening |
| 20260611073630 | performance_indexes |
| 20260611160108 | atomic_jc_number |
| 20260612012022 | phase1_schema |
| 20260612012058 | phase1_rls |
| 20260612013631 | phase2_documents_extend |
| 20260625081132 | 0013_phase8_overlay_report |
| 20260625081156 | 0014_phase10_dossier |
| 20260702120642 | fix_rls_authenticated_all_bypass |
| 20260702120739 | enterprise_gates_pwht_chart_recorder |
| 20260702120910 | fix_gate_blockers_array_append |
| 20260702121019 | harden_rpc_execute_grants_and_search_path |
| 20260702121057 | revoke_anon_execute_new_functions |
| 20260702121723 | require_auth_for_all_selects |
| 20260702121918 | tighten_remaining_select_policies |
| 20260702123745 | customer_portal_role_and_rls |
| 20260702135246 | apply_pmi_dimension_extend_columns |
| 20260702154029 | remove_all_oes_objects |

**21 migrations applied remotely.** Only 8 have a corresponding local file (see below).

## Local files that match remote (safe, verified by content + name)

`0001_schema.sql`, `0002_functions_triggers.sql`, `0003_rls_policies.sql`,
`0004_phase1_schema.sql` (== remote `phase1_schema`),
`0005_phase1_rls.sql` (== remote `phase1_rls`),
`0006_phase2_documents_extend.sql` (== remote `phase2_documents_extend`),
`0013_phase8_overlay_report.sql`, `0014_phase10_dossier.sql`.

## Local files with NO remote counterpart — archived 2026-07-04

Moved to `supabase/migrations/_archived_never_applied/`. These were never applied as-is;
their intended schema changes were superseded by later remote migrations (mainly
`enterprise_gates_pwht_chart_recorder` and `apply_pmi_dimension_extend_columns`). **Do not
run these files** — the columns/constraints they describe already exist on the live DB,
created by different SQL:

- `0007_phase4_traceability.sql`
- `0008_phase5_pmi_extend.sql` → superseded by `apply_pmi_dimension_extend_columns`
- `0009_phase5_pmi_cleanup.sql`
- `0010_phase6_production_traveller.sql`
- `0011_phase7_dimension_report.sql` → superseded by `apply_pmi_dimension_extend_columns`
- `0012_phase7_cleanup.sql`
- `0015_expand_document_types.sql` → superseded by `enterprise_gates_pwht_chart_recorder`
- `0016_pwht_approval_workflow.sql` → contained invalid SQL (multi-column `ADD COLUMN IF
  NOT EXISTS`, index on non-existent `pwht_runs.job_card_id`); never applied
- `0017_enterprise_gates_pwht_chart.sql` → local draft; live schema differs (`pwht_required`
  reads from `wps_master`, not `job_cards`) — the applied version is remote
  `enterprise_gates_pwht_chart_recorder`

## Remote-only migrations with no local file at all

`production_hardening`, `performance_indexes`, `atomic_jc_number`,
`fix_rls_authenticated_all_bypass`, `enterprise_gates_pwht_chart_recorder`,
`fix_gate_blockers_array_append`, `harden_rpc_execute_grants_and_search_path`,
`revoke_anon_execute_new_functions`, `require_auth_for_all_selects`,
`tighten_remaining_select_policies`, `customer_portal_role_and_rls`,
`apply_pmi_dimension_extend_columns`, `remove_all_oes_objects`.

Their exact SQL text only exists on the remote project — it was applied directly (via MCP
`execute_sql` / dashboard) and not committed as a local migration file at the time. This is
the real gap: **the repo cannot currently rebuild the live schema from scratch.**

## Confirmed schema facts (live DB, verified 2026-07-04)

- The database is **no longer shared with the unrelated `oes_*` app** — `remove_all_oes_objects`
  dropped every `oes_*` table/bucket/function. `list_tables` confirms only ValveTrack tables
  remain in `public`. *(This resolves the "shared Supabase project" risk flagged in the prior
  audit — re-verify before relying on it if more time has passed.)*
- `pwht_required` lives on **`wps_master`** (via `wps_qualifications.wps_master_id`), NOT `job_cards`.
- `pmi_reports.generated_pdf_path` / `report_number` and the equivalent `dimension_reports`
  columns **exist live** (added by `apply_pmi_dimension_extend_columns`).
- `pwht_runs.approval_status` and the full PWHT approval/chart-recorder schema exist live.
- All ValveTrack tables have RLS enabled; SELECT is authenticated-only; a `customer` role
  exists with client-scoped RLS for the portal (`customer_portal_role_and_rls`).

## How to finish this properly

The remaining gap is real: 13 of 21 applied migrations have no local SQL file. To close it:

1. `supabase login` (interactive — requires a browser; couldn't be done in this session)
2. `supabase link --project-ref axwxpjbzdhaevoimagiz`
3. `supabase db pull` — this will generate local migration files for the 13 missing
   remote-only migrations, making the local folder byte-for-byte reproducible.
4. Delete `_archived_never_applied/` once the pull confirms the live schema matches.

Until step 3 is done, treat this file — not the migrations folder — as the source of truth
for what's actually live.
