-- 0052 — Allow one customer portal login to access multiple client companies
--
-- Until now a portal login mapped to exactly one company (profiles.client_id),
-- and every customer RLS policy derived visibility from current_client_id().
-- Some customers legitimately span more than one client entity (e.g. Ranjith
-- represents both AMPO VALVES INDIA PRIVATE LIMITED and AMPO S.COOP) and need
-- one login across both.
--
-- The alternatives were rejected on purpose: reassigning job cards to a
-- different customer would falsify which customer the work belongs to on an
-- ERP that produces inspection and dispatch documents, and merging the two
-- companies would erase a real distinction between separate legal entities.
--
-- This change is deliberately ADDITIVE:
--   • profiles.client_id remains the PRIMARY company — no backfill, and every
--     existing single-company login keeps behaving exactly as before.
--   • portal_user_clients holds any ADDITIONAL companies.
--   • current_client_ids() returns the union of the two.
-- Only the *_customer_select policies are altered. Staff policies are separate
-- and RLS policies are permissive (OR'd), so internal access is untouched.

-- ── 1. Mapping table ────────────────────────────────────────────────────────
create table if not exists public.portal_user_clients (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  client_id  uuid not null references public.clients(id)  on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, client_id)
);

comment on table public.portal_user_clients is
  'Extra client companies a customer portal login may access, beyond its primary profiles.client_id.';

alter table public.portal_user_clients enable row level security;

drop policy if exists "puc_staff_all" on public.portal_user_clients;
create policy "puc_staff_all" on public.portal_user_clients
  using (is_internal_staff()) with check (is_internal_staff());

-- A portal user may read (never write) their own grants.
drop policy if exists "puc_self_select" on public.portal_user_clients;
create policy "puc_self_select" on public.portal_user_clients
  for select using (profile_id = auth.uid());

-- ── 2. current_client_ids() ─────────────────────────────────────────────────
-- Same shape/guarantees as current_client_id(): STABLE + SECURITY DEFINER, and
-- returns nothing unless the caller is an active 'customer'.
create or replace function public.current_client_ids()
returns setof uuid
language sql
stable
security definer
set search_path to 'public'
as $$
  select p.client_id
    from public.profiles p
   where p.id = auth.uid() and p.role = 'customer' and p.client_id is not null
  union
  select puc.client_id
    from public.portal_user_clients puc
    join public.profiles p on p.id = puc.profile_id
   where puc.profile_id = auth.uid() and p.role = 'customer';
$$;

revoke all on function public.current_client_ids() from public, anon;
grant execute on function public.current_client_ids() to authenticated;

-- ── 3. Point the customer policies at the new function ──────────────────────
alter policy "clients_customer_select" on public.clients
  using (id in (select current_client_ids()));

alter policy "job_cards_customer_select" on public.job_cards
  using (client_id in (select current_client_ids()));

alter policy "documents_customer_select" on public.documents
  using (job_card_id is not null and exists (
    select 1 from job_cards jc
     where jc.id = documents.job_card_id
       and jc.client_id in (select current_client_ids())));

alter policy "pmi_customer_select" on public.pmi_reports
  using (exists (select 1 from job_cards jc
                  where jc.id = pmi_reports.job_card_id
                    and jc.client_id in (select current_client_ids())));

alter policy "dimension_customer_select" on public.dimension_reports
  using (exists (select 1 from job_cards jc
                  where jc.id = dimension_reports.job_card_id
                    and jc.client_id in (select current_client_ids())));

alter policy "overlay_customer_select" on public.overlay_welding_reports
  using (exists (select 1 from job_cards jc
                  where jc.id = overlay_welding_reports.job_card_id
                    and jc.client_id in (select current_client_ids())));

alter policy "dispatches_customer_select" on public.dispatches
  using (exists (select 1 from job_cards jc
                  where jc.id = dispatches.job_card_id
                    and jc.client_id in (select current_client_ids())));

alter policy "process_customer_select" on public.process_executions
  using (exists (select 1 from job_cards jc
                  where jc.id = process_executions.job_card_id
                    and jc.client_id in (select current_client_ids())));

alter policy "wps_customer_select" on public.wps_qualifications
  using (exists (select 1 from job_cards jc
                  where jc.id = wps_qualifications.job_card_id
                    and jc.client_id in (select current_client_ids())));

alter policy "dossiers_customer_select" on public.customer_dossiers
  using (exists (select 1 from job_cards jc
                  where jc.id = customer_dossiers.job_card_id
                    and jc.client_id in (select current_client_ids())));

alter policy "dossier_docs_customer_select" on public.customer_dossier_documents
  using (exists (select 1 from customer_dossiers d
                   join job_cards jc on jc.id = d.job_card_id
                  where d.id = customer_dossier_documents.dossier_id
                    and jc.client_id in (select current_client_ids())));

alter policy "pwht_run_jobs_customer_select" on public.pwht_run_jobs
  using (exists (select 1 from job_cards jc
                  where jc.id = pwht_run_jobs.job_card_id
                    and jc.client_id in (select current_client_ids())));

alter policy "pwht_runs_customer_select" on public.pwht_runs
  using (exists (select 1 from pwht_run_jobs prj
                   join job_cards jc on jc.id = prj.job_card_id
                  where prj.pwht_run_id = pwht_runs.id
                    and jc.client_id in (select current_client_ids())));

alter policy "pwht_readings_customer_select" on public.pwht_chart_readings
  using (exists (select 1 from pwht_run_jobs prj
                   join job_cards jc on jc.id = prj.job_card_id
                  where prj.pwht_run_id = pwht_chart_readings.pwht_run_id
                    and jc.client_id in (select current_client_ids())));

-- current_client_id() is intentionally left in place (now unused by policies)
-- so nothing else that may reference it breaks.
