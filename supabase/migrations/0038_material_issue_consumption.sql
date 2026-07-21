-- 0038 — Material issue: recipient operator + partial-consumption return-to-stock
--
-- Point 3 (partial usage): material is deducted in full when issued (unchanged).
-- Later the operator confirms how much was actually used against the job; any
-- unused balance is returned to stock. Net effect: only the consumed quantity
-- leaves inventory.
--   e.g. issue 150 kg -> 150 leaves stock. Confirm 120 used -> 30 returns.
--
-- Point 4: capture the operator the material was issued to (free text).

-- ── new columns ──────────────────────────────────────────────
alter table public.material_issues
  add column issued_to          text,
  add column consumption_status text not null default 'pending'
    check (consumption_status in ('pending','confirmed'));

alter table public.material_issue_items
  add column consumed_qty  numeric(14,3),
  add column returned_qty  numeric(14,3) not null default 0 check (returned_qty >= 0);

-- ── grandfather existing issues as fully-consumed ────────────
-- Historical issues predate the consumption step; treat them as fully used so
-- they don't show up as "awaiting confirmation".
update public.material_issues set consumption_status = 'confirmed';
update public.material_issue_items set consumed_qty = issued_qty where consumed_qty is null;

-- consumed can't exceed what was issued
alter table public.material_issue_items
  add constraint material_issue_items_consumed_range
    check (consumed_qty is null or (consumed_qty >= 0 and consumed_qty <= issued_qty));

-- ── return-to-stock trigger ──────────────────────────────────
-- On the first consumption confirmation, if some quantity is unused, append an
-- adjustment_in ledger row for the returned amount valued at the SAME rate the
-- material left stock (the issue_out row) so stock value nets to consumed-only.
create or replace function public.after_material_issue_consumption()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_rate numeric(14,2);
begin
  if old.consumed_qty is null
     and new.consumed_qty is not null
     and new.returned_qty > 0 then

    select unit_rate into v_rate
      from public.stock_ledger
     where reference_type = 'material_issue'
       and reference_id = new.material_issue_id
       and transaction_type = 'issue_out'
       and item_id = new.item_id
       and storage_location_id = new.storage_location_id
     order by created_at asc
     limit 1;

    insert into public.stock_ledger
      (item_id, storage_location_id, transaction_type, qty, unit_rate, reference_type, reference_id, created_by)
    values
      (new.item_id, new.storage_location_id, 'adjustment_in', new.returned_qty, coalesce(v_rate, 0),
       'material_issue', new.material_issue_id,
       (select issued_by from public.material_issues where id = new.material_issue_id));
  end if;
  return new;
end; $$;

drop trigger if exists trg_after_material_issue_consumption on public.material_issue_items;
create trigger trg_after_material_issue_consumption
  after update on public.material_issue_items
  for each row execute function public.after_material_issue_consumption();

-- ── UPDATE policies (0032 only granted select/insert here) ────
create policy "material_issues_update" on public.material_issues
  for update using (current_role_name() in ('admin','operator','engineer'))
  with check (current_role_name() in ('admin','operator','engineer'));

create policy "material_issue_items_update" on public.material_issue_items
  for update using (current_role_name() in ('admin','operator','engineer'))
  with check (current_role_name() in ('admin','operator','engineer'));
