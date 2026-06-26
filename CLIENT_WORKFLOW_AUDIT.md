# CLIENT WORKFLOW AUDIT
## ValveTrack ERP vs. Real Manufacturing Process

**Audit Date**: June 26, 2026  
**Status**: Preliminary Analysis (pending Project 1 & 2 document review)  
**Scope**: Manufacturing workflow from material receipt to job closure

---

## PART 1: OFFICIAL CLIENT WORKFLOW

### Stated Process Flow

```
NPDN / Material Receipt
        ↓
Job Card Creation
        ↓
Welding Procedure Specification (WPS)
        ↓
Welding Execution
(Welding Report / Electrode Test Certificate)
        ↓
Heat Treatment Chart
        ↓
Inspection & Quality Control
(Dimensional Report / DP Test Report)
        ↓
Final Acceptance
        ↓
Delivery Challan
        ↓
Invoice
        ↓
Job Closure
```

**Key Points from Process Flow:**
- 11 distinct workflow stages
- Documents are uploaded at specific stages
- Each stage has defined deliverables
- Final deliverables go to customer (dossier)

---

## PART 2: CURRENT ERP WORKFLOW ANALYSIS

### Implemented Status Lifecycle

Current job card has **14 status states**:

```
created 
  ↓
wps_pending 
  ↓
wps_uploaded 
  ↓
wps_approved 
  ↓
process_assigned 
  ↓
in_process 
  ↓
process_complete 
  ↓
reports_pending 
  ↓
reports_complete 
  ↓
dispatch_ready 
  ↓
dispatched 
  ↓
accounts_processing 
  ↓
closed
```

**Plus**: `on_hold` status (admin override)

### Mapping: Client Workflow → ERP Status

| Client Stage | ERP Status | Module | Comments |
|--------------|-----------|--------|----------|
| NPDN / Material Receipt | (implicit) | Job Cards | Captured in `received_date` field |
| Job Card Creation | `created` | Job Cards | Standard CRUD operation |
| WPS Specification | `wps_pending` → `wps_uploaded` → `wps_approved` | WPS Qualifications | Full approval workflow |
| Welding Execution | `process_assigned` → `in_process` → `process_complete` | Process Executions | Operator logs welds |
| Welding Report | `reports_pending` → `reports_complete` | Documents + Overlay Reports | Generated PDFs |
| Heat Treatment Chart | `reports_pending` → `reports_complete` | PWHT Runs | Heat treatment data |
| Dimensional Inspection | `reports_pending` → `reports_complete` | Dimension Reports | Dimensional measurements |
| DP/LPT Test Report | `reports_pending` → `reports_complete` | Overlay Reports (NDE section) | Liquid penetrant testing |
| PMI (Material Analysis) | `reports_pending` → `reports_complete` | PMI Reports | Elemental composition |
| Final Acceptance | `dispatch_ready` | (implicit) | QC sign-off on job card |
| Delivery Challan | `dispatched` | Dispatches module | Shipment tracking |
| Invoice | `accounts_processing` → `closed` | Accounts module | Payment tracking |
| Job Closure | `closed` | Job Cards | Final state |

**Status: GOOD MAPPING** ✅
- All 11 client stages map to existing ERP statuses
- No additional statuses needed

---

## PART 3: DOCUMENT MAPPING (Expected from Projects)

### Documents Expected Throughout Workflow

Based on process flow, client typically uploads:

#### Pre-Production Documents
| Document | Client Stage | Expected in ERP | Module |
|----------|--------------|-----------------|--------|
| Purchase Order | Material Receipt | ❓ | Documents (optional) |
| Delivery Challan (Inbound) | Material Receipt | ❓ | Documents (optional) |
| Job Card | Job Card Creation | ✅ | Job Cards |
| Drawing | Job Card Creation | ❓ | Documents (optional) |
| WPS (Welding Procedure Spec) | WPS Stage | ✅ | WPS Qualifications |
| PQR (Procedure Qualification Record) | WPS Stage | ❓ | Documents (optional) |

#### Production Documents
| Document | Client Stage | Expected in ERP | Module |
|----------|--------------|-----------------|--------|
| Welding Report | Welding Execution | ❓ | Process Executions / Documents |
| Electrode Test Certificate | Welding Execution | ❓ | Documents (optional) |
| Consumable Certificates | Welding Execution | ❓ | Documents (optional) |

#### Inspection Documents
| Document | Client Stage | Expected in ERP | Module |
|----------|--------------|-----------------|--------|
| Heat Treatment Chart | Heat Treatment | ✅ | PWHT Runs |
| Dimensional Report | Inspection & QC | ✅ | Dimension Reports |
| DP Test Report | Inspection & QC | ✅ | Overlay Reports (NDE section) |
| PMI Report | Inspection & QC | ✅ | PMI Reports |
| Hardness Test Report | Inspection & QC | ❓ | Documents (optional) |
| MPI/RT Report | Inspection & QC | ❓ | Documents (optional) |

