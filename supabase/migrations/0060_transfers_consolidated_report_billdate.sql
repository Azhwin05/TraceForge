-- 0060 — Stock transfers between locations, consolidated-report fast path,
-- and a bill date on client documents. Three independent client requests,
-- bundled into one migration because none of them touch the same tables.

-- ═════════════════════════════════════════════════════════════════════════
-- PART A — Stock transfer between storage locations
--
-- Client request: move existing stock of an item from one bin/location to
-- another (e.g. "RE Alapakkam" to somewhere else). Nothing existing does
-- this — Adjust changes a balance up/down at ONE location, Clear zeroes one
-- out. A transfer is two linked ledger entries (out at source, in at
-- destination) that must post atomically and preserve value — same
-- unit_rate on both legs, so a transfer can never manufacture or destroy
-- stock value, only relocate it.
--
-- Modelled directly on after_stock_adjustment_insert (0046): a header table
-- for audit, one INSERT trigger that validates and posts to stock_ledger.
-- ═════════════════════════════════════════════════════════════════════════

create table public.stock_transfers (
  id                uuid primary key default gen_random_uuid(),
  item_id           uuid not null references public.item_master (id),
  from_location_id  uuid not null references public.storage_locations (id),
  to_location_id    uuid not null references public.storage_locations (id),
  qty               numeric(14,3) not null check (qty > 0),
  unit_rate         numeric(14,2) not null default 0,
  reason            text not null,
  created_by        uuid references public.profiles (id),
  created_at        timestamptz not null default now(),
  constraint stock_transfers_distinct_locations check (from_location_id <> to_location_id)
);

create index idx_stock_transfers_item on public.stock_transfers (item_id);
create index idx_stock_transfers_from on public.stock_transfers (from_location_id);
create index idx_stock_transfers_to   on public.stock_transfers (to_location_id);

alter table public.stock_transfers enable row level security;

create policy "stock_transfers_staff_select" on public.stock_transfers
  for select using (is_internal_staff());

-- Admin only — same boundary as stock_adjustments (createStockAdjustment).
create policy "stock_transfers_admin_insert" on public.stock_transfers
  for insert with check (current_role_name() = 'admin');

comment on table public.stock_transfers is
  'Audit header for a location-to-location stock move. The actual balance '
  'change is two rows in stock_ledger (adjustment_out at from_location, '
  'adjustment_in at to_location), posted by trg_after_stock_transfer_insert, '
  'both valued at the SAME rate so a transfer cannot change total stock value.';

alter table public.stock_ledger
  drop constraint if exists stock_ledger_reference_type_check;
alter table public.stock_ledger
  add constraint stock_ledger_reference_type_check
    check (reference_type in ('grn', 'material_issue', 'adjustment', 'transfer'));

create or replace function public.after_stock_transfer_insert()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_balance  numeric(14,3);
  v_avg_cost numeric(14,2);
begin
  select coalesce(balance_qty, 0), coalesce(avg_unit_cost, 0)
    into v_balance, v_avg_cost
    from public.stock_balances
   where item_id = new.item_id and storage_location_id = new.from_location_id;

  if coalesce(v_balance, 0) < new.qty then
    raise exception 'Insufficient stock at source location to transfer: available %, requested %', coalesce(v_balance, 0), new.qty;
  end if;

  -- A transfer preserves value: both legs valued at the source's current
  -- weighted average, never the value the destination happens to already
  -- hold for other batches of the same item.
  update public.stock_transfers set unit_rate = v_avg_cost where id = new.id;

  insert into public.stock_ledger (item_id, storage_location_id, transaction_type, qty, unit_rate, reference_type, reference_id, created_by)
  values
    (new.item_id, new.from_location_id, 'adjustment_out', new.qty, v_avg_cost, 'transfer', new.id, new.created_by),
    (new.item_id, new.to_location_id,   'adjustment_in',  new.qty, v_avg_cost, 'transfer', new.id, new.created_by);

  return new;
end; $$;

revoke all on function public.after_stock_transfer_insert() from public, anon, authenticated;

drop trigger if exists trg_after_stock_transfer_insert on public.stock_transfers;
create trigger trg_after_stock_transfer_insert
  after insert on public.stock_transfers
  for each row execute function public.after_stock_transfer_insert();

-- ═════════════════════════════════════════════════════════════════════════
-- PART B — Consolidated report: upload one PDF instead of filling every
-- structured report, and the job moves to Reports Complete automatically.
--
-- Client request: "either these reports or a complete PDF, and proceed to
-- next step." The existing gate (job_card_gate_blockers) requires an
-- approved PMI/Dimension/Overlay report before reports_complete — this adds
-- a consolidated-report document as an alternative way to satisfy that same
-- gate, and a trigger that auto-advances the status the moment a qualifying
-- document is uploaded, so the common case needs no extra click.
-- ═════════════════════════════════════════════════════════════════════════

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

alter table public.documents
  add constraint documents_document_type_check check (document_type in (
    'wps_pdf','pqr_pdf','pmi_report','dimension_report',
    'pwht_chart','dispatch_doc','invoice','calibration_cert',
    'customer_po','customer_drawing','job_card_pdf',
    'overlay_welding_report','annotated_drawing','other',
    'dossier_index','dossier_zip',
    'welding_report','electrode_test_certificate','consumable_certificate',
    'material_test_certificate','nde_report','lpt_report','hardness_report',
    'incoming_delivery_challan','outgoing_delivery_challan',
    'final_acceptance_document','contract_review','process_layout',
    'material_receipt_document','purchase_order','job_card_scan','wps','pqr',
    'heat_treatment_chart','dp_test_report','supporting_certificate',
    'rework_photo',
    -- 0060 — the alternative to filling every structured report
    'consolidated_report'
  ));

