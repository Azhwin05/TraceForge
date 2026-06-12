-- Phase 1 — Document-Controlled ERP Foundation
-- ─────────────────────────────────────────────────────────────────────────────
-- SAFE: all existing tables / columns / constraints are untouched.
-- This file only:
--   1. Creates new master-data tables
--   2. Creates documents central registry
--   3. Creates nde_records table
--   4. ADDs nullable columns to existing tables (backward compatible)
--   5. Creates the Supabase Storage bucket
-- ─────────────────────────────────────────────────────────────────────────────


-- ═════════════════════════════════════════════════════════════════════════════
-- SECTION 1 — WPS MASTER
-- Standalone master record for a Welding Procedure Specification.
-- One WPS is created once and can be linked to many job-card WPS qualifications.
-- Existing wps_qualifications.wps_number (free text) stays untouched.
-- ═════════════════════════════════════════════════════════════════════════════
create table public.wps_master (
  id                      uuid primary key default gen_random_uuid(),
  wps_no                  text not null unique,          -- e.g. WPS/RE/703
  pqr_no                  text,                          -- e.g. PQR/RE/703
  welding_process         text,                          -- SAW, GTAW, SMAW, FCAW …
  type                    text,                          -- Manual / Semi-auto / Auto
  scope                   text,
  joint_design            text,                          -- BW, FW …
  base_material           text,
  filler_material         text,
  filler_aws_class        text,                          -- ER430, E309L-16 …
  filler_size             text,
  position                text,                          -- 1G, 2G, 3G …
  preheat_min             numeric(6,1),                  -- °C
  interpass_max           numeric(6,1),                  -- °C
  pwht_required           boolean not null default false,
  pwht_temp_min           numeric(6,1),                  -- °C
  pwht_temp_max           numeric(6,1),                  -- °C
  pwht_time_range         text,                          -- "30–60 min"
  gas_json                jsonb,                         -- {shielding: "Ar", backing: "N2"}
  electrical_params_json  jsonb,                         -- {polarity: "DCSP", current_range: "200–250A"}
  technique_json          jsonb,                         -- {string_bead: true, oscillation: false}
  approved_by             text,
  reviewed_by             text,
  revision                text not null default 'Rev 0',
  effective_date          date,
  status                  text not null default 'draft'
                            check (status in ('draft','approved','superseded')),
  notes                   text,
  created_by              uuid references public.profiles (id),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

comment on table public.wps_master is
  'Reusable Welding Procedure Specification master. Referenced by wps_qualifications via wps_master_id.';


-- ═════════════════════════════════════════════════════════════════════════════
-- SECTION 2 — CONSUMABLE MASTER
-- Welding consumables catalogue (electrodes, wires, flux, rods).
-- Process executions can reference a consumable via consumable_master_id.
-- ═════════════════════════════════════════════════════════════════════════════
create table public.consumable_master (
  id              uuid primary key default gen_random_uuid(),
  brand           text not null,
  product_name    text not null,
  aws_class       text,                    -- ER430, E309L …
  size            text,                    -- 3.15 mm, 2.4 mm …
  type            text not null
                    check (type in ('electrode','wire','flux','rod','other')),
  manufacturer    text,
  notes           text,
  is_active       boolean not null default true,
  created_by      uuid references public.profiles (id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.consumable_master is
  'Welding consumables catalogue. Referenced by process_executions.consumable_master_id.';


-- ═════════════════════════════════════════════════════════════════════════════
-- SECTION 3 — CHEMICAL MASTER
-- NDE / LPT chemicals (penetrants, developers, cleaners, removers).
-- Referenced by nde_records.
-- ═════════════════════════════════════════════════════════════════════════════
create table public.chemical_master (
  id              uuid primary key default gen_random_uuid(),
  chemical_name   text not null,
  manufacturer    text,
  type            text not null
                    check (type in ('penetrant','developer','cleaner','remover','other')),
  notes           text,
  is_active       boolean not null default true,
  created_by      uuid references public.profiles (id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.chemical_master is
  'NDE / LPT chemicals catalogue. Referenced by nde_records.';


-- ═════════════════════════════════════════════════════════════════════════════
-- SECTION 4 — INSTRUMENT MASTER
-- Inspection instruments (PMI, dimensional, hardness, NDE …).
-- Referenced by pmi_reports and dimension_reports.
-- ═════════════════════════════════════════════════════════════════════════════
create table public.instrument_master (
  id                        uuid primary key default gen_random_uuid(),
  instrument_name           text not null,
  instrument_type           text not null
                              check (instrument_type in
                                     ('pmi','dimensional','visual','hardness','nde','other')),
  serial_number             text,
  manufacturer              text,
  calibration_due           date,
  -- doc_url kept for Phase 1 backward compatibility (paste a URL);
  -- storage_path used once file upload is wired (Phase 2).
  calibration_cert_url      text,
  calibration_storage_path  text,
  is_active                 boolean not null default true,
  created_by                uuid references public.profiles (id),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

comment on table public.instrument_master is
  'Inspection instruments master. Referenced by pmi_reports and dimension_reports.';


-- ═════════════════════════════════════════════════════════════════════════════
-- SECTION 5 — NDE / LPT RECORDS
-- Non-Destructive Examination records per job card.
-- Required for the Overlay Welding Report customer submission document.
-- ═════════════════════════════════════════════════════════════════════════════
create table public.nde_records (
  id                      uuid primary key default gen_random_uuid(),
  job_card_id             uuid not null references public.job_cards (id) on delete cascade,
  nde_type                text not null
                            check (nde_type in ('lpt','mpi','rt','ut','vt','other')),
  procedure_ref           text,
  -- LPT / DP Test specifics (nullable — not all NDE types need these)
  type_of_penetrant       text,
  stage_of_test           text,              -- pre-cleaning, post-cleaning …
  penetrant_application   text,              -- spray / brush / immersion
  penetrant_removal       text,
  penetrant_dwell_time    numeric(6,1),      -- minutes
  developer_application   text,
  developer_dwell_time    numeric(6,1),      -- minutes
  post_cleaning           text,
  surface_condition       text,
  temperature_of_part     numeric(6,1),      -- °C
  evaluation              text,              -- free-text evaluation notes
  result                  text not null default 'pending'
                            check (result in ('pending','accepted','rejected')),
  -- Chemicals used (up to 3; Phase 2 will move these to a junction table if needed)
  chemical_1_id           uuid references public.chemical_master (id),
  chemical_2_id           uuid references public.chemical_master (id),
  chemical_3_id           uuid references public.chemical_master (id),
  report_number           text,
  inspected_by            text,
  inspection_date         date,
  notes                   text,
  created_by              uuid references public.profiles (id),
  created_at              timestamptz not null default now()
);

comment on table public.nde_records is
  'NDE / LPT inspection records per job card. Feeds into the Overlay Welding Report PDF.';


-- ═════════════════════════════════════════════════════════════════════════════
-- SECTION 6 — DOCUMENTS (CENTRAL REGISTRY)
-- Every file uploaded to Supabase Storage is registered here.
-- Existing doc_url columns stay; storage_path is the new authoritative path.
-- ═════════════════════════════════════════════════════════════════════════════
create table public.documents (
  id              uuid primary key default gen_random_uuid(),
  -- Which record does this document belong to?
  entity_type     text not null
                    check (entity_type in (
                      'job_card','wps_master','wps_qualification',
                      'pmi_report','dimension_report','pwht_run',
                      'dispatch','instrument_master','nde_record','other'
                    )),
  entity_id       uuid not null,
  -- What kind of document is it?
  document_type   text not null
                    check (document_type in (
                      'wps_pdf','pqr_pdf','pmi_report','dimension_report',
                      'pwht_chart','dispatch_doc','invoice','calibration_cert',
                      'customer_po','customer_drawing','job_card_pdf',
                      'overlay_welding_report','annotated_drawing','other'
                    )),
  -- Supabase Storage path: {entity_type}/{entity_id}/{document_type}/{file_name}
  storage_path    text not null,
  file_name       text not null,
  file_size       integer,                       -- bytes
  mime_type       text,
  version         integer not null default 1,    -- incremented on re-upload
  is_active       boolean not null default true, -- soft-delete support
  notes           text,
  uploaded_by     uuid references public.profiles (id),
  uploaded_at     timestamptz not null default now()
);

comment on table public.documents is
  'Central registry for every file stored in Supabase Storage. Query this instead of storage.objects.';


-- ═════════════════════════════════════════════════════════════════════════════
-- SECTION 7 — COLUMN ADDITIONS TO EXISTING TABLES
-- All new columns are nullable with no defaults (backward compatible).
-- Existing rows are unaffected.
-- ═════════════════════════════════════════════════════════════════════════════

-- ── wps_qualifications ────────────────────────────────────────────────────
-- Optional link to a WPS Master entry. Null = the record predates WPS Master.
alter table public.wps_qualifications
  add column if not exists wps_master_id uuid
    references public.wps_master (id) on delete set null;

-- ── pmi_reports ────────────────────────────────────────────────────────────
-- instrument_master_id: replaces free-text instrument_name going forward.
-- storage_path: Supabase Storage path (doc_url kept for old records).
alter table public.pmi_reports
  add column if not exists instrument_master_id uuid
    references public.instrument_master (id) on delete set null,
  add column if not exists storage_path text;

-- ── dimension_reports ──────────────────────────────────────────────────────
alter table public.dimension_reports
  add column if not exists instrument_master_id uuid
    references public.instrument_master (id) on delete set null,
  add column if not exists storage_path text;

-- ── pwht_runs ─────────────────────────────────────────────────────────────
-- Missing fields identified in Phase 0 for customer submission documents.
alter table public.pwht_runs
  add column if not exists unloading_temp   numeric(10,2),   -- °C
  add column if not exists cooling_method   text
    check (cooling_method in ('air','furnace','controlled')),
  add column if not exists pwht_result      text
    check (pwht_result in ('pass','fail')),
  add column if not exists storage_path     text;

-- ── process_executions ────────────────────────────────────────────────────
-- consumable_master_id: structured reference replaces free-text consumable_batch.
-- consumable_batch is kept — it stores the specific batch number used,
--   while consumable_master_id stores the product reference.
-- post_heat_temp, consumable_feed_rate, weld_date: missing from the client traveller.
alter table public.process_executions
  add column if not exists consumable_master_id uuid
    references public.consumable_master (id) on delete set null,
  add column if not exists weld_date            date,
  add column if not exists post_heat_temp       numeric(10,2),   -- °C
  add column if not exists consumable_feed_rate numeric(10,2);   -- kg/hr or g/min

-- ── dispatches ────────────────────────────────────────────────────────────
alter table public.dispatches
  add column if not exists storage_path text;


-- ═════════════════════════════════════════════════════════════════════════════
-- SECTION 8 — INDEXES
-- ═════════════════════════════════════════════════════════════════════════════

-- documents — the two most common lookup patterns
create index idx_documents_entity   on public.documents (entity_type, entity_id);
create index idx_documents_type     on public.documents (document_type);
create index idx_documents_active   on public.documents (entity_type, entity_id)
  where is_active = true;

-- wps_master
create index idx_wps_master_status  on public.wps_master (status);
create index idx_wps_master_no      on public.wps_master (wps_no);

-- consumable_master
create index idx_consumable_active  on public.consumable_master (type, is_active);

-- instrument_master
create index idx_instrument_type    on public.instrument_master (instrument_type, is_active);
create index idx_instrument_cal_due on public.instrument_master (calibration_due)
  where is_active = true;

-- nde_records
create index idx_nde_job_card       on public.nde_records (job_card_id);
create index idx_nde_type           on public.nde_records (nde_type);

-- new FK columns on existing tables
create index idx_wps_qual_master    on public.wps_qualifications (wps_master_id)
  where wps_master_id is not null;
create index idx_pe_consumable      on public.process_executions (consumable_master_id)
  where consumable_master_id is not null;
create index idx_pmi_instrument     on public.pmi_reports (instrument_master_id)
  where instrument_master_id is not null;
create index idx_dim_instrument     on public.dimension_reports (instrument_master_id)
  where instrument_master_id is not null;


-- ═════════════════════════════════════════════════════════════════════════════
-- SECTION 9 — SUPABASE STORAGE BUCKET
-- Private bucket; 50 MB file limit; PDF and common image types only.
-- RLS on storage.objects is defined in 0005_phase1_rls.sql.
-- ═════════════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,         -- private: never serve files without a signed URL
  52428800,      -- 50 MB per file
  array[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;