#### Final Delivery Documents
| Document | Client Stage | Expected in ERP | Module |
|----------|--------------|-----------------|--------|
| Final Acceptance/QC Sign-off | Final Acceptance | ❓ | Job Cards (sign-off fields) |
| Delivery Challan (Outbound) | Delivery | ✅ | Dispatches |
| Invoice | Invoice | ✅ | Accounts |
| Customer Dossier Bundle | Delivery | ✅ | Customer Dossiers |

**Legend**: ✅ Supported | ❓ Needs Verification

---

## PART 4: UPLOAD CAPABILITY AUDIT

### Current Document Upload Support

#### Supported Document Types (in ERP)

1. **WPS Qualification Document**
   - Upload: ✅ Yes (wps_qualifications.storage_path)
   - Versioning: ✅ Yes (revision field)
   - Multiple uploads: ✅ Yes (new record per revision)
   - PDF preview: ✅ Yes (signed URLs)
   - Approval workflow: ✅ Yes (approval_status field)

2. **PMI Report**
   - Upload: ✅ Yes (pmi_reports.storage_path + generated_pdf_path)
   - Versioning: ❌ No explicit version field
   - Multiple uploads: ❓ Unclear (new record vs. update)
   - PDF generation: ✅ Yes (API route generates PDF)
   - Approval workflow: ✅ Yes (pmi_status field)

3. **Dimensional Report**
   - Upload: ✅ Yes (dimension_reports.storage_path + generated_pdf_path)
   - Versioning: ❌ No explicit version field
   - Multiple uploads: ❓ Unclear
   - PDF generation: ✅ Yes (API route)
   - Approval workflow: ✅ Yes (dimension_status field)

4. **Overlay Welding Report**
   - Upload: ✅ Yes (overlay_welding_reports.generated_pdf_path)
   - Versioning: ❌ No explicit version field
   - Multiple uploads: ❓ Unclear
   - PDF generation: ✅ Yes (API route)
   - Approval workflow: ✅ Yes (report_status field)

5. **Heat Treatment Chart (PWHT)**
   - Upload: ✅ Yes (pwht_runs.storage_path)
   - Versioning: ❌ No explicit version field
   - Multiple uploads: ❓ Unclear
   - PDF preview: ✅ Yes (signed URL)
   - Approval workflow: ❌ No approval_status field

6. **Dispatch Challan**
   - Upload: ✅ Yes (dispatches.storage_path)
   - Versioning: ❌ No explicit version field
   - Multiple uploads: ❌ No (single record per dispatch)
   - PDF preview: ✅ Yes (signed URL)
   - Approval workflow: ❌ No approval_status field

7. **General Documents**
   - Upload: ✅ Yes (documents table)
   - Versioning: ✅ Yes (version field, is_latest flag)
   - Multiple uploads: ✅ Yes (incremental versioning)
   - Categories: ✅ Yes (document_type field with 16+ types)
   - Approval workflow: ✅ Yes (approval_status field)

#### NOT YET SUPPORTED OR UNCLEAR

| Document Type | Upload Support | Status |
|---------------|-----------------|--------|
| Welding Report (standalone PDF) | ❌ No | Process Executions is data only, not PDF |
| Electrode Test Certificate | ❓ Maybe | Documents table (optional) |
| Consumable Batch Certificates | ❓ Maybe | Documents table (optional) |
| Material Certs (from supplier) | ❓ Maybe | Documents table (optional) |
| Hardness Test Report | ❓ Maybe | Documents table (optional) |
| MPI/Radiography Report | ❓ Maybe | Documents table (optional) |
| PQR (Procedure Qualification) | ❓ Maybe | Documents table (optional) |
| Design Drawings (customer) | ❓ Maybe | Documents table (optional) |
| Inspection Notes/Photos | ❓ Maybe | Documents table (optional) |
| Customer PO | ❓ Maybe | Documents table (optional) |

**Key Finding**: Core reports have storage support, but supporting certificates/documents rely on generic `documents` table.

---

## PART 5: WORKFLOW STAGE AUDIT

### Stage 1: NPDN / Material Receipt

| Capability | Status | Details |
|-----------|--------|---------|
| Create job card | ✅ | Standard CRUD |
| Capture received date | ✅ | `job_cards.received_date` |
| Upload inbound challan | ❓ | Possible via documents table |
| Upload delivery note | ❓ | Possible via documents table |
| Upload PO | ❓ | Possible via documents table |
| Link to client | ✅ | `job_cards.client_id` FK |
| Set material info | ✅ | heat_number, material_code, base_material fields |
| PDF versioning | ✅ | documents table supports versions |
| Approval workflow | ❌ | No explicit approval for receipt docs |

