# ValveTrack ERP - Complete Database Schema

---

## Overview

- **DBMS**: PostgreSQL 17 (Supabase Cloud)
- **Tables**: 22 total
- **Migrations**: 14 SQL files (0001 through 0014)
- **RLS Policies**: 30+ (one row group per table per role)
- **SQL Functions**: 10+ (state machine, audit logging, helpers)
- **Triggers**: 15+ (auto-updated timestamps, audit, status transitions)
- **Enums**: 9 custom types
- **Indexes**: 30+ (performance optimization)

---

## Database Initialization

### Key Extensions
```sql
create extension if not exists "pgcrypto";  -- uuid generation, password hashing
```

### Auth Schema (Built-in)
Supabase provides:
- `auth.users` — credentials, JWT claims
- `auth.sessions` — active sessions
- `auth.uid()` — current user ID (used in RLS)

---

## Schema: Detailed Table Documentation

### 1. profiles (Users & Roles)
**Purpose**: User account information and role assignment  
**Location**: `src/types/database.ts` line 478

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | uuid | PK, FK auth.users(id) ON DELETE CASCADE | User ID |
| `full_name` | text | NOT NULL | Display name |
| `role` | text | NOT NULL, CHECK in ('admin','operator','engineer','qa','accounts','management') | Role assignment |
| `phone` | text | nullable | Contact number |
| `is_active` | boolean | NOT NULL DEFAULT true | Soft-delete flag |
| `created_at` | timestamptz | NOT NULL DEFAULT now() | Account creation timestamp |

**RLS Policies**:
- `profiles_select_all` — Everyone can read all profiles (needed for "uploaded_by" display)
- `profiles_admin_all` — Only admin can INSERT/UPDATE/DELETE
- **No user can self-delete** — is_active flag managed by admin only

**Relationships**: Referenced by job_cards (created_by), wps_qualifications (uploaded_by, approved_by), all entities (who-did-what)

---

### 2. clients (Customer Records)
**Purpose**: Customer/vendor information  
**Location**: Migration 0001

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | uuid | PK DEFAULT gen_random_uuid() | Client ID |
| `name` | text | NOT NULL UNIQUE | Company name |
| `contact_name` | text | nullable | Person name |
| `contact_email` | text | nullable | Email |
| `contact_phone` | text | nullable | Phone |
| `address` | text | nullable | Physical address |
| `created_at` | timestamptz | NOT NULL DEFAULT now() | Record creation |

**RLS Policies**:
- `clients_select_all` — Everyone reads
- `clients_admin_write` — Only admin can INSERT/UPDATE/DELETE

**Indexes**:
- Implicit on `name` (UNIQUE)

**Relationships**:
- `job_cards.client_id` → `clients.id` (FK)

---

### 3. job_cards (Master Work Order Table)
**Purpose**: Central job order tracking — single source of truth  
**Location**: Migration 0001 (extended in 0010 Phase 6)  
**Criticality**: CORE — most complex table

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | uuid | PK DEFAULT gen_random_uuid() | Job card ID |
| `jc_number` | text | NOT NULL UNIQUE | Human-readable ID (e.g., JC/2026/001) |
| `client_id` | uuid | NOT NULL FK clients(id) | Which customer |
| `nbdn_number` | text | NOT NULL UNIQUE | Purchase order tracking number |
| `po_number` | text | nullable | Customer PO reference |
| `description` | text | NOT NULL | Work description |
| `drawing_number` | text | nullable | CAD drawing reference |
| `heat_number` | text | nullable | Material heat/lot number |
| `part_number` | text | nullable | BOM part number |
| `quantity` | integer | NOT NULL DEFAULT 1, CHECK > 0 | Units to process |
| `process_type` | text[] | NOT NULL, CHECK <@ ['welding','machining','cladding','overlay'] | Array of process types |
| `received_date` | date | NOT NULL DEFAULT current_date | Inbound date |
| `status` | text | NOT NULL DEFAULT 'created', CHECK in (14 enum values) | State machine value |
| `previous_status` | text | nullable | For state transition logging |
| `stage_entered_at` | timestamptz | NOT NULL DEFAULT now() | When entered current status |
| `created_by` | uuid | nullable FK profiles(id) | Creator user |
| `created_at` | timestamptz | NOT NULL DEFAULT now() | Creation timestamp |
| `updated_at` | timestamptz | NOT NULL DEFAULT now() | Last update timestamp |
| **Phase 6 additions** | | | Product-specific details |
| `product_group` | text | nullable | E.g., "Gate Valves", "Check Valves" |
| `buyer` | text | nullable | Purchasing person/company |
| `material_code` | text | nullable | Material specification |
| `valve_size_class` | text | nullable | DN/size (DN50, DN100, etc.) |
| `valve_type_component` | text | nullable | Component type |
| `base_material` | text | nullable | Primary material (SS316, Carbon Steel, etc.) |
| `overlay_material` | text | nullable | Cladding/overlay material (if applicable) |
| `base_material_grade` | text | nullable | Material grade (A/B/D, etc.) |
| `regularization` | text | nullable | Regulatory compliance code |
| `ring_heat_no` | text | nullable | For overlaid ring tracking |
| `mpi_rt_no` | text | nullable | Magnet Particle Inspection / Radiography reference |
| **Phase 6 sign-offs** | | | QC checkpoints |
| `production_checked_by` | text | nullable | Production supervisor sign-off |
| `production_checked_date` | date | nullable | QC check date |
| `qc_checked_by` | text | nullable | QA inspector name |
| `qc_checked_date` | date | nullable | QA check date |
| `stores_checked_by` | text | nullable | Warehouse verification |
| `stores_checked_date` | date | nullable | Stores check date |

