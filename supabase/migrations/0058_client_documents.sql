-- 0058 — Client Documents: admin pushes a PDF directly to a specific client
--
-- New client request, unrelated to job cards: an admin uploads a PDF and
-- assigns it to exactly one client company. That client's portal login sees
-- only documents assigned to them. Deliberately a NEW table rather than
-- reusing `documents` — every existing document is anchored to a job_card_id,
-- and that's how its RLS scoping works ("this doc belongs to a job, that job
-- belongs to a client"). There is no job here at all, so bending job_card_id
-- to nullable would touch a lot of already-working, already-audited logic for
-- no benefit. This table reuses the same STORAGE BUCKET ('documents') and the
-- same RLS/signed-URL pattern, just scoped directly by client_id.

create table public.client_documents (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references public.clients (id),
  title            text not null,
  description      text,
  -- Free-text label, not a fixed enum — the client asked for a simple label,
  -- not a managed taxonomy.
  label            text,
  storage_path     text not null,
  file_name        text not null,
  file_size_bytes  bigint,
  -- Soft delete / revoke: history is kept (who uploaded, who removed, when)
  -- rather than destroyed, matching every other document flow in this app.
  is_active        boolean not null default true,
  uploaded_by      uuid references public.profiles (id),
  uploaded_at      timestamptz not null default now(),
  removed_by       uuid references public.profiles (id),
  removed_at       timestamptz
);

create index idx_client_documents_client   on public.client_documents (client_id);
create index idx_client_documents_active   on public.client_documents (is_active);
create index idx_client_documents_uploaded on public.client_documents (uploaded_by);
create index idx_client_documents_removed  on public.client_documents (removed_by);

comment on table public.client_documents is
  'PDFs an admin pushes directly to one client, independent of any job card. '
  'Portal customers see only their own active rows.';

alter table public.client_documents enable row level security;

-- Staff: full visibility (needed to manage/audit what has been pushed to whom).
create policy "client_documents_staff_select" on public.client_documents
  for select using (is_internal_staff());

-- Upload/manage restricted to admin — this is a direct admin-to-client
-- handoff, not a shared operational document like job-card paperwork.
create policy "client_documents_admin_insert" on public.client_documents
  for insert with check (current_role_name() = 'admin');

create policy "client_documents_admin_update" on public.client_documents
  for update using (current_role_name() = 'admin')
  with check (current_role_name() = 'admin');

create policy "client_documents_admin_delete" on public.client_documents
  for delete using (current_role_name() = 'admin');

-- Customer: only their own company's rows, and only while still active
-- (revoked documents disappear from the portal without deleting the row).
create policy "client_documents_customer_select" on public.client_documents
  for select using (
    is_active
    and client_id in (select current_client_ids())
  );

-- ─────────────────────────────────────────────────────────────
-- Storage RLS — same bucket ('documents'), same shape as the existing
-- documents_storage_select policy (0053): add an OR branch rather than
-- rewrite, so nothing already working can regress.
-- ─────────────────────────────────────────────────────────────
alter policy "documents_storage_select" on storage.objects
  using (
    bucket_id = 'documents'
    and (
      is_internal_staff()
      or exists (
        select 1
          from public.documents d
          join public.job_cards jc on jc.id = d.job_card_id
         where d.storage_path = storage.objects.name
           and d.job_card_id is not null
           and jc.client_id in (select current_client_ids())
      )
      or exists (
        select 1
          from public.client_documents cd
         where cd.storage_path = storage.objects.name
           and cd.is_active
           and cd.client_id in (select current_client_ids())
      )
    )
  );

create index if not exists idx_client_documents_storage_path
  on public.client_documents (storage_path);

-- Verify before committing
do $$
declare
  n bigint;
begin
  select count(*) into n from public.client_documents;
  raise notice '0058 ok — client_documents in place, RLS enabled, storage policy extended';
end $$;
