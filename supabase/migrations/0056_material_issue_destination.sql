-- 0056 — Destination on material issues (e.g. "sent to CBE")
--
-- Client feedback: when material is issued to a different site/branch rather
-- than consumed locally, that needs to be recorded and reportable. `remarks`
-- already exists but is free-text notes, not a queryable field — this is a
-- deliberately separate column so a future report ("everything sent to CBE
-- this month") is a plain filter, not a text search over remarks.

alter table public.material_issues
  add column if not exists destination text;

comment on column public.material_issues.destination is
  'Where the material is going when it is not being consumed on-site — e.g. '
  '"CBE" for the Coimbatore branch. Free text: sites are not a fixed, closed list.';
