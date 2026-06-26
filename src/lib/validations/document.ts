import { z } from "zod"

/**
 * Document Upload Validation Schemas
 *
 * Validates all document-related inputs at the boundary
 */

// ============================================================================
// DOCUMENT UPLOAD
// ============================================================================

export const documentUploadSchema = z.object({
  jobCardId: z.string().uuid("Invalid job card ID"),
  documentType: z.string().min(1, "Document type is required"),
  documentName: z.string().min(1, "Document name required").max(255),
  fileName: z.string().min(1, "File name required").max(255),
  filePath: z.string().min(1, "File path required"),
  fileSize: z.number().int().min(1, "Invalid file size").max(52428800, "File size must be less than 50MB"),
  mimeType: z.string().min(1, "MIME type required"),
  sourceModule: z.string().optional(),
  sourceRecordId: z.string().uuid().optional(),
  approvalRequired: z.boolean().default(false),
  dossierEligible: z.boolean().default(false),
  notes: z.string().max(500).optional(),
})

export type DocumentUploadInput = z.infer<typeof documentUploadSchema>

// ============================================================================
// DOCUMENT APPROVAL
// ============================================================================

export const documentApprovalSchema = z.object({
  documentId: z.string().uuid("Invalid document ID"),
})

export type DocumentApprovalInput = z.infer<typeof documentApprovalSchema>

// ============================================================================
// DOCUMENT REJECTION
// ============================================================================

export const documentRejectionSchema = z.object({
  documentId: z.string().uuid("Invalid document ID"),
  rejectionReason: z.string().min(5, "Rejection reason must be at least 5 characters").max(500),
})

export type DocumentRejectionInput = z.infer<typeof documentRejectionSchema>

// ============================================================================
// DOCUMENT ARCHIVE
// ============================================================================

export const documentArchiveSchema = z.object({
  documentId: z.string().uuid("Invalid document ID"),
})

export type DocumentArchiveInput = z.infer<typeof documentArchiveSchema>

// ============================================================================
// PWHT APPROVAL
// ============================================================================

export const pwhtApprovalSchema = z.object({
  pwhtRunId: z.string().uuid("Invalid PWHT run ID"),
})

export type PwhtApprovalInput = z.infer<typeof pwhtApprovalSchema>

// ============================================================================
// PWHT REJECTION
// ============================================================================

export const pwhtRejectionSchema = z.object({
  pwhtRunId: z.string().uuid("Invalid PWHT run ID"),
  rejectionReason: z.string().min(5, "Rejection reason must be at least 5 characters").max(500),
})

export type PwhtRejectionInput = z.infer<typeof pwhtRejectionSchema>

// ============================================================================
// PWHT SUBMISSION
// ============================================================================

export const pwhtSubmissionSchema = z.object({
  pwhtRunId: z.string().uuid("Invalid PWHT run ID"),
})

export type PwhtSubmissionInput = z.infer<typeof pwhtSubmissionSchema>

// ============================================================================
// JOB CLOSURE VALIDATION
// ============================================================================

export const jobClosureValidationSchema = z.object({
  jobCardId: z.string().uuid("Invalid job card ID"),
})

export type JobClosureValidationInput = z.infer<typeof jobClosureValidationSchema>

// ============================================================================
// DOSSIER AUTO-POPULATION
// ============================================================================

export const dossierAutoPopulationSchema = z.object({
  jobCardId: z.string().uuid("Invalid job card ID"),
  excludeDocumentIds: z.array(z.string().uuid()).optional().default([]),
})

export type DossierAutoPopulationInput = z.infer<typeof dossierAutoPopulationSchema>
