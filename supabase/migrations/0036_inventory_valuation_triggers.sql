-- 0036 — Value-aware stock triggers (weighted-average costing)
--
-- Supersedes the qty-only trigger bodies from 0031:
--   * after_grn_item_insert       — now stamps the GRN unit_rate onto the
--                                    grn_in ledger row (value enters stock).
--   * after_material_issue_item_insert — now values the issue_out row at the
--                                    item's current weighted-average cost, so
--                                    issuing to a job removes both quantity
--                                    and the correct rupee value from stock.

-- ─────────────────────────────────────────────────────────────
-- GRN items -> "Move to Inventory": grn_in row carries the purchase rate.
-- ─────────────────────────────────────────────────────────────
create or replace function public.after_grn_item_insert()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_qi_item_id uuid;
  v_qi_accepted_qty numeric(14,3);
  v_already_grned numeric(14,3);
begin
  select material_inward_item_id, accepted_qty into v_qi_item_id, v_qi_accepted_qty
    from public.quality_inspections where id = new.quality_inspection_id;

  if v_qi_item_id is null then
    raise exception 'Quality inspection % not found', new.quality_inspection_id;
  end if;

  select coalesce(sum(gi.accepted_qty), 0) into v_already_grned
    from public.grn_items gi
   where gi.quality_inspection_id = new.quality_inspection_id
     and gi.id <> new.id;

  if v_already_grned + new.accepted_qty > v_qi_accepted_qty then
    raise exception 'GRN quantity (%) exceeds accepted quantity (%) for this inspection', v_already_grned + new.accepted_qty, v_qi_accepted_qty;
  end if;

  insert into public.stock_ledger (item_id, storage_location_id, transaction_type, qty, unit_rate, reference_type, reference_id, created_by)
  values (new.item_id, new.storage_location_id, 'grn_in', new.accepted_qty, coalesce(new.unit_rate, 0), 'grn', new.grn_id,
          (select generated_by from public.grn where id = new.grn_id));

  update public.material_inward mi
     set status = 'grn_generated', updated_at = now()
    from public.grn g
   where g.id = new.grn_id
     and mi.id = g.material_inward_id;

  return new;
end; $$;

-- ─────────────────────────────────────────────────────────────
-- material_issue_items -> "Material Issue for Production": issue_out row is
-- valued at the item/location weighted-average cost at the moment of issue.
-- ─────────────────────────────────────────────────────────────
create or replace function public.after_material_issue_item_insert()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_balance   numeric(14,3);
  v_avg_cost  numeric(14,2);
begin
  select coalesce(balance_qty, 0), coalesce(avg_unit_cost, 0)
    into v_balance, v_avg_cost
    from public.stock_balances
   where item_id = new.item_id and storage_location_id = new.storage_location_id;

  if coalesce(v_balance, 0) < new.issued_qty then
    raise exception 'Insufficient stock: available %, requested %', coalesce(v_balance, 0), new.issued_qty;
  end if;

  insert into public.stock_ledger (item_id, storage_location_id, transaction_type, qty, unit_rate, reference_type, reference_id, created_by)
  values (new.item_id, new.storage_location_id, 'issue_out', new.issued_qty, coalesce(v_avg_cost, 0), 'material_issue', new.material_issue_id,
          (select issued_by from public.material_issues where id = new.material_issue_id));

  return new;
end; $$;