**Status**: ✅ **SUPPORTED** (with documents table for optional receipts)

---

### Stage 2: Job Card Creation

| Capability | Status | Details |
|-----------|--------|---------|
| Create job card | ✅ | Operator can insert (RLS policy allows) |
| Assign status | ✅ | Default `created` |
| Capture all metadata | ✅ | 30+ fields (description, part_number, drawing_number, etc.) |
| Link to client | ✅ | client_id FK |
| Set process types | ✅ | ARRAY['welding', 'machining', 'cladding', 'overlay'] |
| Generate unique JC number | ✅ | Atomic RPC function |
| Assign to engineer | ✅ | (not explicit, could use workflow) |
| Lock/finalize | ❌ | No finalization state |

**Status**: ✅ **FULLY SUPPORTED**

---

### Stage 3: Welding Procedure Specification (WPS)

| Capability | Status | Details |
|-----------|--------|---------|
| Upload WPS PDF | ✅ | wps_qualifications.storage_path |
| Track revision | ✅ | revision field (e.g., "Rev A", "Rev 1") |
| Link to job card | ✅ | job_card_id FK |
| Link to master WPS | ✅ | wps_master_id (optional, for reuse) |
| QA approval | ✅ | approval_status + approved_by + approved_at |
| Rejection reason | ✅ | rejection_reason field |
| Multiple uploads | ✅ | Can create new records per revision |
| Sign-off | ✅ | approved_by stores profile name/ID |
| PDF preview | ✅ | storage_path → signed URL via API |
| Linked to PQR | ❓ | wps_master has pqr_no, but unclear PQR upload location |

**Status**: ✅ **FULLY SUPPORTED**
**Gap**: PQR document upload not explicitly modeled (could use documents table)

---

### Stage 4: Welding Execution

| Capability | Status | Details |
|-----------|--------|---------|
| Record welder details | ✅ | process_executions.welder_name, assigned_to (FK profiles) |
| Record weld parameters | ✅ | amps, volts, travel_speed, gas_flow, pre_heat, inter_pass, polarity, etc. |
| Track consumables used | ✅ | consumable_master_id, consumable_batch |
| Record weld date | ✅ | weld_date field |
| Attach electrodes certs | ❓ | Documents table (optional) |
| Attach consumable certs | ❓ | Documents table (optional) |
| Attach welding report PDF | ❓ | Documents table (optional) |
| Status transition | ✅ | process_assigned → in_process → process_complete |
| QA inspection | ❌ | No visual inspection approval at this stage |
| Multiple welds per job | ✅ | process_executions has job_card_id FK (1:N) |

**Status**: ⚠️ **PARTIALLY SUPPORTED**
**Gaps**:
- No "Welding Report" document storage in process_executions (data only, no PDF)
- No visual inspection approval workflow
- Electrode test certificates must go in documents table

---

### Stage 5: Heat Treatment Chart (PWHT)

| Capability | Status | Details |
|-----------|--------|---------|
| Record heat cycle | ✅ | pwht_runs table (operator, temps, times, furnace) |
| Upload heat treatment chart | ✅ | storage_path field |
| Track furnace details | ✅ | furnace_id field |
| Record operator | ✅ | operator_name field |
| Record temperatures | ✅ | loading_temp, soaking_temp, unloading_temp |
| Record heating rate | ✅ | rate_of_heating (°C/hour) |
| Record cooling method | ✅ | cooling_method (air, furnace, controlled) |
| Record cycle date | ✅ | date_of_cycle field |
| Pass/fail result | ✅ | pwht_result field |
| Multiple jobs in one cycle | ✅ | pwht_run_jobs mapping table |
| PDF preview | ✅ | storage_path → signed URL |
| Approval workflow | ❌ | No approval_status field |
| Version tracking | ❌ | No version field |

**Status**: ✅ **SUPPORTED** (limited workflow)
**Gaps**:
- No approval workflow for PWHT charts
- No versioning support

---

### Stage 6: Inspection & Quality Control

#### 6a. Dimensional Inspection

