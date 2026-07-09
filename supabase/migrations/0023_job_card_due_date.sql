-- 0023 — Job Card due date (Phase 4 of the Process Flow enterprise update)
--
-- Adds a production due date to job cards. Aging (days since creation) and overdue
-- days are derived at read time from created_at / due_date, so nothing is stored
-- redundantly. Purely additive — existing rows get a null due_date.
--
-- Distinct from accounts.due_date, which is the *payment* due date.
--
-- Rollback:
--   alter table public.job_cards drop column if exists due_date;

alter table public.job_cards
  add column if not exists due_date date;

comment on column public.job_cards.due_date is
  'Production due date for the job. Aging/overdue are derived from this + created_at.';

create index if not exists idx_job_cards_due_date
  on public.job_cards (due_date) where due_date is not null;
