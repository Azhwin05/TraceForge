import Link from "next/link"
import { Factory } from "lucide-react"
import { requireCustomer } from "@/lib/auth"
import { PortalHeaderActions } from "@/components/portal/portal-header-actions"

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile, clientId, clientIds } = await requireCustomer()

  const { data: clientRows } = await supabase
    .from("clients")
    .select("id, name")
    .in("id", clientIds)

  const rows = (clientRows ?? []) as { id: string; name: string }[]
  const primaryName = rows.find((c) => c.id === clientId)?.name ?? "Your Company"
  // A login can span several companies — don't imply it's only the primary one.
  const clientName =
    rows.length > 1 ? `${primaryName} +${rows.length - 1} more` : primaryName
  const allCompanies = rows.map((c) => c.name).join(" · ")

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/portal" className="flex items-center gap-2">
            <Factory className="h-5 w-5 text-orange-500" />
            <div className="leading-tight">
              <div className="text-sm font-semibold">Raghav Engineering · Customer Portal</div>
              <div className="text-xs text-muted-foreground" title={allCompanies}>{clientName}</div>
            </div>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/portal" className="text-muted-foreground hover:text-foreground">Overview</Link>
            <Link href="/portal/jobs" className="text-muted-foreground hover:text-foreground">My Jobs</Link>
            <PortalHeaderActions name={profile.full_name ?? "Account"} />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        ValveTrack · Data shown is scoped to {clientName} only.
      </footer>
    </div>
  )
}