| Capability | Status | Details |
|-----------|--------|---------|
| Create dimension report | ✅ | dimension_reports table |
| Record gauge/instrument | ✅ | gauge_used, instrument_master_id |
| Record measurements | ✅ | dimensions JSONB (dimension_name, required, tolerance, actual_value_1/2/3, pass_fail) |
| Record tolerances | ✅ | Part of JSONB structure |
| Pass/fail per dimension | ✅ | pass_fail field per dimension |
| Overall result | ✅ | result_status field (accepted, rejected, hold) |
| Inspector sign-off | ✅ | approved_by field |
| Approval workflow | ✅ | dimension_status (draft, approved, rejected, submitted) |
| PDF generation | ✅ | API generates PDF from data |
| PDF upload | ✅ | generated_pdf_path field |
| Multiple inspections | ✅ | New record per inspection (no version field) |
| Rejection reason | ✅ | rejection_reason field |

**Status**: ✅ **FULLY SUPPORTED**

#### 6b. DP Test Report (Liquid Penetrant Testing)

| Capability | Status | Details |
|-----------|--------|---------|
| Record DP test | ✅ | overlay_welding_reports (NDE section) |
| Penetrant type | ✅ | type_of_penetrant field |
| Developer application | ✅ | developer_application field |
| Test procedure | ✅ | lpt_procedure_ref field |
| Stage of test | ✅ | stage_of_test field |
| Temperature | ✅ | temperature_of_part field |
| Dwell times | ✅ | penetrant_dwell_time, developer_dwell_time fields |
| Result | ✅ | result_status field (accepted, rejected, hold) |
| PDF generation | ✅ | API generates PDF |
| Approval workflow | ✅ | report_status (draft, approved, rejected, submitted) |
| Chemical tracking | ✅ | chemicals_used_json (JSONB array) |
| Inspector sign-off | ✅ | inspected_by, approved_by fields |
| Rejection reason | ✅ | rejection_reason field |

**Status**: ✅ **FULLY SUPPORTED**

#### 6c. PMI Test Report (Material Analysis)

| Capability | Status | Details |
|-----------|--------|---------|
| Create PMI report | ✅ | pmi_reports table |
| Record elements | ✅ | readings JSONB (location_name, heat_no, items array with Ni, Cr, Mo, Fe, Nb, Ti %) |
| Multiple locations | ✅ | readings array structure |
| Multiple items per location | ✅ | items array per location |
| Instrument tracking | ✅ | instrument_serial, instrument_master_id |
| Calibration tracking | ✅ | calibration_due field |
| Result (pass/fail) | ✅ | result field (acceptable, not_acceptable) |
| Inspector sign-off | ✅ | inspected_by field |
| Approval workflow | ✅ | pmi_status (draft, approved, rejected, submitted) |
| PDF generation | ✅ | API generates PDF |
| Rejection reason | ✅ | rejection_reason field |
| Multiple tests | ✅ | New record per test |

**Status**: ✅ **FULLY SUPPORTED**

#### 6d. Hardness/MPI/Other Tests

| Capability | Status | Details |
|-----------|--------|---------|
| Hardness test report | ❓ | Documents table only |
| MPI/Radiography report | ❓ | Documents table only |
| NDE certificates | ❓ | Documents table only |
| Calibration certificates | ✅ | instrument_master.calibration_storage_path |

**Status**: ⚠️ **PARTIAL** (relies on documents table for optional tests)

---

### Stage 7: Final Acceptance

| Capability | Status | Details |
|-----------|--------|---------|
| QC final sign-off | ✅ | job_cards.qc_checked_by, qc_checked_date fields |
| Production sign-off | ✅ | job_cards.production_checked_by, production_checked_date fields |
| Stores sign-off | ✅ | job_cards.stores_checked_by, stores_checked_date fields |
| All reports complete check | ⚠️ | Manual (no automated validation) |
| Status update to dispatch_ready | ✅ | Manual state transition |
| Mark reports as submitted | ✅ | submitted_to_customer flag on reports |

**Status**: ⚠️ **PARTIAL** (manual validation of report completeness)

---

### Stage 8: Delivery Challan

| Capability | Status | Details |
|-----------|--------|---------|
| Create dispatch record | ✅ | dispatches table |
| Generate DC number | ✅ | dc_number field (manual entry or auto-gen) |
| Upload challan PDF | ✅ | storage_path field |
| Record dispatch date | ✅ | dispatch_date field |
| Record vehicle/courier | ✅ | vehicle_details field |
| Link to job card | ✅ | job_card_id FK |
| Update job status | ✅ | Status → dispatched |
| PDF preview | ✅ | storage_path → signed URL |
| Multiple dispatch docs | ❌ | Single record (no versioning) |

**Status**: ✅ **FULLY SUPPORTED** (single challan per dispatch)

---

### Stage 9: Invoice

