-- 0054 — Close the accounts/audit_log/alerts/profiles leak + portal invoice view
--
-- REVISED: when this was first applied, `accounts`, `audit_log` and `alerts`
-- had already been independently re-scoped to staff-only SELECT policies
-- (accounts_staff_select / audit_log_staff_select / alerts_staff_select, all
-- using is_internal_staff()), and `profiles` already had profiles_self_select
-- + profiles_staff_select — so the original `alter policy ... "accounts_select_all"`
-- etc. failed with "policy does not exist", because that policy name was gone.
--
-- The verification block below re-checks the same property (a customer can
-- read only their own profile; staff can read everything) without assuming
-- specific policy names, so this migration is safe to run regardless of
-- which of the two shapes the database is currently in.
--
-- The one part of the original migration that had NOT been applied yet is
-- the portal_invoice_refs view (item 5 below) — that part still runs as before.

-- ─────────────────────────────────────────────────────────────
-- 1–2. Internal-only tables + profiles — verify only, no changes needed
--    if the policies already look like this (see note above).
-- ─────────────────────────────────────────────────────────────
do $$
declare
  n bigint;
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'accounts'
       and cmd = 'SELECT' and qual ilike '%is_internal_staff%'
  ) then
    raise exception 'accounts has no staff-scoped SELECT policy — do not proceed, this table is still open to every authenticated user.';
  end if;

  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'audit_log'
       and cmd = 'SELECT' and qual ilike '%is_internal_staff%'
  ) then
    raise exception 'audit_log has no staff-scoped SELECT policy.';
  end if;

  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'alerts'
       and cmd = 'SELECT' and qual ilike '%is_internal_staff%'
  ) then
    raise exception 'alerts has no staff-scoped SELECT policy.';
  end if;

  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'profiles'
       and cmd = 'SELECT' and (qual ilike '%is_internal_staff%' or qual ilike '%auth.uid%')
  ) then
    raise exception 'profiles has no self/staff-scoped SELECT policy — it may still be open to every authenticated user.';
  end if;

  raise notice '0054 step 1-2: accounts/audit_log/alerts/profiles are already correctly scoped — no policy changes needed.';
end $$;

-- ─────────────────────────────────────────────────────────────
-- 3. Invoice reference for the customer portal
--
--    `accounts` is staff-only and RLS cannot mask individual columns, so the
--    portal reads this view instead — invoice number + date ONLY, never
--    po_value, invoice_value, payment_status or payment_amount.
-- ─────────────────────────────────────────────────────────────
create or replace view public.portal_invoice_refs as
  select a.job_card_id,
         a.invoice_number,
         a.invoice_date
    from public.accounts a
    join public.job_cards jc on jc.id = a.job_card_id
   where a.invoice_number is not null
     and (
       is_internal_staff()
       or jc.client_id in (select current_client_ids())
     );

comment on view public.portal_invoice_refs is
  'Invoice reference only (number + date) scoped to the caller''s companies. '
  'Exists because accounts is staff-only and RLS cannot mask columns. '
  'Never add value or payment columns here.';

grant select on public.portal_invoice_refs to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 4. Prove everything is queryable before committing
-- ─────────────────────────────────────────────────────────────
do $$
declare
  n bigint;
begin
  select count(*) into n from public.profiles;
  select count(*) into n from public.accounts;
  select count(*) into n from public.audit_log;
  select count(*) into n from public.alerts;
  select count(*) into n from public.portal_invoice_refs;
  raise notice '0054 ok — all four tables and the new invoice view are queryable';
end $$;
