-- 0042 — Job Card Recycle Bin: soft delete with 6-month retention + auto-purge
--
-- "Delete" no longer removes a job card immediately. It's soft-deleted
-- (deleted_at stamped, nothing cascades, every child row stays intact) and
-- sits in the Recycle Bin for 6 months, fully restorable. After that window a
-- scheduled purge hard-deletes it for real, the same way the old delete did.
--
-- Because soft-delete is reversible and non-destructive, it does NOT need the
-- old hard-delete guards (blocking on dossiers / issued material) — those
-- existed only to prevent irreversible data loss, which no longer applies
-- here. The final hard purge still respects real FK constraints (see below).

alter table public.job_cards
  add column deleted_at timestamptz,
  add column deleted_by uuid references public.profiles (id),
  add column purge_at   timestamptz;

create index idx_job_cards_deleted_at on public.job_cards (deleted_at) where deleted_at is not null;

comment on column public.job_cards.deleted_at is 'Set when moved to the Recycle Bin. Null = active/visible everywhere.';
comment on column public.job_cards.deleted_by is 'Admin who deleted it.';
comment on column public.job_cards.purge_at   is 'When the permanent hard-delete runs — deleted_at + 6 months.';

-- ── Purge function ───────────────────────────────────────────────────────
-- Hard-deletes any job card whose retention window has passed. A job card
-- that still can't be removed because of a real FK restrict (e.g. a
-- customer_dossier — see 0014, `on delete restrict`) is SKIPPED and reported,
-- not allowed to fail the whole batch.
--
-- Callable by: an admin (checked against profiles.role), or the cron job
-- itself (auth.uid() is null outside a user session — trusted system context).
create or replace function public.purge_expired_job_cards()
returns table (purged_id uuid, jc_number text, skipped boolean, reason text)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r record;
begin
  if auth.uid() is not null then
    if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
      raise exception 'Only an administrator can purge job cards';
    end if;
  end if;

  for r in
    select id, jc_number from public.job_cards
     where deleted_at is not null and purge_at <= now()
     order by purge_at
  loop
    begin
      delete from public.job_cards where id = r.id;
      purged_id := r.id; jc_number := r.jc_number; skipped := false; reason := null;
      return next;
    exception when foreign_key_violation then
      purged_id := r.id; jc_number := r.jc_number; skipped := true; reason := SQLERRM;
      return next;
    end;
  end loop;
  return;
end; $$;

revoke all on function public.purge_expired_job_cards() from public, anon;
grant execute on function public.purge_expired_job_cards() to authenticated;

-- ── Daily schedule (best-effort) ─────────────────────────────────────────
-- If pg_cron isn't available on this project this block raises a NOTICE and
-- the rest of the migration still applies cleanly — purge then falls back to
-- the "Purge Now" admin action / an external cron hitting the API route.
do $$
begin
  create extension if not exists pg_cron with schema extensions;
  perform cron.schedule(
    'purge-expired-job-cards',
    '0 3 * * *',
    $cron$select public.purge_expired_job_cards();$cron$
  );
exception when others then
  raise notice 'pg_cron scheduling skipped (extension unavailable on this plan): %', SQLERRM;
end $$;