**RLS Policies**:
- `job_cards_select_all` — Everyone reads
- `job_cards_admin_all` — Admin full access
- `job_cards_operator_insert` — Operator can create (INSERT)
- `job_cards_engineer_update` — Engineer can update (Phase 6)
- `job_cards_qa_update` — QA can update (Phase 6)

**Triggers**:
- `trg_job_cards_updated_at` — Auto-set updated_at before each UPDATE
- `trg_enforce_job_card_status_transition` — Validate state machine transitions
- `trg_log_job_card_status_change` — Log status changes to audit_log (SECURITY DEFINER)

**Indexes**:
- `idx_jc_status` on (status) — Quick "all open jobs" queries
- `idx_jc_client` on (client_id, status) — Filter by customer
- `idx_jc_nbdn`, `idx_jc_po`, `idx_jc_drawing`, `idx_jc_heat`, `idx_jc_part` — Lookup by reference
- `idx_jc_stage_entered` on (stage_entered_at) — Overdue job detection
- `idx_jc_fts` — Full-text search GIN index

**Status Lifecycle** (14 states + on_hold):
```
created → wps_pending → wps_uploaded → wps_approved → process_assigned → 
in_process → process_complete → reports_pending → reports_complete → 
dispatch_ready → dispatched → accounts_processing → closed
```
Plus `on_hold` (admin-only, can jump to any state from any state)

---

### 4. wps_qualifications (Welding Procedure Specification per Job)
**Purpose**: WPS document upload and approval workflow  

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | uuid | PK DEFAULT gen_random_uuid() | Qualification ID |
| `job_card_id` | uuid | NOT NULL FK job_cards(id) ON DELETE CASCADE | Which job |
| `wps_number` | text | NOT NULL | WPS code (e.g., WPS/RE/703) |
| `revision` | text | nullable | Document revision |
| `doc_url` | text | nullable | DEPRECATED (use storage_path) |
| `approval_status` | text | NOT NULL DEFAULT 'pending', CHECK in ('pending','approved','rejected') | Approval state |
| `approved_by` | uuid | nullable FK profiles(id) | QA approver |
| `approved_at` | timestamptz | nullable | Approval timestamp |
| `rejection_reason` | text | nullable | If rejected |
| `uploaded_by` | uuid | nullable FK profiles(id) | Uploader |
| `uploaded_at` | timestamptz | NOT NULL DEFAULT now() | Upload time |
| `wps_master_id` | uuid | nullable FK wps_master(id) ON DELETE SET NULL | Link to reusable master (Phase 1) |
| `storage_path` | text | nullable | Supabase Storage path |

**RLS Policies**:
- `wps_select_all` — Everyone reads
- `wps_admin_all` — Admin full access
- `wps_qa_insert` — QA can upload
- `wps_qa_update` — QA can approve/reject

---

### 5. pmi_reports (Material Composition Analysis)
**Purpose**: Positive Material Identification (elemental analysis)  
**Location**: Migration 0001 (extended Phase 5, 0008–0009)

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | uuid | PK | Report ID |
| `job_card_id` | uuid | NOT NULL FK job_cards(id) ON DELETE CASCADE | Which job |
| `readings` | jsonb | NOT NULL | Structured PMI data (array of PmiLocation) |
| `instrument_name` | text | nullable | DEPRECATED (use instrument_master) |
| `instrument_serial` | text | nullable | Serial number |
| `calibration_due` | date | nullable | Instrument calibration expiry |
| `result` | text | CHECK in ('acceptable','not_acceptable') | Overall pass/fail |
| `doc_url` | text | nullable | DEPRECATED |
| `uploaded_by` | uuid | nullable FK profiles(id) | Inspector |
| `created_at` | timestamptz | NOT NULL DEFAULT now() | Report date |
| `instrument_master_id` | uuid | nullable FK instrument_master(id) | Instrument reference |
| `storage_path` | text | nullable | Generated PDF path |
| **Phase 5 additions** | | | Customer-facing fields |
| `report_number` | text | nullable | Report ID for customer (e.g., PMI-2026-001) |
| `report_date` | date | nullable | Official report date |
| `customer` | text | nullable | Customer name (from job_cards.client.name) |
| `quantity` | text | nullable | Number of items tested |
| `order_number` | text | nullable | Customer order reference |
| `item_no` | text | nullable | BOM item |
| `valve_size_class` | text | nullable | Size (DN50, etc.) |
| `valve_type_component` | text | nullable | Component type |
| `base_material` | text | nullable | Material specification |
| `overlay_material` | text | nullable | If applicable |
| `drawing_number` | text | nullable | Drawing reference |
| `procedure_ref` | text | nullable | Testing procedure used |
| `heat_no` | text | nullable | Material lot/heat number |
| `annotated_drawing_path` | text | nullable | Marked-up drawing image |
| `pmi_status` | text | NOT NULL DEFAULT 'draft', CHECK in ('draft','approved','rejected','submitted') | Approval workflow |
| `approved_by_name` | text | nullable | Approver name |
| `approved_at` | timestamptz | nullable | Approval time |
| `rejection_reason` | text | nullable | If rejected |
| `submitted_to_customer` | boolean | NOT NULL DEFAULT false | In dossier? |
| `submitted_at` | timestamptz | nullable | Customer submission time |
| `generated_pdf_path` | text | nullable | Path to generated PDF |
| `inspected_by` | text | nullable | Inspector name |

