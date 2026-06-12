// Shared utilities for Supabase Storage document management.
// No "use server" / "use client" — safe to import from anywhere.

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const

export const ALLOWED_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "webp", "doc", "docx"] as const
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB
export const STORAGE_BUCKET = "documents"

/** Strips unsafe characters from a file name. Never trust user input directly. */
export function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100)
}

/**
 * Canonical storage path format:
 *   {entityType}/{entityId}/{documentType}/{date}-{safeFilename}
 * Example:
 *   wps_qualification/abc-uuid/wps_pdf/2026-06-12-wps-703.pdf
 */
export function buildStoragePath(
  entityType: string,
  entityId: string,
  documentType: string,
  fileName: string,
): string {
  const date = new Date().toISOString().slice(0, 10)
  const safe = sanitizeFilename(fileName)
  return `${entityType}/${entityId}/${documentType}/${date}-${safe}`
}

/** Returns an error string if invalid, or null if the file is acceptable. */
export function validateFileClient(file: File): string | null {
  if (file.size === 0) return "File is empty."
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File too large. Maximum size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB.`
  }
  const ext = (file.name.split(".").pop() ?? "").toLowerCase()
  const mimeOk = (ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)
  const extOk = (ALLOWED_EXTENSIONS as readonly string[]).includes(ext)
  if (!mimeOk && !extOk) {
    return "Invalid file type. Allowed: PDF, JPG, PNG, WebP, DOC, DOCX."
  }
  return null
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Extracts the filename portion from a Supabase Storage path. */
export function filenameFromPath(storagePath: string): string {
  return storagePath.split("/").pop() ?? storagePath
}
