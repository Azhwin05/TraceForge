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

/**
 * Shared guard: resolve a target portal user, refusing anything that isn't a
 * customer. Keeps these admin endpoints incapable of touching internal staff
 * accounts regardless of what id is posted to them.
 */
async function loadCustomerTarget(userId: string) {
  let admin
  try {
    admin = createAdminClient()
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Admin client unavailable" as string }
  }
  const { data: target } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .single()

  if (!target) return { error: "That portal user no longer exists." }
  if ((target as { role: string }).role !== "customer") {
    return { error: "That account is not a customer portal login." }
  }
  return { admin }
}

/**
 * Replace the set of ADDITIONAL companies a portal login may access. The
 * primary company (profiles.client_id) is always included implicitly by
 * current_client_ids() and is never stored here, so it can't be revoked by
 * accident.
 */
export async function setPortalUserCompanies(
  userId: string,
  clientIds: string[],
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin"])
  if (guard.error) return { error: guard.error }

  const target = await loadCustomerTarget(userId)
  if ("error" in target) return { error: target.error }
  const { admin } = target

  const { data: profile } = await admin
    .from("profiles")
    .select("client_id")
    .eq("id", userId)
    .single()
  const primary = (profile as { client_id: string | null } | null)?.client_id ?? null

  // Never persist the primary company as an "extra" grant
  const extras = Array.from(new Set(clientIds)).filter((id) => id && id !== primary)

  const { error: delErr } = await admin.from("portal_user_clients").delete().eq("profile_id", userId)
  if (delErr) return { error: sanitizeError(delErr) }

  if (extras.length > 0) {
    const { error: insErr } = await admin
      .from("portal_user_clients")
      .insert(extras.map((client_id) => ({ profile_id: userId, client_id })))
    if (insErr) return { error: sanitizeError(insErr) }
  }

  revalidatePath("/portal-users")
  return {}
}

/** Set a new password for a portal login. Admin-only. */
export async function resetPortalUserPassword(
  userId: string,
  password: string,
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin"])
  if (guard.error) return { error: guard.error }

  if (typeof password !== "string" || password.length < 8) {
    return { error: "Password must be at least 8 characters." }
  }

  const target = await loadCustomerTarget(userId)
  if ("error" in target) return { error: target.error }

  const { error } = await target.admin.auth.admin.updateUserById(userId, { password })
  if (error) return { error: sanitizeError(error) }

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
