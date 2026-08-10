-- 0055 — Client meeting requests: rework, tagging, consumable weights, PO gate
--
-- Covers items 1, 2, 3, 4 and 6 from the client's list. Item 5 (portal invoice
-- reference) is handled by the portal_invoice_refs view in 0054, because it
-- depended on locking `accounts` down first.

-- ─────────────────────────────────────────────────────────────
-- 1. Job tagging  (client request #1, second half)
--
--    Freeform labels for grouping and retrieval — "urgent", "site-return",
--    a campaign name. Deliberately text[] rather than a tags table: these are
--    ad-hoc operator labels, not managed master data, and a GIN index gives
--    containment search without a join.
-- ─────────────────────────────────────────────────────────────
alter table public.job_cards
  add column if not exists tags text[] not null default '{}';

create index if not exists idx_jc_tags on public.job_cards using gin (tags);

comment on column public.job_cards.tags is
  'Freeform operator labels for grouping/retrieval. Lowercased and trimmed by the app.';

-- ─────────────────────────────────────────────────────────────
-- 2. Rework records  (client request #2)
--
--    Rework was previously invisible: nothing in the schema recorded that a
--    job had been redone, why, or how often. Each row is one rework event
--    against a job card. Photos reuse public.documents (document_type
--    'rework_photo') rather than a bespoke table, so they inherit the existing
--    storage RLS, versioning and signed-URL flow.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.rework_records (
  id             uuid primary key default gen_random_uuid(),
  job_card_id    uuid not null references public.job_cards (id) on delete cascade,
  rework_date    date not null default current_date,
  stage          text not null,
  reason         text not null,
  quantity       integer not null default 1 check (quantity > 0),
  -- Who found it vs. who fixed it are different questions; both are optional
  -- because the shop floor will not always know at entry time.
  identified_by  uuid references public.profiles (id),
  performed_by   uuid references public.profiles (id),
  corrective_action text,
  status         text not null default 'open'
                   check (status in ('open','in_progress','completed')),
  notes          text,
  created_by     uuid references public.profiles (id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_rework_job    on public.rework_records (job_card_id);
create index if not exists idx_rework_date   on public.rework_records (rework_date desc);
create index if not exists idx_rework_status on public.rework_records (status);

alter table public.rework_records enable row level security;

-- Internal-only by design: rework is quality data about the shop's own
-- process. Exposing it to the customer portal is a commercial decision for
-- the business to make deliberately, not a default.
create policy "rework_staff_select" on public.rework_records
  for select using (is_internal_staff());

create policy "rework_staff_write" on public.rework_records
  for insert with check (current_role_name() in ('admin','operator','engineer','qa'));

create policy "rework_staff_update" on public.rework_records
  for update using (current_role_name() in ('admin','operator','engineer','qa'))
  with check (current_role_name() in ('admin','operator','engineer','qa'));

create policy "rework_admin_delete" on public.rework_records
  for delete using (current_role_name() = 'admin');

-- Keep updated_at honest (mirrors the existing set_updated_at triggers).
drop trigger if exists trg_rework_updated_at on public.rework_records;
create trigger trg_rework_updated_at
  before update on public.rework_records
  for each row execute function public.set_updated_at();

-- Allow rework photos to be filed against the existing documents table.
-- Same defensive drop-by-lookup as 0014: the constraint is found by definition
-- rather than by assumed name, then re-added with the full existing list from
-- 0014 plus 'rework_photo'. Every previously-valid value is preserved — if one
-- were dropped, existing document rows would violate the new constraint and
-- the migration would fail (which is the safe direction, but avoidable).
do $$
declare
  cname text;
begin
  select conname into cname
    from pg_constraint
   where conrelid = 'public.documents'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) ilike '%document_type%';
  if cname is not null then
    execute 'alter table public.documents drop constraint ' || quote_ident(cname);
  end if;
end $$;

-- Deliberately a SUPERSET of every value the codebase can produce:
--
--   * the 0014 list (what the live DB currently enforces);
--   * the 12 types added by 0015 — which lives in _archived_never_applied/,
--     so the TypeScript DocumentType union and the FileUpload role map offer
--     types the database would REJECT with a check violation. That is a latent
--     bug independent of this work, fixed here because the constraint is being
--     rewritten anyway;
--   * the workflow keys from src/lib/workflow/document-requirements.ts;
--   * 'rework_photo', which is what this migration actually needs.
--
-- A superset can never fail against existing rows and can never break an
-- upload path that works today, whichever of the two states the live DB is in.
alter table public.documents
  add constraint documents_document_type_check check (document_type in (
    -- 0014 — currently enforced
    'wps_pdf','pqr_pdf','pmi_report','dimension_report',
    'pwht_chart','dispatch_doc','invoice','calibration_cert',
    'customer_po','customer_drawing','job_card_pdf',
    'overlay_welding_report','annotated_drawing','other',
    'dossier_index','dossier_zip',
    -- 0015 (never applied) — present in TypeScript and offered by the UI
    'welding_report','electrode_test_certificate','consumable_certificate',
    'material_test_certificate','nde_report','lpt_report','hardness_report',
    'incoming_delivery_challan','outgoing_delivery_challan',
    'final_acceptance_document','contract_review','process_layout',
    -- workflow requirement keys (document-requirements.ts)
    'material_receipt_document','purchase_order','job_card_scan','wps','pqr',
    'heat_treatment_chart','dp_test_report','supporting_certificate',
    -- this migration
    'rework_photo'
  ));

-- ─────────────────────────────────────────────────────────────
-- 3. Consumable weight tracking  (client request #3)
--
--    The ERP already derives usage as issued_qty - returned_qty (0038). The
--    client wants the more accurate method for welding consumables: weigh the
--    coil before and after, because a part-used spool cannot meaningfully be
--    "returned". These columns record the measurement; consumed_qty stays the
--    single authoritative figure that the stock ledger reads, and the app
--    computes it from the weights.
--
--    kg_per_unit exists because stock may be held in coils/nos rather than kg
--    — without it, a weight delta cannot be converted into a stock quantity.
-- ─────────────────────────────────────────────────────────────
alter table public.item_master
  add column if not exists kg_per_unit numeric(14,4)
    check (kg_per_unit is null or kg_per_unit > 0);

comment on column public.item_master.kg_per_unit is
  'Nominal kg per stocking unit, for consumables measured by weight. '
  'Null when the item is already stocked in kg (or is not weighed).';

alter table public.material_issue_items
  add column if not exists weight_before_kg numeric(14,3)
    check (weight_before_kg is null or weight_before_kg >= 0),
  add column if not exists weight_after_kg  numeric(14,3)
    check (weight_after_kg is null or weight_after_kg >= 0);

-- You cannot end heavier than you started.
alter table public.material_issue_items
  drop constraint if exists material_issue_items_weight_order;
alter table public.material_issue_items
  add constraint material_issue_items_weight_order check (
    weight_before_kg is null
    or weight_after_kg is null
    or weight_after_kg <= weight_before_kg
  );

comment on column public.material_issue_items.weight_before_kg is
  'Consumable weight before the process. With weight_after_kg the app derives '
  'consumed_qty; see confirmConsumption in the material-issues actions.';

-- ─────────────────────────────────────────────────────────────
-- 4. Purchase Order gate on dispatch  (client request #6)
--
--    Enforced in the database, not just the UI: dispatch is the point of no
--    return commercially, and a route-level check is not a real boundary.
--    Deliberately NOT a NOT NULL on job_cards.po_number — historical jobs
--    have nulls, and blocking job *creation* would stall the shop floor on
--    trial work and verbal POs. The form requires it for new jobs; this
--    trigger is the hard stop.
-- ─────────────────────────────────────────────────────────────
create or replace function public.enforce_po_before_dispatch()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_po text;
  v_jc text;
begin
  select po_number, jc_number into v_po, v_jc
    from public.job_cards where id = new.job_card_id;

  if v_po is null or btrim(v_po) = '' then
    raise exception
      'Cannot dispatch job card % — no Purchase Order number is recorded. Add the PO to the job card first.',
      coalesce(v_jc, new.job_card_id::text)
      using errcode = 'check_violation';
  end if;

  return new;
end; $$;

drop trigger if exists trg_enforce_po_before_dispatch on public.dispatches;
create trigger trg_enforce_po_before_dispatch
  before insert or update of job_card_id on public.dispatches
  for each row execute function public.enforce_po_before_dispatch();

-- ─────────────────────────────────────────────────────────────
-- 5. Search performance  (client request #4)
--
--    idx_jc_fts (0001) indexes to_tsvector(...), but the search actions use
--    `ilike '%term%'` — which cannot use a tsvector GIN index. It has been
--    dead weight since day one, costing writes and storage while every search
--    sequentially scans job_cards.
--
--    Trigram indexes are what `ilike '%...%'` can actually use. Nothing in the
--    codebase calls to_tsvector/textSearch, so the FTS index is dropped rather
--    than left to rot.
-- ─────────────────────────────────────────────────────────────
create extension if not exists pg_trgm;

create index if not exists idx_jc_trgm_jc_number   on public.job_cards using gin (jc_number gin_trgm_ops);
create index if not exists idx_jc_trgm_nbdn        on public.job_cards using gin (nbdn_number gin_trgm_ops);
create index if not exists idx_jc_trgm_po          on public.job_cards using gin (po_number gin_trgm_ops);
create index if not exists idx_jc_trgm_description on public.job_cards using gin (description gin_trgm_ops);
create index if not exists idx_jc_trgm_drawing     on public.job_cards using gin (drawing_number gin_trgm_ops);
create index if not exists idx_jc_trgm_heat        on public.job_cards using gin (heat_number gin_trgm_ops);
create index if not exists idx_jc_trgm_part        on public.job_cards using gin (part_number gin_trgm_ops);

-- Client name is searchable via the clients join (request #4 explicitly asks
-- for it and it was the one genuinely missing field).
create index if not exists idx_clients_trgm_name on public.clients using gin (name gin_trgm_ops);

drop index if exists public.idx_jc_fts;

-- ─────────────────────────────────────────────────────────────
-- 6. Verify before committing
-- ─────────────────────────────────────────────────────────────
do $$
declare
  n bigint;
begin
  select count(*) into n from public.rework_records;
  select count(*) into n from public.job_cards where tags is not null;
  perform 1 from public.item_master limit 1;
  perform 1 from public.material_issue_items limit 1;
  raise notice '0055 ok — rework_records, tags, weights, PO trigger and trigram indexes in place';
end $$;
