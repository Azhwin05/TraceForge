-- ═════════════════════════════════════════════════════════════════════════════
-- 0009 — Phase 5 Cleanup: broaden QA update permissions on pmi_reports
--
-- Previously (0008) QA could only update rows where pmi_status = 'draft'.
-- This blocked QA from approving (draft→approved) and from rejecting
-- approved reports. Updated rule: QA can update any non-submitted row.
-- ═════════════════════════════════════════════════════════════════════════════

drop policy if exists "pmi_qa_update" on public.pmi_reports;

create policy "pmi_qa_update" on public.pmi_reports
  for update
  using     (current_role_name() = 'qa' and pmi_status <> 'submitted')
  with check (current_role_name() = 'qa');
