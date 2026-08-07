import { cache } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import type { UserRole } from "@/types/database"

type Profile = { full_name: string | null; role: string; is_active: boolean; client_id: string | null }

export const getSessionWithProfile = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, is_active, client_id")
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

/**
 * Guard for the external customer portal. Ensures the current user is an active
 * customer bound to a client. Redirects staff to the internal app and
 * unauthenticated users to login. Customer data isolation is ultimately
 * enforced by RLS (`current_client_id()`); this is the app-layer gate.
 */
export async function requireCustomer(): Promise<
  AuthSession & { clientId: string; clientIds: string[] }
> {
  const session = await requireAuth()
  const { profile, supabase } = session
  if (profile.role !== "customer") {
    // Internal staff shouldn't be in the portal
    redirect("/dashboard")
  }
  if (!profile.client_id) {
    redirect("/login?error=portal_not_provisioned")
  }

  // A login may be granted additional companies beyond its primary one
  // (portal_user_clients). RLS already scopes every query via
  // current_client_ids(); this is only so the UI can name them.
  const { data: extra } = await supabase
    .from("portal_user_clients")
    .select("client_id")
    .eq("profile_id", session.user.id)

  const clientIds = Array.from(
    new Set([profile.client_id, ...((extra ?? []) as { client_id: string }[]).map((r) => r.client_id)]),
  )

  return { ...session, clientId: profile.client_id, clientIds }
}
