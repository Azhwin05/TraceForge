# ValveTrack ERP — Tester's Guide

**For:** QA / Manual Tester
**System:** ValveTrack ERP (Raghav Engineering) + Customer Portal
**Prepared:** 2026-07-02

---

## 0. Read this first

- This is the **first full manual test pass**. The app builds cleanly, passes automated tests, and its security/data rules have been verified — but **no one has clicked through every screen in a browser yet**. Your job is to find what breaks. Finding issues is success, not failure.
- **How to report a bug** — for each problem note: (1) which role you were logged in as, (2) the page URL, (3) exactly what you clicked/typed, (4) what you expected, (5) what actually happened (copy any error text / screenshot).
- Test in this order — later sections depend on data created in earlier ones.

### Setup prerequisites (do before testing)
1. **App URL:** `__________________` (ask the admin — the deployed Vercel link).
2. **Login accounts** — confirm these exist and the password with the admin. Expected test accounts:
   | Role | Email | Password |
   |---|---|---|
   | Admin | admin@raghaveng.com | (confirm) |
   | QA | qa@raghaveng.com | (confirm) |
   | Engineer | engineer@raghaveng.com | (confirm) |
   | Operator | operator@raghaveng.com | (confirm) |
   | Accounts | accounts@raghaveng.com | (confirm) |
   | Management | management@raghaveng.com | (confirm) |
3. **Customer portal test (Section 9)** needs a portal login. The admin creates it at **Portal Users** (requires `SUPABASE_SERVICE_ROLE_KEY` to be configured on the server). If that's not set yet, skip Section 9 and tell the admin.

---

## 1. Login & access control

| # | Step | Expected result | Pass? |
|---|---|---|---|
| 1.1 | Go to the app URL without logging in; try to open `/dashboard` | Redirected to the login page | ☐ |
| 1.2 | Log in as **Operator** | Lands on the Dashboard | ☐ |
| 1.3 | While logged in as Operator, look at the left sidebar | You see Dashboard, Job Cards, PWHT Runs, Search — but **not** admin-only items like Settings / Portal Users | ☐ |
| 1.4 | Log out (top-right), log in as **Admin** | Sidebar now shows Settings, Portal Users, Audit Trail, Master Data | ☐ |
| 1.5 | Enter a wrong password 6+ times quickly | After several tries you get "Too many requests" (rate limiting) | ☐ |

---

## 2. Dashboard

| # | Step | Expected result | Pass? |
|---|---|---|---|
| 2.1 | Log in as Admin, view Dashboard | Job counts by status, recent activity, and any alerts load without errors | ☐ |
| 2.2 | Switch tabs / navigate away and back | Pages show a brief loading skeleton, not a frozen screen | ☐ |

---

## 3. Job Card creation (Operator)

