"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth"
import { sanitizeError } from "@/lib/security"

/**
 * Uses requireAuth rather than a bare getUser(): the local helper only checked
 * that a session existed, so a DEACTIVATED account could still acknowledge
 * alerts. requireAuth enforces is_active and the presence of a profile.
 */
export async function acknowledgeAlert(alertId: string): Promise<{ error?: string }> {
  const { supabase, user } = await requireAuth()
  const { error } = await supabase
    .from("alerts")
    .update({ acknowledged_at: new Date().toISOString(), acknowledged_by: user.id })
    .eq("id", alertId)
  if (error) return { error: sanitizeError(error) }
  revalidatePath("/alerts")
  return {}
}
