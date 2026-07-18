-- 0030 — Inventory module: core schema
--
-- Implements the Material Inward & Inventory Management workflow:
--   Material Inward (DC) -> Incoming Inspection -> Quality Inspection
--   -> Accepted -> GRN -> Move to Inventory (stock ledger) -> Material Issue
--   -> Automatic Inventory Update (derived stock_balances view)
--
-- Stock balance is NEVER stored as a mutable column — it is always derived
-- from stock_ledger (append-only) so it can't drift from the transaction
-- history. See 0031 for the triggers that append to the ledger.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- item_master — the catalog of materials/parts tracked in inventory
-- ─────────────────────────────────────────────────────────────
create table public.item_master (
  id                uuid primary key default gen_random_uuid(),
  item_code         text not null unique,
  item_name         text not null,
  category          text not null check (category in ('raw_material','consumable','component','finished_part','other')),
  uom               text not null,
  hsn_code          text,
  min_stock_level   numeric(14,3) not null default 0 check (min_stock_level >= 0),
  description       text,
  is_active         boolean not null default true,
  created_by        uuid references public.profiles (id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- suppliers
-- ─────────────────────────────────────────────────────────────
create table public.suppliers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  contact_name  text,
  contact_phone text,
  contact_email text,
  address       text,
  gst_no        text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- storage_locations — bins/racks/stores where accepted stock is kept
-- ─────────────────────────────────────────────────────────────
create table public.storage_locations (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- material_inward — one row per Delivery Challan (DC) receipt event
-- ─────────────────────────────────────────────────────────────
create table public.material_inward (
  id              uuid primary key default gen_random_uuid(),
  dc_number       text not null,
  dc_date         date not null default current_date,
  supplier_id     uuid not null references public.suppliers (id),
  po_number       text,
  vehicle_no      text,
  remarks         text,
  status          text not null default 'pending_inspection' check (status in (
                    'pending_inspection','incoming_inspection_done','qc_accepted',
                    'qc_rejected','grn_generated'
                  )),
  received_by     uuid references public.profiles (id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (dc_number, supplier_id)
);

create table public.material_inward_items (
  id                  uuid primary key default gen_random_uuid(),
  material_inward_id  uuid not null references public.material_inward (id) on delete cascade,
  item_id             uuid not null references public.item_master (id),
  dc_quantity         numeric(14,3) not null check (dc_quantity > 0),
  uom                 text not null,
  remarks             text
);

-- ─────────────────────────────────────────────────────────────
-- incoming_inspections — quantity / packaging / documents check
-- (one per material_inward; step before quality inspection)
-- ─────────────────────────────────────────────────────────────
create table public.incoming_inspections (
  id                  uuid primary key default gen_random_uuid(),
  material_inward_id  uuid not null references public.material_inward (id) on delete cascade,
  inspected_by        uuid references public.profiles (id),
  inspection_date      timestamptz not null default now(),
  quantity_ok         boolean not null,
  packaging_ok        boolean not null,
  documents_ok        boolean not null,
  remarks             text,
  unique (material_inward_id)
);

-- ─────────────────────────────────────────────────────────────
-- quality_inspections — per-item pass/fail against quality spec
-- ─────────────────────────────────────────────────────────────
create table public.quality_inspections (
  id                       uuid primary key default gen_random_uuid(),
  material_inward_id       uuid not null references public.material_inward (id) on delete cascade,
  material_inward_item_id  uuid not null references public.material_inward_items (id) on delete cascade,
  inspected_by             uuid references public.profiles (id),
  inspection_date          timestamptz not null default now(),
  result                   text not null check (result in ('accepted','rejected')),
  accepted_qty             numeric(14,3) not null default 0 check (accepted_qty >= 0),
  rejected_qty             numeric(14,3) not null default 0 check (rejected_qty >= 0),
  rejection_reason         text,
  remarks                  text,
  unique (material_inward_item_id)
);

-- ─────────────────────────────────────────────────────────────
-- goods receipt note (GRN) — formal stock-in record for accepted material
-- ─────────────────────────────────────────────────────────────
create table public.grn (
  id                  uuid primary key default gen_random_uuid(),
  grn_number          text not null unique,
  material_inward_id  uuid not null references public.material_inward (id),
  generated_by        uuid references public.profiles (id),
  generated_at        timestamptz not null default now(),
  status              text not null default 'active' check (status in ('active','cancelled')),
  remarks             text,
  unique (material_inward_id)
);

create table public.grn_items (
  id                    uuid primary key default gen_random_uuid(),
  grn_id                uuid not null references public.grn (id) on delete cascade,
  item_id               uuid not null references public.item_master (id),
  quality_inspection_id uuid not null references public.quality_inspections (id),
  accepted_qty          numeric(14,3) not null check (accepted_qty > 0),
  uom                   text not null,
  storage_location_id   uuid not null references public.storage_locations (id),
  unit_rate             numeric(14,2),
  remarks               text
);

-- ─────────────────────────────────────────────────────────────
-- material_issues — stock issued from stores against a production job
-- ─────────────────────────────────────────────────────────────
create table public.material_issues (
  id            uuid primary key default gen_random_uuid(),
  issue_number  text not null unique,
  job_card_id   uuid references public.job_cards (id),
  issued_by     uuid references public.profiles (id),
  issue_date    timestamptz not null default now(),
  status        text not null default 'issued' check (status in ('issued','cancelled')),
  remarks       text
);

create table public.material_issue_items (
  id                  uuid primary key default gen_random_uuid(),
  material_issue_id   uuid not null references public.material_issues (id) on delete cascade,
  item_id             uuid not null references public.item_master (id),
  storage_location_id uuid not null references public.storage_locations (id),
  issued_qty          numeric(14,3) not null check (issued_qty > 0),
  uom                 text not null,
  remarks             text
);

-- ─────────────────────────────────────────────────────────────
-- stock_ledger — append-only transaction log; the ONLY source of truth
-- for stock balances (see stock_balances view in 0031).
-- ─────────────────────────────────────────────────────────────
create table public.stock_ledger (
  id                    uuid primary key default gen_random_uuid(),
  item_id               uuid not null references public.item_master (id),
  storage_location_id   uuid not null references public.storage_locations (id),
  transaction_type      text not null check (transaction_type in ('grn_in','issue_out','adjustment_in','adjustment_out')),
  qty                   numeric(14,3) not null check (qty > 0),
  reference_type        text not null check (reference_type in ('grn','material_issue','adjustment')),
  reference_id          uuid not null,
  created_by            uuid references public.profiles (id),
  created_at            timestamptz not null default now()
);

create index idx_stock_ledger_item_location on public.stock_ledger (item_id, storage_location_id);
create index idx_material_inward_status on public.material_inward (status);
create index idx_material_inward_items_inward on public.material_inward_items (material_inward_id);
create index idx_quality_inspections_inward on public.quality_inspections (material_inward_id);
create index idx_grn_items_grn on public.grn_items (grn_id);
create index idx_material_issue_items_issue on public.material_issue_items (material_issue_id);
