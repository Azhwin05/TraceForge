-- 0053 — CRITICAL: scope document storage to its owner
--
-- The 'documents' bucket is private (good — no anonymous access), but its
-- storage.objects policies only asked "are you authenticated?":
--
--   documents_storage_select ... using (bucket_id = 'documents' and auth.role() = 'authenticated')
--   documents_storage_insert ... with check (same)
--
-- A portal customer holds a valid `authenticated` session, so they could list
-- the bucket and mint a signed URL for ANY object in it — every other
-- customer's PMI/dimension/overlay reports, job cards, dispatch documents and
-- invoices. Object keys are also predictable:
--   {entityType}/{entityId}/{documentType}/{date}-{filename}
-- The app's generate-url routes do check the metadata table first, but storage
-- is reachable directly via the Storage API, so route-level checks are not the
-- security boundary — this policy is.
--
-- Customers may now read an object only when the matching public.documents row
-- is linked to a job card belonging to one of their companies. That mirrors the
-- existing documents_customer_select policy exactly, so the portal keeps
-- working: every customer-facing PDF (including generated reports) is
-- registered in public.documents with job_card_id set. WPS-master PDFs are the
-- one generated artefact without a job_card_id — internal master data, which
-- customers are correctly excluded from.
--
-- Uploads become staff-only: a customer has never had a legitimate reason to
-- write into this bucket, and the previous policy allowed it.
-- update/delete were already admin-only and are left untouched.

alter policy "documents_storage_select" on storage.objects
  using (
    bucket_id = 'documents'
    and (
      is_internal_staff()
      or exists (
        select 1
          from public.documents d
          join public.job_cards jc on jc.id = d.job_card_id
         where d.storage_path = storage.objects.name
           and d.job_card_id is not null
           and jc.client_id in (select current_client_ids())
      )
    )
  );

alter policy "documents_storage_insert" on storage.objects
  with check (bucket_id = 'documents' and is_internal_staff());

-- Supports the storage_path lookup the SELECT policy performs on every object
-- read; without it each signed-URL request would seq-scan public.documents.
create index if not exists idx_documents_storage_path
  on public.documents (storage_path);
