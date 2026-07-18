-- 0034 — Atomic number generators for GRN and Material Issue, mirroring
-- generate_jc_number's advisory-lock pattern (avoids COUNT+INSERT races).

create or replace function public.generate_grn_number()
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
  perform pg_advisory_xact_lock(hashtext('grn_number_lock_' || year_str));

  select coalesce(max(cast(split_part(grn_number, '-', 3) as int)), 0) + 1
    into next_num
    from public.grn
   where grn_number like 'GRN-' || year_str || '-%'
     and grn_number ~ ('^GRN-' || year_str || '-[0-9]+$');

  return 'GRN-' || year_str || '-' || lpad(next_num::text, 4, '0');
end; $$;

create or replace function public.generate_material_issue_number()
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
  perform pg_advisory_xact_lock(hashtext('issue_number_lock_' || year_str));

  select coalesce(max(cast(split_part(issue_number, '-', 3) as int)), 0) + 1
    into next_num
    from public.material_issues
   where issue_number like 'MI-' || year_str || '-%'
     and issue_number ~ ('^MI-' || year_str || '-[0-9]+$');

  return 'MI-' || year_str || '-' || lpad(next_num::text, 4, '0');
end; $$;

revoke all on function public.generate_grn_number() from public;
revoke all on function public.generate_material_issue_number() from public;
grant execute on function public.generate_grn_number() to authenticated;
grant execute on function public.generate_material_issue_number() to authenticated;