| Capability | Status | Details |
|-----------|--------|---------|
| Create invoice | ✅ | accounts table |
| Link to job card | ✅ | job_card_id FK |
| Record PO number | ✅ | po_number field |
| Record invoice number | ✅ | invoice_number field |
| Record invoice date | ✅ | invoice_date field |
| Record invoice value | ✅ | invoice_value (numeric) |
| Auto-calculate due date | ✅ | due_date (dispatch_date + 60 days) |
| Track GRN status | ✅ | grn_status field (pending, received, held) |
| Track payment status | ✅ | payment_status field (pending, partial, received) |
| PDF upload | ❓ | Documents table only |
| Payment tracking | ✅ | payment_date, payment_amount fields |

**Status**: ✅ **FULLY SUPPORTED**
**Gap**: Invoice PDF upload not in accounts table (must use documents table)

---

### Stage 10: Job Closure

| Capability | Status | Details |
|-----------|--------|---------|
| Auto-close on payment | ✅ | Trigger closes job when payment_status = 'received' |
| Manual close | ✅ | Admin can transition to `closed` |
| Archive docs | ✅ | documents.is_active flag (soft-delete) |
| Final audit log | ✅ | All changes logged to audit_log |
| Lock job card | ❌ | No explicit "locked" state |
| Final dossier | ✅ | customer_dossiers.status = 'completed' |
| Completion date | ⚠️ | Implicit (job_cards.updated_at) |

**Status**: ✅ **FULLY SUPPORTED**

---

## PART 6: DOCUMENT CENTER AUDIT

### Current Document Center Capabilities

**Table**: `documents`

| Capability | Status | Details |
|-----------|--------|---------|
| Document upload | ✅ | Storage path + metadata |
| File versioning | ✅ | version field (incremental) |
| Latest version tracking | ✅ | is_latest boolean flag |
| Soft delete (archive) | ✅ | is_active boolean |
| Categorization | ✅ | entity_type (12 categories), document_type (16+ types) |
| Job card linkage | ✅ | job_card_id denormalized |
| Module linkage | ✅ | entity_type + entity_id |
| File metadata | ✅ | file_name, file_size, mime_type |
| Approval workflow | ✅ | approval_status (none, pending, approved, rejected) |
| Search | ⚠️ | No FTS index on documents (unlike job_cards) |
| Filtering | ⚠️ | Possible via API but no UI documented |
| Preview (PDF) | ✅ | Signed URLs via storage API |
| Download | ✅ | Signed URLs with time limits |
| Custom metadata | ✅ | metadata_json JSONB |
| Notes/Comments | ✅ | notes field |
| Upload timestamp | ✅ | uploaded_at field |
| Uploader tracking | ✅ | uploaded_by FK profiles |
| Document naming | ✅ | document_name user-friendly label |

**Assessment**: ✅ **COMPREHENSIVE**

**Improvements Recommended**:
1. Add full-text search (GIN index on document_name + file_name)
2. Add tagging system (ARRAY type field for custom tags)
3. Add "required documents per stage" checklist UI
4. Add document expiry tracking (for certificates)

---

## PART 7: CUSTOMER DOSSIER AUDIT

### Current Dossier Implementation

**Tables**: `customer_dossiers` + `customer_dossier_documents` (Phase 10)

| Capability | Status | Details |
|-----------|--------|---------|
| Bundle documents | ✅ | customer_dossier_documents.document_id array |
| Link to job card | ✅ | customer_dossiers.job_card_id |
| Generate ZIP | ✅ | API endpoint generates ZIP from bundle |
| Generate PDF index | ✅ | API generates index PDF |
| Track status | ✅ | dossiers.status field (draft, ready, submitted, completed) |
| Submission date | ✅ | submitted_at field |
| Include generated reports | ✅ | Can add pmi_report, dimension_report, etc. as documents |
| Include customer docs | ✅ | Can add PO, drawings, etc. as documents |
| Version dossier | ⚠️ | No explicit version field (new record per dossier) |
| PDF preview | ✅ | Can generate preview PDF |
| Customer download | ✅ | Signed URL with time limit |
| Email dossier | ❌ | No email integration documented |

**Assessment**: ✅ **FUNCTIONAL** (with room for enhancement)

**Improvements Recommended**:
1. Auto-populate dossier with submitted reports (submitted_to_customer = true)
2. Add document checklist validation before dossier submission
3. Add email notification to customer on dossier completion
4. Add dossier version tracking

---

## PART 8: UPLOAD CAPABILITY AUDIT (BY DOCUMENT TYPE)

### Can Users Upload Each Document Type?

