-- Phase 2 — extend documents table + add wps_qualifications.storage_path
-- SAFE: all additions are nullable / have defaults. No existing data affected.

-- Versioning and classification columns for documents table
alter table public.documents
  add column if not exists is_latest         boolean not null default true,
  add column if not exists job_card_id       uuid references public.job_cards (id) on delete set null,
  add column if not exists document_category text not null default 'uploaded'
    check (document_category in ('uploaded','generated')),
  add column if not exists document_name     text,
  add column if not exists source_module     text,
  add column if not exists metadata_json     jsonb,
  add column if not exists approval_status   text not null default 'none'
    check (approval_status in ('none','pending','approved','rejected'));

-- wps_qualifications.storage_path was missed in Phase 1
alter table public.wps_qualifications
  add column if not exists storage_path text;

-- Indexes for the new columns
create index if not exists idx_documents_latest
  on public.documents (entity_type, entity_id, document_type)
  where is_latest = true;

create index if not exists idx_documents_job_card
  on public.documents (job_card_id)
  where job_card_id is not null;

create index if not exists idx_documents_category
  on public.documents (document_category, document_type);
