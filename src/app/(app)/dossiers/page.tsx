import Link from "next/link"
import { PackageCheck, Plus, ChevronRight } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { DossierStatus, UserRole } from "@/types/database"

export const metadata = { title: "Dossiers — ValveTrack" }

const STATUS_BADGE: Record<DossierStatus, { label: string; className: string }> = {
  draft:     { label: "Draft",     className: "bg-gray-100 text-gray-700" },
  generated: { label: "Generated", className: "bg-blue-100 text-blue-700" },
  submitted: { label: "Submitted", className: "bg-green-100 text-green-700" },
  archived:  { label: "Archived",  className: "bg-slate-100 text-slate-500" },
}

function fmtDate(d?: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

type DossierRow = {
  id: string
  dossier_number: string
  dossier_date: string
  status: DossierStatus
  customer_name: string | null
  submitted_to_customer: boolean
  submitted_at: string | null
  created_at: string
  job_cards: { jc_number: string } | null
}

type SearchParams = {
  status?: string
  archived?: string
}

export default async function DossiersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const { profile } = await requireAuth()
  const userRole = (profile?.role ?? "operator") as UserRole
  const canCreate = ["admin", "qa"].includes(userRole)

  const supabase = await createClient()

  const showArchived = sp.archived === "1"

  let query = supabase
    .from("customer_dossiers")
    .select("id, dossier_number, dossier_date, status, customer_name, submitted_to_customer, submitted_at, created_at, job_cards(jc_number)")
    .order("created_at", { ascending: false })

  if (!showArchived) query = query.neq("status", "archived")
  if (sp.status) query = query.eq("status", sp.status as DossierStatus)

  const { data: rawRows } = await query
  const dossiers = (rawRows ?? []) as DossierRow[]

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customer Submission Dossiers</h1>
          <p className="text-muted-foreground text-sm mt-1">Compiled document packs for customer delivery</p>
        </div>
        {canCreate && (
          <Link
            href="/dossiers/new"
            className="flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> New Dossier
          </Link>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <form className="flex flex-wrap gap-3 items-center">
            <select
              name="status"
              defaultValue={sp.status ?? ""}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="generated">Generated</option>
              <option value="submitted">Submitted</option>
            </select>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="checkbox" name="archived" value="1" defaultChecked={showArchived} className="accent-primary" />
              Show archived
            </label>
            <button type="submit" className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-sm">Filter</button>
            {(sp.status || showArchived) && (
              <a href="/dossiers" className="h-8 px-3 rounded-md border border-input bg-background text-sm flex items-center text-muted-foreground">
                Clear
              </a>
            )}
          </form>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Dossiers {dossiers.length > 0 && `(${dossiers.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dossiers.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <PackageCheck className="h-8 w-8 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No dossiers found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left font-medium text-muted-foreground pb-2 pr-3">Dossier No.</th>
                    <th className="text-left font-medium text-muted-foreground pb-2 pr-3">Job Card</th>
                    <th className="text-left font-medium text-muted-foreground pb-2 pr-3">Customer</th>
                    <th className="text-left font-medium text-muted-foreground pb-2 pr-3">Date</th>
                    <th className="text-left font-medium text-muted-foreground pb-2 pr-3">Status</th>
                    <th className="text-left font-medium text-muted-foreground pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {dossiers.map((d) => {
                    const badge = STATUS_BADGE[d.status]
                    return (
                      <tr key={d.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2.5 pr-3 font-medium font-mono">{d.dossier_number}</td>
                        <td className="py-2.5 pr-3 text-xs">
                          {d.job_cards ? (
                            <span className="font-mono text-primary">{d.job_cards.jc_number}</span>
                          ) : "—"}
                        </td>
                        <td className="py-2.5 pr-3 text-xs">{d.customer_name ?? "—"}</td>
                        <td className="py-2.5 pr-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(d.dossier_date)}</td>
                        <td className="py-2.5 pr-3">
                          <span className={cn("rounded-full px-2 py-0.5 text-xs", badge.className)}>
                            {badge.label}
                          </span>
                          {d.submitted_to_customer && (
                            <span className="ml-1 text-xs text-green-700">✓</span>
                          )}
                        </td>
                        <td className="py-2.5">
                          <Link
                            href={`/dossiers/${d.id}`}
                            className="flex items-center gap-0.5 text-xs text-primary hover:underline"
                          >
                            View <ChevronRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
