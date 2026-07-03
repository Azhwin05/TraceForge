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
  const { data: doc } = await supabase
    .from("documents")
    .select("id")
    .eq("storage_path", storagePath)
    .eq("is_active", true)
    .maybeSingle()

  if (!doc) {
    return { url: null, error: "Document not found or access denied" }
  }

  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(storagePath, 3600)

  if (error || !data?.signedUrl) {
    return { url: null, error: "Could not generate download link" }
  }
  return { url: data.signedUrl, error: null }
}
