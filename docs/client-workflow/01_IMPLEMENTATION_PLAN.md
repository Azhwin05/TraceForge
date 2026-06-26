# Phase 1-3 Implementation Plan
## ValveTrack ERP Client Workflow Support

**Prepared**: June 26, 2026  
**Phases**: 1 (Critical), 2 (Recommended), 3 (Nice-to-Have)  
**Total Effort**: 8-10 weeks  
**Team Size**: 1-2 engineers

---

## PHASE 1: CORE PRODUCTION REQUIREMENTS (Weeks 1-4)

### Objectives
- Make the ERP fully usable for client's real manufacturing workflow
- Enable document upload at every workflow stage
- Show document completion status on Job Card
- Support approval workflows for all critical documents
- Enable dossier generation with auto-populated documents

### Phase 1 Implementation Sequence

#### **Week 1: Configuration & Audit**

**1.1 — Expand Document Type Enum** (1 day)
- Add missing document types to documents table constraint
- New types: welding_report, electrode_test_certificate, consumable_certificate, etc.
- Migration: 0015_expand_document_types.sql

**1.2 — Workflow Document Configuration** (3 days)
- Create: `src/lib/workflow/document-requirements.ts`
- Define all 23 document types with:
  - Workflow stage
  - Required/optional/conditional
  - Allowed MIME types
  - Multi-file support
  - Approval requirement
  - Dossier eligibility
- Create tests: `src/__tests__/workflow-config.test.ts`
- Type safety via TypeScript, no database config initially

#### **Week 2: UI Components**

**2.1 — Job Card Workflow Tracker Component** (4 days)
- Create: `src/components/job-cards/JobCardWorkflowTracker.tsx`
- Display: 12 workflow stages with status indicators
- Show: document count, approval status, latest revision, updated by/date
- Calculate status from live data (documents table, reports tables)
- Colors: not-started (gray), in-progress (blue), uploaded (green), pending-approval (yellow), approved (green checkmark), rejected (red), submitted (blue), completed (dark green)
- Action button per stage: "Upload", "View", "Approve", "Reject"
- Click stage to expand and show:
  - List of uploaded documents
  - Revision history
  - Approval comments
  - Download links
  - Preview (for PDF)
  - Upload form for revisions

**2.2 — Stage Document Upload Component** (3 days)
- Create: `src/components/job-cards/StageDocumentUpload.tsx`
- Reusable for all workflow stages
- Features:
  - Drag & drop file area
  - File picker button
  - File size validation (max 50MB)
  - MIME type validation
  - Multiple file support (configurable)
  - Progress bar
  - Clear error messages
  - After upload: show file list with versioning
- Uses existing Supabase storage client
- Server Action: `src/app/(app)/job-cards/upload-document-action.ts`

#### **Week 3: Database & Workflows**

**3.1 — PWHT Approval Workflow** (2 days)
- Migration: 0016_pwht_approval_workflow.sql
- Add fields: approval_status, approved_by, approved_at, rejection_reason
- Update RLS: QA can update approval fields
- Create Server Action: `src/app/(app)/pwht-runs/approve-action.ts`
- Create UI: Approval form in PWHT detail page
- Add tests: Idempotency, authorization, audit logging

**3.2 — Welding Report Document Linking** (2 days)
- Document linking via documents table (NO storage_path on process_executions)
- Server Action: `src/app/(app)/job-cards/link-welding-report-action.ts`
- Create documents.entity_type = 'process_execution' entries
- Tests: Linking, retrieval, versioning

**3.3 — Consumable Certificate Linking** (1 day)
- Server Action for certificate upload
- Link to consumable_master and job_card
- Store in documents table

#### **Week 4: Dossier & Closure**

**4.1 — Dossier Auto-Population** (2 days)
- Update: `src/app/(app)/dossiers/actions.ts` create-dossier server action
- Auto-include documents where:
  - job_card_id = job.id
  - is_latest = true
  - is_active = true
  - approval_status = 'approved' (if requires approval)
  - submitted_to_customer = true OR dossier_eligible = true
  - Not rejected
- User can still review and exclude optional docs
- Tests: Auto-inclusion logic, user overrides

**4.2 — Job Closure Validation** (2 days)
- Server Action: `src/app/(app)/job-cards/validate-closure-action.ts`
- Check: Required documents exist
- Check: Required approvals complete
- Check: Delivery Challan exists
- Check: Invoice exists
- Check: Dossier generated
- Return: List of missing items or approval to close
- Tests: All closure scenarios