**RLS Policies**:
- `pmi_select_all` — Everyone reads
- `pmi_admin_all` — Admin full access
- `pmi_qa_insert` — QA can create
- `pmi_qa_update` — QA can approve/reject (if not submitted)

**PmiReadings JSON Structure**:
```typescript
type PmiReadings = Array<{
  location_name: string          // e.g., "Heat 1"
  heat_no: string | null         // Material lot number
  items: Array<{
    reading_no: number           // Sequence number
    ni: number | null            // Nickel %
    cr: number | null            // Chromium %
    mo: number | null            // Molybdenum %
    fe: number | null            // Iron %
    nb: number | null            // Niobium %
    ti: number | null            // Titanium %
  }>
}>
```

---

### 6. dimension_reports (Dimensional Inspection)
**Purpose**: Geometric measurements and tolerances  
**Location**: Migration 0001 (extended Phase 7, 0011–0012)

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | uuid | PK | Report ID |
| `job_card_id` | uuid | NOT NULL FK job_cards(id) ON DELETE CASCADE | Which job |
| **Legacy JSONB** | | | Backward compat (Phase 0) |
| `required_dimensions` | jsonb | NOT NULL | Original format (not used now) |
| `tolerances` | jsonb | nullable | Original format |
| `sample_readings` | jsonb | NOT NULL | Original format |
| `overall_result` | text | nullable (was NOT NULL), CHECK in ('pass','fail') | Legacy result field |
| `instrument_used` | text | nullable | Gauge name |
| `visual_result` | text | nullable | Visual inspection notes |
| `inspected_by` | text | nullable | Inspector |
| `approved_by_name` | text | nullable | Approver |
| `doc_url` | text | nullable | DEPRECATED |
| `created_by` | uuid | nullable FK profiles(id) | Creator |
| `created_at` | timestamptz | NOT NULL DEFAULT now() | Created |
| `instrument_master_id` | uuid | nullable FK instrument_master(id) | Gauge reference |
| `storage_path` | text | nullable | Generated PDF |
| **Phase 7 additions** | | | New canonical format |
| `report_number` | text | nullable | Customer report ID |
| `report_date` | date | nullable | Report date |
| `vendor_name` | text | nullable | Supplier/vendor name |
| `description` | text | nullable | Work item description |
| `drawing_number` | text | nullable | Drawing reference |
| `drawing_revision` | text | nullable | Drawing rev (e.g., A, B1) |
| `po_number` | text | nullable | Customer PO |
| `material_code` | text | nullable | Material spec |
| `sample_number` | text | nullable | Sample/batch number |
| `heat_number` | text | nullable | Material lot |
| `mp_dp_number` | text | nullable | Particle/penetrant inspection ref |
| `visual_satisfactory` | boolean | nullable | Visual OK? |
| `gauge_used` | text | nullable | Measurement equipment |
| `approved_by` | text | nullable | Approver name |
| `dimension_status` | text | NOT NULL DEFAULT 'draft', CHECK in ('draft','approved','rejected','submitted') | Workflow state |
| `result_status` | text | nullable, CHECK in ('accepted','rejected','hold') | Pass/fail/hold |
| `generated_pdf_path` | text | nullable | PDF path |
| `submitted_to_customer` | boolean | NOT NULL DEFAULT false | In dossier? |
| `submitted_at` | timestamptz | nullable | Submission time |
| `approved_at` | timestamptz | nullable | Approval time |
| `rejection_reason` | text | nullable | If rejected |
| `dimensions` | jsonb | nullable | Array of DimensionRow objects |

**DimensionRow JSON Structure**:
```typescript
type DimensionRow = {
  dimension_name: string      // e.g., "OD Flange"
  required_dimension: string  // e.g., "100 ± 0.5"
  tolerance: string           // e.g., "+0.5/-0.5"
  actual_value_1: string      // First measurement
  actual_value_2: string      // Second measurement
  actual_value_3: string      // Third measurement
  pass_fail: "pass" | "fail" | "na"
  remarks: string             // Notes
}
```

