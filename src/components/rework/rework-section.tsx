"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Wrench, Plus, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileUpload } from "@/components/documents/file-upload"
import { ReworkDialog, type StaffOption } from "@/components/rework/rework-dialog"
import { deleteRework } from "@/app/(app)/rework/actions"
import { cn } from "@/lib/utils"
import type { ReworkRecord, UserRole } from "@/types/database"

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  open:        { label: "Open",        className: "bg-red-100 text-red-700" },
  in_progress: { label: "In Progress", className: "bg-amber-100 text-amber-700" },
  completed:   { label: "Completed",   className: "bg-green-100 text-green-700" },
}

const WRITE_ROLES: UserRole[] = ["admin", "operator", "engineer", "qa"]

/**
 * Rework panel on the job card. Photos reuse the shared FileUpload/documents
 * pipeline (document_type 'rework_photo') rather than a bespoke uploader, so
 * they inherit the existing storage RLS, size/signature validation and
 * signed-URL download flow.
 */
export function ReworkSection({
  jobCardId, jobCardNumber, records, staff, userRole,
}: {
  jobCardId: string
  jobCardNumber: string
  records: ReworkRecord[]
  staff: StaffOption[]
  userRole: UserRole
}) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<ReworkRecord | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const canWrite = WRITE_ROLES.includes(userRole)
  const canDelete = userRole === "admin"
  const staffById = new Map(staff.map((s) => [s.id, s.full_name]))

  async function handleDelete(id: string) {
    if (!confirm("Delete this rework record? This cannot be undone.")) return
    setDeletingId(id)
    const res = await deleteRework(id)
    setDeletingId(null)
    if (res.error) { toast.error(res.error); return }
    toast.success("Rework record deleted")
    router.refresh()
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wrench className="h-4 w-4" />
          Rework
          {records.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">({records.length})</span>
          )}
        </CardTitle>
        {canWrite && (
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Record Rework
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {records.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No rework recorded for this job.
          </p>
        ) : (
          records.map((r) => {
            const badge = STATUS_BADGE[r.status] ?? STATUS_BADGE.open
            return (
              <div key={r.id} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.stage}</span>
                    <Badge className={cn(badge.className)}>{badge.label}</Badge>
                    <span className="text-xs text-muted-foreground">
                      Qty {r.quantity} · {new Date(r.rework_date).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </span>
                  </div>
                  {(canWrite || canDelete) && (
                    <div className="flex items-center gap-1">
                      {canWrite && (
                        <Button variant="ghost" size="sm" onClick={() => setEditing(r)} className="h-7 px-2">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => handleDelete(r.id)}
                          disabled={deletingId === r.id}
                          className="h-7 px-2 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-sm">{r.reason}</p>

                {r.corrective_action && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Corrective action: </span>
                    {r.corrective_action}
                  </p>
                )}

                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {r.identified_by && <span>Identified by {staffById.get(r.identified_by) ?? "—"}</span>}
                  {r.performed_by && <span>Reworked by {staffById.get(r.performed_by) ?? "—"}</span>}
                </div>

                {canWrite && (
                  <FileUpload
                    entityType="job_card"
                    entityId={jobCardId}
                    documentType="rework_photo"
                    userRole={userRole}
                    jobCardId={jobCardId}
                    sourceModule="rework"
                    label="Attach photo"
                  />
                )}
              </div>
            )
          })
        )}
      </CardContent>

      {createOpen && (
        <ReworkDialog
          jobCardId={jobCardId}
          jobCardNumber={jobCardNumber}
          staff={staff}
          open={createOpen}
          onOpenChange={setCreateOpen}
        />
      )}
      {editing && (
        <ReworkDialog
          jobCardId={jobCardId}
          jobCardNumber={jobCardNumber}
          staff={staff}
          existing={editing}
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}
    </Card>
  )
}
