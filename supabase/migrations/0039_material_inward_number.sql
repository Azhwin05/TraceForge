-- 0039 — System-generated Material Inward number (point 7)
--
-- The dc_number is the SUPPLIER's delivery-challan number (manual, unchanged).
-- inward_number is our own sequential id, generated automatically like GRN /
-- Material Issue numbers: MIN-<year>-<seq>. Existing rows are backfilled.

alter table public.material_inward add column inward_number text;

-- Backfill existing rows: MIN-<year>-<seq> ordered by created_at within each year.
with numbered as (
  select id,
         extract(year from created_at)::text as yr,
         row_number() over (partition by extract(year from created_at) order by created_at, id) as rn
  from public.material_inward
)
update public.material_inward mi
   set inward_number = 'MIN-' || n.yr || '-' || lpad(n.rn::text, 4, '0')
  from numbered n
 where mi.id = n.id;

alter table public.material_inward
  alter column inward_number set not null,
  add constraint material_inward_inward_number_unique unique (inward_number);

-- Atomic generator (advisory-lock pattern, mirrors generate_grn_number).
create or replace function public.generate_material_inward_number()
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  year_str text;
  next_num int;
begin
  year_str := extract(year from now())::text;
  perform pg_advisory_xact_lock(hashtext('inward_number_lock_' || year_str));

  select coalesce(max(cast(split_part(inward_number, '-', 3) as int)), 0) + 1
    into next_num
    from public.material_inward
   where inward_number like 'MIN-' || year_str || '-%'
     and inward_number ~ ('^MIN-' || year_str || '-[0-9]+$');

  return 'MIN-' || year_str || '-' || lpad(next_num::text, 4, '0');
end; $$;

revoke all on function public.generate_material_inward_number() from public;
grant execute on function public.generate_material_inward_number() to authenticated;