**RLS Policies**:
- `dimension_select_all` — Everyone reads
- `dimension_admin_all` — Admin full access
- `dimension_qa_insert` — QA can create
- `dimension_qa_update` — QA can update (if not submitted)

---

### 7. overlay_welding_reports (Overlay/Cladding Report)
**Purpose**: Overlay welding inspection & testing results  
**Location**: Migration 0013 (Phase 8)

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | uuid | PK | Report ID |
| `job_card_id` | uuid | NOT NULL FK job_cards(id) ON DELETE CASCADE | Which job |
| `report_number` | text | nullable | Report ID |
| `report_date` | date | nullable | Report date |
| `vendor_name` | text | nullable | Supplier |
| `vendor_number` | text | nullable | Vendor code |
| `customer_name` | text | nullable | Customer |
| `po_number` | text | nullable | Customer PO |
| `nbdn_number` | text | nullable | Order number |
| `material_code` | text | nullable | Material spec |
| `drawing_number` | text | nullable | Drawing ref |
| `wps_number` | text | nullable | WPS used |
| `item_description` | text | nullable | Item description |
| `quantity` | text | nullable | Number of items |
| `base_material_grade` | text | nullable | Base material |
| `heat_number` | text | nullable | Heat/lot number |
| `test_coupon_number` | text | nullable | Test coupon ID |
| `dimension_report_number` | text | nullable | Related dimension report |
| `welder_name` | text | nullable | Welder |
| `visual_examination` | text | nullable | Visual pass/fail |
| `process` | text | nullable | Welding process (GMAW, SMAW, etc.) |
| `job_card_number` | text | nullable | JC reference |
| `job_card_date` | date | nullable | JC date |
| `deposit_material` | text | nullable | Filler material |
| `aws_class_number` | text | nullable | AWS classification |
| `consumable_make` | text | nullable | Consumable brand |
| `consumable_batch_number` | text | nullable | Consumable batch |
| `date_of_welding` | date | nullable | Weld date |
| `heat_treatment_chart_number` | text | nullable | PWHT chart reference |
| `hardness_required` | text | nullable | Hardness spec (HV, etc.) |
| `hardness_actual` | text | nullable | Measured hardness |
| `deposit_thickness_condition` | text | nullable | As-welded condition |
| `deposit_thickness_required` | text | nullable | Required thickness |
| `deposit_thickness_actual` | text | nullable | Actual thickness |
| **NDE / LPT Section** | | | Non-destructive testing |
| `lpt_procedure_ref` | text | nullable | Procedure spec |
| `type_of_penetrant` | text | nullable | Penetrant type |
| `stage_of_test` | text | nullable | Pre/post cleaning |
| `penetrant_application` | text | nullable | Application method |
| `penetrant_removal` | text | nullable | Removal method |
| `evaluation_of_dp_test` | text | nullable | Test results |
| `temperature_of_part` | text | nullable | Test temperature |
| `penetrant_dwell_time` | text | nullable | Dwell time |
| `surface_condition` | text | nullable | Surface prep |
| `developer_application` | text | nullable | Developer application |
| `post_cleaning` | text | nullable | Post-test cleaning |
| `developer_dwell_time` | text | nullable | Developer dwell |
| `chemicals_used_json` | jsonb | nullable | Array of chemicals |
| `result_status` | text | nullable, CHECK in ('accepted','rejected','hold') | Pass/fail/hold |
| `remarks` | text | nullable | General remarks |
| `inspected_by` | text | nullable | Inspector |
| `approved_by` | text | nullable | Approver |
| `rejection_reason` | text | nullable | If rejected |
| `report_status` | text | NOT NULL DEFAULT 'draft', CHECK in ('draft','approved','rejected','submitted') | Workflow |
| `generated_pdf_path` | text | nullable | PDF path |
| `submitted_to_customer` | boolean | NOT NULL DEFAULT false | In dossier? |
| `submitted_at` | timestamptz | nullable | Submission time |
| `approved_at` | timestamptz | nullable | Approval time |
| `created_by` | uuid | nullable FK profiles(id) | Creator |
| `created_at` | timestamptz | NOT NULL DEFAULT now() | Created |
| `updated_at` | timestamptz | NOT NULL DEFAULT now() | Updated |

**ChemicalEntry JSON**:
```typescript
type OverlayChemicalEntry = {
  chemical_type: string    // "penetrant", "developer", "cleaner", "remover"
  chemical_name: string
  manufacturer: string
  batch_no: string
  expiry_date: string
}
```

---

### 8–11. Master Data Tables

