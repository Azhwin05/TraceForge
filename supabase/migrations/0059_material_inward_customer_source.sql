-- 0059 — Material Inward can now come FROM a client, not just a supplier
--
-- Client request: material doesn't only arrive from outside vendors — a
-- client sometimes sends their OWN material for a specific job ("use this
-- material for this job"). Structurally this is the exact same DC → incoming
-- inspection → QC → GRN → stock pipeline; none of incoming_inspections,
-- quality_inspections, grn or grn_items reference supplier_id at all, so only
-- material_inward itself needs to change.
--
-- Reuses `clients` — the same table job cards and the portal already use —
-- rather than a new "customers" master, since inventory/customers already is
-- just a view onto `clients`.

alter table public.material_inward
  add column source_type text not null default 'supplier'
    check (source_type in ('supplier', 'customer')),
  add column client_id uuid references public.clients (id),
  -- Earmarks the inward for a specific job — available for either source,
  -- since a supplier delivery can be job-specific too, not only customer-
  -- supplied material.
  add column job_card_id uuid references public.job_cards (id);

alter table public.material_inward
  alter column supplier_id drop not null;

-- Exactly one of supplier_id / client_id, matching the declared source —
-- the two fields can never both be set or both be empty.
alter table public.material_inward
  add constraint material_inward_source_matches_type check (
    (source_type = 'supplier' and supplier_id is not null and client_id is null)
    or
    (source_type = 'customer' and client_id is not null and supplier_id is null)
  );

-- The old UNIQUE(dc_number, supplier_id) can't survive supplier_id going
-- nullable — Postgres treats NULL as distinct in a unique constraint, so it
-- would have silently stopped preventing duplicate customer-sourced DCs
-- (every customer-sourced row has supplier_id = NULL, and NULLs never
-- conflict with each other). Replaced with one partial unique index per
-- source, preserving the exact same duplicate-prevention guarantee for both.
alter table public.material_inward
  drop constraint material_inward_dc_number_supplier_id_key;

create unique index material_inward_dc_supplier_uniq
  on public.material_inward (dc_number, supplier_id)
  where supplier_id is not null;

create unique index material_inward_dc_client_uniq
  on public.material_inward (dc_number, client_id)
  where client_id is not null;

create index idx_material_inward_client_id   on public.material_inward (client_id);
create index idx_material_inward_job_card_id on public.material_inward (job_card_id);

comment on column public.material_inward.source_type is
  'Where this delivery came from: an outside supplier, or the client sending '
  'their own material for a job. Drives which of supplier_id/client_id is set.';
comment on column public.material_inward.client_id is
  'Set only when source_type = customer. The client who sent their own '
  'material — usually valued at GRN unit_rate = 0, since it is not Raghav''s '
  'owned stock.';
comment on column public.material_inward.job_card_id is
  'Optional — which job this delivery is earmarked for. Available for either '
  'source_type, not only customer-supplied material.';

-- No RLS change needed: material_inward is staff-only (is_internal_staff())
-- with no customer-portal exposure today, and this feature does not change
-- that — customers do not see their own material_inward rows.

do $$
declare
  n bigint;
begin
  select count(*) into n from public.material_inward;
  raise notice '0059 ok — % existing material_inward rows still valid under the new source_type constraint', n;
end $$;
