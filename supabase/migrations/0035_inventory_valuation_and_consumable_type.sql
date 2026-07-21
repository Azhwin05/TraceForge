-- 0035 — Inventory valuation (₹ value through the ledger) + consumable classification
--
-- Adds monetary value to the inventory system so the dashboard can show
-- "wire 75 kg — worth ₹1,00,000", and so issuing material to a job removes
-- both quantity AND value from stock.
--
-- Valuation method: WEIGHTED AVERAGE COST.
--   * Purchase rate is captured at GRN (grn_items.unit_rate, now required).
--   * Every stock_ledger row carries the unit_rate for that movement.
--   * grn_in rows use the GRN rate; issue_out rows use the item's current
--     weighted-average cost at the moment of issue (computed by the trigger
--     in 0036) so the remaining average is left unchanged.
--   * stock_balances therefore derives balance_value and avg_unit_cost
--     directly from the append-only ledger — never stored, never drifts.
--
-- Consumable classification: raw materials are consumed using powder / rod /
-- wire / other consumables. Each consumable item is tagged with its type.

-- ─────────────────────────────────────────────────────────────
-- 1. Consumable classification on item_master
-- ─────────────────────────────────────────────────────────────
alter table public.item_master
  add column consumable_type text
    check (consumable_type is null or consumable_type in ('powder','rod','wire','other'));

comment on column public.item_master.consumable_type is
  'For category=consumable items only: powder | rod | wire | other. Null for non-consumables.';

-- ─────────────────────────────────────────────────────────────
-- 2. Per-movement value on the stock ledger
-- ─────────────────────────────────────────────────────────────
alter table public.stock_ledger
  add column unit_rate numeric(14,2) not null default 0 check (unit_rate >= 0);

comment on column public.stock_ledger.unit_rate is
  '₹ per unit for this movement. grn_in = GRN rate; issue_out = weighted-average cost at issue time.';

-- ─────────────────────────────────────────────────────────────
-- 3. Purchase rate is now mandatory at GRN
-- ─────────────────────────────────────────────────────────────
update public.grn_items set unit_rate = 0 where unit_rate is null;
alter table public.grn_items
  alter column unit_rate set default 0,
  alter column unit_rate set not null;
alter table public.grn_items
  add constraint grn_items_unit_rate_nonneg check (unit_rate >= 0);

-- ─────────────────────────────────────────────────────────────
-- 4. stock_balances — now derives value + weighted-average cost
-- ─────────────────────────────────────────────────────────────
drop view if exists public.stock_balances;
create view public.stock_balances as
select
  item_id,
  storage_location_id,
  balance_qty,
  balance_value,
  case when balance_qty > 0 then round(balance_value / balance_qty, 2) else 0 end as avg_unit_cost
from (
  select
    item_id,
    storage_location_id,
    coalesce(sum(case when transaction_type in ('grn_in','adjustment_in')  then qty
                      when transaction_type in ('issue_out','adjustment_out') then -qty
                      else 0 end), 0) as balance_qty,
    coalesce(sum(case when transaction_type in ('grn_in','adjustment_in')  then qty * unit_rate
                      when transaction_type in ('issue_out','adjustment_out') then -qty * unit_rate
                      else 0 end), 0) as balance_value
  from public.stock_ledger
  group by item_id, storage_location_id
) t;

-- Views default to definer semantics; keep the querying user's RLS in force
-- (mirrors 0033) and re-grant read access dropped by the view recreation.
alter view public.stock_balances set (security_invoker = true);
grant select on public.stock_balances to authenticated;
