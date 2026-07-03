# ERP Software Audit Report — ValveTrack
**Date:** 2026-07-02 | **Scope:** Full codebase at `D:\ERP_RRenginerring\valvetrack` (git HEAD `6e63d62`, 2026-06-26)
**Method:** Independent code inspection (5 parallel deep-dives on auth/RBAC, workflow enforcement, schema, file security, API/tests). Prior self-authored docs (`HANDOFF_*.md`, `CLIENT_WORKFLOW_AUDIT.md`) were treated as claims to verify, not fact.

---

## 1. Executive Summary

ValveTrack is a well-architected **single-tenant** manufacturing QC/ERP system (Next.js 14 + Supabase) covering job card lifecycle, WPS/PMI/dimension/PWHT inspection, dispatch, accounts, and customer dossiers. Auth, RBAC, RLS, and schema design are genuinely solid — better than the average early-stage internal tool. However, two findings undercut the system's central promise:

1. **The "No document → No progress" rule is not enforced at the point that actually matters.** The database transition trigger validates *which* status can follow *which*, but never checks whether required documents (PMI, dimension, PWHT) are approved. The application layer has a `validateJobClosure()` check, but it can be bypassed entirely via `forceCloseJob()` or by calling `updateJobCardStatus()` directly.
2. **A document/dossier IDOR vulnerability** lets any authenticated user fetch signed URLs and documents belonging to jobs they have no business reason to see — because Storage RLS only checks `authenticated`, not job ownership.

Additionally, the build currently ships with `typescript.ignoreBuildErrors: true` and `eslint.ignoreDuringBuilds: true` (added for a client demo deploy and never removed), meaning type errors are silently masked in production builds.

**Bottom line:** this is demo-ready, not client-production-ready. The gaps are fixable in days, not months, but they are exactly the gaps a real manufacturing client would notice first (a job dispatching without an approved PMI report; one company's — or in this single-tenant case, one user's — documents visible to another).

Note: `audit_prompt.md` (the brief this audit follows) assumes multi-tenancy. **Multi-tenant/multi-company support does not exist in this codebase** — confirmed absent, not partially built. Section 9 covers this as a gap against the original ask, not as a currently-relevant security surface.

---

## 2. Tech Stack Identified

- **Frontend:** Next.js 14 (App Router, React 18 Server Components), Tailwind CSS 3.4, shadcn/ui, React Hook Form + Zod, TanStack React Table 8, React Query 5, Recharts
- **Backend:** Next.js API routes + Server Actions (Node.js runtime)
- **Database:** PostgreSQL via Supabase (Supabase JS client, not a full ORM)
- **Auth:** Supabase Auth (JWT), custom `requireAuth()`/`requireRole()` wrapper in `src/lib/auth.ts`
- **File Storage:** Supabase Storage, private bucket, signed URLs
- **PDF Generation:** `@react-pdf/renderer` (server-side only)
- **Email:** Resend
- **Error Tracking:** Sentry (configured, not confirmed active in prod)
- **Deployment:** Vercel (app), Supabase Cloud (DB/storage)
- **Validation:** Zod schemas (partial coverage — see §7)

---

## 3. Project Architecture

- `src/app/(app)/**` — authenticated pages, each with colocated `actions.ts` (server actions) — job-cards, pmi-reports, dimension-reports, overlay reports, dossiers, accounts, search, master data
- `src/app/api/**` — 9 routes, almost entirely PDF-generation and signed-URL endpoints (`generate`, `generate-url` pairs per document type) + a health check
- `src/lib/auth.ts` — `requireAuth()` / `requireRole()`, the single enforcement chokepoint for server-side access control
- `src/lib/security.ts` — UUID validation, error sanitization, LIKE-escaping, CSRF helpers
- `src/middleware.ts` — rate limiting + CSRF origin/referer validation
- `supabase/migrations/*.sql` — 14 migrations, 22 tables, RLS policies, triggers (status-transition enforcement, audit logging)
- `src/__tests__/` — 4 Jest suites (security, rate-limit, validations, env) — narrow, unit-level only

This is a conventional, coherent structure for a Next.js + Supabase app. No architectural red flags in the layout itself.

---

