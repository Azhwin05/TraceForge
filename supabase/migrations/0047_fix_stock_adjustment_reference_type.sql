-- 0047 — Fix after_stock_adjustment_insert: wrong reference_type
--
-- stock_ledger.reference_type only allows 'grn' | 'material_issue' | 'adjustment'
-- (stock_ledger_reference_type_check, defined back in 0030/0031). The 0046
-- trigger wrote 'stock_adjustment', which isn't in that list and made every
-- single adjustment fail with a check-constraint violation. Caught by an
-- isolated fixture test against the live DB immediately after 0046 was
-- applied — no real adjustment was ever attempted with the broken version.
-- Uses the already-reserved 'adjustment' category instead.

create or replace function public.after_stock_adjustment_insert()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_balance  numeric(14,3);
  v_avg_cost numeric(14,2);
  v_rate     numeric(14,2);
begin
  select coalesce(balance_qty, 0), coalesce(avg_unit_cost, 0)
    into v_balance, v_avg_cost
    from public.stock_balances
   where item_id = new.item_id and storage_location_id = new.storage_location_id;

  if new.direction = 'out' then
    if coalesce(v_balance, 0) < new.qty then
      raise exception 'Insufficient stock to reduce: available %, requested %', coalesce(v_balance, 0), new.qty;
    end if;
    v_rate := v_avg_cost;
  else
    v_rate := coalesce(nullif(new.unit_rate, 0), v_avg_cost);
  end if;

  update public.stock_adjustments set unit_rate = v_rate where id = new.id;

  insert into public.stock_ledger (item_id, storage_location_id, transaction_type, qty, unit_rate, reference_type, reference_id, created_by)
  values (
    new.item_id, new.storage_location_id,
    case when new.direction = 'in' then 'adjustment_in' else 'adjustment_out' end,
    new.qty, v_rate, 'adjustment', new.id, new.created_by
  );

  return new;
end; $$;
