-- 0043 — Admin DELETE policies for Item Master, Suppliers, Storage Locations
--
-- 0032 only ever granted select/insert/update on these three tables — there
-- was never a way to delete a row at the database layer at all. Mirrors the
-- `clients_admin_delete` pattern from 0003. The app layer (actions.ts) still
-- pre-checks for real transaction history and blocks with a readable message
-- before this policy is ever exercised; these FKs have no `on delete cascade`
-- so an in-use row can't be deleted regardless.

create policy "item_master_admin_delete" on public.item_master
  for delete using (current_role_name() = 'admin');

create policy "suppliers_admin_delete" on public.suppliers
  for delete using (current_role_name() = 'admin');

create policy "storage_locations_admin_delete" on public.storage_locations
  for delete using (current_role_name() = 'admin');