| # | Step | Expected result | Pass? |
|---|---|---|---|
| 3.1 | As Operator, go to Job Cards → New | Form opens with fields: client, NBDN, description, process type, quantity, etc. | ☐ |
| 3.2 | Submit with required fields empty | Validation errors appear; nothing is saved | ☐ |
| 3.3 | Fill all fields, pick an existing client (e.g. **L & T Valves**), choose process type **welding**, save | Job card is created with an auto-generated JC number (e.g. RRE-2026-####) | ☐ |
| 3.4 | Open the new job card detail | All entered data shows correctly; status is "created" / "wps_pending" | ☐ |
| 3.5 | Try creating a second job with the **same NBDN number** | Rejected (NBDN must be unique) | ☐ |

---

## 4. Workflow gates — the core rule ("No document → No progress")

This is the most important behaviour to verify. Use the job from Section 3.

| # | Step | Expected result | Pass? |
|---|---|---|---|
| 4.1 | As Admin, on a welding job with **no approved WPS and no inspection reports**, try to move status straight to **Ready for Dispatch** | **Blocked** with a clear message listing what's missing (approved WPS, approved inspection report) | ☐ |
| 4.2 | As QA, upload/submit a WPS for the job, then approve it | Status advances; WPS shows "approved" | ☐ |
| 4.3 | Try to dispatch again with still no approved inspection report | Still **blocked** — "approved inspection report required" | ☐ |
| 4.4 | Add and approve a PMI **or** Dimension report (Sections 5–6), then move to Ready for Dispatch | Now **allowed** | ☐ |
| 4.5 | Try to **close** a job that has no dispatch record | Blocked — "cannot close without a dispatch record" | ☐ |
| 4.6 | As a non-admin, try to close a job whose payment is not received | Blocked — "payment has not been received" | ☐ |

> If any of 4.1 / 4.3 / 4.5 let you through, that is a **critical bug** — report immediately.

---

## 5. PMI Report (QA)

| # | Step | Expected result | Pass? |
|---|---|---|---|
| 5.1 | As QA, create a PMI report for the job (enter readings, instrument, etc.) | Saves as "draft" | ☐ |
| 5.2 | Generate the PMI PDF | A PDF is produced and can be opened/downloaded | ☐ |
| 5.3 | Approve the PMI report | Status becomes "approved" | ☐ |
| 5.4 | Try to approve it again | No error / no double-approval (idempotent) | ☐ |
| 5.5 | Reject a different draft PMI report without a reason | Requires a rejection reason | ☐ |

---

## 6. Dimension Report (QA)

| # | Step | Expected result | Pass? |
|---|---|---|---|
| 6.1 | As QA, create a Dimension report (dimensions, tolerances, readings) | Saves as "draft" | ☐ |
| 6.2 | Generate the Dimension PDF | PDF opens/downloads | ☐ |
| 6.3 | Approve it | Status "approved" | ☐ |

---

## 7. PWHT Chart Recorder (Engineer + QA) — new module

| # | Step | Expected result | Pass? |
|---|---|---|---|
| 7.1 | As Engineer, go to PWHT Runs → create a run (chart number, furnace, operator, cycle temps), link the job card | Run is created | ☐ |
| 7.2 | Open the run detail (click the chart number or "Chart recorder →") | Detail page opens with cycle details, an empty temperature-vs-time graph, and a readings table | ☐ |
| 7.3 | Fill WPS number / component ID / cycle start & end, Save details | Saves successfully | ☐ |
| 7.4 | Add a few manual readings (time + temperature) | Each appears in the table and the **graph updates** | ☐ |
| 7.5 | Prepare a small CSV (lines like `0,30` then `15,180` then `30,350`) and use "Import recorder CSV" | Readings import; graph fills in; a count is shown | ☐ |
| 7.6 | Click "Chart PDF" | A PDF with the plotted temperature curve, cycle details, and linked jobs opens | ☐ |
| 7.7 | Try to **Submit for approval** with **zero readings** on a fresh run | Blocked — "no chart recorder readings captured" | ☐ |
| 7.8 | Submit the run (with readings) for approval; then as QA, Approve it | Status draft → submitted → approved | ☐ |
| 7.9 | After approval, try to add/delete a reading | Blocked — readings are locked once approved | ☐ |

---

## 8. Dispatch, Accounts, and Automated Documentation

| # | Step | Expected result | Pass? |
|---|---|---|---|
| 8.1 | As Admin, once a job is Ready for Dispatch, create a dispatch (DC number, date, vehicle) | Dispatch saved; status → Dispatched | ☐ |
| 8.2 | Create a second dispatch with the **same DC number** | Rejected (DC number must be unique) | ☐ |
| 8.3 | As Accounts, add invoice + mark payment received | Saved; job can then move toward closure | ☐ |
| 8.4 | As QA/Admin, go to Dossiers → create a dossier for the job, select documents, Generate | An index PDF + ZIP pack are generated and downloadable | ☐ |
| 8.5 | On the generated dossier, click **Email to Customer**, enter an email you can check | Email is sent (needs email configured); it lists the documents with working download links. "Last sent to…" shows on the dossier | ☐ |

> 8.5 needs `RESEND_API_KEY` configured. If email isn't set up, note it and skip.

---

## 9. Customer Portal — data isolation (most important security test)

**Setup (Admin):** Portal Users → create a login for **L & T Valves** (name, email, temp password, select client = L&T). Repeat for **SRM INDUSTRY** with a different email.

| # | Step | Expected result | Pass? |
|---|---|---|---|
| 9.1 | Log out. Log in with the **L&T** portal account | You land on the **Customer Portal** (`/portal`), header shows "L & T Valves" — NOT the internal ERP | ☐ |
| 9.2 | As the L&T portal user, try to open an internal page, e.g. `/dashboard` or `/job-cards` | Redirected back to `/portal` (no access to internal app) | ☐ |
| 9.3 | View "My Jobs" | You see **only L&T's** job cards — never SRM's or any other client's | ☐ |
| 9.4 | Open an L&T job detail | You see process status timeline, inspection/PWHT report statuses, dispatch info, and downloadable documents — but **no** internal pricing/payment (accounts) data | ☐ |
| 9.5 | Download a document | The file opens | ☐ |
| 9.6 | Log out; log in as the **SRM** portal user | You see only SRM's jobs — **not** L&T's | ☐ |
| 9.7 | (If you can) note an L&T job's URL, then while logged in as SRM paste that URL | "Not found" / access denied — SRM cannot see L&T's job even with the direct link | ☐ |

> 9.3, 9.6, 9.7 are the critical isolation checks. If a customer ever sees another client's data, that is a **critical bug** — report immediately.

---

## 10. General / cross-cutting

| # | Step | Expected result | Pass? |
|---|---|---|---|
| 10.1 | Use the Search feature with a JC number, drawing number, PO | Relevant results; no errors with odd characters (`%`, `_`, quotes) | ☐ |
| 10.2 | Try uploading a non-document file (e.g. rename a `.zip` to `.pdf`) as a document | Rejected — file content doesn't match its type | ☐ |
| 10.3 | Open the app on a tablet / narrow window | Usable (note: mobile layout is known to be limited) | ☐ |
| 10.4 | Deactivated user: ask admin to disable an account, then try to use it | Access is blocked | ☐ |

---

## Known limitations (not bugs — don't file these)

- **Mobile navigation** is limited; the app is desktop/tablet-first.
- **Portal user creation** requires `SUPABASE_SERVICE_ROLE_KEY` on the server; without it the create form is disabled (existing accounts still work).
- **Email** (dossier delivery, notifications) requires `RESEND_API_KEY`.
- The app currently shares its database with an unrelated system; this does not affect ValveTrack data or the tests above.
- No automated end-to-end (browser) tests yet — this manual pass is the first full click-through.

---

## Summary for the tester

Please fill in, then return to the dev team:

- Sections fully passed: ____ / 10
- Critical issues found (workflow gate bypass, or a customer seeing another client's data): ____
- Other issues found: ____
- Overall: ☐ Ready to ship  ☐ Needs fixes (see notes)
