import { redirect } from "next/navigation"
import { requireRole } from "@/lib/auth"
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin"
import { UsersClient } from "@/components/settings/users-client"
import type { Profile } from "@/types/database"

export const metadata = { title: "Settings — ValveTrack" }

/**
 * Previously this page fetched the session manually and only *hid* admin
 * controls in the UI for non-admins — it never actually redirected them, so
 * any authenticated staff member could open /settings directly and see the
 * full user roster (RLS's profiles_staff_select policy lets any internal
 * staff SELECT all profiles). requireRole makes that an actual gate.
 */
export default async function SettingsPage() {
  const guard = await requireRole(["admin"])
  // requireAuth() (called inside requireRole) has already confirmed there IS
  // a session — this is a logged-in non-admin, so send them somewhere real
  // rather than back to /login.
  if (guard.error) redirect("/dashboard")
  const { user, supabase } = guard

  // Customer portal logins are managed exclusively on the Portal Users page
  // (they carry a client_id binding this screen doesn't handle) — excluding
  // them here also avoids a dead-end "Edit Role" that would always fail the
  // profiles_customer_client_chk constraint.
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .neq("role", "customer")
    .order("full_name")

  // profiles has no email column (it lives only in auth.users), so the
  // roster needs a second, service-role lookup to show/edit it at all.
  let emailById = new Map<string, string>()
  let adminConfigured = isAdminConfigured()
  if (adminConfigured) {
    try {
      const admin = createAdminClient()
      const map = new Map<string, string>()
      let page = 1
      const perPage = 200
      for (;;) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
        if (error) throw error
        for (const u of data.users) {
          if (u.email) map.set(u.id, u.email)
        }
        if (data.users.length < perPage) break
        page += 1
        if (page > 20) break // hard stop — well beyond any realistic org size
      }
      emailById = map
    } catch {
      // Don't let an email-lookup hiccup take down the whole page — the
      // roster still renders, just without emails, same as the
      // "not configured" state below.
      adminConfigured = false
    }
  }

  return (
    <UsersClient
      profiles={(profiles ?? []) as Profile[]}
      emailById={Object.fromEntries(emailById)}
      currentUserId={user.id}
      isAdmin
      provisioningEnabled={adminConfigured}
    />
  )
}
