import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { WpsForm } from "@/components/master-data/wps-form"
import type { UserRole } from "@/types/database"

export const metadata = { title: "New WPS Master — ValveTrack" }

export default async function NewWpsMasterPage() {
  const { profile } = await requireAuth()
  const role = (profile?.role ?? "operator") as UserRole

  if (!["admin", "qa"].includes(role)) redirect("/master-data/wps")

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link
          href="/master-data/wps"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back to WPS Master
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">New WPS Master</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Creates a Draft record. Admin must approve before it can be linked to job cards.
        </p>
      </div>

      <WpsForm mode="create" />
    </div>
  )
}
