"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search, ChevronRight, Pencil, Truck } from "lucide-react"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { InventoryRowActions } from "@/components/inventory/inventory-row-actions"
import { deleteMaterialInward } from "@/app/(app)/inventory/material-inward/actions"
import type { MaterialInward, Supplier, Client, UserRole } from "@/types/database"

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending_inspection:        { label: "Pending Inspection",  className: "bg-muted text-muted-foreground" },
  incoming_inspection_done:  { label: "Incoming Done",       className: "bg-info-surface text-info" },
  qc_accepted:                { label: "QC Accepted",         className: "bg-success-surface text-success" },
  qc_rejected:                { label: "QC Rejected",         className: "bg-danger-surface text-danger" },
  grn_generated:              { label: "GRN Generated",       className: "bg-success-surface text-success" },
}

type Row = MaterialInward & { suppliers: Pick<Supplier, "name"> | null; clients: Pick<Client, "name"> | null }

export function MaterialInwardListClient({ records, userRole }: { records: Row[]; userRole: UserRole }) {
  const [search, setSearch] = useState("")
  const router = useRouter()
  const isAdmin = userRole === "admin"

  const filtered = records.filter((r) => {
    const q = search.toLowerCase()
    return !q
      || r.inward_number.toLowerCase().includes(q)
      || r.dc_number.toLowerCase().includes(q)
      || (r.suppliers?.name ?? "").toLowerCase().includes(q)
      || (r.clients?.name ?? "").toLowerCase().includes(q)
  })

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search DC number, supplier or client…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Truck}
          title={search ? "No matches" : "No material inward recorded"}
          description={
            search
              ? "Nothing matches that search. Check the spelling, or clear it to see everything."
              : "Each delivery of wire, rod or powder is logged here, then inspected and posted to stock as a GRN."
          }
        />
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {filtered.map((r) => {
            const status = STATUS_LABELS[r.status] ?? { label: r.status, className: "bg-muted text-muted-foreground" }
            return (
              <div key={r.id} className="flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-muted/40 transition-colors">
                <Link href={`/inventory/material-inward/${r.id}`} className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.inward_number}</span>
                    <span className="text-muted-foreground">—</span>
                    <span>{r.source_type === "customer" ? (r.clients?.name ?? "Unknown client") : (r.suppliers?.name ?? "Unknown supplier")}</span>
                    {r.source_type === "customer" && (
                      <span className="rounded-full bg-info-surface px-2 py-0.5 text-xs font-medium text-info">
                        Client-supplied
                      </span>
                    )}
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", status.className)}>
                      {status.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>DC: {r.dc_number}</span>
                    <span>DC Date: {new Date(r.dc_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                    {r.po_number && <span>PO: {r.po_number}</span>}
                  </div>
                </Link>
                {isAdmin && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => router.push(`/inventory/material-inward/${r.id}/edit`)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <InventoryRowActions
                      label={r.inward_number}
                      canDelete
                      onDelete={() => deleteMaterialInward(r.id)}
                      deleteDescription="This permanently removes the delivery-challan record and its inspections. Blocked if a GRN has already been generated (material already moved into stock) — cancel/reverse that first."
                    />
                  </div>
                )}
                <Link href={`/inventory/material-inward/${r.id}`}>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