#### 8. wps_master (Reusable Welding Procedures)
**Purpose**: Library of approved welding procedures (Phase 1)

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | PK |
| `wps_no` | text | UNIQUE, procedure code |
| `pqr_no` | text | Procedure Qualification Record |
| `welding_process` | text | GTAW, SMAW, FCAW, SAW |
| `type` | text | Manual, Semi-auto, Auto |
| `scope` | text | Applicability scope |
| `joint_design` | text | BW, FW, etc. |
| `base_material` | text | Material spec |
| `filler_material` | text | Electrode/wire |
| `filler_aws_class` | text | AWS grade |
| `filler_size` | text | 2.4mm, 3.15mm, etc. |
| `position` | text | 1G, 2G, 3G, 4G |
| `preheat_min` | numeric | Minimum °C |
| `interpass_max` | numeric | Maximum °C |
| `pwht_required` | boolean | Post-weld heat treatment needed? |
| `pwht_temp_min` | numeric | PWHT minimum °C |
| `pwht_temp_max` | numeric | PWHT maximum °C |
| `pwht_time_range` | text | e.g., "30–60 min" |
| `gas_json` | jsonb | Shielding gas specs |
| `electrical_params_json` | jsonb | Polarity, current range |
| `technique_json` | jsonb | String bead, oscillation, etc. |
| `approved_by` | text | Approver name |
| `reviewed_by` | text | Reviewer |
| `revision` | text | Rev 0, Rev 1, etc. |
| `effective_date` | date | Approval date |
| `status` | text | draft, approved, superseded |
| `notes` | text | Additional info |
| `created_by` | uuid | FK profiles |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**RLS**: Admin full, Engineer/QA insert/update, everyone reads

---

#### 9. consumable_master (Welding Consumables)
**Purpose**: Electrode, wire, flux, rod catalog  

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | PK |
| `brand` | text | NOT NULL, supplier brand |
| `product_name` | text | Product model |
| `aws_class` | text | AWS grade (ER430, E309L) |
| `size` | text | Diameter (1.2mm, 2.4mm) |
| `type` | text | electrode, wire, flux, rod, other |
| `manufacturer` | text | |
| `batch_no` | text | Batch/lot number |
| `manufacturing_date` | date | |
| `expiry_date` | date | |
| `is_active` | boolean | Soft-delete |
| `notes` | text | |
| `created_by` | uuid | FK profiles |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

#### 10. chemical_master (NDE/LPT Chemicals)
**Purpose**: Penetrant, developer, cleaner catalog

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | PK |
| `chemical_name` | text | NOT NULL |
| `manufacturer` | text | |
| `type` | text | penetrant, developer, cleaner, remover, other |
| `batch_no` | text | |
| `expiry_date` | date | |
| `is_active` | boolean | |
| `notes` | text | |
| `created_by` | uuid | FK profiles |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

#### 11. instrument_master (Inspection Instruments)
**Purpose**: PMI, dimensional gauge, hardness tester catalog

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | PK |
| `instrument_name` | text | NOT NULL |
| `instrument_type` | text | pmi, dimensional, visual, hardness, nde, other |
| `serial_number` | text | |
| `manufacturer` | text | |
| `calibration_due` | date | Next calibration |
| `calibration_cert_url` | text | DEPRECATED |
| `calibration_storage_path` | text | Supabase Storage path |
| `is_active` | boolean | |
| `created_by` | uuid | FK profiles |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

### 12. process_executions (Production Records)
**Purpose**: Track process execution (welding, machining, cladding, overlay)

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | PK |
| `job_card_id` | uuid | FK job_cards |
| `process_type` | text | welding, machining, cladding, overlay |
| `welder_name` | text | Person/operator |
| `amps_required` | text | Spec |
| `amps_actual` | numeric | Measured |
| `volts_required` | text | Spec |
| `volts_actual` | numeric | Measured |
| `travel_speed` | numeric | mm/min |
| `gas_flow_rate` | numeric | Liters/min |
| `pre_heat_temp` | numeric | °C |
| `inter_pass_temp` | numeric | °C |
| `weld_height` | numeric | mm |
| `polarity` | text | DCRP, DCSP, AC |
| `consumable_batch` | text | Batch number |
| `weld_date` | date | Process date |
| `post_heat_temp` | numeric | °C |
| `consumable_feed_rate` | numeric | kg/hr or g/min |
| `weld_metal` | text | Grade/type |
| `notes` | text | |
| `assigned_to` | uuid | FK profiles (engineer) |
| `started_at` | timestamptz | |
| `completed_at` | timestamptz | |
| `status` | text | assigned, in_progress, completed |
| `consumable_master_id` | uuid | FK consumable_master |
| `created_at` | timestamptz | |

---

### 13. pwht_runs (Post-Weld Heat Treatment)
**Purpose**: Heat treatment cycle records

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | PK |
| `chart_number` | text | Heat treatment chart ID |
| `furnace_id` | text | Furnace identifier |
| `operator_name` | text | PWHT operator |
| `loading_temp` | numeric | °C |
| `soaking_temp` | numeric | °C |
| `soaking_time` | numeric | minutes |
| `rate_of_heating` | numeric | °C/hour |
| `unloading_temp` | numeric | °C |
| `cooling_method` | text | air, furnace, controlled |
| `date_of_cycle` | date | |
| `pwht_result` | text | pass, fail |
| `doc_url` | text | DEPRECATED |
| `storage_path` | text | PDF path |
| `created_by` | uuid | FK profiles |
| `created_at` | timestamptz | |

