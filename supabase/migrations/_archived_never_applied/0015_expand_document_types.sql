-- Phase 1: Expand Document Type Enum
-- Adds support for all document types needed by client workflow

-- Drop existing constraint
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_document_type_check;

-- Add new constraint with expanded document types
ALTER TABLE documents
ADD CONSTRAINT documents_document_type_check CHECK (document_type IN (
  -- EXISTING TYPES
  'wps_pdf',
  'pqr_pdf',
  'pmi_report',
  'dimension_report',
  'pwht_chart',
  'dispatch_doc',
  'invoice',
  'calibration_cert',
  'customer_po',
  'customer_drawing',
  'job_card_pdf',
  'overlay_welding_report',
  'annotated_drawing',
  'other',
  'dossier_index',
  'dossier_zip',

  -- NEW TYPES FOR PHASE 1
  'welding_report',
  'electrode_test_certificate',
  'consumable_certificate',
  'material_test_certificate',
  'nde_report',
  'lpt_report',
  'hardness_report',
  'incoming_delivery_challan',
  'outgoing_delivery_challan',
  'final_acceptance_document',
  'contract_review',
  'process_layout'
));

-- Add comment
COMMENT ON TABLE documents IS 'Central document registry with versioning, approval workflow, and archiving support for all ERP modules';
