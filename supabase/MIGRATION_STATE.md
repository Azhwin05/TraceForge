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
| 20260709073258 | machines_master (local file: 0020_machines_master.sql) |
| 20260709074722 | process_operations_routing (local file: 0021_process_operations_routing.sql) |
| 20260709082734 | operation_sequence_gate (local file: 0022_operation_sequence_gate.sql) |
| 20260709083400 | job_card_due_date (local file: 0023_job_card_due_date.sql) |
| 20260709132133 | fix_engineer_process_execution_update_rls (local file: 0024_fix_engineer_process_execution_update_rls.sql) |
| 20260709132147 | job_card_full_capture_fields (local file: 0025_job_card_full_capture_fields.sql) |

**27 migrations applied remotely.** 8 legacy + all 6 of `0020`–`0025` have a
corresponding local file (see below). **2026-07-09 reconciliation note:** `0024` and
`0025` were originally applied by hand via the SQL Editor in a separate session (their
DDL was live and verified correct — RLS policy fix + 10 additive columns on
`job_cards` — but had no entry in the remote migration history). Both were idempotent
(`drop policy if exists` / `add column if not exists`), so they were safely re-run via
`apply_migration` to register them; no schema change resulted, only the tracking gap
closed.

| 20260709132308 | index_process_executions_machine_id (local file: 0026_index_process_executions_machine_id.sql) |

**28 migrations applied remotely.** Added during the Phase 7 QA sweep — the
performance advisor flagged `process_executions.machine_id` as an unindexed FK
(INFO level); indexed it since it's joined on every job card load and PDF render.

## WPS Master — full PQR/WPS field capture (2026-07-09)

Client sent a paper PQR/WPS (WPS/RE/301, ASME IX QW-402–QW-410 + QW-150 tensile
test) and asked that the WPS module capture every field. Added:

| Local file | Remote name | Notes |
|---|---|---|
| `0027_wps_master_full_pqr_capture.sql` | wps_master_full_pqr_capture | Joint/base-metal/filler-metal JSONB blobs, PWHT cooling/loading/unloading, per-pass table (weld_passes_json), tensile test table (tensile_tests_json), date_of_welding, preheat_other. Additive. |
| (comment-only fix, no schema change) | wps_master_weld_passes_comment_fix | Corrected a column comment to include amps_range. |
| `0028_wps_master_weld_progression.sql` | wps_master_weld_progression | weld_progression column (missed in 0027 — QW-405 has both "Position of Groove" and "Weld Progression"). Additive. |

Verified live: inserted a WPS record transcribed field-for-field from the paper
document (joint geometry, base metal spec, filler metal F-No/A-No, all 4 per-pass
rows, both tensile specimens, weld_progression) and confirmed round-trip via
PostgREST — all data persisted and read back correctly. Row deleted after
verification (test data, not a real WPS record).

## Process Flow enterprise update — new migrations (2026-07-09, applied + committed)

These are applied via MCP `apply_migration` AND committed as local files (byte-for-byte),
so reproducibility improves from here regardless of the 13 historical gaps below.

| Local file | Remote name | Notes |
|---|---|---|
| `0020_machines_master.sql` | machines_master | Phase 1 — machine catalogue (welding/machining). Additive. |
| `0021_process_operations_routing.sql` | process_operations_routing | Phase 2 — operation_type/sequence/machine/qty on process_executions + seed_process_operations(). Additive. |
| `0022_operation_sequence_gate.sql` | operation_sequence_gate | Phase 3 — 'skipped' status + enforce_operation_sequence trigger (no-skip, admin override) + process_complete gate. Additive. |
| `0023_job_card_due_date.sql` | job_card_due_date | Phase 4 — job_cards.due_date (production due date) for aging/overdue. Additive. |

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