### 14. pwht_run_jobs (Job ↔ PWHT Mapping)
**Purpose**: Many-to-many: which jobs were in which heat cycle

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | PK |
| `pwht_run_id` | uuid | FK pwht_runs |
| `job_card_id` | uuid | FK job_cards |
| `status` | text | pending, passed, failed |
| `is_final` | boolean | Final heat treat? |
| UNIQUE | (pwht_run_id, job_card_id) | No duplicates |

---

### 15. dispatches (Shipment Records)
**Purpose**: Track shipment to customer

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | PK |
| `job_card_id` | uuid | FK job_cards (cascade delete prevents orphans) |
| `dc_number` | text | Dispatch challan number |
| `dispatch_date` | date | Shipment date |
| `vehicle_details` | text | Truck/courier details |
| `remarks` | text | Special handling |
| `doc_url` | text | DEPRECATED |
| `storage_path` | text | PDF path |
| `created_by` | uuid | FK profiles |
| `created_at` | timestamptz | |

---

### 16. accounts (Accounting & Invoicing)
**Purpose**: PO, invoice, GRN, payment tracking

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | PK |
| `job_card_id` | uuid | FK job_cards |
| `po_number` | text | Customer purchase order |
| `po_value` | numeric | INR/USD |
| `invoice_number` | text | Invoice ID |
| `invoice_date` | date | |
| `invoice_value` | numeric | Amount invoiced |
| `grn_status` | text | pending, received, held |
| `grn_date` | date | Goods receipt date |
| `payment_status` | text | pending, partial, received |
| `payment_date` | date | |
| `payment_amount` | numeric | Amount paid |
| `due_date` | date | AUTO-CALCULATED: dispatch_date + 60 days |
| `tally_reference` | text | ERP reference |
| `notes` | text | |
| `updated_by` | uuid | FK profiles |
| `updated_at` | timestamptz | |

**Special Behavior**:
- `due_date` is auto-calculated by `set_accounts_due_date()` trigger
- When `payment_status` = 'received', the `close_job_on_payment_received()` trigger automatically closes the job card

---

### 17. alerts (Overdue Job Tracking)
**Purpose**: Alert management for aging jobs

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | PK |
| `job_card_id` | uuid | FK job_cards |
| `alert_type` | text | e.g., "stage_overdue" |
| `stage` | text | Which stage (in_process, reports, etc.) |
| `hours_overdue` | numeric | How late |
| `sent_at` | timestamptz | Alert timestamp |
| `acknowledged_at` | timestamptz | nullable, ack time |
| `acknowledged_by` | uuid | FK profiles |

---

### 18. audit_log (Immutable Audit Trail)
**Purpose**: Complete history of job card state changes

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | bigserial | PK | Sequence ID |
| `entity_type` | text | NOT NULL | Table name (job_card, pmi_report, etc.) |
| `entity_id` | uuid | NOT NULL | Record ID |
| `action` | text | NOT NULL | status_change, insert, update, delete |
| `old_value` | jsonb | nullable | Before (SECURITY DEFINER only) |
| `new_value` | jsonb | nullable | After (SECURITY DEFINER only) |
| `performed_by` | uuid | FK profiles | Who (auth.uid()) |
| `performed_at` | timestamptz | NOT NULL DEFAULT now() | When |

**RLS Policy**:
- `audit_log_select_all` — Everyone reads
- **NO INSERT/UPDATE/DELETE policies for ANY role** — Only the trigger `log_job_card_status_change()` and `log_master_data_change()` can write (via SECURITY DEFINER)

This makes the audit log **immutable** — no user can delete their own records.

---

### 19. documents (Central File Registry)
**Purpose**: Track all uploaded/generated files

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | PK |
| `entity_type` | text | job_card, wps_master, pmi_report, dimension_report, pwht_run, dispatch, instrument_master, nde_record, overlay_report, dossier, other |
| `entity_id` | uuid | Which record |
| `document_type` | text | wps_pdf, pqr_pdf, pmi_report, dimension_report, pwht_chart, dispatch_doc, invoice, calibration_cert, customer_po, customer_drawing, job_card_pdf, overlay_welding_report, annotated_drawing, other, dossier_index, dossier_zip |
| `storage_path` | text | Supabase Storage path |
| `file_name` | text | Original filename |
| `file_size` | integer | Bytes |
| `mime_type` | text | application/pdf, image/jpeg, etc. |
| `version` | integer | 1, 2, 3... (re-uploads increment) |
| `is_active` | boolean | Soft-delete flag |
| `is_latest` | boolean | Current version? |
| `job_card_id` | uuid | FK (denormalized for quick lookup) |
| `document_category` | text | uploaded or generated |
| `document_name` | text | User-friendly name |
| `source_module` | text | Which module created it |
| `metadata_json` | jsonb | Custom metadata |
| `approval_status` | text | none, pending, approved, rejected |
| `notes` | text | |
| `uploaded_by` | uuid | FK profiles |
| `uploaded_at` | timestamptz | |