## 4. Current Implemented Workflow

Job card status machine (13 linear states + `on_hold` escape hatch, admin-only):

```
created → wps_pending → wps_uploaded → wps_approved → process_assigned
→ in_process → process_complete → reports_pending → reports_complete
→ dispatch_ready → dispatched → accounts_processing → closed
```

Enforced legal-transition whitelist lives in the DB trigger `enforce_job_card_status_transition()` (`supabase/migrations/0002_functions_triggers.sql:32-87`). This *does* stop illegal jumps (e.g. `created` → `dispatched`), but does **not** check document state as a precondition for any transition — that logic exists only in application code (`closure-actions.ts`) and only for the closure path, and even there it can be routed around.

---

## 5. Expected Workflow vs Actual Workflow

| Module | Expected | Actual | Status | Gap |
|---|---|---|---|---|
| Multi-tenant company selection | Users select company; data isolated | Not implemented — single tenant | ❌ Missing | Entire module absent |
| Job Card creation | Full field set, tenant-isolated, dup-prevented | Implemented, unique `jc_number`/`nbdn_number`, no tenant field (n/a) | ✅ Mostly done | No tenant scoping (by design, single-tenant) |
| Qualification (WPS) gate | Blocks production until approved | WPS has real `approval_status`; role-gated approval | ✅ Done | Approval exists, but downstream gates don't re-check it before dispatch |
| Process execution | Process-specific fields captured | Implemented per process type | ✅ Done | Not independently deep-audited this pass |
| Report upload / QA validation | No dispatch without approved PMI/Dimension/PWHT | Documents exist; **but pmi_reports & dimension_reports have no `approval_status` column at all** | ⚠️ Partial | Cannot even represent "approved" for these two report types in schema |
| PWHT conditional | Blocks dispatch if `pwht_required` and not approved | `pwht_required` flag exists; **no gate anywhere checks it before dispatch/closure** | ❌ Broken | Flag is decorative |
| PO Linkage | 1 PO → many jobs, visible on job detail | Present via `accounts.po_number` | ⚠️ Partial | `po_number` not unique; no dedicated PO entity |
| Dispatch | Blocked until reports approved | `createDispatch()` only checks `status === 'dispatch_ready'`, no report checks | ❌ Broken | Status can reach `dispatch_ready` without report approval in the first place |
| Accounts/payment | GRN + payment status tracked, blocks closure if unpaid | Schema supports it; `forceCloseJob()` bypasses everything | ⚠️ Partial | Bypass negates the gate |
| Job closure | Only after all gates pass | `validateJobClosure()` exists and is reasonably thorough | ⚠️ Partial | `forceCloseJob()` (admin) skips it entirely, logging only |
| Document Center | Searchable, company-isolated | Search exists, LIKE-escaped, works | ⚠️ Partial | Storage RLS doesn't scope by job/document ownership — IDOR (see §13) |
| Role-based access | Server + DB enforced | Confirmed enforced at both layers for reviewed flows | ✅ Done | One gap: `createClient_()` has no role check (RLS catches it, but late) |

---

## 6. Database Review

22 tables across 14 migrations. Strong points: comprehensive `ON DELETE CASCADE` on all job-child tables, status stored via `CHECK` constraints (not free text), immutable `audit_log` writable only by `SECURITY DEFINER` triggers, full-text search index on `job_cards`, soft-delete via `is_active` on `documents` and master tables.

**Gaps found:**
- `accounts.po_number`, `accounts.invoice_number`, `dispatches.dc_number` are **not unique** — duplicate invoices/dispatches are possible.
- `pmi_reports` and `dimension_reports` have **no `approval_status` column** — unlike `wps_qualifications` and `pwht_runs`, there is no schema-level way to mark these approved/rejected, which is the root cause of the broken dispatch gate in §5.
- Missing FK indexes on `process_executions.job_card_id`, `dispatches.job_card_id`, and no index on `accounts.payment_status`.
- `pmi_reports`, `dimension_reports`, `dispatches` lack `updated_at` — no way to detect stale/concurrent edits.

*(Full table-by-table detail available in the schema sub-audit; omitted here for length.)*

---

## 7. API Review

