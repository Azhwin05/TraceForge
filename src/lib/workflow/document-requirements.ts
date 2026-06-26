/**
 * Workflow Document Requirements Configuration
 *
 * Defines all document types, their workflow stages, requirements, and eligibility.
 * This is the single source of truth for document management throughout the ERP.
 *
 * Do NOT store these in the database. Use TypeScript for type safety and clarity.
 */

import type { UserRole } from "@/types/database"

export type WorkflowStage =
  | "material_receipt"
  | "job_card_creation"
  | "wps_specification"
  | "welding_execution"
  | "heat_treatment"
  | "inspection_qc"
  | "final_acceptance"
  | "delivery"
  | "invoice"
  | "closure"

export type DocumentRequirementKey =
  | "material_receipt_document"
  | "incoming_delivery_challan"
  | "purchase_order"
  | "contract_review"
  | "job_card_scan"
  | "wps"
  | "pqr"
  | "welding_report"
  | "electrode_test_certificate"
  | "heat_treatment_chart"
  | "process_layout"
  | "customer_drawing"
  | "dimension_report"
  | "dp_test_report"
  | "lpt_report"
  | "pmi_report"
  | "nde_report"
  | "final_acceptance_document"
  | "outgoing_delivery_challan"
  | "invoice"
  | "supporting_certificate"
  | "other"

export interface WorkflowDocumentRequirement {
  key: DocumentRequirementKey
  label: string
  stage: WorkflowStage
  required: boolean
  /** If true, document is only required under certain conditions */
  conditional?: boolean
  conditionalReason?: string
  /** MIME types that are allowed. Empty = any */
  allowedMimeTypes: string[]
  /** Can multiple files of this type be uploaded? */
  allowMultiple: boolean
  /** Does this document require QA/Manager approval? */
  requiresApproval: boolean
  /** Can this document be included in the final customer dossier? */
  dossierEligible: boolean
  /** Roles that can upload this document type */
  allowedRoles: UserRole[]
  /** Document category for grouping */
  category: "input" | "process" | "inspection" | "output"
  /** Can this document expire? (for certificates) */
  canExpire: boolean
  /** Default visibility: Should this be visible to customer in dossier? */
  customerVisibleByDefault: boolean
}

/**
 * Complete document requirements for all workflow stages
 *
 * Usage:
 *   const docReq = DOCUMENT_REQUIREMENTS.wps
 *   if (docReq.required && !hasDocument) { showWarning() }
 */
