-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 10 — Customer Submission Dossier
-- New tables: customer_dossiers, customer_dossier_documents
-- Also extends documents table CHECK constraints for overlay + dossier types
-- (Phase 8 added overlay_report writes but never updated the constraint)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Extend documents.entity_type CHECK ───────────────────────────────────────
-- Drop old constraint (auto-named by Postgres) and replace with extended list

DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.documents'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%entity_type%';
  IF cname IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.documents DROP CONSTRAINT ' || quote_ident(cname);
  END IF;
END $$;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_entity_type_check
  CHECK (entity_type IN (
    'job_card','wps_master','wps_qualification',
    'pmi_report','dimension_report','pwht_run',
    'dispatch','instrument_master','nde_record','other',
    'overlay_report','dossier'
  ));

-- ── Extend documents.document_type CHECK ─────────────────────────────────────

DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.documents'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%document_type%';
  IF cname IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.documents DROP CONSTRAINT ' || quote_ident(cname);
  END IF;
END $$;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_document_type_check
  CHECK (document_type IN (
    'wps_pdf','pqr_pdf','pmi_report','dimension_report',
    'pwht_chart','dispatch_doc','invoice','calibration_cert',
    'customer_po','customer_drawing','job_card_pdf',
    'overlay_welding_report','annotated_drawing','other',
    'dossier_index','dossier_zip'
  ));

-- ── customer_dossiers ─────────────────────────────────────────────────────────

create table public.customer_dossiers (
  id              uuid primary key default gen_random_uuid(),
  job_card_id     uuid not null references public.job_cards (id) on delete restrict,

  dossier_number  text not null,
  dossier_date    date not null,

  -- Customer / job context (auto-filled from job card on creation)
  customer_name   text,
  po_number       text,
  nbdn_number     text,
  drawing_number  text,
  heat_number     text,

  -- Sign-off
  prepared_by     text,
  approved_by     text,
  remarks         text,

  -- Lifecycle
  status          text not null default 'draft'
    check (status in ('draft','generated','submitted','archived')),
  generated_index_pdf_path  text,
  generated_zip_path        text,
  submitted_to_customer     boolean not null default false,
  submitted_at              timestamptz,
  submitted_by              text,

  -- Audit
  created_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── customer_dossier_documents ────────────────────────────────────────────────

create table public.customer_dossier_documents (
  id           uuid primary key default gen_random_uuid(),
  dossier_id   uuid not null references public.customer_dossiers (id) on delete cascade,
  document_id  uuid not null references public.documents (id) on delete restrict,
  document_type text,
  document_name text,
  version       integer,
  sort_order    integer not null default 0,
  included      boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (dossier_id, document_id)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

create index idx_dossier_job_card on public.customer_dossiers (job_card_id);
create index idx_dossier_status   on public.customer_dossiers (status);
create index idx_dossier_doc_dossier on public.customer_dossier_documents (dossier_id);

-- ── updated_at trigger ────────────────────────────────────────────────────────

create trigger dossier_set_updated_at
  before update on public.customer_dossiers
  for each row execute function public.set_updated_at();

-- ── RLS — customer_dossiers ───────────────────────────────────────────────────

alter table public.customer_dossiers enable row level security;

-- Admin: full access (covers select/insert/update/delete)
create policy "dossiers_admin_all" on public.customer_dossiers
  for all
  using (current_role_name() = 'admin')
  with check (current_role_name() = 'admin');

-- QA: select all, insert, update non-submitted
create policy "dossiers_qa_select" on public.customer_dossiers
  for select
  using (current_role_name() = 'qa');

create policy "dossiers_qa_insert" on public.customer_dossiers
  for insert
  with check (current_role_name() = 'qa');

create policy "dossiers_qa_update" on public.customer_dossiers
  for update
  using (current_role_name() = 'qa' and status <> 'submitted')
  with check (current_role_name() = 'qa');

-- Everyone else: read-only (excludes archived by convention on query side)
create policy "dossiers_others_select" on public.customer_dossiers
  for select
  using (current_role_name() not in ('admin','qa'));

-- ── RLS — customer_dossier_documents ─────────────────────────────────────────

alter table public.customer_dossier_documents enable row level security;

create policy "dossier_docs_admin_all" on public.customer_dossier_documents
  for all
  using (current_role_name() = 'admin')
  with check (current_role_name() = 'admin');

create policy "dossier_docs_qa_select" on public.customer_dossier_documents
  for select
  using (current_role_name() = 'qa');

create policy "dossier_docs_qa_insert" on public.customer_dossier_documents
  for insert
  with check (current_role_name() = 'qa');

create policy "dossier_docs_qa_delete" on public.customer_dossier_documents
  for delete
  using (current_role_name() = 'qa');

create policy "dossier_docs_others_select" on public.customer_dossier_documents
  for select
  using (current_role_name() not in ('admin','qa'));