**4.3 — Phase 1 Integration Testing** (2 days)
- E2E scenario: Welding project from creation to dossier
- Scenario: Job without PWHT (documents optional)
- Scenario: Reject and revise document
- Build verification
- TypeScript verification

### Phase 1 Deliverables

**Code**:
- 1 migration (PWHT fields)
- 1 config file (document requirements)
- 3 components (tracker, upload, approval UI)
- 5 server actions (upload, approve, validate, etc.)
- ~20 test cases

**Documentation**:
- 02_PHASE_1_IMPLEMENTATION.md (detailed code + config)
- 05_DATABASE_CHANGES.md (migration scripts)
- 07_TEST_REPORT.md (test results)

**Build Output**:
- TypeScript: 0 errors
- Tests: all passing
- Production build: successful

---

## PHASE 2: RECOMMENDED ENHANCEMENTS (Weeks 5-6)

### Objectives
- Improve version control consistency
- Enable advanced document search
- Add workflow notifications
- Support document expiry tracking

### Phase 2 Tasks

**2.1 — Document Versioning Consistency** (2 days)
- Audit all report modules (PMI, Dimension, Overlay)
- Add version field where missing (OR use documents.version)
- Ensure old revisions remain accessible
- Update APIs to show version history
- Tests: Version tracking, retrieval

**2.2 — Document Search & Filters** (3 days)
- Enhance: `/documents` page search
- Add filters:
  - By job card number
  - By document type
  - By approval status
  - By uploaded date range
  - By workflow stage
  - By latest only
- Add: Full-text search on document_name, file_name
- Database index: GIN on documents (FTS)
- Tests: Search accuracy, performance

**2.3 — Email Notifications** (3 days)
- Events:
  - Document awaiting approval
  - Document approved/rejected
  - PWHT ready for QA
  - Job closure blocked (missing docs)
- Use existing email infrastructure (Resend)
- Templates: Per event type
- Tests: Email routing, deduplication

**2.4 — Document Expiry Tracking** (2 days)
- Add optional fields to documents:
  - expiry_date
  - warning_days_before
- Alert query: Documents expiring in 30 days
- UI: Expiry indicator on document list
- Tests: Expiry calculation, warnings

### Phase 2 Deliverables

**Code**:
- Enhanced search & filters (API + UI)
- Email notification module
- Expiry tracking (DB + queries)
- Configuration for notification events

**Documentation**:
- 03_PHASE_2_IMPLEMENTATION.md

---

## PHASE 3: NICE-TO-HAVE ENHANCEMENTS (Weeks 7-10)

### Objectives
- Optimize for field usage
- Add signature capture
- Provide operational analytics
- Show job timeline

### Phase 3 Tasks

**3.1 — Mobile Upload Optimization** (2 days)
- Responsive design improvements
- Camera input support (if not already present)
- Larger touch targets
- Mobile-friendly file picker

**3.2 — Signature Capture** (3 days)
- Digital signature canvas component
- Sign-off for: Material receipt, WPS approval, PWHT, QC, Dispatch
- Store as image in documents table
- Audit trail with signer name/role/timestamp

**3.3 — Analytics Dashboard** (4 days)
- Metrics:
  - Jobs by current stage (pie chart)
  - Average time per stage (bar chart)
  - Documents pending approval (table)
  - Missing required documents (table)
  - Dossier completion % (gauge)
  - QA turnaround time (trend)
- New page: `/analytics`
- Server-side aggregation (no client-side data loading)

**3.4 — Job Timeline** (3 days)
- Chronological event log per job
- Events: Status change, document upload, approval, rejection, revision, dispatch, closure
- Source: audit_log table
- Timeline UI component
- Link to related documents/records

### Phase 3 Deliverables

**Code**:
- Mobile optimization (CSS + components)
- Signature component
- Analytics aggregation queries
- Timeline UI

**Documentation**:
- 04_PHASE_3_IMPLEMENTATION.md

---

## DATABASE CHANGES SUMMARY

### Migration 0015: Expand Document Types
```sql
ALTER TABLE documents ADD CONSTRAINT check_document_type 
  CHECK (document_type IN (
    'wps_pdf', 'pqr_pdf', 'pmi_report', 'dimension_report', 
    'pwht_chart', 'dispatch_doc', 'invoice', 'calibration_cert',
    'customer_po', 'customer_drawing', 'job_card_pdf',
    'overlay_welding_report', 'annotated_drawing', 'other',
    'dossier_index', 'dossier_zip',
    -- NEW:
    'welding_report', 'electrode_test_certificate', 
    'consumable_certificate', 'material_test_certificate',
    'nde_report', 'lpt_report', 'hardness_report',
    'incoming_delivery_challan', 'outgoing_delivery_challan',
    'final_acceptance_document', 'contract_review', 'process_layout'
  ));
```