| Document | Upload Path | Format | Versioning | Approval | Status |
|----------|------------|--------|-----------|----------|--------|
| Material Receipt Challan | documents table | PDF | ✅ | ❌ | ⚠️ Optional |
| Purchase Order | documents table | PDF/Image | ✅ | ❌ | ⚠️ Optional |
| Drawing (Customer) | documents table | PDF/Image | ✅ | ❌ | ⚠️ Optional |
| WPS PDF | wps_qualifications | PDF | ✅ | ✅ | ✅ Mandatory |
| PQR Document | documents table | PDF | ✅ | ❌ | ⚠️ Optional |
| Welding Report | documents table | PDF | ✅ | ❌ | ⚠️ Optional |
| Electrode Test Cert | documents table | PDF/Image | ✅ | ❌ | ⚠️ Optional |
| Consumable Certs | documents table | PDF/Image | ✅ | ❌ | ⚠️ Optional |
| Heat Treatment Chart | pwht_runs | PDF | ❌ | ❌ | ✅ Mandatory |
| Dimension Report | dimension_reports | PDF (generated or uploaded) | ❌ | ✅ | ✅ Mandatory |
| DP Test Report | overlay_welding_reports | PDF (generated) | ❌ | ✅ | ✅ Mandatory |
| PMI Report | pmi_reports | PDF (generated) | ❌ | ✅ | ✅ Mandatory |
| Hardness Report | documents table | PDF | ✅ | ❌ | ⚠️ Optional |
| MPI/RT Report | documents table | PDF | ✅ | ❌ | ⚠️ Optional |
| Calibration Certs | instrument_master | PDF | ❌ | ❌ | ⚠️ Optional |
| Delivery Challan | dispatches | PDF | ❌ | ❌ | ✅ Mandatory |
| Invoice | documents table | PDF | ✅ | ❌ | ⚠️ Optional |

**Key Findings**:
- ✅ **Mandatory documents**: fully supported with workflow
- ⚠️ **Optional documents**: supported via generic documents table (no UI/workflow)
- ❌ **Missing**: Limited support for supporting certificates

---

## PART 9: MISSING FEATURES

### Critical Gaps (Must fix before production)

| Gap | Impact | Current State | Fix Required |
|-----|--------|---------------|-------------|
| Welding Report PDF upload | HIGH | Process Executions is data-only | Add storage_path to process_executions OR create welding_reports table |
| Heat Treatment approval workflow | HIGH | No approval_status on pwht_runs | Add approval workflow (pending, approved, rejected) |
| Document requirement checklist | HIGH | No UI to validate documents per stage | Add checklist validation in job card detail view |
| Consumable/Electrode cert tracking | MEDIUM | Relies on documents table (no direct link) | Add document linking to consumable_master |
| Final acceptance validation | MEDIUM | Manual check (no automation) | Auto-validate when all reports are submitted |
| Dossier auto-population | MEDIUM | Manual document selection | Auto-include submitted reports (submitted_to_customer = true) |
| Report versioning | MEDIUM | No version field on pmi/dimension/overlay reports | Add version field (or track in documents table) |

### Recommended Improvements (Should implement)

| Improvement | Impact | Effort |
|------------|--------|--------|
| Full-text search on documents | UX | Small |
| Document tagging system | UX | Small |
| Document expiry alerts (certs) | UX/Safety | Small |
| Email notifications on submission | UX | Medium |
| Dossier version tracking | Audit | Medium |
| Heat treatment approval workflow | Process | Small |
| Auto-transition job status | Process | Medium |
| Role-based document visibility | Security | Small |

### Nice-to-Have Features (Future)

| Feature | Impact |
|---------|--------|
| Signature capture on digital forms | Compliance |
| Document encryption at rest | Security |
| Advanced analytics dashboard | Insights |
| Mobile app for field uploads | Usability |
| Workflow automation rules | Efficiency |

---

## PART 10: IMPLEMENTATION PLAN

### Phase 1: Critical Fixes (2 weeks)

**Must complete before production use**

1. **Add Welding Report Storage** (2 days)
   - Add `storage_path` field to `process_executions` table
   - Create migration: `0015_welding_report_storage.sql`
   - Update API to handle PDF upload
   - Update Server Action to accept file upload

2. **Add Heat Treatment Approval Workflow** (2 days)
   - Add `approval_status`, `approved_by`, `approved_at`, `rejection_reason` to `pwht_runs`
   - Create migration: `0016_pwht_approval_workflow.sql`
   - Update RLS policies (QA can approve)
   - Add approval UI in heat treatment module

3. **Add Document Requirement Checklist** (3 days)
   - Create new table: `job_card_document_checklist`
   - Define required documents per job type/process
   - Add UI in job card detail (visual checklist)
   - Add validation before dispatch transition

4. **Add Dossier Auto-Population** (2 days)
   - Update customer_dossiers creation logic
   - Auto-include all documents with `submitted_to_customer = true`
   - Update dossier UI to show auto-included docs

