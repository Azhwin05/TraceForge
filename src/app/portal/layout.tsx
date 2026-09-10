import Link from "next/link"

import { requireCustomer } from "@/lib/auth"
import { PortalHeaderActions } from "@/components/portal/portal-header-actions"
import { PortalNav } from "@/components/portal/portal-nav"
import { BrandMark } from "@/components/layout/brand-lockup"

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
      <header className="sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5 md:px-6">
          <Link
            href="/portal"
            className="flex min-w-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <BrandMark size={32} />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-semibold text-foreground">
                Raghav Engineering
              </span>
              <span
                className="block truncate text-xs text-muted-foreground"
                title={allCompanies}
              >
                {clientName}
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <PortalNav />
            </div>
            <PortalHeaderActions name={profile.full_name ?? "Account"} />
          </div>
        </div>

        {/* Below sm the nav moves to its own row so the company name keeps room */}
        <div className="border-t border-border px-4 py-1.5 sm:hidden">
          <PortalNav />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-6 md:py-8">
        {children}
      </main>

      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        ValveTrack · Data shown is scoped to {clientName} only.
      </footer>
    </div>
  )
}
