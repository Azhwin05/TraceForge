-- 0046 — Admin delete for Material Inward + manual Stock Adjustments
--
-- Part 1: Material Inward never had a DELETE policy at all (0032 only ever
-- granted select/insert/update). Adding it here; the app layer additionally
-- pre-checks and blocks with a readable reason if a GRN was already
-- generated (that FK is `on delete no action`, so an in-use inward can't
-- actually be deleted regardless — this just explains why up front).
create policy "material_inward_admin_delete" on public.material_inward
  for delete using (current_role_name() = 'admin');

-- Part 2: Manual Stock Adjustments — "Edit/Delete" for Stock Balances.
-- Stock Balances is a calculated view (summed from stock_ledger), so there's
-- no row to literally edit. Instead: admin can post a correction — increase
-- (found extra stock) or decrease (damaged/lost/count correction) — with a
-- reason, exactly like a receipt or issue changes the balance. Append-only,
-- same as everything else touching stock_ledger; nothing is ever mutated.

create table public.stock_adjustments (
  id                   uuid primary key default gen_random_uuid(),
  item_id              uuid not null references public.item_master (id),
  storage_location_id  uuid not null references public.storage_locations (id),
  direction            text not null check (direction in ('in', 'out')),
  qty                  numeric(14,3) not null check (qty > 0),
  unit_rate            numeric(14,2) not null default 0,
  reason               text not null,
  created_by           uuid references public.profiles (id),
  created_at           timestamptz not null default now()
);

create index idx_stock_adjustments_item_location on public.stock_adjustments (item_id, storage_location_id);

comment on table public.stock_adjustments is
  'Manual admin corrections to stock (found/damaged/count fix). Each row auto-appends the matching adjustment_in/adjustment_out entry to stock_ledger via trigger.';
comment on column public.stock_adjustments.unit_rate is
  'For "in": the rate given (or defaulted to current weighted-average by the trigger if not supplied). For "out": always overwritten with the current weighted-average, same principle as a material issue.';

alter table public.stock_adjustments enable row level security;

create policy "stock_adjustments_select_all" on public.stock_adjustments
  for select using (true);
create policy "stock_adjustments_admin_insert" on public.stock_adjustments
  for insert with check (current_role_name() = 'admin');

-- ── Trigger: validate + append to stock_ledger ───────────────────────────
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
    v_rate := v_avg_cost; -- a decrease is always valued at the current weighted average
  else
    v_rate := coalesce(nullif(new.unit_rate, 0), v_avg_cost);
  end if;

  -- Record the rate actually applied (in case it was defaulted) for an honest audit trail.
  update public.stock_adjustments set unit_rate = v_rate where id = new.id;

  insert into public.stock_ledger (item_id, storage_location_id, transaction_type, qty, unit_rate, reference_type, reference_id, created_by)
  values (
    new.item_id, new.storage_location_id,
    case when new.direction = 'in' then 'adjustment_in' else 'adjustment_out' end,
    new.qty, v_rate, 'adjustment', new.id, new.created_by
  );

  return new;
end; $$;

revoke all on function public.after_stock_adjustment_insert() from public, anon, authenticated;

drop trigger if exists trg_after_stock_adjustment_insert on public.stock_adjustments;
create trigger trg_after_stock_adjustment_insert
  after insert on public.stock_adjustments
  for each row execute function public.after_stock_adjustment_insert();
