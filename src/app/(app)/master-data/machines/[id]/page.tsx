import { notFound } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth"
import { ToggleActiveButton } from "@/components/master-data/toggle-active-button"
import { buttonVariants } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import type { UserRole } from "@/types/database"

const CATEGORY_LABELS: Record<string, string> = {
  welding:   "Welding",
  machining: "Machining",
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

export default async function MachineDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { supabase, profile } = await requireAuth()
  const userRole = (profile?.role ?? "operator") as UserRole

  const { data: record, error } = await supabase
    .from("machines")
    .select("*")
    .eq("id", params.id)
    .single()

  if (error || !record) notFound()

  const canEdit = ["admin", "engineer"].includes(userRole)
  const canDeactivate = ["admin", "engineer"].includes(userRole)

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/master-data/machines"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}
        >
          <ChevronLeft className="h-4 w-4" /> Machines
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{record.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5 font-mono">{record.machine_code}</p>
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
              href={`/master-data/machines/${record.id}/edit`}
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
          <Row label="Machine Code" value={record.machine_code} />
          <Row label="Name"         value={record.name} />
          <Row label="Category"     value={CATEGORY_LABELS[record.category] ?? record.category} />
          <Row label="Location"     value={record.location} />
          <Row label="Notes"        value={record.notes} />
        </dl>
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
      {canDeactivate && (
        <div className="rounded-lg border border-border p-5">
          <h2 className="font-semibold mb-1">Status</h2>
          <p className="text-sm text-muted-foreground mb-3">
            {record.is_active
              ? "This machine is currently active and can be assigned to operations."
              : "This machine is inactive and will not appear in assignment lists."}
          </p>
          <ToggleActiveButton table="machines" id={record.id} isActive={record.is_active} />
        </div>
      )}
    </div>
  )
}
