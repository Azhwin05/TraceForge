-- 0048 — Let operators create Customer Items, not just admins
--
-- The app layer (createCustomerItems in customers/actions.ts) was opened up to
-- admin + operator so day-to-day data entry doesn't require an admin, mirroring
-- the existing `clients_operator_insert` policy on the `clients` table (operators
-- could already create Customers). This migration adds the matching INSERT
-- policy on `customer_items` — without it, the RLS policy from 0044
-- (admin-only insert) silently rejects every operator submission even though
-- the app-layer guard now allows it.
--
-- Edit/delete/recycle-bin remain admin-only — only CREATE is being opened up.

create policy "customer_items_operator_insert" on public.customer_items
  for insert with check (current_role_name() = 'operator');
