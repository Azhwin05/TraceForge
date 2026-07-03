"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireRole } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { sanitizeError } from "@/lib/security"

const createPortalUserSchema = z.object({
  email: z.string().email("A valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(2, "Full name is required").max(200),
  clientId: z.string().uuid("Select a client company"),
})

export type CreatePortalUserInput = z.infer<typeof createPortalUserSchema>

/**
 * Provision an external customer-portal login, bound to one client company.
 * Admin-only. Uses the service-role admin API to create the auth user, then
 * writes a `customer` profile tied to the client. RLS (`current_client_id()`)
 * then isolates everything that user can see to that client.
 */
export async function createPortalUser(raw: unknown): Promise<{ error?: string; userId?: string }> {
  const guard = await requireRole(["admin"])
  if (guard.error) return { error: guard.error }

  const parsed = createPortalUserSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }
  const { email, password, fullName, clientId } = parsed.data

  let admin
  try {
    admin = createAdminClient()
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Admin client unavailable" }
  }

  // Confirm the client exists (clean error rather than an FK violation later)
  const { data: client } = await admin.from("clients").select("id, name").eq("id", clientId).single()
  if (!client) return { error: "Selected client company was not found." }

  // Create the auth user (email pre-confirmed for internal provisioning)
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, portal: true },
  })
  if (createErr || !created?.user) {
    return { error: sanitizeError(createErr ?? new Error("Failed to create user")) }
  }

  // Write the customer profile bound to the client
  const { error: profileErr } = await admin.from("profiles").upsert(
    {
      id: created.user.id,
      full_name: fullName,
      role: "customer",
      client_id: clientId,
      is_active: true,
    },
    { onConflict: "id" }
  )
  if (profileErr) {
    // Roll back the orphaned auth user so a retry is clean
    try { await admin.auth.admin.deleteUser(created.user.id) } catch {}
    return { error: sanitizeError(profileErr) }
  }

  revalidatePath("/portal-users")
  return { userId: created.user.id }
}

/** Enable/disable a portal login without deleting it. Admin-only. */
export async function setPortalUserActive(userId: string, active: boolean): Promise<{ error?: string }> {
  const guard = await requireRole(["admin"])
  if (guard.error) return { error: guard.error }

  const { supabase } = guard
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: active })
    .eq("id", userId)
    .eq("role", "customer")

  if (error) return { error: sanitizeError(error) }
  revalidatePath("/portal-users")
  return {}
}