9 API routes, mostly PDF-generation and signed-URL pairs. All reviewed routes call `requireAuth()` + role checks and validate UUID path params via `isValidUUID()`. Errors are sanitized through `sanitizeError()` before reaching the client — good practice, consistently applied in both API routes and server actions.

**Problems:**
- POST route bodies are not validated with Zod schemas (validation is ad hoc / partial) — inconsistent with the Zod usage seen in server actions for forms.
- Search (`src/app/(app)/search/actions.ts`) properly escapes `%`, `_`, `\` before `.ilike()` — LIKE injection is handled correctly.
- Rate limiting is real but **IP-based via `x-forwarded-for` with no documented reverse-proxy trust configuration** — spoofable if deployed without a trusted proxy in front that strips/overwrites the header.
- Rate limiter is in-process memory — will not work correctly across multiple server instances (acceptable for current single-instance Vercel deploy, will silently stop working if scaled horizontally).

---

## 8. Frontend/UI Review

Not independently re-audited pixel-by-pixel this pass (out of scope for the 5 sub-audits run). Per prior docs: loading skeletons on all pages, desktop-first sidebar nav (no mobile nav), 42 pages, shadcn/ui components. Recommend a follow-up UI-specific pass focused on: mobile/tablet usability (explicitly listed as not implemented), and whether blocked/gated statuses are visually obvious to operators (important given the enforcement gaps above — operators need to *see* what's missing even where the system won't stop them).

---

## 9. Multi-Tenant Review

**Not implemented.** There is no company/tenant table, no tenant_id column on any table, and no company-selection screen. This is a full gap against the original brief, not a partial implementation. If multi-company support is actually needed (the brief implies it is), this is a schema-level change (add `company_id` to every table, rewrite every RLS policy to filter by it) — not a small patch. If the business is genuinely single-company, this section of the brief should be treated as N/A rather than a defect.

---

## 10. Role-Based Access Review

Six roles (Admin, QA, Engineer, Operator, Accounts, Management), enforced at **both** the server-action layer (`requireRole()`) and the database layer (RLS policies keyed off role). Verified on WPS approval, PMI approval, and dimension-report generation — all three re-check role server-side, not just hide UI buttons.

One inconsistency: `createClient_()` (job-cards/actions.ts) doesn't call `requireRole()`, relying on RLS to reject non-admins at the DB layer. Functionally safe, but produces a raw DB error instead of a clean permission message — cosmetic/UX issue, not a security hole.

No `SUPABASE_SERVICE_ROLE_KEY` usage found anywhere in app code — good, RLS can't be silently bypassed.

---

## 11. Workflow Gate Validation Review — **the main finding of this audit**

This is the section that matters most given the system's stated purpose ("No document → No progress").

- `enforce_job_card_status_transition()` (`0002_functions_triggers.sql:32-87`) validates **legal transition paths only** — it has no awareness of document approval state.
- `updateJobCardStatus()` (`src/app/(app)/job-cards/actions.ts:67-113`) checks role only. Any user with a role permitted to move status to `dispatch_ready` or `dispatched` can do so with zero document checks.
- `createDispatch()` (`detail-actions.ts:60-104`) checks only `status === 'dispatch_ready'` — nothing about report approval.
- `validateJobClosure()` (`closure-actions.ts:35-153`) is the *only* place real gating logic exists, and it's closure-specific, not dispatch-specific.
- `forceCloseJob()` (`closure-actions.ts:159-205`) sets status to `closed` directly, bypassing `validateJobClosure()` entirely — it logs the action but does not block it. This is admin-only, but "admin can silently override every gate with just an audit-log entry" is a materially different guarantee than "the system will not let you close a job with missing documents."
- `pwht_required` flag: exists in schema, **never checked** at any transition gate. A job requiring PWHT can dispatch without it.
- Root cause: `pmi_reports` and `dimension_reports` don't even have an `approval_status` column (§6), so there is no schema-level fact for a gate to check even if one were added at the dispatch step.

**This is the highest-priority fix in the entire audit.** The fix is well-scoped: add `approval_status` to `pmi_reports`/`dimension_reports` (mirroring `wps_qualifications`), then add a real precondition check — ideally in the DB trigger, so it can't be bypassed by any future application code path — before allowing `→ dispatch_ready`, `→ dispatched`, or `→ closed`, including inside `forceCloseJob()`.

---

## 12. Document Management Review

Versioning is handled correctly (old docs marked `is_latest: false` before new upload; `upsert: false` prevents accidental overwrite). Filenames are sanitized (no path traversal). ZIP dossier generation uses sanitized names before `zip.file()` — no zip-slip risk.

**Critical gap — IDOR:** Storage RLS (`0005_phase1_rls.sql:260-262`) only requires `auth.role() = 'authenticated'` to read any object in the `documents` bucket. There is no join back to `job_cards` or ownership check. Combined with `/api/dossiers/[id]/generate` and `generate-url` routes not verifying the caller has any relationship to the underlying job (`dossiers/generate/route.ts:48-52`, `generate-url/route.ts:22-41`), **any authenticated user can enumerate dossier/document IDs and pull documents from jobs unrelated to them.** In a real multi-user deployment (Operator role shouldn't see Accounts-only records, etc.) this defeats the RBAC work done everywhere else.

File type validation is client-side only (MIME + extension), no server-side magic-byte check — a renamed executable would pass current checks. Medium severity given the private-bucket + auth requirement, but should still be fixed.

---

## 13. Security Findings

| Severity | Issue | File/Location | Risk | Recommended Fix |
|---|---|---|---|---|
| **HIGH** | Document/dossier IDOR — any authenticated user can access any job's documents | `src/app/api/dossiers/[id]/generate/route.ts:48-52`, `generate-url/route.ts:22-41`, storage RLS `supabase/migrations/0005_phase1_rls.sql:260-262` | Cross-role/cross-job data exposure (QA docs visible to Operator, etc.) | Add ownership/role check in both routes; scope storage RLS via join to `job_cards` or a `documents.allowed_roles` check, not just `authenticated` |
| **HIGH** | Dispatch/closure workflow gates bypassable | `job-cards/actions.ts:67-113`, `detail-actions.ts:60-104`, `closure-actions.ts:159-205` | Job dispatches/closes without approved PMI/Dimension/PWHT reports | Add DB-trigger-level precondition checks; remove or heavily restrict `forceCloseJob()`'s bypass |
| **MEDIUM** | `pwht_required` flag never enforced at any gate | schema-wide | PWHT-required jobs can dispatch without heat treatment records | Add gate check as part of the above fix |
| **MEDIUM** | Build masks type/lint errors | `next.config.mjs:14-17` (`ignoreBuildErrors`, `ignoreDuringBuilds`) | Real bugs shipped silently; git log shows this was a "temp" demo hack never reverted | Fix underlying type errors in workflow/dossier action files, then remove both flags |
| **MEDIUM** | File type validation client-side only | `file-upload.tsx:79-110`, `storage-utils.ts:46-58` | Malicious file upload disguised as PDF | Add server-side magic-byte check (e.g. `file-type` package) before storage write |
| **MEDIUM** | Rate limiting keyed on spoofable `x-forwarded-for` | `src/middleware.ts:19-24` | Rate limits bypassable without a trusted reverse proxy | Confirm Vercel's edge sets this header safely (it generally does); document/verify trust boundary explicitly |
| **LOW** | `createClient_()` has no explicit role check (relies on RLS) | `job-cards/actions.ts` | Non-admin gets raw DB error instead of clean permission denial | Add `requireRole(["admin"])` |
| **LOW** | No uniqueness on `po_number`, `invoice_number`, `dc_number` | `0001_schema.sql:176,191,193` | Duplicate invoices/dispatches possible | Add unique constraints (composite with job_card_id if legitimately reused) |

---

## 14. Performance Findings

| Issue | Location | Impact | Fix |
|---|---|---|---|
| In-process rate limiter | `src/lib/rate-limit.ts` | Breaks correctness if scaled to multiple instances | Move to Upstash Redis before horizontal scaling |
| Missing FK indexes | `process_executions.job_card_id`, `dispatches.job_card_id` | Slower joins as job volume grows | Add standard FK indexes |
| No index on `accounts.payment_status`/`po_number`/`invoice_number` | `0001_schema.sql` | Accounts dashboard/search will slow at scale | Add indexes matching query patterns |
| Server-side pagination confirmed working on job list & search | `job-cards/page.tsx:28-41`, `search/actions.ts` | N/A — this is a strength, not a gap | — |

---

## 15. Bugs Found

| Bug | Location | Steps to Reproduce | Expected | Actual | Fix |
|---|---|---|---|---|---|
| Dispatch without approved reports | `detail-actions.ts:60-104` | Move job to `dispatch_ready` (role-permitted), call `createDispatch()` without any PMI/Dimension/PWHT approval existing | Blocked with an error | Dispatch succeeds | Add precondition check (see §11) |
| Force-close skips all validation | `closure-actions.ts:159-205` | Admin calls `forceCloseJob()` on a job missing reports/payment | Should require explicit acknowledgment of what's being overridden, or be disabled | Closes silently, logs only | Require override reason + still block truly missing data (e.g. no dispatch record at all), or make it a distinct "reopen-and-fix" flow instead |
| No approval status representable for PMI/Dimension reports | schema | Try to mark a PMI report "approved" | Should have an `approval_status` field | Column doesn't exist | Add column (mirror `wps_qualifications`) |
| Type/lint errors hidden at build | `next.config.mjs:14-17` | Run `next build` with a type error present | Build should fail | Build succeeds silently | Remove ignore flags once underlying errors are fixed |

---

## 16. Missing Features

- **Multi-tenant/company isolation** — entirely absent; needed if this will ever serve more than one company (§9).
- **PMI/Dimension report approval workflow** — schema and UI don't support marking these approved/rejected, which is foundational to the stated business rule.
- **PO as a first-class entity** — currently just a text field on `accounts`; no dedicated PO record, no enforced 1-PO-to-many-jobs linkage beyond a shared string.
- **Mobile/tablet UI** — desktop-only sidebar nav per prior docs; shop-floor usage likely needs at least tablet support.
- **E2E tests** — none exist; all 4 test suites are narrow unit tests of security helpers.
- **CI/CD pipeline** — not set up; type/lint checks aren't gated on merge, which is how the `ignoreBuildErrors` hack persisted.

---

## 17. Recommended Architecture Improvements

1. Move all workflow-gate logic (document approval preconditions) **into the database trigger**, not just application code — this is the only place it can't be bypassed by a new code path someone adds later.
2. Add `approval_status` to `pmi_reports` and `dimension_reports` to match the pattern already used for `wps_qualifications`/`pwht_runs`. This is the actual root-cause fix, not a workaround.
3. Fix Storage RLS to scope by ownership/entity relationship rather than blanket `authenticated`. If Supabase Storage policies can't easily express the join, consider proxying all document downloads through a server action that does the ownership check explicitly (already partially true for signed-URL routes — just add the check).
4. Remove the `ignoreBuildErrors`/`ignoreDuringBuilds` flags as a discrete, prioritized cleanup task — every day they stay in is a day new type errors ship unnoticed.

Nothing here requires a rewrite or new framework — these are additive fixes to an already-reasonable architecture.

---

## 18. Testing Plan

**Workflow/state machine:**
- Attempt every illegal status transition pair; assert DB trigger rejects all but the whitelisted 13.
- Attempt to move a job to `dispatch_ready`/`dispatched` with no approved PMI/Dimension/PWHT report; assert rejection (currently would fail — this is the regression test that should exist first).
- Call `forceCloseJob()` on a job missing mandatory documents; assert it's blocked or requires explicit justification.

**Permissions:**
- For each of the 6 roles, attempt every sensitive server action (approve WPS, approve PMI, create dispatch, update accounts) and assert only the correct roles succeed.
- Attempt the same actions via direct fetch to the server action/API route (bypassing UI) to confirm server-side enforcement holds without client cooperation.

**Document isolation (once IDOR is fixed):**
- User A creates a job with documents; User B (different role, unrelated to that job) attempts to fetch the signed URL / dossier by guessing/incrementing IDs; assert rejection.

**File upload:**
- Upload a `.exe` renamed to `.pdf`; assert server-side rejection once magic-byte check is added.
- Upload a file exceeding size limit; assert rejection.

**API contract:**
- Fuzz UUID path params with malformed input; assert 400, not 500.
- Confirm error responses never contain raw Postgres error text (regression test against `sanitizeError()`).

---

## 19. Production Readiness Checklist

- [x] Authentication secure (server-enforced, active-flag checked)
- [x] RLS role-based (not permissive)
- [ ] Tenant isolation verified — **N/A, not implemented; confirm this is intentional for a single-company deployment**
- [ ] Workflow gates enforced — **FAILS: dispatch/closure bypassable**
- [ ] File uploads secure — **PARTIAL: no server-side type validation; document IDOR present**
- [x] Audit logs enabled (immutable, trigger-only writes)
- [ ] Backups configured — not verified this pass (Supabase Cloud default backups should be confirmed explicitly)
- [ ] Error monitoring added — Sentry configured but not confirmed active/tested
- [ ] Tests passing — unit tests pass, but coverage doesn't include workflow/permission/isolation scenarios
- [ ] Type/lint checks enforced at build — **FAILS: currently disabled**

---

## 20. Phase-by-Phase Fix Plan

### Phase 1 — Critical Workflow and Security Fixes
- Add `approval_status` to `pmi_reports`/`dimension_reports`; wire up approve/reject UI+actions matching the WPS pattern.
- Add DB-trigger-level precondition checks for `→ dispatch_ready`, `→ dispatched`, `→ closed` (including inside `forceCloseJob()`).
- Enforce `pwht_required` at the same gate.
- Fix document/dossier IDOR: scope storage RLS and add ownership checks in `generate`/`generate-url` routes.
- **Files:** `supabase/migrations/` (new migration), `job-cards/actions.ts`, `job-cards/detail-actions.ts`, `closure-actions.ts`, `api/dossiers/[id]/*`, `0005_phase1_rls.sql` follow-up migration
- **Risk if skipped:** A client-facing demo could dispatch/close a job with no approved inspection data — the exact failure mode the system exists to prevent.
- **Effort:** 3-5 days.

### Phase 2 — Database and Backend Hardening
- Add missing unique constraints (`po_number`, `invoice_number`, `dc_number`) and missing FK indexes.
- Add server-side magic-byte file validation.
- Add Zod schema validation to remaining API route bodies.
- Remove `ignoreBuildErrors`/`ignoreDuringBuilds`; fix the underlying type errors.
- **Effort:** 3-4 days.

### Phase 3 — UI/UX Improvements
- Mobile/tablet navigation.
- Make blocked/gated status visually explicit on job detail pages once real gates exist (so operators see *why*, not just *that*, something is blocked).
- **Effort:** 3-5 days.

### Phase 4 — Testing and QA
- Write the workflow/permission/isolation tests described in §18.
- Stand up Playwright for at least the core job lifecycle happy path + one blocked-path scenario.
- **Effort:** 4-6 days.

### Phase 5 — Production Deployment Readiness
- Move rate limiter to Upstash Redis.
- Confirm Supabase backup policy and Sentry are actually active (not just configured).
- Add CI (GitHub Actions) to gate merges on type-check + lint + tests, preventing a repeat of the `ignoreBuildErrors` situation.
- **Effort:** 2-3 days.

---

## 21. Final Verdict

- **Is this production ready?** No — not because the architecture is wrong, but because the system's central rule ("no document → no progress") is not actually enforced where it counts. Everything else (auth, RBAC, RLS, schema, error handling) is genuinely close to production quality.
- **Can a real manufacturing company use it now?** Only in a supervised pilot with a small, trusted user group, and with the understanding that dispatch/closure discipline currently depends on people following the process, not the system enforcing it.
- **Biggest risks:** (1) a job dispatching without approved inspection reports — silent, no error, looks fine until a customer complaint traces back to it; (2) one user pulling another job's documents via a guessed ID.
- **Must fix before demo:** Nothing blocks a demo today — the gaps are invisible unless someone specifically tries to break the workflow, which is exactly the risk profile of "looks done, isn't."
- **Must fix before production:** Phase 1 in full (workflow gates + document IDOR), plus removing the build-error-masking flags before any further feature work ships.