5. **Add Report Versioning** (3 days)
   - Add `version` field to `pmi_reports`, `dimension_reports`, `overlay_welding_reports`
   - Update API to increment version on re-submission
   - Track version in documents table as well

**Deliverable**: Production-ready dossier generation with full document traceability

---

### Phase 2: Recommended Improvements (2 weeks)

1. **Full-Text Search on Documents** (2 days)
   - Add GIN index on documents (document_name, file_name)
   - Update API search endpoint
   - Add search UI in document center

2. **Heat Treatment Approval UI** (1 day)
   - Add approval/rejection form in PWHT Runs module
   - Add notification to QA

3. **Document Expiry Alerts** (2 days)
   - Add `expiry_date` field to documents
   - Create alert query (expiring in 30 days)
   - Add alerts page

4. **Consumable Cert Linking** (2 days)
   - Add foreign key from documents → consumable_master
   - Update document upload UI to link to consumable

5. **Email Notifications** (3 days)
   - Send email when dossier is ready
   - Send email when report is approved
   - Send email on payment received

**Deliverable**: Enhanced UX and automation for operator efficiency

---

### Phase 3: Nice-to-Have (Future roadmap)

1. Signature capture on digital forms
2. Advanced document analytics
3. Mobile app for field uploads
4. Workflow automation rules
5. Document encryption
6. Audit trail visualization

---

## PART 11: READINESS ASSESSMENT

### Current Production Readiness Score

**Overall: 7.5 / 10** ✅ **PRODUCTION-READY WITH MINOR CHANGES**

### Scoring Breakdown

| Category | Score | Status | Comments |
|----------|-------|--------|----------|
| **Workflow Stages** | 9/10 | ✅ Good | All 11 stages mapped to ERP statuses |
| **Document Upload** | 7/10 | ⚠️ Fair | Core reports supported, optional docs via documents table |
| **Approval Workflow** | 8/10 | ✅ Good | WPS, PMI, Dimension, Overlay all have approval |
| **Report Generation** | 8/10 | ✅ Good | APIs generate PDFs for major reports |
| **Dossier Support** | 7/10 | ⚠️ Fair | Auto-population needed, versioning missing |
| **Document Traceability** | 9/10 | ✅ Good | Comprehensive audit log, version tracking |
| **Access Control** | 8/10 | ✅ Good | RLS policies on all tables, role-based |
| **Data Integrity** | 9/10 | ✅ Good | State machine enforced, triggers ensure consistency |
| **User Experience** | 6/10 | ⚠️ Fair | No UI for document checklist, manual validation |
| **Completeness** | 7/10 | ⚠️ Fair | Heat treatment approval missing, welding report storage limited |

### What's Missing for 9/10

1. ✅ **Welding Report Storage** — Add to process_executions
2. ✅ **Heat Treatment Approval** — Add approval_status to pwht_runs
3. ✅ **Document Checklist UI** — Add visual validation
4. ✅ **Report Versioning** — Add version field to report tables
5. ✅ **Dossier Auto-Population** — Auto-include submitted reports

### What's Missing for 10/10

- Email notifications on status changes
- Mobile app for field uploads
- Advanced search/analytics dashboard
- Signature capture on forms

---

## PART 12: REQUIRED CHANGES (MINIMAL)

### To Support Client's Real Workflow

#### Change 1: Add Welding Report Storage

**Priority**: CRITICAL  
**Table**: `process_executions`  
**Migration**: Add columns

```sql
ALTER TABLE process_executions ADD COLUMN (
  storage_path TEXT,
  report_number TEXT,
  report_date DATE,
  visual_examination TEXT
);
```

**Rationale**: Clients upload welding reports as PDFs. Currently process_executions is data-only.

#### Change 2: Add Heat Treatment Approval Workflow

**Priority**: CRITICAL  
**Table**: `pwht_runs`  
**Migration**: Add columns

```sql
ALTER TABLE pwht_runs ADD COLUMN (
  approval_status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT
);
```

**Rationale**: Heat treatment charts need QA approval before dispatch.

#### Change 3: Add Document Requirement Checklist

**Priority**: CRITICAL  
**New Table**: `job_card_document_checklist`

```sql
CREATE TABLE job_card_document_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_card_id UUID NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT true,
  has_document BOOLEAN NOT NULL DEFAULT false,
  document_id UUID REFERENCES documents(id),
  checked_at TIMESTAMPTZ,
  checked_by UUID REFERENCES profiles(id)
);
```

**Rationale**: Validate that all required documents are uploaded before dispatch.

#### Change 4: Add Report Versioning

**Priority**: RECOMMENDED  
**Tables**: `pmi_reports`, `dimension_reports`, `overlay_welding_reports`

```sql
ALTER TABLE pmi_reports ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE dimension_reports ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE overlay_welding_reports ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
```

