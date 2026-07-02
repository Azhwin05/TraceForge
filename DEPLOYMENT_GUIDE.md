# ValveTrack ERP - Deployment Guide for Client Testing

## 🚀 Quick Deployment to Vercel

Your code is ready to deploy! Follow these steps:

### Step 1: Connect GitHub to Vercel (2 minutes)

1. Go to: **https://vercel.com/new**
2. Click **"Import Git Repository"**
3. Enter: `https://github.com/Azhwin05/TraceForge`
4. Click **Import**

### Step 2: Configure Environment Variables (3 minutes)

In the Vercel deployment form, add these environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NODE_ENV=production
```

**Get these values from:**
- Supabase Dashboard → Settings → API
- Copy `Project URL` and `anon` public key

### Step 3: Deploy (1 click)

Click **"Deploy"** button

Vercel will:
- ✅ Build Next.js app
- ✅ Deploy to CDN globally
- ✅ Provide URL automatically

### Step 4: Get Your Live Link

After deployment completes:
```
✓ Production: https://your-app.vercel.app
```

---

## 🔑 Test Accounts for Client

Your client can login with any of these test accounts:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@raghaveng.com | Test@123 |
| QA | qa@raghaveng.com | Test@123 |
| Engineer | engineer@raghaveng.com | Test@123 |
| Operator | operator@raghaveng.com | Test@123 |
| Accounts | accounts@raghaveng.com | Test@123 |
| Management | management@raghaveng.com | Test@123 |

---

## ✨ What Your Client Can Test

### ✅ Working Features (Ready)
- **Login** — with 6 quick-login buttons for test accounts
- **Job Cards List** — browse all jobs
- **Job Card Detail** — view job information
- **Master Data** — WPS, consumables, chemicals, instruments
- **Reports** — PMI, Dimension, Overlay reports (read-only)
- **Document Center** — view uploaded documents
- **Audit Trail** — see all changes
- **Alerts** — overdue job tracking

### ⏳ In Development (UI Implementation)
- Document upload workflow (backend ready, UI pending)
- PWHT approval workflow (backend ready, UI pending)
- Job closure validation (backend ready, UI pending)
- Dossier generation (backend ready, UI pending)

---

## 📝 What NOT to Test Yet

These features are in progress and not yet integrated:

- ❌ Document upload from workflow stages
- ❌ PWHT approval forms
- ❌ Welding report attachment
- ❌ Delivery challan upload
- ❌ Invoice upload
- ❌ Dossier generation

*These will be available in Phase 1.5 (next 2-3 weeks)*

---

## 🐛 Known Issues

1. **Database Migrations Not Applied**
   - Workflow document types and PWHT approval fields are in migrations but not applied to production Supabase yet
   - This means new document types won't work until migrations are applied
   - **Fix**: Apply migrations in Supabase SQL Editor

2. **File Upload Simulated**
   - Document upload code is written but not tested against actual Supabase Storage
   - Files won't actually persist until Storage integration is complete

3. **TypeScript Build**
   - Some components reference features not yet implemented
   - Build may show warnings (safe to deploy, features are stubbed)

---

## 📊 Architecture Overview

```
Frontend (Next.js 14)
    ↓
Vercel (Hosted)
    ↓
Supabase (PostgreSQL + RLS)
    ↓
Supabase Storage (PDF/Documents)
```

---

## 🔗 Important Links

- **GitHub Repo**: https://github.com/Azhwin05/TraceForge
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Supabase Dashboard**: https://supabase.com/dashboard
- **Documentation**: See `/docs/client-workflow/` folder in repo

---

## 📞 Support for Your Client

**Tell your client:**

> Welcome to ValveTrack ERP! This is a pre-release version with core features ready.
>
> **What works:** Login, job cards, master data, reports, document center, audit trail
> 
> **What's coming:** Document upload workflow, PWHT approval, dossier generation (2-3 weeks)
>
> **Quick start:** Use quick-login buttons on the login page to try different roles
>
> **Documentation**: Check the docs folder for detailed guides

---

## ✅ Deployment Checklist

- [ ] Fork/access GitHub repo: https://github.com/Azhwin05/TraceForge
- [ ] Create Vercel account: https://vercel.com/signup
- [ ] Connect repo to Vercel
- [ ] Add environment variables (SUPABASE_URL, SUPABASE_ANON_KEY)
- [ ] Click Deploy
- [ ] Wait for build to complete (5-10 min)
- [ ] Share live URL with client
- [ ] Client tests with quick-login accounts

---

## 🚀 After Deployment

1. Test the login with each role using quick-login buttons
2. Navigate through job cards and master data
3. Check that navigation works
4. Verify responsive design on mobile
5. Report any issues

---

**Status**: Ready for production deployment  
**Code Push Date**: June 26, 2026  
**Deployment Target**: Vercel (global CDN)  
**Estimated Deploy Time**: 5-10 minutes  

🎉 **Your client can now see and test the ValveTrack ERP system!**

---

## ⚠️ REQUIRED: Apply migration 0017 (2026-07-02 enterprise hardening)

Before deploying this version, run `supabase/migrations/0017_enterprise_gates_pwht_chart.sql`
against the database (Supabase Dashboard → SQL Editor, or `supabase db push`).

It delivers:
- **Workflow gates in the DB trigger** — dispatch/close now require approved WPS,
  inspection reports, and PWHT (when required). "No document → No progress" is
  enforced at the database, not just the UI.
- **PWHT chart recorder schema** — `pwht_chart_readings` table + run columns
  (component ID, WPS number, cycle window).
- **Repairs migration 0016** — 0016 contains invalid SQL (`ADD COLUMN IF NOT EXISTS (…)`
  multi-column form) and an index on a non-existent column. If 0016 was never applied
  or failed, SKIP it — 0017 idempotently includes everything 0016 intended.
- Unique DC/invoice numbers, missing FK indexes, `updated_at` triggers,
  `log_admin_action` / `log_document_dispatch` audit RPCs,
  dossier email-tracking columns, operator INSERT policy on clients.

Also set `RESEND_API_KEY` + `RESEND_FROM_EMAIL` in the environment to enable the
"Email to Customer" automated documentation feature.
