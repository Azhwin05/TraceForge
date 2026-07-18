-- 0031 — Inventory module: workflow gates + automatic stock updates
--
-- Mirrors the gate pattern from 0022 (enforce_operation_sequence): DB-level
-- triggers are the source of truth, server actions mirror them for UX.

-- ─────────────────────────────────────────────────────────────
-- stock_balances — derived, read-only view (never write to this directly)
-- ─────────────────────────────────────────────────────────────
create view public.stock_balances as
select
  item_id,
  storage_location_id,
  coalesce(sum(case when transaction_type in ('grn_in','adjustment_in') then qty
                     when transaction_type in ('issue_out','adjustment_out') then -qty
                     else 0 end), 0) as balance_qty
from public.stock_ledger
group by item_id, storage_location_id;

-- ─────────────────────────────────────────────────────────────
-- incoming_inspections -> bump material_inward.status
-- ─────────────────────────────────────────────────────────────
create or replace function public.after_incoming_inspection()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update public.material_inward
     set status = 'incoming_inspection_done', updated_at = now()
   where id = new.material_inward_id
     and status = 'pending_inspection';
  return new;
end; $$;

drop trigger if exists trg_after_incoming_inspection on public.incoming_inspections;
create trigger trg_after_incoming_inspection
  after insert on public.incoming_inspections
  for each row execute function public.after_incoming_inspection();

-- ─────────────────────────────────────────────────────────────
-- quality_inspections gate:
--   * Must come after incoming inspection.
--   * When every item on the inward has been inspected, roll up the
--     material_inward status to qc_accepted (all pass) or qc_rejected
--     (any fail) — mirrors the "Accept/Reject" branch in the workflow.
-- ─────────────────────────────────────────────────────────────
create or replace function public.enforce_quality_inspection_prereq()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_status text;
begin
  select status into v_status from public.material_inward where id = new.material_inward_id;
  if v_status is null then
    raise exception 'Material inward record not found';
  end if;
  if v_status = 'pending_inspection' then
    raise exception 'Incoming inspection must be completed before quality inspection';
  end if;
  return new;
end; $$;

drop trigger if exists trg_enforce_quality_inspection_prereq on public.quality_inspections;
create trigger trg_enforce_quality_inspection_prereq
  before insert on public.quality_inspections
  for each row execute function public.enforce_quality_inspection_prereq();

create or replace function public.after_quality_inspection()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_total_items   integer;
  v_inspected     integer;
  v_any_rejected  boolean;
begin
  select count(*) into v_total_items
    from public.material_inward_items where material_inward_id = new.material_inward_id;

  select count(*) into v_inspected
    from public.quality_inspections where material_inward_id = new.material_inward_id;

  if v_inspected >= v_total_items then
    select exists(
      select 1 from public.quality_inspections
       where material_inward_id = new.material_inward_id and result = 'rejected'
    ) into v_any_rejected;

    update public.material_inward
       set status = case when v_any_rejected then 'qc_rejected' else 'qc_accepted' end,
           updated_at = now()
     where id = new.material_inward_id;
  end if;

  return new;
end; $$;

drop trigger if exists trg_after_quality_inspection on public.quality_inspections;
create trigger trg_after_quality_inspection
  after insert on public.quality_inspections
  for each row execute function public.after_quality_inspection();

-- ─────────────────────────────────────────────────────────────
-- GRN gate: can only be generated once material_inward is qc_accepted.
-- GRN line items must reference an *accepted* quality_inspection for the
-- same item, and cannot exceed its accepted_qty (checked in app layer for
-- partial-GRN scenarios; DB enforces the accepted-status prerequisite).
-- ─────────────────────────────────────────────────────────────
create or replace function public.enforce_grn_prereq()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_status text;
begin
  select status into v_status from public.material_inward where id = new.material_inward_id;
  if v_status is distinct from 'qc_accepted' then
    raise exception 'GRN can only be generated for material inward records with status qc_accepted (current: %)', v_status;
  end if;
  return new;
end; $$;

drop trigger if exists trg_enforce_grn_prereq on public.grn;
create trigger trg_enforce_grn_prereq
  before insert on public.grn
  for each row execute function public.enforce_grn_prereq();

-- ─────────────────────────────────────────────────────────────
-- GRN items -> "Move to Inventory": append grn_in rows to stock_ledger,
-- and flip material_inward to grn_generated once a GRN exists for it.
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

  insert into public.stock_ledger (item_id, storage_location_id, transaction_type, qty, reference_type, reference_id, created_by)
  values (new.item_id, new.storage_location_id, 'grn_in', new.accepted_qty, 'grn', new.grn_id,
          (select generated_by from public.grn where id = new.grn_id));

  update public.material_inward mi
     set status = 'grn_generated', updated_at = now()
    from public.grn g
   where g.id = new.grn_id
     and mi.id = g.material_inward_id;

  return new;
end; $$;

drop trigger if exists trg_after_grn_item_insert on public.grn_items;
create trigger trg_after_grn_item_insert
  after insert on public.grn_items
  for each row execute function public.after_grn_item_insert();

-- ─────────────────────────────────────────────────────────────
-- material_issue_items -> "Material Issue for Production": append
-- issue_out rows to stock_ledger, blocking the issue if it would drive
-- the balance negative (admins may still be blocked — there is no
-- legitimate reason to issue more than is in stock).
-- ─────────────────────────────────────────────────────────────
create or replace function public.after_material_issue_item_insert()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_balance numeric(14,3);
begin
  select coalesce(balance_qty, 0) into v_balance
    from public.stock_balances
   where item_id = new.item_id and storage_location_id = new.storage_location_id;

  if coalesce(v_balance, 0) < new.issued_qty then
    raise exception 'Insufficient stock: available %, requested %', coalesce(v_balance, 0), new.issued_qty;
  end if;

  insert into public.stock_ledger (item_id, storage_location_id, transaction_type, qty, reference_type, reference_id, created_by)
  values (new.item_id, new.storage_location_id, 'issue_out', new.issued_qty, 'material_issue', new.material_issue_id,
          (select issued_by from public.material_issues where id = new.material_issue_id));

  return new;
end; $$;

drop trigger if exists trg_after_material_issue_item_insert on public.material_issue_items;
create trigger trg_after_material_issue_item_insert
  after insert on public.material_issue_items
  for each row execute function public.after_material_issue_item_insert();

-- ─────────────────────────────────────────────────────────────
-- updated_at maintenance (mirrors existing job_cards pattern)
-- ─────────────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_item_master_touch on public.item_master;
create trigger trg_item_master_touch
  before update on public.item_master
  for each row execute function public.touch_updated_at();
