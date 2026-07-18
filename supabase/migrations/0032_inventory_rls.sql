-- 0032 — Inventory module: Row Level Security
-- Convention (mirrors 0003): current_role_name() helper, select-all for
-- authenticated staff, write access scoped by role.
--   * admin: full access everywhere.
--   * operator / engineer: create/update material_inward, incoming
--     inspections, GRN, material issues (stores-floor operations).
--   * qa: create/update quality_inspections.
--   * item/supplier/location masters: admin + engineer maintain them.
--   * stock_ledger: no direct client writes — only the SECURITY DEFINER
--     triggers (owned by the table owner) can insert, same lockdown as
--     audit_log in 0003.

alter table public.item_master           enable row level security;
alter table public.suppliers             enable row level security;
alter table public.storage_locations     enable row level security;
alter table public.material_inward       enable row level security;
alter table public.material_inward_items enable row level security;
alter table public.incoming_inspections  enable row level security;
alter table public.quality_inspections   enable row level security;
alter table public.grn                   enable row level security;
alter table public.grn_items             enable row level security;
alter table public.material_issues       enable row level security;
alter table public.material_issue_items  enable row level security;
alter table public.stock_ledger          enable row level security;

-- ── item_master ──────────────────────────────────────────────
create policy "item_master_select_all" on public.item_master
  for select using (true);
create policy "item_master_write" on public.item_master
  for insert with check (current_role_name() in ('admin','engineer'));
create policy "item_master_update" on public.item_master
  for update using (current_role_name() in ('admin','engineer'))
  with check (current_role_name() in ('admin','engineer'));

-- ── suppliers ─────────────────────────────────────────────────
create policy "suppliers_select_all" on public.suppliers
  for select using (true);
create policy "suppliers_write" on public.suppliers
  for insert with check (current_role_name() in ('admin','engineer'));
create policy "suppliers_update" on public.suppliers
  for update using (current_role_name() in ('admin','engineer'))
  with check (current_role_name() in ('admin','engineer'));

-- ── storage_locations ────────────────────────────────────────
create policy "storage_locations_select_all" on public.storage_locations
  for select using (true);
create policy "storage_locations_write" on public.storage_locations
  for insert with check (current_role_name() in ('admin','engineer'));
create policy "storage_locations_update" on public.storage_locations
  for update using (current_role_name() in ('admin','engineer'))
  with check (current_role_name() in ('admin','engineer'));

-- ── material_inward / items ──────────────────────────────────
create policy "material_inward_select_all" on public.material_inward
  for select using (true);
create policy "material_inward_insert" on public.material_inward
  for insert with check (current_role_name() in ('admin','operator','engineer'));
create policy "material_inward_update" on public.material_inward
  for update using (current_role_name() in ('admin','operator','engineer'))
  with check (current_role_name() in ('admin','operator','engineer'));

create policy "material_inward_items_select_all" on public.material_inward_items
  for select using (true);
create policy "material_inward_items_insert" on public.material_inward_items
  for insert with check (current_role_name() in ('admin','operator','engineer'));

-- ── incoming_inspections ─────────────────────────────────────
create policy "incoming_inspections_select_all" on public.incoming_inspections
  for select using (true);
create policy "incoming_inspections_insert" on public.incoming_inspections
  for insert with check (current_role_name() in ('admin','operator','engineer','qa'));

-- ── quality_inspections ──────────────────────────────────────
create policy "quality_inspections_select_all" on public.quality_inspections
  for select using (true);
create policy "quality_inspections_insert" on public.quality_inspections
  for insert with check (current_role_name() in ('admin','qa'));

-- ── grn / grn_items ───────────────────────────────────────────
create policy "grn_select_all" on public.grn
  for select using (true);
create policy "grn_insert" on public.grn
  for insert with check (current_role_name() in ('admin','engineer'));

create policy "grn_items_select_all" on public.grn_items
  for select using (true);
create policy "grn_items_insert" on public.grn_items
  for insert with check (current_role_name() in ('admin','engineer'));

-- ── material_issues / items ──────────────────────────────────
create policy "material_issues_select_all" on public.material_issues
  for select using (true);
create policy "material_issues_insert" on public.material_issues
  for insert with check (current_role_name() in ('admin','operator','engineer'));

create policy "material_issue_items_select_all" on public.material_issue_items
  for select using (true);
create policy "material_issue_items_insert" on public.material_issue_items
  for insert with check (current_role_name() in ('admin','operator','engineer'));

-- ── stock_ledger ──────────────────────────────────────────────
-- Read-only for everyone; only the SECURITY DEFINER triggers write here.
create policy "stock_ledger_select_all" on public.stock_ledger
  for select using (true);
