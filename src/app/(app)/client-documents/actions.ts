"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { sanitizeError } from "@/lib/security"
import { matchesSignature } from "@/lib/documents/file-signature"
import { clientDocumentSchema, type ClientDocumentInput } from "@/lib/validations/client-document"
import { STORAGE_BUCKET } from "@/lib/documents/storage-utils"

// Files up to this size are downloaded server-side to verify their magic
// bytes, mirroring registerUploadedDocument's threshold for the same reason.
const SIGNATURE_CHECK_MAX_BYTES = 10 * 1024 * 1024

export type RegisterClientDocumentInput = ClientDocumentInput & {
  storagePath: string
  fileName: string
  fileSize?: number | null
}

/**
 * Called after the browser has already uploaded the PDF to Supabase Storage.
 * Admin-only — this is a direct admin-to-client handoff, not a shared
 * operational document. Verifies the file is actually a PDF by content, not
 * just by extension, exactly like the job-card document upload path.
 */
export async function registerClientDocument(
  input: RegisterClientDocumentInput,
): Promise<{ id?: string; error?: string }> {
  const guard = await requireRole(["admin"])
  if (guard.error) return { error: guard.error }
  const { supabase, user } = guard

  const parsed = clientDocumentSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }
  const data = parsed.data

  if (!input.storagePath || input.storagePath.split("/").length < 3) {
    return { error: "Invalid storage path." }
  }
  if (!input.fileName.toLowerCase().endsWith(".pdf")) {
    return { error: "Only PDF files are accepted for client documents." }
  }

  // Server-side content check — the browser's MIME type is advisory only.
  if ((input.fileSize ?? 0) <= SIGNATURE_CHECK_MAX_BYTES) {
    const { data: fileBlob, error: downloadErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(input.storagePath)

    if (downloadErr || !fileBlob) {
      return { error: "Uploaded file could not be verified. Please re-upload." }
    }

    const bytes = new Uint8Array(await fileBlob.slice(0, 4096).arrayBuffer())
    if (!matchesSignature(bytes, "pdf")) {
      try { await supabase.storage.from(STORAGE_BUCKET).remove([input.storagePath]) } catch {}
      return { error: "File content is not a valid PDF — the upload was rejected." }
    }
  }

  const { data: row, error } = await supabase
    .from("client_documents")
    .insert({
      client_id:       data.client_id,
      title:           data.title.trim(),
      description:     data.description?.trim() || null,
      label:           data.label?.trim() || null,
      bill_date:       data.bill_date || null,
      storage_path:    input.storagePath,
      file_name:       input.fileName,
      file_size_bytes: input.fileSize ?? null,
      uploaded_by:     user.id,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[client-documents] register", error)
    try { await supabase.storage.from(STORAGE_BUCKET).remove([input.storagePath]) } catch {}
    return { error: sanitizeError(error) }
  }

  revalidatePath("/client-documents")
  return { id: row.id }
}

/** Revoke — soft delete. The portal stops showing it; the record and the
 *  file both remain for audit purposes. */
export async function revokeClientDocument(id: string): Promise<{ error?: string }> {
  const guard = await requireRole(["admin"])
  if (guard.error) return { error: guard.error }
  const { supabase, user } = guard

  const { error } = await supabase
    .from("client_documents")
    .update({ is_active: false, removed_by: user.id, removed_at: new Date().toISOString() })
    .eq("id", id)

  if (error) { console.error("[client-documents] revoke", error); return { error: sanitizeError(error) } }

  revalidatePath("/client-documents")
  return {}
}

/** Restore a previously revoked document. */
export async function restoreClientDocument(id: string): Promise<{ error?: string }> {
  const guard = await requireRole(["admin"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const { error } = await supabase
    .from("client_documents")
    .update({ is_active: true, removed_by: null, removed_at: null })
    .eq("id", id)

  if (error) { console.error("[client-documents] restore", error); return { error: sanitizeError(error) } }

  revalidatePath("/client-documents")
  return {}
}

/**
 * Set or correct the bill date after the fact — the same "don't lock it in
 * forever" principle applied to Material Issue remarks and Item Master.
 */
export async function updateClientDocumentBillDate(
  id: string,
  billDate: string | null,
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const { error } = await supabase
    .from("client_documents")
    .update({ bill_date: billDate || null })
    .eq("id", id)

  if (error) { console.error("[client-documents] update bill date", error); return { error: sanitizeError(error) } }

  revalidatePath("/client-documents")
  revalidatePath("/portal/documents")
  return {}
}
