-- 0020 — Machines master (Phase 1 of the Process Flow enterprise update)
--
-- Adds a machine catalogue split into welding vs. machining machines, so each
-- process operation can be assigned to the specific machine it ran on.
-- Referenced (Phase 2) by process_executions.machine_id.
--
-- Additive only: new table + new policies + new triggers. Nothing existing is
-- altered. Matches the live master-table conventions verified against the
-- production DB (is_internal_staff SELECT, current_role_name write gates,
-- set_updated_at + log_master_data_change triggers).
--
-- Rollback:
--   drop table if exists public.machines cascade;

create table if not exists public.machines (
  id            uuid primary key default gen_random_uuid(),
  machine_code  text not null unique,                 -- e.g. WLD-01, CNC-VTL-03
  name          text not null,                        -- human name / model
  category      text not null
                  check (category in ('welding','machining')),
  location      text,                                 -- bay / shop location
  is_active     boolean not null default true,
  notes         text,
  created_by    uuid references public.profiles (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.machines is
  'Machine catalogue (welding / machining). Referenced by process_executions.machine_id.';

create index if not exists idx_machines_category_active
  on public.machines (category) where is_active;

-- updated_at maintenance (same generic trigger fn used by every table)
drop trigger if exists trg_machines_updated_at on public.machines;
create trigger trg_machines_updated_at
  before update on public.machines
  for each row execute function public.set_updated_at();

-- master-data audit trail (same fn used by the other master tables)
drop trigger if exists trg_audit_machines on public.machines;
create trigger trg_audit_machines
  after insert or update or delete on public.machines
  for each row execute function public.log_master_data_change();

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Read:  all internal staff (customers/anon excluded), matching the hardened
--        master-table SELECT policy live on consumable_master.
-- Write: admin (full); engineer (insert/update — they assign machines in exec).
alter table public.machines enable row level security;

drop policy if exists "machines_staff_select" on public.machines;
create policy "machines_staff_select" on public.machines
  for select using (is_internal_staff());

drop policy if exists "machines_admin_all" on public.machines;
create policy "machines_admin_all" on public.machines
  for all
  using     (current_role_name() = 'admin')
  with check (current_role_name() = 'admin');

drop policy if exists "machines_engineer_insert" on public.machines;
create policy "machines_engineer_insert" on public.machines
  for insert
  with check (current_role_name() = 'engineer');

drop policy if exists "machines_engineer_update" on public.machines;
create policy "machines_engineer_update" on public.machines
  for update
  using     (current_role_name() = 'engineer')
  with check (current_role_name() = 'engineer');
