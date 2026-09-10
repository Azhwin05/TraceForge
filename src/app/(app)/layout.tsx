import { redirect } from "next/navigation"
import { getSessionWithProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppHeader } from "@/components/layout/app-header"
import type { UserRole } from "@/types/database"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSessionWithProfile()
  if (!session) redirect("/login")

  const { user, profile } = session
  if (!profile || !profile.is_active) redirect("/login?error=account_disabled")

  // External portal customers must never reach the internal app
  if (profile.role === "customer") redirect("/portal")

  const role = (profile.role ?? "operator") as UserRole

  // Fetch unacknowledged alert count for the sidebar badge
  const supabase = await createClient()
  const { count: alertCount } = await supabase
    .from("alerts")
    .select("*", { count: "exact", head: true })
    .is("acknowledged_at", null)

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar role={role} alertCount={alertCount ?? 0} />
      {/* min-w-0 stops a wide table inside main from stretching the flex row
          and pushing the sidebar off-screen. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          email={user.email ?? ""}
          fullName={profile.full_name ?? user.email ?? "User"}
          role={role}
          alertCount={alertCount ?? 0}
        />
        <main className="flex-1 px-4 py-5 md:px-6 md:py-6">{children}</main>
      </div>
    </div>
  )
}
