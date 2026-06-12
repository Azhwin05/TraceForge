# TraceForge

> Valve manufacturing quality & traceability ERP — built for engineering shops that need a full paper trail from raw material to customer delivery.

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38BDF8?logo=tailwindcss)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## What it does

TraceForge is a production-grade ERP covering the full lifecycle of a valve manufacturing job:

| Module | What it tracks |
|--------|---------------|
| **Job Cards** | Creation, status progression, client & PO linkage |
| **WPS Master** | Welding Procedure Specifications with approval workflow |
| **Production Traveller** | Process executions, NDE/LPT records, consumable traceability |
| **PWHT Runs** | Post-weld heat treatment runs, charts, results |
| **PMI Reports** | Positive Material Identification with PDF generation |
| **Dimension Reports** | Dimensional inspection with PDF generation |
| **Overlay Welding Reports** | Overlay weld inspection with PDF generation |
| **Document Center** | Unified view of every document across all modules |
| **Customer Dossiers** | Packaged customer submission: index PDF + ZIP of selected documents |
| **Master Data** | WPS, consumables, instruments, chemicals |
| **Audit Trail** | Immutable log of every state change |
| **Alerts** | Role-based notifications for overdue or pending actions |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, Server Components, Server Actions) |
| Language | TypeScript 5 |
| Database | Supabase (PostgreSQL + Row Level Security) |
| Auth | Supabase Auth (email/password) |
| Storage | Supabase Storage (documents bucket) |
| PDF Generation | `@react-pdf/renderer` (server-side) |
| ZIP Generation | `jszip` |
| Forms | React Hook Form + Zod v4 |
| UI Components | shadcn/ui + Tailwind CSS |
| Tables | TanStack Table |
| Toasts | Sonner |
| Error Tracking | Sentry |
| Deployment | Docker / Vercel |

---

## Roles & Permissions

| Role | Capabilities |
|------|-------------|
| `admin` | Full access to everything — create, edit, approve, archive, delete |
| `qa` | Create/edit/generate/submit reports and dossiers; cannot approve or archive |
| `engineer` | Manage process executions; read-only on reports |
| `operator` | Read-only across the app |
| `accounts` | View dispatch, accounts sections |
| `management` | Dashboard and reporting read access |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)

### 1. Clone & install

```bash
git clone https://github.com/Azhwin05/TraceForge.git
cd TraceForge
npm install
```

### 2. Environment variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>   # optional, for admin scripts
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

All other variables (`TWILIO_*`, `UPSTASH_*`, `SENTRY_DSN`, etc.) are optional and only needed for their respective features.

### 3. Database setup

Apply all migrations in order via the **Supabase Dashboard → SQL Editor**:

```
supabase/migrations/
  0001_schema.sql                  — base tables (profiles, job_cards, documents)
  0002_functions_triggers.sql      — set_updated_at trigger, audit helpers
  0003_rls_policies.sql            — core RLS policies
  0004_phase1_schema.sql           — WPS master, instruments, PMI, documents
  0005_phase1_rls.sql              — Phase 1 RLS
  0006_phase2_documents_extend.sql — document versioning, categories
  0007_phase4_traceability.sql     — audit trail
  0008_phase5_pmi_extend.sql       — PMI report table
  0009_phase5_pmi_cleanup.sql      — PMI cleanup
  0010_phase6_production_traveller.sql — NDE, PWHT, process execution
  0011_phase7_dimension_report.sql — dimension reports
  0012_phase7_cleanup.sql          — dimension cleanup
  0013_phase8_overlay_report.sql   — overlay welding reports
  0014_phase10_dossier.sql         — dossiers + documents constraint extensions
```

> **Important:** Run them in order. Each migration is safe to re-run (uses `CREATE TABLE IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS` patterns where applicable).

### 4. Supabase Storage

Create a bucket named `documents` in your Supabase project:

1. Supabase Dashboard → **Storage** → **New bucket**
2. Name: `documents`
3. Public: **No** (private — access via signed URLs)

### 5. Create the first admin user

