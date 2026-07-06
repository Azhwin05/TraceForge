# ValveTrack — System Walkthrough & Status Report
**For: Raghav Engineering** · **Prepared: 2026-07-04** · **Live URL:** https://trace-forge-xi.vercel.app

---

## How to read this document

1. **Section A** — click-by-click walkthrough for each of the 6 roles, in plain language.
2. **Section B** — honest status: what's fully working, what's partially working, what's not built yet.
3. **Section C** — the 6 test logins to try it yourself right now.

Every screen and button named below actually exists in the live system today — this isn't a plan, it's what you can click right now.

---

## Section C first — Try it yourself

Go to **https://trace-forge-xi.vercel.app** and log in with any of these (password is the same for all: `Test@123`):

| Role | Email | What they can do |
|---|---|---|
| Admin | admin@raghaveng.com | Everything — full control |
| QA | qa@raghaveng.com | Approvals, master data, reports |
| Engineer | engineer@raghaveng.com | Process execution, reports |
| Operator | operator@raghaveng.com | Job cards, basic entry |
| Accounts | accounts@raghaveng.com | Payments, dispatch, alerts |
| Management | management@raghaveng.com | Read-only oversight, dashboard |

There is also a separate **Customer Portal** (`/portal`) for your clients (KSB, ONGC, etc.) to log in and see only their own jobs — see Section A.7.

---

## Section A — Workflow, click by click

### A.1 — Login
- Open the site → land on the **Login** page.
- Either type an email/password, or click one of the 6 colored **quick-login** buttons (Admin, QA, Engineer, Operator, Accounts, Management) — these are shortcuts to the test accounts above, useful for demoing without typing.
- On success you land on the **Dashboard**.

### A.2 — Dashboard (all roles land here)
Top of screen shows 5 stat cards:
- **Active Jobs**, **In Process**, **Awaiting Reports**, **Dispatched This Month**, **Closed This Month**

Below that: a **Recent Job Cards** list and a **Blocked / Attention Needed** list — jobs stuck waiting on something.

Left sidebar (changes per role — see A.8 for exact per-role menu):
`Dashboard · Job Cards · PWHT Runs · Search · Alerts` and, for Admin/QA, `Master Data`, `Reports`, `System` sections.

### A.3 — Creating a Job Card (the "single source of truth")
1. Sidebar → **Job Cards** → **+ New** button (top right of the list page).
2. Fill in: client, PO number, valve details, process type.
3. Click **Create**. The system auto-generates a Job Card number (e.g. `JC-2026-0042`) — you never type this yourself.
4. You land on the **Job Card Detail** page — this single page is where the *entire* rest of the workflow happens, as expandable sections stacked top to bottom:

   `Advanced Details → WPS → Process Execution → NDE/LPT → PWHT Summary → PMI Report → Dimension Report → Overlay Welding Report → Dossier → Documents → Sign-Off → Dispatch → Accounts`

Each section below is one of those blocks on that same page.

### A.4 — WPS Qualification (Gate 1)
- On the Job Card page, the **WPS** section lets QA/Admin attach or confirm the Welding Procedure Specification for this job.
- **This is a real gate**: the system will not let the job move to the next status until a WPS is attached and approved. This is enforced by the database itself, not just the screen — so it can't be skipped by accident.

### A.5 — PMI / Dimension / Overlay Reports
- Sidebar → **PMI Reports** / **Dimension Reports** / **Overlay Reports**, or directly from the sections on the Job Card page.
- Click **+ New Report**, fill in readings/results, **Save**.
- Click **Generate PDF** — the system produces a formatted PDF report and stores it, downloadable from the same screen.

### A.6 — Process Execution & PWHT (conditional)
- **Process Execution** section on the Job Card logs each production step with timestamps (the "traveller").
- **PWHT Runs** (sidebar, or the PWHT Summary section on the job card) — only appears/matters if the job's WPS requires heat treatment.
  - Engineer records the heat-treatment chart (time/temperature data).
  - QA/Admin reviews it on the **PWHT Run detail page** and can **Approve** or **Reject** it — with a required reason if rejected.
  - Once approved, a **chart PDF** can be generated and downloaded — this becomes part of the customer dossier.

