# ValveTrack ERP - Complete Engineering Handoff Document
## Executive Summary

---

## Project Overview

**Project Name:** ValveTrack ERP  
**Industry:** Manufacturing (Valve Quality Control & Traceability)  
**Primary Use Case:** Job card lifecycle management with quality inspection, testing, and customer submission documentation  
**Repository:** D:\ERP_RRenginerring\valvetrack  
**Current Status:** Phase 10 - Complete (Production-ready with security hardening)

---

## What is ValveTrack?

ValveTrack is an enterprise-grade manufacturing ERP system built specifically for valve manufacturing companies. It manages the complete job lifecycle from job card creation through quality assurance testing, production execution, and final customer delivery with comprehensive traceability and documentation.

### Core Purpose

To provide:
- **Traceability**: Track every valve from receipt to shipment with complete audit trail
- **Quality Control**: Multi-stage inspection (PMI, Dimensional, Overlay welding, NDE testing)
- **Compliance**: Customer submission dossiers with required certifications
- **Workflow Automation**: Job card status machine with role-based state transitions
- **Document Management**: Centralized PDF/document storage with versioning

---

## Key Business Problems Solved

1. **Manual Process Bottleneck**: Job cards previously tracked on paper/spreadsheets → Now digital with real-time status
2. **Lost Traceability**: No audit trail of who did what when → Complete SECURITY DEFINER trigger-based audit logging
3. **Inspection Data Scatter**: PMI/dimensional/overlay reports in different systems → Centralized document registry
4. **Customer Compliance Complexity**: Manual dossier assembly for each customer → Automated ZIP generation with index PDF
5. **Role Confusion**: No permission boundaries → 6 role hierarchy with RLS on every table

---

## User Roles & Workflows

### Six Role Types

| Role | Primary Responsibilities | Key Screens |
|---|---|---|
| **Admin** | System configuration, user management, master data | Dashboard, Settings, All modules |
| **QA (Inspector)** | Quality checks, inspection data entry, report approval | PMI/Dimension/Overlay reports, Master Data, Dossiers |
| **Engineer** | Production planning, process execution, WPS management | Process Execution, WPS Master, Job cards |
| **Operator** | Job card creation, status updates, receiving | Job Cards, Search, Dashboard |
| **Accounts** | Invoice tracking, GRN, payment status | Accounts, Job Cards (read) |
| **Management** | Visibility, KPIs, audit trail | Dashboard, Audit Trail, Job Cards (read) |

### Main Workflows

#### 1. Job Card Lifecycle (14 statuses)
```
created 
  → wps_pending 
  → wps_uploaded 
  → wps_approved 
  → process_assigned 
  → in_process 
  → process_complete 
  → reports_pending 
  → reports_complete 
  → dispatch_ready 
  → dispatched 
  → accounts_processing 
  → closed
```
Plus `on_hold` (admin-only escape hatch) at any stage.

#### 2. WPS Qualification Flow
Job receives WPS document → QA uploads to system → Links to WPS Master → Approval → Release to production

#### 3. Quality Inspection Workflow
Job assigned → PMI reading (elemental composition) → Dimensional check → Overlay welding report (for overlay jobs) → NDE/LPT testing → All reports approved → Job closes

#### 4. Customer Submission Dossier
QA creates dossier → Selects reports → Generates index PDF + ZIP file → Marks submitted → Archives

---

## Overall Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Next.js 14 App Router                      │
│                    (React 18 Server Components)                 │
└───────────┬──────────────────────────────────────────────────┬──┘
            │                                                    │
    ┌───────▼────────┐                                 ┌────────▼──────┐
    │  Pages/Routes  │                                 │  Server Actions│
    │ (RLS enforced) │                                 │  (Validation)  │
    └────────────────┘                                 └────────────────┘
            │                                                    │
            └─────────────────────┬──────────────────────────────┘
                                  │
                  ┌───────────────▼────────────────┐
                  │   Supabase Client (Server)     │
                  │  - Auth                        │
                  │  - Database (PostgreSQL)       │
                  │  - Storage (PDF/ZIP buckets)   │
                  └────────────┬────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
    ┌───▼────┐          ┌──────▼──────┐      ┌──────▼───────┐
    │ Auth   │          │ PostgreSQL  │      │ Storage      │
    │ (JWT)  │          │ RLS enabled │      │ (documents/) │
    └────────┘          └─────────────┘      └──────────────┘
                        (22 tables)
                        (14 migrations)
                        (6 roles)
                        (SQL functions/triggers)
