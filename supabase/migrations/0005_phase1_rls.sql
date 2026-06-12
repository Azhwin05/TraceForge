-- Phase 1 — RLS, Triggers, and Storage Policies for new tables
-- ─────────────────────────────────────────────────────────────────────────────
-- Depends on: 0003_rls_policies.sql (current_role_name() function must exist)
--             0004_phase1_schema.sql (new tables must exist)
-- ─────────────────────────────────────────────────────────────────────────────


-- ═════════════════════════════════════════════════════════════════════════════
-- SECTION 1 — updated_at TRIGGERS for new tables
-- Re-uses the existing set_updated_at() function from 0002_functions_triggers.sql
-- ═════════════════════════════════════════════════════════════════════════════
create trigger trg_wps_master_updated_at
  before update on public.wps_master
  for each row execute function public.set_updated_at();

create trigger trg_consumable_master_updated_at
  before update on public.consumable_master
  for each row execute function public.set_updated_at();

create trigger trg_chemical_master_updated_at
  before update on public.chemical_master
  for each row execute function public.set_updated_at();

create trigger trg_instrument_master_updated_at
  before update on public.instrument_master
  for each row execute function public.set_updated_at();


-- ═════════════════════════════════════════════════════════════════════════════
-- SECTION 2 — GENERIC AUDIT LOG TRIGGER FOR MASTER TABLES
-- Logs INSERT / UPDATE / DELETE on master tables to the existing audit_log.
-- SECURITY DEFINER so it bypasses the audit_log RLS (same approach as 0002).
-- ═════════════════════════════════════════════════════════════════════════════
create or replace function public.log_master_data_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.audit_log
      (entity_type, entity_id, action, old_value, new_value, performed_by)
    values
      (tg_table_name, new.id, 'insert', null, to_jsonb(new), auth.uid());
    return new;
  elsif (tg_op = 'UPDATE') then
    insert into public.audit_log
      (entity_type, entity_id, action, old_value, new_value, performed_by)
    values
      (tg_table_name, new.id, 'update', to_jsonb(old), to_jsonb(new), auth.uid());
    return new;
  elsif (tg_op = 'DELETE') then
    insert into public.audit_log
      (entity_type, entity_id, action, old_value, new_value, performed_by)
    values
      (tg_table_name, old.id, 'delete', to_jsonb(old), null, auth.uid());
    return old;
  end if;
end;
$$;

-- Attach audit trigger to each new master table
create trigger trg_audit_wps_master
  after insert or update or delete on public.wps_master
  for each row execute function public.log_master_data_change();

create trigger trg_audit_consumable_master
  after insert or update or delete on public.consumable_master
  for each row execute function public.log_master_data_change();

create trigger trg_audit_chemical_master
  after insert or update or delete on public.chemical_master
  for each row execute function public.log_master_data_change();

create trigger trg_audit_instrument_master
  after insert or update or delete on public.instrument_master
  for each row execute function public.log_master_data_change();

-- documents table: audit uploads and soft-deletes
create trigger trg_audit_documents
  after insert or update or delete on public.documents
  for each row execute function public.log_master_data_change();


-- ═════════════════════════════════════════════════════════════════════════════
-- SECTION 3 — ENABLE RLS ON NEW TABLES
-- ═════════════════════════════════════════════════════════════════════════════
alter table public.wps_master         enable row level security;
alter table public.consumable_master  enable row level security;
alter table public.chemical_master    enable row level security;
alter table public.instrument_master  enable row level security;
alter table public.nde_records        enable row level security;
alter table public.documents          enable row level security;


-- ═════════════════════════════════════════════════════════════════════════════
-- SECTION 4 — RLS POLICIES — WPS MASTER
-- Read:   all authenticated users (needed by job card + dispatch views)
-- Write:  admin (full), engineer + qa (insert/update — WPS preparation/review)
-- Delete: admin only
-- ═════════════════════════════════════════════════════════════════════════════
create policy "wps_master_select_all" on public.wps_master
  for select using (true);

create policy "wps_master_admin_all" on public.wps_master
  for all
  using     (current_role_name() = 'admin')
  with check (current_role_name() = 'admin');

create policy "wps_master_engineer_insert" on public.wps_master
  for insert
  with check (current_role_name() = 'engineer');

create policy "wps_master_engineer_update" on public.wps_master
  for update
  using     (current_role_name() = 'engineer')
  with check (current_role_name() = 'engineer');

create policy "wps_master_qa_insert" on public.wps_master
  for insert
  with check (current_role_name() = 'qa');

create policy "wps_master_qa_update" on public.wps_master
  for update
  using     (current_role_name() = 'qa')
  with check (current_role_name() = 'qa');


-- ═════════════════════════════════════════════════════════════════════════════
-- SECTION 5 — RLS POLICIES — CONSUMABLE MASTER
-- Read:   all authenticated users
-- Write:  admin (full), engineer (insert/update — they use these in execution)
-- ═════════════════════════════════════════════════════════════════════════════
create policy "consumable_master_select_all" on public.consumable_master
  for select using (true);

create policy "consumable_master_admin_all" on public.consumable_master
  for all
  using     (current_role_name() = 'admin')
  with check (current_role_name() = 'admin');