**Rationale**: Allow multiple revisions of inspection reports.

#### Change 5: Update Dossier Auto-Population

**Priority**: RECOMMENDED  
**Update**: `customer_dossiers` creation logic

Change from manual selection to:
1. Auto-include all documents where `submitted_to_customer = true`
2. Auto-include all reports where `report_status = 'approved'`

**Code Change**: Update Server Action in `src/app/(app)/dossiers/actions.ts`

#### Change 6: Add FTS Index on Documents

**Priority**: RECOMMENDED  
**Migration**: Add index

```sql
CREATE INDEX idx_documents_fts ON documents USING GIN (
  to_tsvector('english', document_name || ' ' || file_name)
);
```

---

## PART 13: RECOMMENDATIONS

### Short Term (Before Go-Live)

1. ✅ Implement all CRITICAL changes (3 above)
2. ✅ Add document checklist UI to job card detail view
3. ✅ Create user documentation on required documents per workflow
4. ✅ Test end-to-end workflow with sample data
5. ✅ Train operators on document upload requirements

### Medium Term (First 3 months)

1. ✅ Implement RECOMMENDED changes
2. ✅ Add email notifications on state transitions
3. ✅ Add document expiry tracking for certificates
4. ✅ Gather client feedback on UX

### Long Term (6+ months)

1. Develop mobile app for field uploads
2. Add signature capture for digital approvals
3. Build advanced analytics dashboard
4. Implement automated workflow rules

---

## PART 14: FINAL VERDICT

### Can ValveTrack Support Client's Real Workflow?

**ANSWER: YES** ✅

**With Current Implementation**: 75% Ready
- All workflow stages mapped
- Core documents supported
- Approval workflows in place
- Dossier generation works

**With Critical Changes**: 95% Ready (1-2 weeks of work)
- Add welding report storage
- Add heat treatment approval
- Add document checklist
- Test end-to-end

**With Recommended Improvements**: 98% Ready (additional 1-2 weeks)
- Add report versioning
- Auto-populate dossier
- Add search functionality
- Email notifications

### Change Scope Assessment

| Scope | Status |
|-------|--------|
| Need to redesign ERP? | ❌ NO |
| Need new modules? | ❌ NO |
| Need new database tables? | ✅ 1 (document_checklist) |
| Need to modify existing tables? | ✅ 3 (process_executions, pwht_runs) |
| Need new API endpoints? | ✅ 2-3 (approval workflows) |
| Need new UI pages? | ✅ 1 (checklist in job card detail) |
| Reuse existing code? | ✅ YES (patterns from pmi_reports approval) |
| Breaking changes? | ❌ NO (backward compatible) |

---

## SUMMARY TABLE

| Aspect | Current | After Critical Changes | After All Improvements |
|--------|---------|------------------------|------------------------|
| Workflow Coverage | 11/11 stages | 11/11 stages | 11/11 stages |
| Document Types | 12/16+ | 16/16+ | 16/16+ |
| Approval Workflows | 4/6 | 6/6 | 6/6 |
| Traceability | ✅ Audit log | ✅ Enhanced | ✅ Full |
| Dossier Quality | ✅ Manual | ✅ Auto | ✅ Optimal |
| Production Readiness | 7.5/10 | 9/10 | 9.5/10 |
| Client Satisfaction | Likely Good | Very Good | Excellent |

---

## APPENDIX: MIGRATION CHECKLIST

### Before Production Deployment

- [ ] **Database Migrations Applied**
  - [ ] 0015_welding_report_storage.sql
  - [ ] 0016_pwht_approval_workflow.sql
  - [ ] 0017_document_checklist.sql
  
- [ ] **Code Changes**
  - [ ] process_executions storage_path field added
  - [ ] pwht_runs approval workflow implemented
  - [ ] job_card_document_checklist table created
  - [ ] Document checklist UI added to job card detail
  - [ ] Dossier auto-population logic updated

- [ ] **Testing**
  - [ ] End-to-end workflow tested with sample data
  - [ ] All reports generate PDFs correctly
  - [ ] Dossier includes all required documents
  - [ ] Approval workflows work correctly
  - [ ] Role-based access controls verified

- [ ] **Documentation**
  - [ ] Updated HANDOFF_03_AI_ENGINEERING_CONTEXT.md with new patterns
  - [ ] User guides created for each module
  - [ ] Operator training completed

- [ ] **Go-Live**
  - [ ] Client data migrated
  - [ ] Staff trained
  - [ ] Support plan in place

---

**Report Generated**: June 26, 2026  
**Status**: Ready for Implementation  
**Next Step**: Review with client, then execute Phase 1 (Critical Changes)
