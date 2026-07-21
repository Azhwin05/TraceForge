-- 0037 — Admin approval workflow for new Item Master items and Suppliers
--
-- New items/suppliers created by non-admins land in a 'pending' state and must
-- be approved by an admin before they can be used in transactions. Admin-created
-- records are approved on creation (handled in the server action). Existing rows
-- are grandfathered to 'approved' via the column default so nothing breaks.
--
-- approval_status is only ever changed by the dedicated admin approve/reject
-- server actions — the item/supplier edit actions never touch it.

alter table public.item_master
  add column approval_status  text not null default 'approved'
    check (approval_status in ('pending','approved','rejected')),
  add column approved_by      uuid references public.profiles (id),
  add column approved_at      timestamptz,
  add column rejection_reason text;

alter table public.suppliers
  add column approval_status  text not null default 'approved'
    check (approval_status in ('pending','approved','rejected')),
  add column approved_by      uuid references public.profiles (id),
  add column approved_at      timestamptz,
  add column rejection_reason text;

create index idx_item_master_approval on public.item_master (approval_status);
create index idx_suppliers_approval   on public.suppliers (approval_status);