create policy "consumable_master_engineer_insert" on public.consumable_master
  for insert
  with check (current_role_name() = 'engineer');

create policy "consumable_master_engineer_update" on public.consumable_master
  for update
  using     (current_role_name() = 'engineer')
  with check (current_role_name() = 'engineer');


-- ═════════════════════════════════════════════════════════════════════════════
-- SECTION 6 — RLS POLICIES — CHEMICAL MASTER
-- Read:   all authenticated users
-- Write:  admin (full), qa (insert/update — QA manages chemical records)
-- ═════════════════════════════════════════════════════════════════════════════
create policy "chemical_master_select_all" on public.chemical_master
  for select using (true);

create policy "chemical_master_admin_all" on public.chemical_master
  for all
  using     (current_role_name() = 'admin')
  with check (current_role_name() = 'admin');

create policy "chemical_master_qa_insert" on public.chemical_master
  for insert
  with check (current_role_name() = 'qa');

create policy "chemical_master_qa_update" on public.chemical_master
  for update
  using     (current_role_name() = 'qa')
  with check (current_role_name() = 'qa');


-- ═════════════════════════════════════════════════════════════════════════════
-- SECTION 7 — RLS POLICIES — INSTRUMENT MASTER
-- Read:   all authenticated users
-- Write:  admin (full), qa (insert/update — QA manages calibration records)
-- ═════════════════════════════════════════════════════════════════════════════
create policy "instrument_master_select_all" on public.instrument_master
  for select using (true);

create policy "instrument_master_admin_all" on public.instrument_master
  for all
  using     (current_role_name() = 'admin')
  with check (current_role_name() = 'admin');

create policy "instrument_master_qa_insert" on public.instrument_master
  for insert
  with check (current_role_name() = 'qa');

create policy "instrument_master_qa_update" on public.instrument_master
  for update
  using     (current_role_name() = 'qa')
  with check (current_role_name() = 'qa');


-- ═════════════════════════════════════════════════════════════════════════════
-- SECTION 8 — RLS POLICIES — NDE RECORDS
-- Read:   all authenticated users
-- Write:  admin (full), engineer + qa (insert/update)
-- Delete: admin only
-- ═════════════════════════════════════════════════════════════════════════════
create policy "nde_records_select_all" on public.nde_records
  for select using (true);

create policy "nde_records_admin_all" on public.nde_records
  for all
  using     (current_role_name() = 'admin')
  with check (current_role_name() = 'admin');

create policy "nde_records_engineer_insert" on public.nde_records
  for insert
  with check (current_role_name() = 'engineer');

create policy "nde_records_engineer_update" on public.nde_records
  for update
  using     (current_role_name() = 'engineer')
  with check (current_role_name() = 'engineer');

create policy "nde_records_qa_insert" on public.nde_records
  for insert
  with check (current_role_name() = 'qa');

create policy "nde_records_qa_update" on public.nde_records
  for update
  using     (current_role_name() = 'qa')
  with check (current_role_name() = 'qa');


-- ═════════════════════════════════════════════════════════════════════════════
-- SECTION 9 — RLS POLICIES — DOCUMENTS (CENTRAL REGISTRY)
-- Read:   all authenticated users
-- Insert: all authenticated users (server actions enforce role-specific rules)
-- Update: admin only (e.g. soft-delete, version bump)
-- Delete: admin only
-- ═════════════════════════════════════════════════════════════════════════════
create policy "documents_select_all" on public.documents
  for select using (true);

create policy "documents_admin_all" on public.documents
  for all
  using     (current_role_name() = 'admin')
  with check (current_role_name() = 'admin');

create policy "documents_authenticated_insert" on public.documents
  for insert
  with check (auth.role() = 'authenticated');


-- ═════════════════════════════════════════════════════════════════════════════
-- SECTION 10 — STORAGE RLS POLICIES (storage.objects)
-- Bucket: documents (private)
-- Read:   authenticated users only (signed URLs generated server-side)
-- Upload: authenticated users (role enforcement in server actions)
-- Delete: admin only
-- Update: admin only (rename / replace)
-- ═════════════════════════════════════════════════════════════════════════════
create policy "documents_storage_select" on storage.objects
  for select
  using (bucket_id = 'documents' and auth.role() = 'authenticated');

create policy "documents_storage_insert" on storage.objects
  for insert
  with check (bucket_id = 'documents' and auth.role() = 'authenticated');

create policy "documents_storage_update" on storage.objects
  for update
  using (bucket_id = 'documents' and current_role_name() = 'admin');

create policy "documents_storage_delete" on storage.objects
  for delete
  using (bucket_id = 'documents' and current_role_name() = 'admin');


-- ═════════════════════════════════════════════════════════════════════════════
-- SECTION 11 — CALIBRATION EXPIRY ALERT HELPER
-- Flags instruments whose calibration_due is within 30 days or overdue.
-- Used by the dashboard in Phase 3 to surface instrument expiry warnings.
-- ═════════════════════════════════════════════════════════════════════════════
create or replace function public.instruments_expiring_soon(days_ahead integer default 30)
returns setof public.instrument_master
language sql
stable
security definer
set search_path = public
as $$
  select * from public.instrument_master
  where is_active = true
    and calibration_due is not null
    and calibration_due <= (current_date + days_ahead)
  order by calibration_due asc;
$$;
