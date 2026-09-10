"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Plus, ChevronRight, Download, Search } from "lucide-react"
import { buttonVariants, Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { formatQty } from "@/lib/format"

type IssueItem = {
  issued_qty: number
  consumed_qty: number | null
  returned_qty: number
  uom: string
  remarks: string | null
  item_master: { item_code: string; item_name: string; consumable_type: string | null } | null
}

export type IssueRow = {
  id: string
  issue_number: string
  issue_date: string
  status: string
  consumption_status: string
  issued_to: string | null
  destination: string | null
  remarks: string | null
  job_cards: { jc_number: string } | null
  material_issue_items: IssueItem[]
}

type TypeFilter = "all" | "wire" | "rod" | "powder"

/** "E7018 Electrode" or "E7018 Electrode +2 more" — the materials on an issue. */
function materialSummary(items: IssueItem[]): string {
  const names = items.map((i) => i.item_master?.item_name).filter(Boolean) as string[]
  if (names.length === 0) return "—"
  if (names.length === 1) return names[0]
  return `${names[0]} +${names.length - 1} more`
}

function csvEscape(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * Exports one CSV row per matching item LINE, not per issue. With a type
 * filter active, an issue that mixes (say) wire and rod lines must export
 * only its wire lines — otherwise "export while filtered to Wire" would still
 * drag in that issue's unrelated rod lines, which is the exact bug reported.
 */
function exportCsv(records: IssueRow[], typeFilter: TypeFilter) {
  const header = [
    "Issue No", "Date", "Job Card", "Issued To", "Destination", "Status", "Usage", "Issue Remarks",
    "Item Code", "Item Name", "Type", "Issued Qty", "Consumed Qty", "Returned Qty", "UOM", "Item Remarks",
  ]
  const rows: string[] = [header.join(",")]
  for (const r of records) {
    const date = new Date(r.issue_date).toLocaleDateString("en-IN")
    const base = [r.issue_number, date, r.job_cards?.jc_number ?? "", r.issued_to ?? "", r.destination ?? "", r.status, r.consumption_status, r.remarks ?? ""]
    const lines = typeFilter === "all"
      ? r.material_issue_items
      : r.material_issue_items.filter((it) => it.item_master?.consumable_type === typeFilter)

    if (lines.length === 0) {
      if (typeFilter === "all") rows.push([...base, "", "", "", "", "", "", ""].map(csvEscape).join(","))
      continue
    }
    for (const it of lines) {
      rows.push([
        ...base,
        it.item_master?.item_code ?? "", it.item_master?.item_name ?? "", it.item_master?.consumable_type ?? "",
        it.issued_qty, it.consumed_qty ?? "", it.returned_qty, it.uom, it.remarks ?? "",
      ].map(csvEscape).join(","))
    }
  }
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  const suffix = typeFilter === "all" ? "" : `-${typeFilter}`
  a.download = `material-issues${suffix}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function MaterialIssuesListClient({
  records,
  canCreate,
}: {
  records: IssueRow[]
  canCreate: boolean
}) {
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return records.filter((r) => {
      const matchType = typeFilter === "all" ||
        r.material_issue_items.some((it) => it.item_master?.consumable_type === typeFilter)
      if (!matchType) return false
      if (!q) return true
      return (
        r.issue_number.toLowerCase().includes(q) ||
        (r.job_cards?.jc_number ?? "").toLowerCase().includes(q) ||
        (r.issued_to ?? "").toLowerCase().includes(q) ||
        (r.destination ?? "").toLowerCase().includes(q) ||
        r.material_issue_items.some((it) =>
          (it.item_master?.item_name ?? "").toLowerCase().includes(q) ||
          (it.item_master?.item_code ?? "").toLowerCase().includes(q))
      )
    })
  }, [records, search, typeFilter])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Material Issues</h1>
          <p className="mt-1 text-sm text-muted-foreground">Stock issued from stores for production</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCsv(filtered, typeFilter)}
            disabled={filtered.length === 0}
          >
            <Download className="mr-1.5 h-4 w-4" /> Export CSV
          </Button>
          {canCreate && (
            <Link href="/inventory/material-issues/new" className={cn(buttonVariants({ size: "sm" }))}>
              <Plus className="mr-1.5 h-4 w-4" /> New Issue
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5">
          {([
            { key: "all", label: "All" },
            { key: "wire", label: "Wire" },
            { key: "rod", label: "Rod" },
            { key: "powder", label: "Powder" },
          ] as const).map((f) => (
            <button
              key={f.key}
              onClick={() => setTypeFilter(f.key)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                typeFilter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search issue, material, job card, operator…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">{search ? "No issues match your search." : "No material issues yet."}</p>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {filtered.map((r) => {
            const totalIssued = r.material_issue_items.reduce((s, it) => s + Number(it.issued_qty || 0), 0)
            const uom = r.material_issue_items[0]?.uom ?? ""
            return (
              <Link
                key={r.id}
                href={`/inventory/material-issues/${r.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-muted/40 transition-colors"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.issue_number}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="truncate text-sm">{materialSummary(r.material_issue_items)}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        r.status === "issued" ? "bg-success-surface text-success" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {r.status === "issued" ? "Issued" : "Cancelled"}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        r.consumption_status === "confirmed" ? "bg-info-surface text-info" : "bg-warning-surface text-warning"
                      )}
                    >
                      {r.consumption_status === "confirmed" ? "Usage confirmed" : "Usage pending"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.issue_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    {r.job_cards?.jc_number && ` · for ${r.job_cards.jc_number}`}
                    {r.issued_to && ` · to ${r.issued_to}`}
                    {r.destination && ` · sent to ${r.destination}`}
                    {totalIssued > 0 && ` · ${formatQty(totalIssued)} ${uom}`}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
