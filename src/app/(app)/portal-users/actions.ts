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

/**
 * Permanently delete a portal login. Admin-only.
 *
 * Deleting the auth user cascades to `profiles` (profiles_id_fkey is ON DELETE
 * CASCADE). The role check below is the important guard: it makes this endpoint
 * incapable of removing an internal staff account (or the admin's own login),
 * no matter what id is posted to it.
 *
 * Most other tables reference profiles with ON DELETE NO ACTION, so if a
 * customer ever did author a record the cascade would be refused — we surface
 * that as a readable message pointing at Disable, which keeps the audit trail
 * intact rather than destroying traceability on a compliance system.
 */
export async function deletePortalUser(userId: string): Promise<{ error?: string }> {
  const guard = await requireRole(["admin"])
  if (guard.error) return { error: guard.error }

  let admin
  try {
    admin = createAdminClient()
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Admin client unavailable" }
  }

  const { data: target } = await admin
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", userId)
    .single()

  if (!target) return { error: "That portal user no longer exists." }
  if ((target as { role: string }).role !== "customer") {
    return { error: "Only customer portal logins can be deleted here." }
  }

  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) {
    const raw = error instanceof Error ? error.message : String(error)
    if (/foreign key|violates/i.test(raw)) {
      return {
        error:
          "Can't delete: this login is referenced by existing records. Disable it instead — that revokes access and keeps the audit trail.",
      }
    }
    return { error: sanitizeError(error) }
  }

  revalidatePath("/portal-users")
  return {}
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