**RLS Policies**:
- `documents_select_all` — Everyone reads
- `documents_admin_all` — Admin full access
- `documents_authenticated_insert` — Any authenticated user can upload

---

### 20–21. customer_dossiers & customer_dossier_documents (Phase 10)

#### 20. customer_dossiers (Submission Bundle)
**Purpose**: Group documents for customer shipment

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | PK |
| `job_card_id` | uuid | FK job_cards (RESTRICT delete) |
| `dossier_number` | text | e.g., DOS-2026-0001 |
| `dossier_date` | date | Creation date |
| `customer_name` | text | Auto-filled from job_cards.client |
| `po_number` | text | |
| `nbdn_number` | text | |
| `drawing_number` | text | |
| `heat_number` | text | |
| `prepared_by` | text | QA name |
| `approved_by` | text | Approver |
| `remarks` | text | |
| `status` | text | draft, generated, submitted, archived |
| `generated_index_pdf_path` | text | Index PDF |
| `generated_zip_path` | text | ZIP archive |
| `submitted_to_customer` | boolean | |
| `submitted_at` | timestamptz | |
| `submitted_by` | text | |
| `created_by` | uuid | FK profiles |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### 21. customer_dossier_documents (Dossier ↔ Document Mapping)
**Purpose**: Many-to-many with sort order

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | PK |
| `dossier_id` | uuid | FK customer_dossiers (cascade) |
| `document_id` | uuid | FK documents (RESTRICT) |
| `document_type` | text | Denormalized |
| `document_name` | text | Denormalized |
| `version` | integer | Which version |
| `sort_order` | integer | Display order |
| `included` | boolean | Include in ZIP? |
| `created_at` | timestamptz | |
| UNIQUE | (dossier_id, document_id) | |

---

### 22. nde_records (Non-Destructive Examination / Liquid Penetrant Testing)
**Purpose**: LPT, MPI, RT, UT, VT, and other NDE inspection records

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | PK |
| `job_card_id` | uuid | FK job_cards |
| `nde_type` | text | lpt, mpi, rt, ut, vt, other |
| `procedure_ref` | text | Standard procedure |
| `type_of_penetrant` | text | e.g., D-1, D-2 (for LPT) |
| `stage_of_test` | text | pre-cleaning, post-cleaning, etc. |
| `penetrant_application` | text | spray, brush, immersion |
| `penetrant_removal` | text | Method |
| `penetrant_dwell_time` | numeric | minutes |
| `developer_application` | text | Method |
| `developer_dwell_time` | numeric | minutes |
| `post_cleaning` | text | Method |
| `surface_condition` | text | Clean, rusty, etc. |
| `temperature_of_part` | numeric | °C |
| `evaluation` | text | Notes |
| `result` | text | pending, accepted, rejected |
| `chemical_1_id` | uuid | FK chemical_master |
| `chemical_2_id` | uuid | FK chemical_master |
| `chemical_3_id` | uuid | FK chemical_master |
| `chemical_4_id` | uuid | FK chemical_master |
| `report_number` | text | NDE report ID |
| `inspected_by` | text | Inspector |
| `inspection_date` | date | |
| `notes` | text | |
| `created_by` | uuid | FK profiles |
| `created_at` | timestamptz | |

---

## Enums (Type Definitions)

```sql
-- user_role
'admin' | 'operator' | 'engineer' | 'qa' | 'accounts' | 'management'

-- job_card_status (14 states + on_hold)
'created' | 'wps_pending' | 'wps_uploaded' | 'wps_approved' | 
'process_assigned' | 'in_process' | 'process_complete' | 
'reports_pending' | 'reports_complete' | 'dispatch_ready' | 
'dispatched' | 'accounts_processing' | 'closed' | 'on_hold'

-- process_type (array)
['welding'] | ['machining'] | ['cladding'] | ['overlay'] | combination

-- approval_status
'pending' | 'approved' | 'rejected'

-- process_execution status
'assigned' | 'in_progress' | 'completed'

-- pwht_job_status
'pending' | 'passed' | 'failed'

-- grn_status
'pending' | 'received' | 'held'

-- payment_status
'pending' | 'partial' | 'received'

-- wps_master_status
'draft' | 'approved' | 'superseded'

-- consumable_type
'electrode' | 'wire' | 'flux' | 'rod' | 'other'

-- chemical_type
'penetrant' | 'developer' | 'cleaner' | 'remover' | 'other'

-- instrument_type
'pmi' | 'dimensional' | 'visual' | 'hardness' | 'nde' | 'other'

-- nde_type
'lpt' | 'mpi' | 'rt' | 'ut' | 'vt' | 'other'

-- nde_result
'pending' | 'accepted' | 'rejected'

-- cooling_method
'air' | 'furnace' | 'controlled'

-- document_category
'uploaded' | 'generated'

-- dossier_status
'draft' | 'generated' | 'submitted' | 'archived'

-- pmi_status
'draft' | 'approved' | 'rejected' | 'submitted'

-- dimension_status
'draft' | 'approved' | 'rejected' | 'submitted'

-- overlay_report_status
'draft' | 'approved' | 'rejected' | 'submitted'
```

