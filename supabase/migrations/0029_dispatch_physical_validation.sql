-- 0029: Physical dispatch validation gate
--
-- Merges the old "Ready" (dispatch_ready) and "Dispatched" (dispatched) stages
-- into a single dispatch step in the UI, gated by a real-world verification.
-- Before a dispatch record can be created, an Admin or QA user physically
-- inspects the finished product and marks it "Ready to Dispatch". We record who
-- performed that check and when. No new status enum value is introduced.

alter table public.job_cards
  add column if not exists dispatch_validated_by uuid references public.profiles(id),
  add column if not exists dispatch_validated_at timestamptz;

comment on column public.job_cards.dispatch_validated_by is
  'Admin/QA who physically verified the finished product as ready to dispatch.';
comment on column public.job_cards.dispatch_validated_at is
  'Timestamp when the product was physically verified as ready to dispatch.';