export const DOCUMENT_REQUIREMENTS: Record<DocumentRequirementKey, WorkflowDocumentRequirement> = {
  // MATERIAL RECEIPT STAGE
  material_receipt_document: {
    key: "material_receipt_document",
    label: "Material Receipt Note",
    stage: "material_receipt",
    required: false,
    allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
    allowMultiple: false,
    requiresApproval: false,
    dossierEligible: false,
    allowedRoles: ["admin", "operator", "accounts"],
    category: "input",
    canExpire: false,
    customerVisibleByDefault: false,
  },

  incoming_delivery_challan: {
    key: "incoming_delivery_challan",
    label: "Incoming Delivery Challan",
    stage: "material_receipt",
    required: false,
    allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
    allowMultiple: false,
    requiresApproval: false,
    dossierEligible: false,
    allowedRoles: ["admin", "operator", "accounts"],
    category: "input",
    canExpire: false,
    customerVisibleByDefault: false,
  },

  purchase_order: {
    key: "purchase_order",
    label: "Purchase Order",
    stage: "material_receipt",
    required: false,
    allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
    allowMultiple: false,
    requiresApproval: false,
    dossierEligible: false,
    allowedRoles: ["admin", "accounts", "management"],
    category: "input",
    canExpire: false,
    customerVisibleByDefault: false,
  },

  contract_review: {
    key: "contract_review",
    label: "Contract Review Document",
    stage: "material_receipt",
    required: false,
    allowedMimeTypes: ["application/pdf"],
    allowMultiple: false,
    requiresApproval: true,
    dossierEligible: false,
    allowedRoles: ["admin", "qa"],
    category: "input",
    canExpire: false,
    customerVisibleByDefault: false,
  },

  // JOB CARD CREATION STAGE
  job_card_scan: {
    key: "job_card_scan",
    label: "Job Card Scan",
    stage: "job_card_creation",
    required: false,
    allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
    allowMultiple: false,
    requiresApproval: false,
    dossierEligible: false,
    allowedRoles: ["admin", "operator", "engineer"],
    category: "input",
    canExpire: false,
    customerVisibleByDefault: false,
  },

  customer_drawing: {
    key: "customer_drawing",
    label: "Customer Drawing",
    stage: "job_card_creation",
    required: false,
    allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
    allowMultiple: true,
    requiresApproval: false,
    dossierEligible: true,
    allowedRoles: ["admin", "engineer", "qa"],
    category: "input",
    canExpire: false,
    customerVisibleByDefault: true,
  },

  // WPS SPECIFICATION STAGE
  wps: {
    key: "wps",
    label: "Welding Procedure Specification (WPS)",
    stage: "wps_specification",
    required: true,
    conditional: false,
    allowedMimeTypes: ["application/pdf"],
    allowMultiple: false,
    requiresApproval: true,
    dossierEligible: true,
    allowedRoles: ["admin", "qa", "engineer"],
    category: "process",
    canExpire: false,
    customerVisibleByDefault: true,
  },

  pqr: {
    key: "pqr",
    label: "Procedure Qualification Record (PQR)",
    stage: "wps_specification",
    required: false,
    conditional: true,
    conditionalReason: "Required if WPS is newly created or significantly modified",
    allowedMimeTypes: ["application/pdf"],
    allowMultiple: false,
    requiresApproval: true,
    dossierEligible: true,
    allowedRoles: ["admin", "qa"],
    category: "process",
    canExpire: false,
    customerVisibleByDefault: true,
  },

  // WELDING EXECUTION STAGE
  welding_report: {
    key: "welding_report",
    label: "Welding Report",
    stage: "welding_execution",
    required: true,
    conditional: true,
    conditionalReason: "Required if welding process is performed",
    allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
    allowMultiple: true,
    requiresApproval: true,
    dossierEligible: true,
    allowedRoles: ["admin", "engineer", "qa"],
    category: "process",
    canExpire: false,
    customerVisibleByDefault: true,
  },

  electrode_test_certificate: {
    key: "electrode_test_certificate",
    label: "Electrode / Consumable Test Certificate",
    stage: "welding_execution",
    required: false,
    conditional: true,
    conditionalReason: "Required if consumables require certification",
    allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
    allowMultiple: true,
    requiresApproval: false,
    dossierEligible: true,
    allowedRoles: ["admin", "engineer", "qa"],
    category: "process",
    canExpire: true,
    customerVisibleByDefault: true,
  },

  process_layout: {
    key: "process_layout",
    label: "Process Layout / Diagram",
    stage: "welding_execution",
    required: false,
    allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
    allowMultiple: false,
    requiresApproval: false,
    dossierEligible: true,
    allowedRoles: ["admin", "engineer", "qa"],
    category: "process",
    canExpire: false,
    customerVisibleByDefault: true,
  },

  // HEAT TREATMENT STAGE
  heat_treatment_chart: {
    key: "heat_treatment_chart",
    label: "Heat Treatment Chart (PWHT)",
    stage: "heat_treatment",
    required: false,
    conditional: true,
    conditionalReason: "Required if PWHT is part of process",
    allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
    allowMultiple: false,
    requiresApproval: true,
    dossierEligible: true,
    allowedRoles: ["admin", "engineer", "qa"],
    category: "process",
    canExpire: false,
    customerVisibleByDefault: true,
  },

  // INSPECTION & QC STAGE
  dimension_report: {
    key: "dimension_report",
    label: "Dimensional Report",
    stage: "inspection_qc",
    required: false,
    conditional: true,
    conditionalReason: "Required if dimensional inspection is performed",
    allowedMimeTypes: ["application/pdf"],
    allowMultiple: false,
    requiresApproval: true,
    dossierEligible: true,
    allowedRoles: ["admin", "qa"],
    category: "inspection",
    canExpire: false,
    customerVisibleByDefault: true,
  },

  dp_test_report: {
    key: "dp_test_report",
    label: "Dye Penetrant (DP) Test Report",
    stage: "inspection_qc",
    required: false,
    conditional: true,
    conditionalReason: "Required if DP testing is performed",
    allowedMimeTypes: ["application/pdf"],
    allowMultiple: false,
    requiresApproval: true,
    dossierEligible: true,
    allowedRoles: ["admin", "qa"],
    category: "inspection",
    canExpire: false,
    customerVisibleByDefault: true,
  },

  lpt_report: {
    key: "lpt_report",
    label: "Liquid Penetrant Test (LPT) Report",
    stage: "inspection_qc",
    required: false,
    conditional: true,
    conditionalReason: "Required if LPT is performed",
    allowedMimeTypes: ["application/pdf"],
    allowMultiple: false,
    requiresApproval: true,
    dossierEligible: true,
    allowedRoles: ["admin", "qa"],
    category: "inspection",
    canExpire: false,
    customerVisibleByDefault: true,
  },

  pmi_report: {
    key: "pmi_report",
    label: "Positive Material Identification (PMI) Report",
    stage: "inspection_qc",
    required: false,
    conditional: true,
    conditionalReason: "Required if material composition verification is needed",
    allowedMimeTypes: ["application/pdf"],
    allowMultiple: false,
    requiresApproval: true,
    dossierEligible: true,
    allowedRoles: ["admin", "qa"],
    category: "inspection",
    canExpire: false,
    customerVisibleByDefault: true,
  },

  nde_report: {
    key: "nde_report",
    label: "Non-Destructive Examination (NDE) Report",
    stage: "inspection_qc",
    required: false,
    conditional: true,
    conditionalReason: "Required if NDE (Radiography, Ultrasonic, etc.) is performed",
    allowedMimeTypes: ["application/pdf"],
    allowMultiple: true,
    requiresApproval: true,
    dossierEligible: true,
    allowedRoles: ["admin", "qa"],
    category: "inspection",
    canExpire: false,
    customerVisibleByDefault: true,
  },

  // FINAL ACCEPTANCE STAGE
  final_acceptance_document: {
    key: "final_acceptance_document",
    label: "Final Acceptance / QC Sign-Off",
    stage: "final_acceptance",
    required: false,
    allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
    allowMultiple: false,
    requiresApproval: true,
    dossierEligible: true,
    allowedRoles: ["admin", "qa"],
    category: "output",
    canExpire: false,
    customerVisibleByDefault: true,
  },

  // DELIVERY STAGE
  outgoing_delivery_challan: {
    key: "outgoing_delivery_challan",
    label: "Outgoing Delivery Challan",
    stage: "delivery",
    required: true,
    allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
    allowMultiple: false,
    requiresApproval: false,
    dossierEligible: true,
    allowedRoles: ["admin", "accounts", "operator"],
    category: "output",
    canExpire: false,
    customerVisibleByDefault: true,
  },

  // INVOICE STAGE
  invoice: {
    key: "invoice",
    label: "Invoice",
    stage: "invoice",
    required: true,
    allowedMimeTypes: ["application/pdf"],
    allowMultiple: false,
    requiresApproval: false,
    dossierEligible: false,
    allowedRoles: ["admin", "accounts"],
    category: "output",
    canExpire: false,
    customerVisibleByDefault: false,
  },

  // SUPPORTING & MISCELLANEOUS
  supporting_certificate: {
    key: "supporting_certificate",
    label: "Supporting Certificate / Document",
    stage: "closure",
    required: false,
    allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
    allowMultiple: true,
    requiresApproval: false,
    dossierEligible: true,
    allowedRoles: ["admin", "qa", "engineer"],
    category: "input",
    canExpire: true,
    customerVisibleByDefault: true,
  },

  other: {
    key: "other",
    label: "Other / Miscellaneous",
    stage: "closure",
    required: false,
    allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    allowMultiple: true,
    requiresApproval: false,
    dossierEligible: false,
    allowedRoles: ["admin"],
    category: "input",
    canExpire: false,
    customerVisibleByDefault: false,
  },
}