---

## SQL Functions & Triggers

### Core Functions

1. **set_updated_at()** — Auto-update timestamp on every UPDATE
2. **enforce_job_card_status_transition()** — State machine validation
3. **log_job_card_status_change()** — SECURITY DEFINER, writes to audit_log
4. **set_accounts_due_date()** — Auto-calculate due_date = dispatch_date + 60 days
5. **close_job_on_payment_received()** — Auto-close job when payment status = 'received'
6. **log_master_data_change()** — SECURITY DEFINER, audit all master table changes
7. **current_role_name()** — Helper: returns auth.uid()'s role
8. **instruments_expiring_soon(days_ahead)** — Returns instruments with calibration due soon

### Trigger Chains

- **job_cards.status UPDATE** → `enforce_job_card_status_transition()` → `set_updated_at()` → `log_job_card_status_change()` (SECURITY DEFINER)
- **accounts.INSERT/UPDATE** → `set_accounts_due_date()` → `trg_accounts_updated_at`
- **accounts.payment_status UPDATE** → `close_job_on_payment_received()` (may trigger job_cards.status UPDATE)
- **Master table INSERT/UPDATE/DELETE** → `log_master_data_change()` (SECURITY DEFINER) → audit_log write

---

## Indexes

**By purpose**:

| Index | Table | Columns | Purpose |
|-------|-------|---------|---------|
| `idx_jc_status` | job_cards | (status) | Find open/pending jobs |
| `idx_jc_client` | job_cards | (client_id, status) | Jobs for a customer |
| `idx_jc_nbdn`, `_po`, `_drawing`, `_heat`, `_part` | job_cards | individual | Quick lookups by reference |
| `idx_jc_stage_entered` | job_cards | (stage_entered_at) | Aging/overdue jobs |
| `idx_jc_fts` | job_cards | GIN (to_tsvector) | Full-text search |
| `idx_pmi_reports_job_card` | pmi_reports | (job_card_id) | Reports for a job |
| `idx_pmi_reports_status` | pmi_reports | (pmi_status) | Draft/approved filtering |
| `idx_dim_status` | dimension_reports | (dimension_status) | Status filtering |
| `idx_dim_job_card` | dimension_reports | (job_card_id) | Reports for a job |
| `idx_overlay_job_card` | overlay_welding_reports | (job_card_id) | |
| `idx_overlay_status` | overlay_welding_reports | (report_status) | |
| `idx_documents_entity` | documents | (entity_type, entity_id) | All files for a record |
| `idx_documents_type` | documents | (document_type) | By document type |
| `idx_documents_active` | documents | (entity_type, entity_id) WHERE is_active=true | Active files only |
| `idx_documents_latest` | documents | (entity_type, entity_id, document_type) WHERE is_latest=true | Latest version |
| `idx_documents_job_card` | documents | (job_card_id) | Files linked to job |
| `idx_documents_category` | documents | (document_category, document_type) | Uploaded vs generated |
| `idx_nde_job_card` | nde_records | (job_card_id) | NDE records for job |
| `idx_nde_type` | nde_records | (nde_type) | By test type |
| `idx_dossier_job_card` | customer_dossiers | (job_card_id) | Dossiers for job |
| `idx_dossier_status` | customer_dossiers | (status) | Draft/submitted filtering |
| `idx_dossier_doc_dossier` | customer_dossier_documents | (dossier_id) | Files in dossier |
| `idx_wps_master_status` | wps_master | (status) | Approved WPS |
| `idx_wps_master_no` | wps_master | (wps_no) | Lookup by number |
| `idx_consumable_active` | consumable_master | (type, is_active) | Available consumables by type |
| `idx_instrument_type` | instrument_master | (instrument_type, is_active) | Instruments by category |
| `idx_instrument_cal_due` | instrument_master | (calibration_due) WHERE is_active=true | Overdue calibrations |
| `idx_audit_entity` | audit_log | (entity_type, entity_id) | History for a record |

---

## Row-Level Security (RLS) Policies

Every table has RLS enabled. 30+ policies enforce role-based access:

- **Operators**: Can read all, create job cards, update certain fields
- **Engineers**: Can read all, update process execution and WPS master
- **QA**: Can read all, upload/approve quality reports, manage master data
- **Admin**: Full access to everything
- **Accounts**: Can read all, insert/update payment records
- **Management**: Read-only on all tables

The database **refuses unauthorized queries at the row level** — even if a malicious user tries to query directly, RLS blocks them.

---

**Next document**: [HANDOFF_03_MODULES.md](HANDOFF_03_MODULES.md) — Detailed module workflows
