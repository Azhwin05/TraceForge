-- 0051 — Close a cross-tenant data leak: portal customers could read the
-- entire Inventory module and every other customer's item register.
--
-- 15 tables carried a SELECT policy of `using (true)`, which grants read
-- access to ANY authenticated user — including external portal customers.
-- Because RLS is the real security boundary (a portal login can call the
-- PostgREST API directly, not just the pages we render), this exposed:
--   • suppliers            — the full supplier list
--   • stock_ledger         — unit rates / material cost + valuation data
--   • item_master, grn*, material_inward*, material_issue*, stock_adjustments
--   • customer_items       — EVERY customer's item register, cross-tenant
--
-- A portal customer must only ever reach the reports and documents for their
-- own job cards. Verified against the live DB by impersonating a real
-- customer profile under RLS: after this change they still see their own
-- job cards / documents / PMI + dimension reports, and get 0 rows from
-- suppliers and 0 rows from any other client's job cards.
--
-- None of these 15 tables are queried by the portal (it reads only
-- job_cards, documents, pmi/dimension/overlay reports, dispatches,
-- pwht_run_jobs and clients), so restricting them cannot break it.
--
-- `is_internal_staff()` is the existing guard used by the other staff
-- policies: true for admin/operator/engineer/qa/accounts/management,
-- false for 'customer'.

alter policy "air_test_records_select_authenticated" on public.air_test_records using (is_internal_staff());
alter policy "customer_items_select_all"            on public.customer_items            using (is_internal_staff());
alter policy "grn_select_all"                       on public.grn                       using (is_internal_staff());
alter policy "grn_items_select_all"                 on public.grn_items                 using (is_internal_staff());
alter policy "incoming_inspections_select_all"      on public.incoming_inspections      using (is_internal_staff());
alter policy "item_master_select_all"               on public.item_master               using (is_internal_staff());
alter policy "material_inward_select_all"           on public.material_inward           using (is_internal_staff());
alter policy "material_inward_items_select_all"     on public.material_inward_items     using (is_internal_staff());
alter policy "material_issue_items_select_all"      on public.material_issue_items      using (is_internal_staff());
alter policy "material_issues_select_all"           on public.material_issues           using (is_internal_staff());
alter policy "quality_inspections_select_all"       on public.quality_inspections       using (is_internal_staff());
alter policy "stock_adjustments_select_all"         on public.stock_adjustments         using (is_internal_staff());
alter policy "stock_ledger_select_all"              on public.stock_ledger              using (is_internal_staff());
alter policy "storage_locations_select_all"         on public.storage_locations         using (is_internal_staff());
alter policy "suppliers_select_all"                 on public.suppliers                 using (is_internal_staff());
