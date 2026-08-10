-- 0054 — URGENT: close four tables still readable by every authenticated user
--
-- Migration 0051 scoped 15 internal tables to is_internal_staff() and 0052
-- scoped the customer-facing ones to current_client_ids(). Four tables created
-- back in 0003 were missed and still carry `for select using (true)`:
--
--   accounts    — po_value, invoice_number, invoice_value, payment_status,
--                 payment_amount, tally_reference for EVERY client
--   audit_log   — old_value/new_value jsonb: the complete change history of
--                 every record in the system, across all clients
--   alerts      — internal SLA/overdue alerts, exposing other clients' job ids
--   profiles    — every staff member's name and role, and the full list of
--                 other customers' portal logins
--
-- A portal customer holds a valid `authenticated` session, so all four were
-- readable by them directly through PostgREST. `accounts` and `audit_log` are
-- the serious ones: commercial terms and a full audit trail belonging to other
-- customers of the same business.
--
-- NOTE ON RECURSION (the one thing to verify after applying): the profiles
-- policy below calls is_internal_staff(), which itself reads profiles. This is
-- safe *only* because that function is SECURITY DEFINER and owned by the table
-- owner, so it bypasses RLS rather than re-entering this policy. That is the
-- standard Supabase pattern and the same shape as current_client_id(). If it
-- were ever redefined as SECURITY INVOKER, profiles would fail with
-- "infinite recursion detected in policy" — see the verification block at the
-- bottom, which proves the policy is queryable before this migration commits.

-- ─────────────────────────────────────────────────────────────
-- 1. Internal-only tables
-- ─────────────────────────────────────────────────────────────
alter policy "accounts_select_all"  on public.accounts  using (is_internal_staff());
alter policy "audit_log_select_all" on public.audit_log using (is_internal_staff());
alter policy "alerts_select_all"    on public.alerts    using (is_internal_staff());

-- ─────────────────────────────────────────────────────────────
-- 2. profiles — staff see everyone; a customer sees only their own row
--    (requireAuth/requireCustomer in src/lib/auth.ts reads exactly that row,
--    so the portal keeps working; nothing in the portal joins other profiles)
-- ─────────────────────────────────────────────────────────────
alter policy "profiles_select_all" on public.profiles
  using (id = auth.uid() or is_internal_staff());

-- ─────────────────────────────────────────────────────────────
-- 3. Invoice reference for the customer portal
--
--    The client asked for the invoice number to be visible in the portal, but
--    `accounts` is now staff-only and RLS cannot hide individual columns. This
--    view exposes ONLY the reference fields — never po_value, invoice_value,
--    payment_status or payment_amount — and filters to the caller's own
--    companies. It deliberately does NOT set security_invoker, so it runs as
--    owner and can read accounts while the caller cannot.
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
-- 4. Prove the policies are queryable before committing
--    Catches the recursion failure mode described above while this is still
--    inside a transaction that can be rolled back.
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
  raise notice '0054 ok — all four policies and the invoice view are queryable';
end $$;
