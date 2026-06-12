-- ValveTrack — Phase 1: Row Level Security
-- RULE 3: enable RLS on every table + role policies.
-- audit_log lockdown: NO role gets direct INSERT/UPDATE/DELETE — only
-- the SECURITY DEFINER trigger (log_job_card_status_change, 0002) can
-- write to it, since that function runs as the table owner and bypasses RLS.

-- ─────────────────────────────────────────────────────────────
-- helper: current user's role (avoids re-querying profiles in every policy)
-- ─────────────────────────────────────────────────────────────
create or replace function public.current_role_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ─────────────────────────────────────────────────────────────
-- enable RLS everywhere
-- ─────────────────────────────────────────────────────────────
alter table public.profiles            enable row level security;
alter table public.clients             enable row level security;
alter table public.job_cards           enable row level security;
alter table public.wps_qualifications  enable row level security;
alter table public.pmi_reports         enable row level security;
alter table public.dimension_reports   enable row level security;
alter table public.process_executions  enable row level security;
alter table public.pwht_runs           enable row level security;
alter table public.pwht_run_jobs       enable row level security;
alter table public.dispatches          enable row level security;
alter table public.accounts            enable row level security;
alter table public.alerts              enable row level security;
alter table public.audit_log           enable row level security;

-- ─────────────────────────────────────────────────────────────
-- profiles
-- Everyone can read profiles (needed for "uploaded by" / "assigned to"
-- displays); only admin can manage them.
-- ─────────────────────────────────────────────────────────────
create policy "profiles_select_all" on public.profiles
  for select using (true);

create policy "profiles_admin_all" on public.profiles
  for all using (current_role_name() = 'admin')
  with check (current_role_name() = 'admin');

-- ─────────────────────────────────────────────────────────────
-- clients
-- admin: full access. operator/qa/engineer/accounts/management: read only.
-- ─────────────────────────────────────────────────────────────
create policy "clients_select_all" on public.clients
  for select using (true);

create policy "clients_admin_write" on public.clients
  for insert with check (current_role_name() = 'admin');
create policy "clients_admin_update" on public.clients
  for update using (current_role_name() = 'admin') with check (current_role_name() = 'admin');
create policy "clients_admin_delete" on public.clients
  for delete using (current_role_name() = 'admin');

-- ─────────────────────────────────────────────────────────────
-- job_cards
--   admin           → full access
--   operator        → SELECT, INSERT
--   engineer/qa/accounts/management → SELECT
-- ─────────────────────────────────────────────────────────────
create policy "job_cards_select_all" on public.job_cards
  for select using (true);

create policy "job_cards_admin_all" on public.job_cards
  for all using (current_role_name() = 'admin')
  with check (current_role_name() = 'admin');

create policy "job_cards_operator_insert" on public.job_cards
  for insert with check (current_role_name() = 'operator');

-- ─────────────────────────────────────────────────────────────
-- wps_qualifications
--   admin → full access
--   qa    → SELECT, INSERT, UPDATE (approval workflow)
--   everyone else → SELECT
-- ─────────────────────────────────────────────────────────────
create policy "wps_select_all" on public.wps_qualifications
  for select using (true);

create policy "wps_admin_all" on public.wps_qualifications
  for all using (current_role_name() = 'admin')
  with check (current_role_name() = 'admin');

create policy "wps_qa_insert" on public.wps_qualifications
  for insert with check (current_role_name() = 'qa');

create policy "wps_qa_update" on public.wps_qualifications
  for update using (current_role_name() = 'qa')
  with check (current_role_name() = 'qa');

-- ─────────────────────────────────────────────────────────────
-- pmi_reports
--   admin → full access | qa → SELECT, INSERT | everyone else → SELECT
-- ─────────────────────────────────────────────────────────────
create policy "pmi_select_all" on public.pmi_reports
  for select using (true);

create policy "pmi_admin_all" on public.pmi_reports
  for all using (current_role_name() = 'admin')
  with check (current_role_name() = 'admin');

create policy "pmi_qa_insert" on public.pmi_reports
  for insert with check (current_role_name() = 'qa');

-- ─────────────────────────────────────────────────────────────
-- dimension_reports
--   admin → full access | qa → SELECT, INSERT | everyone else → SELECT
-- ─────────────────────────────────────────────────────────────
create policy "dimension_select_all" on public.dimension_reports
  for select using (true);

create policy "dimension_admin_all" on public.dimension_reports
  for all using (current_role_name() = 'admin')
  with check (current_role_name() = 'admin');