```

---

## Current Maturity Level

### ✅ Production-Ready
- Authentication & authorization hardened
- CSRF protection on all mutating endpoints
- Rate limiting (login: 100/min dev, 5/min prod)
- Input validation via Zod schemas
- Error sanitization (no schema leakage)
- HTML injection prevention in emails
- LIKE injection escaping on search
- CSP headers, HSTS, X-Frame-Options
- 41 passing Jest tests
- 0 TypeScript errors (strict mode)
- Idempotency checks on report approvals
- Server-side pagination (25 records/page)
- Loading skeletons on all pages (no UI freeze on tab switch)
- Supabase RLS on every table
- Audit logging via SECURITY DEFINER triggers

### ⚠️ Partial / Next Phase
- E2E tests (Playwright) — not started
- Mobile navigation — desktop sidebar only
- Detail page streaming (React Suspense) — not implemented
- Master data CRUD forms — not wired to database
- CI/CD pipeline (GitHub Actions) — not set up
- Sentry error tracking — configured but not tested
- Dimension/overlay report idempotency — not audited

### ❌ Not Implemented
- Real-time WebSocket updates
- PDF annotation editor (client-side)
- Advanced analytics dashboard
- Multi-tenant support
- API rate limiting per user (currently per IP)

---

## Technology Stack at a Glance

### Frontend
- **Framework**: Next.js 14 (App Router, React 18 Server Components)
- **Styling**: Tailwind CSS 3.4 + shadcn/ui + Base UI React Menu
- **Forms**: React Hook Form + Zod
- **Tables**: TanStack React Table 8
- **State**: React Query 5 (server-side caching)
- **PDF**: @react-pdf/renderer (server-side generation)
- **Icons**: Lucide React
- **Charts**: Recharts
- **File ops**: jszip (ZIP generation)
- **Email client**: Resend

### Backend
- **Runtime**: Node.js (Next.js API routes)
- **Database**: PostgreSQL (Supabase)
- **ORM**: Supabase JavaScript client (not a full ORM)
- **Storage**: Supabase Storage (private bucket, signed URLs)
- **Auth**: Supabase Auth (JWT-based)
- **Validation**: Zod
- **Error tracking**: Sentry
- **Email**: Resend

### Infrastructure
- **Hosting**: Vercel (Next.js)
- **Database**: Supabase Cloud (PostgreSQL 17)
- **Storage**: Supabase Storage
- **Secrets**: Environment variables (validated at startup)

---

## Key Statistics

| Metric | Count |
|--------|-------|
| TypeScript files | 200+ |
| Pages | 42 |
| API routes | 4 (+ 4 signing endpoints) |
| Database tables | 22 |
| SQL migrations | 14 |
| SQL functions | 10+ (triggers, state machine, audit) |
| RLS policies | 30+ |
| Components | 100+ |
| Custom hooks | 20+ |
| Jest test suites | 4 |
| Test assertions | 41 |
| Production issues found & fixed | 12 (in last remediation) |

---

## Important Context for Incoming Engineer

### What You Need to Know Immediately

1. **Session Management**: `requireAuth()` in `src/lib/auth.ts` is the enforcer — every protected page/action calls it. It redirects before returning if `profile.is_active === false`.

2. **RLS is Mandatory**: The database does NOT trust the client. Every query to Supabase is checked against RLS policies based on `auth.uid()` and `current_role_name()`. You cannot write frontend code that bypasses RLS.

3. **State Machine**: Job card statuses follow a strict state machine in `enforce_job_card_status_transition()`. Admin can jump to/from `on_hold` at any time; everyone else follows the linear path. **This is not enforced client-side** — the database will reject invalid transitions.

4. **Audit Everything**: Insert/update/delete on master tables (WPS, chemicals, instruments) is automatically logged via `log_master_data_change()` SECURITY DEFINER function. You cannot insert audit_log directly; the trigger is the only writer.

5. **PDF Generation is Server-Only**: The `@react-pdf/renderer` library only works on the server (in API routes). Components are passed to `ReactPDF.Document` and rendered on the server, then stored in Supabase Storage. Clients get signed URLs pointing to the storage file.

6. **Search is Dangerous**: The search endpoint in `src/app/(app)/search/actions.ts` uses `.ilike()` which is vulnerable to LIKE wildcards. We escape `%`, `_`, `\` before building the filter. Never append user input directly to `.ilike()`.

7. **Rate Limits are Per-IP in Dev, Strict in Prod**: The middleware checks `X-Forwarded-For` / `X-Real-IP` headers. In dev mode we allow 100 logins/min (for testing quick-switch). In prod it's 5/min. You can't bypass this without changing middleware.

8. **Loading States Save UX**: Every page now has `loading.tsx` with skeleton screens. This prevents the UI freeze that happens when server fetches data. If you add a new page, **always add `loading.tsx`**.

---

## Next Steps for Handoff

Read in order:
1. **This file** (you are here) — big picture
2. **01_Architecture.md** — system design, auth flow, data flow diagrams
3. **02_Database.md** — every table, relationship, trigger, policy
4. **03_Modules.md** — each business module (job cards, PMI, dimension, overlay, dossiers, etc.)
5. **04_API.md** — API routes and server actions
6. **05_Security.md** — auth, authorization, validation, hardening
7. **06_Deployment.md** — how to deploy, env vars, checklist
8. **07_AI_Context.md** — conventions, patterns, pitfalls for future AI assistants

---

## Contact & Support

- **Bug Reports**: Check `src/__tests__/` for existing test patterns
- **Security Issues**: Review `src/lib/security.ts` and middleware for validation patterns
- **Database Questions**: See `supabase/migrations/` for the canonical schema
- **Performance Tuning**: Check indexes in migrations; pagination is already in place

---

**Document Generated**: 2026-06-26  
**Last Updated**: Post-Remediation Phase  
**Status**: Production-ready, fully documented
