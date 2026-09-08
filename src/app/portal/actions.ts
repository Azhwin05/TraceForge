"use server"

import { requireCustomer } from "@/lib/auth"

/**
 * Sign a document for download in the customer portal.
 *
 * Isolation is enforced twice: (1) the query below runs under the customer's
 * session, so the client-scoped `documents_customer_select` RLS policy only
 * returns rows for THEIR client; (2) we only sign a path that resolves to such
 * a row. A customer cannot sign another client's file even by guessing paths.
 */
export async function getCustomerSignedUrl(
  storagePath: string
): Promise<{ url: string; error: null } | { url: null; error: string }> {
  const { supabase } = await requireCustomer()

  if (!storagePath || typeof storagePath !== "string") {
    return { url: null, error: "Invalid document reference" }
  }

  // RLS-scoped ownership check: does a document the customer may see live here?
  const { data: doc, error: lookupError } = await supabase
    .from("documents")
    .select("id")
    .eq("storage_path", storagePath)
    .eq("is_active", true)
    .maybeSingle()

  // The customer-facing message stays the same either way — we must not reveal
  // whether a path exists — but a *query failure* and a genuine access denial
  // are very different operationally, so the real cause is always logged.
  if (lookupError) {
    console.error("[portal] document ownership lookup failed:", lookupError)
    return { url: null, error: "Could not verify access to this document" }
  }

  if (!doc) {
    return { url: null, error: "Document not found or access denied" }
  }

  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(storagePath, 3600)

  if (error || !data?.signedUrl) {
    // Storage RLS is scoped separately from the documents table (migration
    // 0053), so a mismatch between the two shows up exactly here. Without this
    // log it would be an unexplained "Could not generate download link".
    console.error("[portal] signing failed for an owned document:", storagePath, error)
    return { url: null, error: "Could not generate download link" }
  }
  return { url: data.signedUrl, error: null }
}

/**
 * Sign a Client Document for download — the admin-to-client PDF handoff
 * (migration 0058), unrelated to job cards. Deliberately a separate lookup
 * from getCustomerSignedUrl above: ownership here is a direct client_id
 * match on client_documents, not a job-card join, and the row must still be
 * active (a revoked document must not be downloadable even with a guessed id).
 */
export async function getClientDocumentSignedUrl(
  documentId: string
): Promise<{ url: string | null; error: string | null }> {
  const { supabase } = await requireCustomer()

  const { data: doc, error: lookupError } = await supabase
    .from("client_documents")
    .select("storage_path")
    .eq("id", documentId)
    .eq("is_active", true)
    .maybeSingle()

  if (lookupError) {
    console.error("[portal] client document ownership lookup failed:", lookupError)
    return { url: null, error: "Could not verify access to this document" }
  }
  if (!doc) return { url: null, error: "Document not found or access denied" }

  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(doc.storage_path, 3600)

  if (error || !data?.signedUrl) {
    console.error("[portal] client document signing failed:", doc.storage_path, error)
    return { url: null, error: "Could not generate download link" }
  }
  return { url: data.signedUrl, error: null }
}