create policy "dimension_qa_insert" on public.dimension_reports
  for insert with check (current_role_name() = 'qa');

-- ─────────────────────────────────────────────────────────────
-- process_executions
--   admin    → full access
--   engineer → SELECT, INSERT, UPDATE — only rows assigned to them
--   everyone else → SELECT
-- ─────────────────────────────────────────────────────────────
create policy "process_select_all" on public.process_executions
  for select using (true);

create policy "process_admin_all" on public.process_executions
  for all using (current_role_name() = 'admin')
  with check (current_role_name() = 'admin');

create policy "process_engineer_insert" on public.process_executions
  for insert with check (
    current_role_name() = 'engineer' and assigned_to = auth.uid()
  );

create policy "process_engineer_update" on public.process_executions
  for update using (
    current_role_name() = 'engineer' and assigned_to = auth.uid()
  )
  with check (
    current_role_name() = 'engineer' and assigned_to = auth.uid()
  );

-- ─────────────────────────────────────────────────────────────
-- pwht_runs / pwht_run_jobs
--   admin → full access | qa → SELECT, INSERT (+ UPDATE on run_jobs) | everyone else → SELECT
-- ─────────────────────────────────────────────────────────────
create policy "pwht_runs_select_all" on public.pwht_runs
  for select using (true);
create policy "pwht_runs_admin_all" on public.pwht_runs
  for all using (current_role_name() = 'admin')
  with check (current_role_name() = 'admin');
create policy "pwht_runs_qa_insert" on public.pwht_runs
  for insert with check (current_role_name() = 'qa');

create policy "pwht_run_jobs_select_all" on public.pwht_run_jobs
  for select using (true);
create policy "pwht_run_jobs_admin_all" on public.pwht_run_jobs
  for all using (current_role_name() = 'admin')
  with check (current_role_name() = 'admin');
create policy "pwht_run_jobs_qa_insert" on public.pwht_run_jobs
  for insert with check (current_role_name() = 'qa');
create policy "pwht_run_jobs_qa_update" on public.pwht_run_jobs
  for update using (current_role_name() = 'qa')
  with check (current_role_name() = 'qa');

-- ─────────────────────────────────────────────────────────────
-- dispatches
--   admin → full access | accounts → SELECT | everyone else → SELECT
--   (creation happens through the dispatch API route under a service
--   role after validateJobForDispatch passes — see API ARCHITECTURE RULES:
--   "never allow direct Supabase client writes from frontend for state changes")
-- ─────────────────────────────────────────────────────────────
create policy "dispatches_select_all" on public.dispatches
  for select using (true);
create policy "dispatches_admin_all" on public.dispatches
  for all using (current_role_name() = 'admin')
  with check (current_role_name() = 'admin');

-- ─────────────────────────────────────────────────────────────
-- accounts
--   admin → full access | accounts role → SELECT, INSERT, UPDATE | everyone else → SELECT
-- ─────────────────────────────────────────────────────────────
create policy "accounts_select_all" on public.accounts
  for select using (true);

create policy "accounts_admin_all" on public.accounts
  for all using (current_role_name() = 'admin')
  with check (current_role_name() = 'admin');

create policy "accounts_role_insert" on public.accounts
  for insert with check (current_role_name() = 'accounts');

create policy "accounts_role_update" on public.accounts
  for update using (current_role_name() = 'accounts')
  with check (current_role_name() = 'accounts');

-- ─────────────────────────────────────────────────────────────
-- alerts — read-only for everyone; admin can acknowledge / manage
-- ─────────────────────────────────────────────────────────────
create policy "alerts_select_all" on public.alerts
  for select using (true);
create policy "alerts_admin_all" on public.alerts
  for all using (current_role_name() = 'admin')
  with check (current_role_name() = 'admin');

-- ─────────────────────────────────────────────────────────────
-- audit_log — IMMUTABLE
-- Readable by everyone (per "management → ALL tables SELECT only" and
-- the /audit page being open to authenticated staff). NO insert/update/
-- delete policy is defined for ANY role — not even admin — so the only
-- way rows enter this table is through the SECURITY DEFINER trigger
-- function `log_job_card_status_change`, which runs as the table owner
-- and therefore bypasses RLS entirely. This is what makes the table
-- truly immutable from the API/client side.
-- ─────────────────────────────────────────────────────────────
create policy "audit_log_select_all" on public.audit_log
  for select using (true);
