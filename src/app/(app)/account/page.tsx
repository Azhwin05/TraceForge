import { requireAuth } from "@/lib/auth"
import { PageHeader } from "@/components/ui/page-header"
import { AccountSecurityCard } from "@/components/account/account-security-card"

export const metadata = { title: "My Account — ValveTrack" }

/**
 * Universal self-service page — every internal staff role lands here to
 * change their own login email or password, regardless of what /settings
 * (admin-only) they can or can't reach.
 */
export default async function AccountPage() {
  const { user } = await requireAuth()

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader
        title="My Account"
        description="Manage your own sign-in credentials."
      />
      <AccountSecurityCard currentEmail={user.email ?? ""} />
    </div>
  )
}