/**
 * Get document requirements for a specific stage
 */
export function getDocumentsForStage(stage: WorkflowStage): WorkflowDocumentRequirement[] {
  return Object.values(DOCUMENT_REQUIREMENTS).filter((doc) => doc.stage === stage)
}

/**
 * Get required documents for a specific stage
 */
export function getRequiredDocumentsForStage(stage: WorkflowStage): WorkflowDocumentRequirement[] {
  return getDocumentsForStage(stage).filter((doc) => doc.required && !doc.conditional)
}

/**
 * Get dossier-eligible documents across all stages
 */
export function getDossierEligibleDocuments(): WorkflowDocumentRequirement[] {
  return Object.values(DOCUMENT_REQUIREMENTS).filter((doc) => doc.dossierEligible)
}

/**
 * Check if a user role can upload a specific document type
 */
export function canUserUploadDocument(documentKey: DocumentRequirementKey, userRole: UserRole): boolean {
  const requirement = DOCUMENT_REQUIREMENTS[documentKey]
  if (!requirement) return false
  return requirement.allowedRoles.includes(userRole)
}

/**
 * Get all document keys for a specific stage
 */
export function getDocumentKeysForStage(stage: WorkflowStage): DocumentRequirementKey[] {
  return Object.values(DOCUMENT_REQUIREMENTS)
    .filter((doc) => doc.stage === stage)
    .map((doc) => doc.key)
}

/**
 * Get stage label for display
 */
export function getStageLabel(stage: WorkflowStage): string {
  const labels: Record<WorkflowStage, string> = {
    material_receipt: "Material Receipt",
    job_card_creation: "Job Card",
    wps_specification: "WPS / PQR",
    welding_execution: "Welding Execution",
    heat_treatment: "Heat Treatment",
    inspection_qc: "Inspection & QC",
    final_acceptance: "Final Acceptance",
    delivery: "Delivery Challan",
    invoice: "Invoice",
    closure: "Job Closure",
  }
  return labels[stage]
}

/**
 * All workflow stages in order
 */
export const WORKFLOW_STAGES: WorkflowStage[] = [
  "material_receipt",
  "job_card_creation",
  "wps_specification",
  "welding_execution",
  "heat_treatment",
  "inspection_qc",
  "final_acceptance",
  "delivery",
  "invoice",
  "closure",
]
