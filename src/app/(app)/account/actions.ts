"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { checkRateLimit } from "@/lib/rate-limit"
import { sanitizeError } from "@/lib/security"
import { changeOwnPasswordSchema, changeOwnEmailSchema } from "@/lib/validations/staff-account"

/**
 * Self-service login-email and password change for the signed-in user.
 * Available to every internal staff role (the (app) route group's own layout
 * already keeps customer-portal accounts out of here entirely) — not gated to
 * admin, because "only admins can change their own password" is not a
 * defensible position in a real deployment.
 *
 * Both actions re-verify the CURRENT password before changing anything. A
 * session left open on a shared shop-floor terminal is a real risk here;
 * without this check, that alone would be enough to permanently lock the
 * real account owner out by silently swapping their login email or password.
 */

export async function changeOwnPassword(raw: unknown): Promise<{ error?: string }> {
  const { user, supabase } = await requireAuth()

  const parsed = changeOwnPasswordSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }
  const { currentPassword, newPassword } = parsed.data

  const email = user.email
  if (!email) return { error: "Your account has no email on file — contact an administrator." }

  const rate = await checkRateLimit(`account-verify:${user.id}`, 5, 15 * 60 * 1000)
  if (!rate.allowed) return { error: "Too many attempts. Please wait 15 minutes and try again." }

  const { error: verifyErr } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  })
  if (verifyErr) return { error: "Current password is incorrect." }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: sanitizeError(error) }

  return {}
}

export async function changeOwnEmail(raw: unknown): Promise<{ error?: string }> {
  const { user, supabase } = await requireAuth()

  const parsed = changeOwnEmailSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }
  const { currentPassword, newEmail } = parsed.data

  const currentEmail = user.email
  if (!currentEmail) return { error: "Your account has no email on file — contact an administrator." }

  if (newEmail === currentEmail.toLowerCase()) {
    return { error: "That is already your email address." }
  }

  const rate = await checkRateLimit(`account-verify:${user.id}`, 5, 15 * 60 * 1000)
  if (!rate.allowed) return { error: "Too many attempts. Please wait 15 minutes and try again." }

  const { error: verifyErr } = await supabase.auth.signInWithPassword({
    email: currentEmail,
    password: currentPassword,
  })
  if (verifyErr) return { error: "Current password is incorrect." }

  // Applied immediately via the admin API rather than Supabase's "click the
  // link in your inbox" confirmation flow — this project has no verified
  // transactional-email path for auth confirmations, and every account it
  // provisions is already created with email_confirm: true for the same reason.
  let admin
  try {
    admin = createAdminClient()
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Admin client unavailable" }
  }

  const { error } = await admin.auth.admin.updateUserById(user.id, {
    email: newEmail,
    email_confirm: true,
  })
  if (error) return { error: sanitizeError(error) }

  revalidatePath("/account")
  revalidatePath("/settings")
  return {}
}
