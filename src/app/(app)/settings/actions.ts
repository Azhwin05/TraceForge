"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import type { UserRole } from "@/types/database"
import { sanitizeError } from "@/lib/security"

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
