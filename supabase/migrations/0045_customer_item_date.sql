-- 0045 — Customer Items: add a Date field
--
-- Each item in a customer's register can carry a date (e.g. when it's
-- needed by, or when it was noted) — a plain date, meaning left to whoever
-- enters it rather than forced into "order date" vs "due date".

alter table public.customer_items
  add column item_date date;

comment on column public.customer_items.item_date is 'Free-purpose date for this item (e.g. needed-by / order date). Optional.';
