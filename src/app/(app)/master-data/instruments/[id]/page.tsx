import { notFound } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth"
import { ToggleActiveButton } from "@/components/master-data/toggle-active-button"
import { DocumentCard } from "@/components/documents/document-card"
import { FileUpload } from "@/components/documents/file-upload"
import { buttonVariants } from "@/components/ui/button"
import { ChevronLeft, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { UserRole } from "@/types/database"

const TYPE_LABELS: Record<string, string> = {
  pmi:         "PMI",
  dimensional: "Dimensional",
  visual:      "Visual",
  hardness:    "Hardness",
  nde:         "NDE",
  other:       "Other",
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

function calibrationAlert(calibration_due: string | null | undefined) {
  if (!calibration_due) return null
  const due = new Date(calibration_due)
  const now = new Date()
  const daysUntil = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (daysUntil >= 31) return null

  const isOverdue = daysUntil < 0
  const msg = isOverdue
    ? `Calibration overdue by ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? "s" : ""}`
    : `Calibration due in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-4 py-3 text-sm",
        isOverdue
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-orange-200 bg-orange-50 text-orange-700"
      )}
    >
      <AlertTriangle className="h-4 w-4 shrink-0" />
      {msg} — calibrated by{" "}
      {due.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
    </div>
  )
}

export default async function InstrumentDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { supabase, profile } = await requireAuth()
  const userRole = (profile?.role ?? "operator") as UserRole

  const [{ data: record, error }, { data: docs }] = await Promise.all([
    supabase
      .from("instrument_master")
      .select("*")
      .eq("id", params.id)
      .single(),
    supabase
      .from("documents")
      .select("*")
      .eq("entity_type", "instrument_master")
      .eq("entity_id", params.id)
      .eq("is_active", true)
      .eq("is_latest", true)
      .order("created_at", { ascending: false }),
  ])

  if (error || !record) notFound()

  const latestCalibDoc = docs?.[0] ?? null
  const canEdit = ["admin", "qa"].includes(userRole)

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/master-data/instruments"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}
        >
          <ChevronLeft className="h-4 w-4" /> Instruments
        </Link>
      </div>

      {calibrationAlert(record.calibration_due)}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{record.instrument_name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {TYPE_LABELS[record.instrument_type] ?? record.instrument_type}
          </p>
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
              href={`/master-data/instruments/${record.id}/edit`}
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
          <Row label="Instrument Name" value={record.instrument_name} />
          <Row label="Type"            value={TYPE_LABELS[record.instrument_type] ?? record.instrument_type} />
          <Row label="Serial Number"   value={record.serial_number} />
          <Row label="Manufacturer"    value={record.manufacturer} />
          <Row
            label="Calibration Due"
            value={
              record.calibration_due
                ? new Date(record.calibration_due).toLocaleDateString("en-IN", {
                    day: "numeric", month: "long", year: "numeric",
                  })
                : null
            }
          />
        </dl>
      </div>

      {/* Calibration Certificate */}
      <div className="rounded-lg border border-border p-5 space-y-3">
        <h2 className="font-semibold">Calibration Certificate</h2>
        <DocumentCard
          document={latestCalibDoc}
          storagePath={record.calibration_storage_path}
          legacyDocUrl={record.calibration_cert_url}
        />
        <FileUpload
          entityType="instrument_master"
          entityId={record.id}
          documentType="calibration_cert"
          userRole={userRole}
          label="Upload Certificate"
          sourceModule="instrument_master"
        />
      </div>

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
      {canEdit && (
        <div className="rounded-lg border border-border p-5">
          <h2 className="font-semibold mb-1">Status</h2>
          <p className="text-sm text-muted-foreground mb-3">
            {record.is_active
              ? "This instrument is active and can be selected for PMI/NDE reports."
              : "This instrument is inactive and will not appear in report dropdowns."}
          </p>
          <ToggleActiveButton table="instrument_master" id={record.id} isActive={record.is_active} />
        </div>
      )}
    </div>
  )
}
