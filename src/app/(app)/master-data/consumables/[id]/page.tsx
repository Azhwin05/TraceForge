import { notFound } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth"
import { ToggleActiveButton } from "@/components/master-data/toggle-active-button"
import { buttonVariants } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import type { UserRole } from "@/types/database"

const TYPE_LABELS: Record<string, string> = {
  electrode: "Electrode",
  wire:      "Wire",
  flux:      "Flux",
  rod:       "Rod",
  other:     "Other",
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="grid grid-cols-3 gap-2 py-2 border-b border-border last:border-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="col-span-2 text-sm">{value}</dd>
    </div>
  )
}

export default async function ConsumableDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { supabase, profile } = await requireAuth()
  const userRole = (profile?.role ?? "operator") as UserRole

  const { data: record, error } = await supabase
    .from("consumable_master")
    .select("*")
    .eq("id", params.id)
    .single()

  if (error || !record) notFound()

  const canEdit = ["admin", "engineer"].includes(userRole)
  const canDeactivate = userRole === "admin"

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/master-data/consumables"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}
        >
          <ChevronLeft className="h-4 w-4" /> Consumables
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{record.product_name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{record.brand}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium",
              record.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
            )}
          >
            {record.is_active ? "Active" : "Inactive"}
          </span>
          {canEdit && (
            <Link
              href={`/master-data/consumables/${record.id}/edit`}
              className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            >
              Edit
            </Link>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="rounded-lg border border-border p-5">
        <h2 className="font-semibold mb-3">Details</h2>
        <dl className="divide-y divide-border">
          <Row label="Brand"        value={record.brand} />
          <Row label="Product Name" value={record.product_name} />
          <Row label="Type"         value={TYPE_LABELS[record.type] ?? record.type} />
          <Row label="AWS Class"    value={record.aws_class} />
          <Row label="Size"         value={record.size} />
          <Row label="Manufacturer" value={record.manufacturer} />
          <Row label="Notes"        value={record.notes} />
        </dl>
      </div>

      {/* Batch / Traceability */}
      {(record.batch_no || record.manufacturing_date || record.expiry_date) && (
        <div className="rounded-lg border border-border p-5">
          <h2 className="font-semibold mb-3">Batch / Traceability</h2>
          <dl className="divide-y divide-border">
            <Row label="Batch Number"        value={record.batch_no} />
            <Row
              label="Manufacturing Date"
              value={
                record.manufacturing_date
                  ? new Date(record.manufacturing_date).toLocaleDateString("en-IN", {
                      day: "numeric", month: "long", year: "numeric",
                    })
                  : null
              }
            />
            <Row
              label="Expiry Date"
              value={
                record.expiry_date
                  ? new Date(record.expiry_date).toLocaleDateString("en-IN", {
                      day: "numeric", month: "long", year: "numeric",
                    })
                  : null
              }
            />
          </dl>
        </div>
      )}

      {/* Meta */}
      <div className="rounded-lg border border-border p-5">
        <h2 className="font-semibold mb-3">Record Info</h2>
        <dl className="divide-y divide-border">
          <Row
            label="Created"
            value={new Date(record.created_at).toLocaleDateString("en-IN", {
              day: "numeric", month: "long", year: "numeric",
            })}
          />
          <Row
            label="Last Updated"
            value={new Date(record.updated_at).toLocaleDateString("en-IN", {
              day: "numeric", month: "long", year: "numeric",
            })}
          />
        </dl>
      </div>

      {/* Toggle active */}
      {canDeactivate && (
        <div className="rounded-lg border border-border p-5">
          <h2 className="font-semibold mb-1">Status</h2>
          <p className="text-sm text-muted-foreground mb-3">
            {record.is_active
              ? "This consumable is currently active and can be assigned to job cards."
              : "This consumable is inactive and will not appear in assignment lists."}
          </p>
          <ToggleActiveButton table="consumable_master" id={record.id} isActive={record.is_active} />
        </div>
      )}
    </div>
  )
}
