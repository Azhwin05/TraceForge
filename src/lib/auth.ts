import { cache } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import type { UserRole } from "@/types/database"

type Profile = { full_name: string | null; role: string; is_active: boolean }

export const getSessionWithProfile = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, is_active")
    .eq("id", user.id)
    .maybeSingle()

  return { user, profile, supabase }
})

export type AuthSession = {
  user: NonNullable<Awaited<ReturnType<typeof getSessionWithProfile>>>["user"]
  profile: Profile
  supabase: NonNullable<Awaited<ReturnType<typeof getSessionWithProfile>>>["supabase"]
}

export async function requireAuth(): Promise<AuthSession> {
  const session = await getSessionWithProfile()
  if (!session) redirect("/login")
  const { profile } = session

  // Deactivated accounts must not access the app
  if (profile && !profile.is_active) redirect("/login?error=account_disabled")

  // Every authenticated user must have a profile row — no silent fallback
  if (!profile) redirect("/login?error=no_profile")

  return { user: session.user, profile, supabase: session.supabase }
}

export async function requireRole(allowedRoles: UserRole[]) {
  const { user, profile, supabase } = await requireAuth()
  const role = profile.role as UserRole
  if (!allowedRoles.includes(role)) {
    return { error: "Unauthorized: insufficient permissions" as const }
  }
  return { user, profile, role, supabase, error: null }
}
