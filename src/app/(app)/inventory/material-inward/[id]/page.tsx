import { notFound } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth"
import { buttonVariants } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import type { UserRole } from "@/types/database"
import { IncomingInspectionForm } from "@/components/inventory/incoming-inspection-form"
import { QualityInspectionPanel } from "@/components/inventory/quality-inspection-panel"
import { GrnGenerator } from "@/components/inventory/grn-generator"
import { MaterialInwardDetailActions } from "@/components/inventory/material-inward-detail-actions"

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending_inspection:        { label: "Pending Inspection",  className: "bg-slate-100 text-slate-600" },
  incoming_inspection_done:  { label: "Incoming Done",       className: "bg-blue-100 text-blue-700" },
  qc_accepted:                { label: "QC Accepted",         className: "bg-green-100 text-green-700" },
  qc_rejected:                { label: "QC Rejected",         className: "bg-red-100 text-red-700" },
  grn_generated:              { label: "GRN Generated",       className: "bg-emerald-100 text-emerald-800" },
}

export default async function MaterialInwardDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { supabase, profile } = await requireAuth()
  const userRole = (profile?.role ?? "operator") as UserRole

  const { data: record, error } = await supabase
    .from("material_inward")
    .select(`
      *, suppliers(name, contact_name, contact_phone),
      material_inward_items(*, item_master(item_code, item_name)),
      incoming_inspections(*),
      quality_inspections(*),
      grn(*, grn_items(*))
    `)
    .eq("id", params.id)
    .single()

  if (error || !record) notFound()

  const { data: storageLocations } = await supabase
    .from("storage_locations")
    .select("id, code, name")
    .eq("is_active", true)
    .order("code")

  const status = STATUS_LABELS[record.status] ?? { label: record.status, className: "bg-slate-100 text-slate-600" }
  const canInwardOps = ["admin", "operator", "engineer"].includes(userRole)
  const canQc = ["admin", "qa"].includes(userRole)
  const canGrn = ["admin", "engineer"].includes(userRole)

  const incomingInspection = record.incoming_inspections ?? null
  const items = record.material_inward_items ?? []
  const qualityInspections = record.quality_inspections ?? []
  const grnRecord = record.grn ?? null

  // GRN'd quality_inspection_ids so we don't offer already-GRN'd items again
  const grnedInspectionIds = new Set((grnRecord?.grn_items ?? []).map((gi) => gi.quality_inspection_id))
  const acceptedForGrn = qualityInspections
    .filter((qi) => qi.result === "accepted" && !grnedInspectionIds.has(qi.id))
    .map((qi) => ({
      ...qi,
      material_inward_items: items.find((it) => it.id === qi.material_inward_item_id)!,
    }))

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/inventory/material-inward" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}>
          <ChevronLeft className="h-4 w-4" /> Material Inward
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{record.inward_number}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">DC {record.dc_number} · {record.suppliers?.name}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", status.className)}>
            {status.label}
          </span>
          {userRole === "admin" && (
            <MaterialInwardDetailActions id={record.id} inwardNumber={record.inward_number} />
          )}
        </div>
      </div>

      {/* DC Details */}
      <div className="rounded-lg border border-border p-5">
        <h2 className="font-semibold mb-3">Delivery Challan Details</h2>
        <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          <div><dt className="text-muted-foreground">DC Date</dt><dd>{new Date(record.dc_date).toLocaleDateString("en-IN")}</dd></div>
          {record.po_number && <div><dt className="text-muted-foreground">PO Number</dt><dd>{record.po_number}</dd></div>}
          {record.vehicle_no && <div><dt className="text-muted-foreground">Vehicle No.</dt><dd>{record.vehicle_no}</dd></div>}
          {record.suppliers?.contact_name && <div><dt className="text-muted-foreground">Supplier Contact</dt><dd>{record.suppliers.contact_name}</dd></div>}
        </dl>
        {record.remarks && <p className="mt-3 text-sm text-muted-foreground">Remarks: {record.remarks}</p>}
      </div>

      {/* DC Items */}
      <div className="rounded-lg border border-border p-5">
        <h2 className="font-semibold mb-3">DC Items</h2>
        <div className="divide-y divide-border">
          {items.map((it: { id: string; item_master: { item_code: string; item_name: string }; dc_quantity: number; uom: string }) => (
            <div key={it.id} className="flex items-center justify-between py-2 text-sm">
              <span>{it.item_master.item_code} — {it.item_master.item_name}</span>
              <span className="text-muted-foreground">{it.dc_quantity} {it.uom}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Incoming Inspection */}
      <div className="rounded-lg border border-border p-5">
        <h2 className="font-semibold mb-3">1. Incoming Inspection</h2>
        {incomingInspection ? (
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
            <div><dt className="text-muted-foreground">Quantity</dt><dd>{incomingInspection.quantity_ok ? "OK" : "Not OK"}</dd></div>
            <div><dt className="text-muted-foreground">Packaging</dt><dd>{incomingInspection.packaging_ok ? "OK" : "Not OK"}</dd></div>
            <div><dt className="text-muted-foreground">Documents</dt><dd>{incomingInspection.documents_ok ? "OK" : "Not OK"}</dd></div>
            {incomingInspection.remarks && (
              <div className="col-span-full"><dt className="text-muted-foreground">Remarks</dt><dd>{incomingInspection.remarks}</dd></div>
            )}
          </dl>
        ) : canInwardOps || canQc ? (
          <IncomingInspectionForm materialInwardId={record.id} />
        ) : (
          <p className="text-sm text-muted-foreground">Not yet inspected.</p>
        )}
      </div>

      {/* Step 2 & 3: Quality Inspection / Accept-Reject */}
      {incomingInspection && (
        <div className="rounded-lg border border-border p-5">
          <h2 className="font-semibold mb-3">2. Quality Inspection (per item)</h2>
          <QualityInspectionPanel
            materialInwardId={record.id}
            items={items}
            inspections={qualityInspections}
            canInspect={canQc}
          />
        </div>
      )}

      {/* Step 4: GRN */}
      {record.status === "qc_accepted" && canGrn && (
        <div className="rounded-lg border border-border p-5">
          <h2 className="font-semibold mb-3">3. Generate GRN — Move to Inventory</h2>
          <GrnGenerator
            materialInwardId={record.id}
            acceptedInspections={acceptedForGrn}
            storageLocations={storageLocations ?? []}
            canAddLocation={userRole === "admin"}
          />
        </div>
      )}

      {record.status === "qc_rejected" && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-5">
          <h2 className="font-semibold text-destructive mb-1">Material Rejected</h2>
          <p className="text-sm text-destructive/90">
            One or more items failed quality inspection. Return to supplier with rejection documentation.
          </p>
        </div>
      )}

      {grnRecord && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-5">
          <h2 className="font-semibold text-emerald-800 mb-3">GRN {grnRecord.grn_number}</h2>
          <div className="divide-y divide-emerald-200">
            {grnRecord.grn_items.map((gi: { id: string; accepted_qty: number; uom: string }) => (
              <div key={gi.id} className="flex items-center justify-between py-2 text-sm text-emerald-900">
                <span>Accepted into stock</span>
                <span>{gi.accepted_qty} {gi.uom}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
