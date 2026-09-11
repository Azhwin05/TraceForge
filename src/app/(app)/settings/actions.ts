"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { checkRateLimit } from "@/lib/rate-limit"
import { sanitizeError } from "@/lib/security"
import { emailSchema, newPasswordSchema, createStaffUserSchema } from "@/lib/validations/staff-account"
import type { UserRole } from "@/types/database"

const VALID_ROLES: UserRole[] = ["admin", "operator", "engineer", "qa", "accounts", "management"]

async function getAdminGuard() {
  const guard = await requireRole(["admin"])
  if (guard.error) return { error: guard.error } as const
  return guard
}

export async function updateUserRole(
  profileId: string,
  role: UserRole
): Promise<{ error?: string }> {
  if (!VALID_ROLES.includes(role)) return { error: "Invalid role" }

  const result = await getAdminGuard()
  if (result.error) return { error: result.error }

  // Prevent admin from changing their own role
  if (profileId === result.user.id) return { error: "Cannot change your own role" }

  const { error } = await result.supabase
    .from("profiles")
    .update({ role })
    .eq("id", profileId)
  if (error) return { error: sanitizeError(error) }

  revalidatePath("/settings")
  return {}
}

export async function toggleUserActive(
  profileId: string,
  isActive: boolean
): Promise<{ error?: string }> {
  const result = await getAdminGuard()
  if (result.error) return { error: result.error }

  if (profileId === result.user.id) return { error: "Cannot deactivate yourself" }

  const { error } = await result.supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", profileId)
  if (error) return { error: sanitizeError(error) }

  revalidatePath("/settings")
  return {}
}

// ─────────────────────────────────────────────────────────────────────────────
// Staff account provisioning & credential management
//
// Portal (customer) logins have long had password reset / activation from the
// Portal Users page. Internal staff accounts had no equivalent — a new admin,
// QA lead or operator could only be created by hand in the Supabase dashboard,
// and nobody could change a staff member's login email or password from the
// app at all. Below mirrors the already-hardened portal-user pattern
// (service-role admin client, upsert-then-rollback-on-failure, admin-only)
// but scoped to non-customer roles.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new internal staff login with an assigned role. Admin-only.
 * Customer portal logins are provisioned exclusively from Portal Users, which
 * keeps the client_id binding and the customer-only invariant in one place.
 */
export async function createStaffUser(
  raw: unknown
): Promise<{ error?: string; userId?: string }> {
  const guard = await getAdminGuard()
  if (guard.error) return { error: guard.error }

  const parsed = createStaffUserSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }
  const { email, password, fullName, role } = parsed.data

  // Generous per-admin cap — well above normal onboarding pace, just a guard
  // against a runaway client loop or a compromised session mass-creating logins.
  const rate = await checkRateLimit(`staff-create:${guard.user.id}`, 20, 60 * 60 * 1000)
  if (!rate.allowed) {
    return { error: "Too many accounts created recently — please wait a bit and try again." }
  }

  let admin
  try {
    admin = createAdminClient()
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Admin client unavailable" }
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })
  if (createErr || !created?.user) {
    return { error: sanitizeError(createErr ?? new Error("Failed to create user")) }
  }

  const { error: profileErr } = await admin.from("profiles").upsert(
    { id: created.user.id, full_name: fullName, role, is_active: true, client_id: null },
    { onConflict: "id" }
  )
  if (profileErr) {
    // Roll back the orphaned auth user so a retry starts clean
    try {
      await admin.auth.admin.deleteUser(created.user.id)
    } catch {
      /* best-effort cleanup — profileErr is still the error we surface */
    }
    return { error: sanitizeError(profileErr) }
  }

  revalidatePath("/settings")
  return { userId: created.user.id }
}

/**
 * Shared guard: resolve a target profile, refusing customer portal logins
 * (those belong to Portal Users) and returning a service-role client for the
 * caller to act with.
 */
async function loadStaffTarget(
  profileId: string
): Promise<
  | { error: string }
  | { admin: ReturnType<typeof createAdminClient>; target: { id: string; role: string; full_name: string } }
> {
  let admin
  try {
    admin = createAdminClient()
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Admin client unavailable" }
  }

  const { data: target } = await admin
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", profileId)
    .single()

  if (!target) return { error: "That user no longer exists." }
  if (target.role === "customer") {
    return { error: "That is a customer portal login — manage it from Portal Users." }
  }
  return { admin, target }
}

/** Change a staff member's login email. Admin-only; cannot target yourself. */
export async function updateStaffEmail(
  profileId: string,
  newEmail: string
): Promise<{ error?: string }> {
  const guard = await getAdminGuard()
  if (guard.error) return { error: guard.error }

  if (profileId === guard.user.id) {
    return { error: "Use “My Account” below to change your own email." }
  }

  const parsedEmail = emailSchema.safeParse(newEmail)
  if (!parsedEmail.success) return { error: parsedEmail.error.issues[0]?.message ?? "Invalid email" }

  const target = await loadStaffTarget(profileId)
  if ("error" in target) return { error: target.error }

  // Applied immediately via the admin API, bypassing the "click the link in
  // your inbox" confirmation flow — consistent with how every account this
  // app provisions is created (email_confirm: true); the project has no
  // verified transactional-email path for auth confirmations to depend on.
  const { error } = await target.admin.auth.admin.updateUserById(profileId, {
    email: parsedEmail.data,
    email_confirm: true,
  })
  if (error) return { error: sanitizeError(error) }

  revalidatePath("/settings")
  return {}
}

/** Set a new password for a staff login. Admin-only; cannot target yourself. */
export async function resetStaffPassword(
  profileId: string,
  newPassword: string
): Promise<{ error?: string }> {
  const guard = await getAdminGuard()
  if (guard.error) return { error: guard.error }

  if (profileId === guard.user.id) {
    return { error: "Use “My Account” below to change your own password." }
  }

  const parsedPassword = newPasswordSchema.safeParse(newPassword)
  if (!parsedPassword.success) {
    return { error: parsedPassword.error.issues[0]?.message ?? "Invalid password" }
  }

  const target = await loadStaffTarget(profileId)
  if ("error" in target) return { error: target.error }

  const { error } = await target.admin.auth.admin.updateUserById(profileId, {
    password: parsedPassword.data,
  })
  if (error) return { error: sanitizeError(error) }

  revalidatePath("/settings")
  return {}
}

// Self-service email/password change ("My Account") lives in
// (app)/account/actions.ts — it's available to every internal staff role, not
// just admin, so it belongs with its own route's authorization boundary
// rather than this file's admin-only one.
