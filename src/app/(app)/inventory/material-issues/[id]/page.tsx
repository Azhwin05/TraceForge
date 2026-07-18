import { notFound } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth"
import { buttonVariants } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"

export default async function MaterialIssueDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { supabase } = await requireAuth()

  const { data: record, error } = await supabase
    .from("material_issues")
    .select(`
      *, job_cards(jc_number),
      material_issue_items(*, item_master(item_code, item_name), storage_locations(code, name))
    `)
    .eq("id", params.id)
    .single()

  if (error || !record) notFound()

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/inventory/material-issues" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}>
          <ChevronLeft className="h-4 w-4" /> Material Issues
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{record.issue_number}</h1>
          {record.job_cards?.jc_number && (
            <p className="text-sm text-muted-foreground mt-0.5">For job card {record.job_cards.jc_number}</p>
          )}
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium shrink-0",
            record.status === "issued" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
          )}
        >
          {record.status === "issued" ? "Issued" : "Cancelled"}
        </span>
      </div>

      <div className="rounded-lg border border-border p-5">
        <h2 className="font-semibold mb-3">Issued Items</h2>
        <div className="divide-y divide-border">
          {record.material_issue_items.map((it: {
            id: string; issued_qty: number; uom: string
            item_master: { item_code: string; item_name: string }
            storage_locations: { code: string; name: string }
          }) => (
            <div key={it.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <p>{it.item_master.item_code} — {it.item_master.item_name}</p>
                <p className="text-xs text-muted-foreground">From {it.storage_locations.code} — {it.storage_locations.name}</p>
              </div>
              <span className="text-muted-foreground">{it.issued_qty} {it.uom}</span>
            </div>
          ))}
        </div>
      </div>

      {record.remarks && (
        <div className="rounded-lg border border-border p-5">
          <h2 className="font-semibold mb-1">Remarks</h2>
          <p className="text-sm text-muted-foreground">{record.remarks}</p>
        </div>
      )}
    </div>
  )
}
