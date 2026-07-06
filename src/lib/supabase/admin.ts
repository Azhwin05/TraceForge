import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

/**
 * Service-role Supabase client. Bypasses RLS — SERVER ONLY, and only for
 * privileged admin operations (e.g. provisioning customer portal users, which
 * requires the auth admin API). Never import this into client components.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY. Throws if it is not configured so the
 * caller can surface a clear "portal provisioning not configured" message
 * rather than failing obscurely.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error(
      "Customer-portal provisioning is not configured: set SUPABASE_SERVICE_ROLE_KEY in the environment."
    )
  }
  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export function isAdminConfigured(): boolean {
  return !!process.env.SUPABASE_SERVICE_ROLE_KEY
}