### Migration 0016: PWHT Approval Workflow
```sql
ALTER TABLE pwht_runs ADD COLUMN (
  approval_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (approval_status IN ('draft', 'submitted', 'approved', 'rejected')),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES profiles(id),
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  submitted_by UUID REFERENCES profiles(id),
  submitted_at TIMESTAMPTZ,
  submitted_to_customer BOOLEAN NOT NULL DEFAULT false,
  submitted_to_customer_at TIMESTAMPTZ
);

CREATE INDEX idx_pwht_runs_approval ON pwht_runs(approval_status);
CREATE INDEX idx_pwht_runs_job ON pwht_runs(job_card_id);
```

### Migration 0017 (Phase 2): Report Versioning
```sql
ALTER TABLE pmi_reports ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE dimension_reports ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE overlay_welding_reports ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

CREATE INDEX idx_reports_version ON pmi_reports(job_card_id, version);
```

### Migration 0018 (Phase 2): Document Expiry
```sql
ALTER TABLE documents ADD COLUMN (
  expiry_date DATE,
  warning_days_before INTEGER DEFAULT 30,
  is_expired BOOLEAN GENERATED ALWAYS AS (
    expiry_date IS NOT NULL AND CURRENT_DATE >= expiry_date
  ) STORED
);
```

---

## TESTING STRATEGY

### Unit Tests (by Phase)

**Phase 1**:
- Document requirement applicability logic
- Workflow status calculation
- Dossier eligibility logic
- Closure validation rules
- Zod schemas for upload, approval, etc.

**Phase 2**:
- Document versioning logic
- Search query accuracy
- Notification event routing

**Phase 3**:
- Analytics aggregation queries
- Timeline event sorting

### Integration Tests

**Phase 1**:
- Upload document → Link to job card → Verify in tracker
- Approve PWHT → Verify submitted_to_customer ready
- Mark document approved → Verify appears in dossier suggestions
- Reject document → Verify blocks closure

**Phase 2**:
- Search filters across scenarios
- Expiry alerts trigger correctly

### E2E Tests (Playwright)

**Scenario 1**: Complete welding project (7 steps)
**Scenario 2**: Non-welding project (skip PWHT)
**Scenario 3**: Reject and revise document
**Scenario 4**: Dossier auto-population

---

## RISK MITIGATION

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Breaking existing workflows | Medium | High | Extensive testing, backward compatibility checks |
| RLS policy misconfigs | Low | High | RLS audit per migration, role-based tests |
| Storage path inconsistencies | Low | Medium | Centralize on documents table, no redundant fields |
| Large dossiers timing out | Medium | Low | Pagination, async ZIP generation |
| Notification spam | Medium | Low | Deduplication, configurable thresholds |

---

## SUCCESS CRITERIA

### Phase 1 Complete When:
- ✅ All workflow stages visible on Job Card detail
- ✅ Documents can be uploaded at each stage
- ✅ Document approval workflows function
- ✅ Dossier auto-generates with approved documents
- ✅ Job closure validates requirements
- ✅ TypeScript builds with 0 errors
- ✅ All tests pass (>80% coverage)
- ✅ No regressions in existing features

### Phase 2 Complete When:
- ✅ Document search works across all filters
- ✅ Versioning consistent across modules
- ✅ Email notifications delivered
- ✅ Expiry tracking alerts work
- ✅ Performance acceptable

### Phase 3 Complete When:
- ✅ Mobile upload optimized
- ✅ Signature capture working
- ✅ Analytics dashboard operational
- ✅ Timeline displays accurately

---

## RESOURCE ALLOCATION

**Week 1-2**: Frontend components (2 dev)  
**Week 2-3**: Backend workflows (1 dev)  
**Week 3-4**: Integration & testing (2 dev)  
**Week 5-6**: Phase 2 enhancements (1 dev)  
**Week 7-10**: Phase 3 features (1 dev)  

---

## GO-LIVE CHECKLIST

Before production deployment:
- [ ] Phase 1 complete & tested
- [ ] Database migrations applied
- [ ] Dossier generation tested with real data
- [ ] Job closure validation tested
- [ ] 3 test projects run through complete workflow
- [ ] Operator training completed
- [ ] Backup procedures documented
- [ ] Rollback plan prepared
- [ ] Performance baselines established
- [ ] Client sign-off received

---

**Status**: Ready for Phase 1 Kickoff  
**Next**: Begin Week 1 implementation per schedule
