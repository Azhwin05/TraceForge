-- 0044 — Inventory: Customer Items register
--
-- A lightweight per-customer item register, independent of item_master (the
-- stores' raw-material/consumable catalog). Each customer (the SAME `clients`
-- table used by Job Tracker — one shared company directory, not a duplicate
-- list) can have many items: their own part/valve names, specs, drawing
-- numbers, quantities, whatever's relevant to that customer.
--
-- Items can be added in a batch and any row can be left as a placeholder
-- (status = 'pending') when full details aren't ready yet — just a name is
-- enough to save it and move to the next one; it's completed later via edit.
--
-- Delete is a soft delete (Recycle Bin, mirrors 0042's job-card pattern):
-- kept 6 months, fully restorable, then auto-purged. Scoped to admin only,
-- per the client's explicit ask. Customers (clients) themselves are NOT
-- given a recycle bin here — that table is shared with Job Tracker across a
-- dozen query sites, and revisiting that is a separate, larger piece of work
-- if actually wanted; customers keep the simpler guarded hard-delete used for
-- Item Master / Suppliers / Storage Locations (blocked if referenced).

create table public.customer_items (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients (id),
  item_name       text not null,
  description     text,
  drawing_number  text,
  quantity        numeric(14,3),
  uom             text,
  remarks         text,
  status          text not null default 'pending' check (status in ('pending', 'complete')),
  created_by      uuid references public.profiles (id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  deleted_by      uuid references public.profiles (id),
  purge_at        timestamptz
);

create index idx_customer_items_client_id  on public.customer_items (client_id);
create index idx_customer_items_deleted_at on public.customer_items (deleted_at) where deleted_at is not null;

comment on column public.customer_items.status is
  'pending = placeholder, added with minimal info to fill in later. complete = fully filled in.';
comment on column public.customer_items.deleted_at is 'Set when moved to the Recycle Bin. Null = active/visible everywhere.';
comment on column public.customer_items.purge_at   is 'When the permanent hard-delete runs — deleted_at + 6 months.';

create trigger customer_items_set_updated_at
  before update on public.customer_items
  for each row execute function public.set_updated_at();

-- ── RLS — admin only for every mutation, matching the client's explicit ask ──
alter table public.customer_items enable row level security;

create policy "customer_items_select_all" on public.customer_items
  for select using (true);
create policy "customer_items_admin_insert" on public.customer_items
  for insert with check (current_role_name() = 'admin');
create policy "customer_items_admin_update" on public.customer_items
  for update using (current_role_name() = 'admin') with check (current_role_name() = 'admin');

-- ── Purge function (mirrors purge_expired_job_cards from 0042) ───────────
create or replace function public.purge_expired_customer_items()
returns table (purged_id uuid, item_name text, skipped boolean, reason text)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r record;
begin
  if auth.uid() is not null then
    if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
      raise exception 'Only an administrator can purge customer items';
    end if;
  end if;

  for r in
    select id, item_name from public.customer_items
     where deleted_at is not null and purge_at <= now()
     order by purge_at
  loop
    begin
      delete from public.customer_items where id = r.id;
      purged_id := r.id; item_name := r.item_name; skipped := false; reason := null;
      return next;
    exception when foreign_key_violation then
      purged_id := r.id; item_name := r.item_name; skipped := true; reason := SQLERRM;
      return next;
    end;
  end loop;
  return;
end; $$;

revoke all on function public.purge_expired_customer_items() from public, anon;
grant execute on function public.purge_expired_customer_items() to authenticated;

-- ── Daily schedule (best-effort — no-op if pg_cron isn't on this plan) ───
do $$
begin
  perform cron.schedule(
    'purge-expired-customer-items',
    '15 3 * * *',
    $cron$select public.purge_expired_customer_items();$cron$
  );
exception when others then
  raise notice 'pg_cron scheduling skipped (extension unavailable on this plan): %', SQLERRM;
end $$;