1. Register via `/login` (standard Supabase email signup)
2. In **Supabase Dashboard → Table Editor → profiles**, set `role = 'admin'` for your user row

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
TraceForge/
├── src/
│   ├── app/
│   │   ├── (app)/                    # Authenticated app shell
│   │   │   ├── job-cards/            # Job card list, detail, new
│   │   │   ├── pmi-reports/          # PMI report list, detail, new, edit
│   │   │   ├── dimension-reports/    # Dimension report list, detail, new, edit
│   │   │   ├── overlay-reports/      # Overlay welding report list, detail, new, edit
│   │   │   ├── pwht-runs/            # PWHT run list
│   │   │   ├── documents/            # Document Center (unified search)
│   │   │   ├── dossiers/             # Customer submission dossiers
│   │   │   ├── master-data/          # WPS, instruments, consumables, chemicals
│   │   │   ├── audit/                # Audit trail
│   │   │   ├── alerts/               # Alerts & notifications
│   │   │   ├── search/               # Global search
│   │   │   └── settings/             # User management
│   │   ├── (auth)/login/             # Login page
│   │   └── api/
│   │       ├── pmi-reports/[id]/generate/      # PDF generation API
│   │       ├── dimension-reports/[id]/generate/
│   │       ├── overlay-reports/[id]/generate/
│   │       └── dossiers/[id]/generate/         # Index PDF + ZIP generation
│   ├── components/
│   │   ├── job-cards/      # Job card sections (WPS, NDE, PWHT, process, dossier…)
│   │   ├── pmi/            # PMI form, PDF template, status actions
│   │   ├── dimension/      # Dimension form, PDF template, status actions
│   │   ├── overlay/        # Overlay form, PDF template, status actions
│   │   ├── dossier/        # Dossier form, index PDF template, status actions
│   │   ├── documents/      # File upload, document card, archive button
│   │   ├── master-data/    # WPS/instrument/consumable/chemical forms & lists
│   │   ├── layout/         # Sidebar, header, breadcrumbs, mobile nav
│   │   └── ui/             # shadcn/ui primitives
│   ├── lib/
│   │   ├── auth.ts                  # requireRole(), getSessionWithProfile()
│   │   ├── supabase/                # Server, client, middleware Supabase clients
│   │   ├── documents/storage-utils.ts
│   │   └── validations/             # Zod schemas for every form
│   └── types/
│       └── database.ts              # Full Supabase DB type map
└── supabase/
    └── migrations/                  # All 14 SQL migrations
```

---

## Key Patterns

### Server Actions + `requireRole`

All mutations use Next.js Server Actions guarded by role:

```ts
export async function createDossier(jobCardId: string, input: DossierInput) {
  const session = await requireRole(["admin", "qa"])
  if (session.error) return { data: null, error: session.error }
  const { user, supabase } = session
  // ...
}
```

### PDF Generation

PDFs are generated server-side using `@react-pdf/renderer` and uploaded to Supabase Storage. A signed URL (3600s expiry) is returned to the client for download.

```
POST /api/dossiers/[id]/generate
→ renders index PDF → uploads to storage → creates ZIP → advances status to "generated"
```

### Document Versioning

Every file upload creates a new `documents` row. Previous versions have `is_latest = false`. All queries default to `is_latest = true`.

### Row Level Security

All tables have RLS enabled. The `current_role_name()` helper function reads the user's role from `profiles` and drives all policies — no application-layer role checks bypass the DB.

---

## Available Scripts

```bash
npm run dev      # Development server (localhost:3000)
npm run build    # Production build (also runs ESLint)
npm run start    # Serve production build
npm run lint     # ESLint only
```

---

## Docker

```bash
docker compose up --build
```

The `docker-compose.yml` exposes port `3000`. Set environment variables via a `.env` file at project root or your container orchestration platform.

---

## Deployment

### Vercel (recommended)

1. Import the repo in [Vercel](https://vercel.com)
2. Add all environment variables from `.env.local.example`
3. Deploy — Next.js is auto-detected

### Self-hosted

```bash
npm run build
npm run start
# or with Docker
docker compose up -d
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Service role key (admin scripts) |
| `NEXT_PUBLIC_APP_URL` | Yes | App base URL (`http://localhost:3000` in dev) |
| `TWILIO_ACCOUNT_SID` | No | Twilio — WhatsApp notifications |
| `TWILIO_AUTH_TOKEN` | No | Twilio auth token |
| `TWILIO_WHATSAPP_FROM` | No | WhatsApp sender number |
| `ADMIN_WHATSAPP_NUMBER` | No | Admin WhatsApp recipient |
| `UPSTASH_REDIS_REST_URL` | No | Upstash Redis — rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | No | Upstash Redis token |
| `SENTRY_DSN` | No | Sentry error tracking DSN |
| `AXIOM_TOKEN` | No | Axiom logging token |
| `CRON_SECRET` | No | Secret for scheduled cron routes |

---

## License

MIT — see [LICENSE](LICENSE)

---

*Built with Next.js 14, Supabase, and @react-pdf/renderer*
