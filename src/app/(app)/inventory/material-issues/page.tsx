import Link from "next/link"
import { Plus, ChevronRight } from "lucide-react"
import { requireAuth } from "@/lib/auth"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { UserRole } from "@/types/database"

export default async function MaterialIssuesPage() {
  const { supabase, profile } = await requireAuth()
  const userRole = (profile?.role ?? "operator") as UserRole
  const canCreate = ["admin", "operator", "engineer"].includes(userRole)

  const { data: records } = await supabase
    .from("material_issues")
    .select("*, job_cards(jc_number)")
    .order("issue_date", { ascending: false })
    .limit(200)

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Material Issues</h1>
          <p className="mt-1 text-sm text-muted-foreground">Stock issued from stores for production</p>
        </div>
        {canCreate && (
          <Link href="/inventory/material-issues/new" className={cn(buttonVariants({ size: "sm" }))}>
            <Plus className="mr-1.5 h-4 w-4" /> New Issue
          </Link>
        )}
      </div>

      {!records || records.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">No material issues yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {records.map((r) => (
            <Link
              key={r.id}
              href={`/inventory/material-issues/${r.id}`}
              className="flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-muted/40 transition-colors"
            >
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{r.issue_number}</span>
                  {r.job_cards?.jc_number && <span className="text-muted-foreground">for {r.job_cards.jc_number}</span>}
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      r.status === "issued" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                    )}
                  >
                    {r.status === "issued" ? "Issued" : "Cancelled"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(r.issue_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