### A.7 — Validation, Dossier, Dispatch, Accounts
- **Sign-Off** section: final internal review before the job can be marked ready.
- **Dossier** section (Admin/QA): compiles the approved reports + PWHT chart into a single customer-facing document package.
- **Dispatch** section: records shipping/delivery details.
- **Accounts** section: records invoice + payment status. Marking payment as received is what allows the job to be closed.
- **Documents** (sidebar → Document Center): every uploaded file across every job, in one searchable place. **Search** (sidebar) does full-text search across job cards and documents.

### A.7b — Customer Portal (separate login, for your clients)
- URL: `https://trace-forge-xi.vercel.app/portal`
- A client contact (e.g. someone at KSB) logs in and sees **only their own company's jobs** — nothing from ONGC, Ampo, or anyone else.
- They can view job status and download the documents you've marked visible to them. They cannot edit anything.
- Admin manages who gets portal access from **Portal Users** (sidebar, Admin only).

### A.8 — What each role sees in the sidebar (verified from the actual menu code)

| Menu item | Admin | QA | Engineer | Operator | Accounts | Management |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Dashboard, Job Cards, PWHT Runs, Search | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Alerts | ✅ | ✅ | ✅ | — | ✅ | — |
| Master Data (WPS/Consumables/Chemicals/Instruments) | ✅ | ✅ | — | — | — | — |
| PMI / Dimension / Overlay Reports, Document Center | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Dossiers | ✅ | ✅ | — | — | — | — |
| Audit Trail | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Portal Users, Settings | ✅ | — | — | — | — | — |

*(Operators and Management don't see Alerts because it's not actionable for those roles — by design.)*

---

## Section B — Honest Status: What's Done vs. What's Not

I'm giving you the real picture, not a sales pitch. Ratings are based on inspecting the actual code and the live database, not on what was originally planned.

### ✅ Fully working, tested, end-to-end
| Feature | Notes |
|---|---|
| Login & role-based access | All 6 roles, working, security-hardened |
| Dashboard | Live stats from the database |
| Job Card creation & auto-numbering | — |
| WPS Qualification gate | Enforced at the database level — cannot be bypassed |
| PMI / Dimension / Overlay Reports + PDF generation | — |
| Process Execution log | — |
| PWHT chart recording + Approve/Reject + chart PDF | Newly completed |
| Dispatch & Accounts (payment) recording | — |
| Document Center & full-text Search | — |
| Customer Portal with per-client data isolation | Newly completed — your clients only ever see their own jobs |
| Security (permissions, data access rules) | Recently hardened; verified no unauthorized data access paths remain |

### 🟡 Partially working — usable, but rough edges
| Feature | What's missing |
|---|---|
| Final "close the job" validation | The rule enforcement exists in the database, but there's no dedicated screen showing *why* a job can't be closed yet — you'd need to check each section manually |
| Ageing/overdue alerts | Works, but only updates when someone opens the Alerts page — it doesn't proactively notify anyone |
| Dossier auto-population | The document bundling has to be assembled manually rather than auto-suggested |

### ❌ Not built yet
| Feature | Status |
|---|---|
| **WhatsApp alerts** (Twilio) | Not implemented at all — no messages are sent |
| **Proactive email/automatic notifications** | Email sending capability exists in the system but nothing is scheduled to trigger it automatically yet |
| **Client filter on Dashboard** (e.g. "show me only KSB jobs") | Not built — dashboard shows all jobs regardless of client |
| **Automated testing coverage for the full workflow** | Core logic has tests; the click-through screens don't have automated tests yet, so regressions are caught manually |
| **CI/CD pipeline** | Code changes aren't automatically checked before going live — currently relies on manual verification |

### Data currently in the live system
Right now there are only **2 job cards** and **1 WPS record** in the live database — it's essentially empty. This is expected for a demo, but before showing this to your client for a real trial, we should either:
- (a) add a handful of realistic sample jobs so the screens don't look empty, or
- (b) start entering your real jobs.

---

## Bottom line

**What you can tell your client today:** *"The full manufacturing workflow — from job creation through WPS approval, inspection reports, heat treatment approval, dispatch, payment, and a client-facing portal — is built and working. Security has been reviewed and hardened. What remains is automation (WhatsApp/email reminders) and some polish around the final closure checklist — these don't block using the system, they make it more hands-off over time."*

**What still needs to happen before a serious production rollout:**
1. Automatic WhatsApp/email alerts for overdue stages
2. Client filter on the dashboard
3. Populate with real or realistic job data
4. Set up automated checks so future code changes can't silently break things

Happy to turn items 1–4 into a prioritized punch list with rough time estimates if that helps you plan the next phase with the client.