-- Re-created with one added OR branch (a consolidated_report document also
-- satisfies the reports gate); everything else byte-for-byte identical to
-- the live function, confirmed by reading it directly before editing.
create or replace function public.job_card_gate_blockers(p_job_card_id uuid, p_new_status text)
returns text[]
language plpgsql
stable security definer
set search_path to 'public'
as $$
declare
  v_blockers text[] := '{}';
  v_process_type text[];
  v_is_welding boolean;
  v_pwht_required boolean;
  v_has_approved_report boolean;
begin
  select process_type into v_process_type from public.job_cards where id = p_job_card_id;
  if v_process_type is null then
    return array['Job card not found'];
  end if;
  v_is_welding := v_process_type && array['welding','cladding','overlay'];

  if p_new_status = 'process_complete' then
    if exists (select 1 from public.process_executions
                where job_card_id = p_job_card_id
                  and operation_type is not null
                  and status not in ('completed','skipped')) then
      v_blockers := array_append(v_blockers,
        'All routed operations must be completed or skipped before marking process complete');
    end if;
  end if;

  if p_new_status in ('reports_complete','dispatch_ready','dispatched') and v_is_welding then
    select exists (select 1 from public.pmi_reports where job_card_id = p_job_card_id and pmi_status in ('approved','submitted'))
        or exists (select 1 from public.dimension_reports where job_card_id = p_job_card_id and dimension_status in ('approved','submitted'))
        or exists (select 1 from public.overlay_welding_reports where job_card_id = p_job_card_id and report_status in ('approved','submitted'))
        or exists (select 1 from public.documents where job_card_id = p_job_card_id and document_type = 'consolidated_report' and is_active and is_latest)
      into v_has_approved_report;
    if not v_has_approved_report then
      v_blockers := array_append(v_blockers, 'At least one approved inspection report (PMI, Dimension or Overlay) — or a consolidated report PDF — is required');
    end if;
  end if;

  if p_new_status in ('dispatch_ready','dispatched') then
    if v_is_welding and not exists (
      select 1 from public.wps_qualifications where job_card_id = p_job_card_id and approval_status = 'approved'
    ) then
      v_blockers := array_append(v_blockers, 'An approved WPS qualification is required');
    end if;

    select coalesce(bool_or(wm.pwht_required), false) into v_pwht_required
      from public.wps_qualifications wq
      join public.wps_master wm on wm.id = wq.wps_master_id
     where wq.job_card_id = p_job_card_id;

    if v_pwht_required and not exists (
      select 1 from public.pwht_run_jobs prj
        join public.pwht_runs pr on pr.id = prj.pwht_run_id
       where prj.job_card_id = p_job_card_id and pr.approval_status = 'approved'
    ) then
      v_blockers := array_append(v_blockers, 'PWHT is required for this job (per WPS): an approved heat treatment run must be linked');
    end if;
  end if;

  if p_new_status = 'closed' and not exists (
    select 1 from public.dispatches where job_card_id = p_job_card_id
  ) then
    v_blockers := array_append(v_blockers, 'Job cannot close without a dispatch record');
  end if;

  return v_blockers;
end; $$;

-- Auto-advance: the moment a qualifying consolidated_report document lands
-- and the job is sitting in reports_pending, move it straight to
-- reports_complete. Scoped tightly on purpose:
--   * only fires from reports_pending specifically — never overrides a
--     later stage or a job on hold;
--   * only this one hop — every gate further down the line (WPS, PWHT,
--     dispatch) still runs at its own transition, untouched by this.
create or replace function public.after_consolidated_report_upload()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.document_type = 'consolidated_report'
     and new.job_card_id is not null
     and new.is_active
     and new.is_latest then
    update public.job_cards
       set status = 'reports_complete',
           stage_entered_at = now()
     where id = new.job_card_id
       and status = 'reports_pending';
  end if;
  return new;
end; $$;

revoke all on function public.after_consolidated_report_upload() from public, anon, authenticated;

drop trigger if exists trg_after_consolidated_report_upload on public.documents;
create trigger trg_after_consolidated_report_upload
  after insert on public.documents
  for each row execute function public.after_consolidated_report_upload();

-- ═════════════════════════════════════════════════════════════════════════
-- PART C — Bill date on Client Documents
--
-- Client request: the invoice date shown on a client document has to be one
-- Chellu enters himself, not derived from when the file happened to be
-- uploaded. Optional — not every client document is an invoice.
-- ═════════════════════════════════════════════════════════════════════════

alter table public.client_documents
  add column if not exists bill_date date;

comment on column public.client_documents.bill_date is
  'Admin-entered date (e.g. invoice/bill date) shown to the client alongside '
  'the document — independent of uploaded_at, which is just when the file '
  'was sent. Optional: not every client document is an invoice.';

-- ═════════════════════════════════════════════════════════════════════════
-- Verify before committing
-- ═════════════════════════════════════════════════════════════════════════
do $$
declare
  n bigint;
begin
  select count(*) into n from public.stock_transfers;
  select count(*) into n from public.client_documents where bill_date is not null;
  perform public.job_card_gate_blockers(
    (select id from public.job_cards limit 1), 'reports_complete'
  );
  raise notice '0060 ok — stock_transfers, consolidated_report gate + trigger, and bill_date all in place';
end $$;
