"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Gauge, Plus, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { airTestSchema, BLANK_AIR_TEST, type AirTestInput } from "@/lib/validations/air-test"
import { upsertAirTestRecord } from "@/app/(app)/job-cards/traveller-actions"
import type { AirTestRecord, UserRole } from "@/types/database"

const RESULT_BADGE: Record<string, string> = {
  pending: "bg-warning-surface text-warning",
  pass:    "bg-success-surface text-success",
  fail:    "bg-danger-surface text-danger",
}

function recordToForm(r: AirTestRecord): AirTestInput {
  return {
    tester_name: r.tester_name ?? "",
    pressure:    r.pressure ?? "",
    duration:    r.duration ?? "",
    result:      r.result ?? "pending",
    notes:       r.notes ?? "",
  }
}

export function AirTestSection({
  jobCardId,
  userRole,
  records,
}: {
  jobCardId: string
  userRole: UserRole
  records: AirTestRecord[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editRecord, setEditRecord] = useState<AirTestRecord | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const canEdit = ["admin", "engineer", "qa"].includes(userRole)
  const showSection = records.length > 0 || canEdit

  const { register, handleSubmit, reset } = useForm<AirTestInput>({
    resolver: zodResolver(airTestSchema),
    defaultValues: BLANK_AIR_TEST,
  })

  function openAdd() {
    reset(BLANK_AIR_TEST)
    setAddOpen(true)
  }

  function openEdit(r: AirTestRecord) {
    reset(recordToForm(r))
    setEditRecord(r)
  }

  function onSubmit(data: AirTestInput) {
    startTransition(async () => {
      const result = await upsertAirTestRecord(jobCardId, editRecord?.id ?? null, data)
      if (result.error) {
        toast.error("Save failed", { description: result.error })
      } else {
        toast.success(editRecord ? "Air test record updated" : "Air test record added")
        setAddOpen(false)
        setEditRecord(null)
        router.refresh()
      }
    })
  }

  if (!showSection) return null

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Gauge className="h-4 w-4" /> Air Testing &amp; Inspection
            </CardTitle>
            {canEdit && (
              <Button size="sm" variant="outline" onClick={openAdd}>
                <Plus className="h-3 w-3 mr-1" /> Add Record
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {records.length === 0 && (
            <p className="text-sm text-muted-foreground">No air test records yet.</p>
          )}
          {records.map((r) => (
            <div key={r.id} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${RESULT_BADGE[r.result ?? "pending"]}`}>
                  {r.result ?? "pending"}
                </span>
                {canEdit && (
                  <Button size="xs" variant="ghost" onClick={() => openEdit(r)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-xs text-muted-foreground sm:grid-cols-3">
                {r.tester_name && <span>Tester: {r.tester_name}</span>}
                {r.pressure && <span>Pressure: {r.pressure}</span>}
                {r.duration && <span>Duration: {r.duration}</span>}
              </div>
              {r.notes && <p className="text-xs text-muted-foreground border-t border-border pt-1.5">{r.notes}</p>}
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog
        open={addOpen || !!editRecord}
        onOpenChange={(v) => { if (!v) { setAddOpen(false); setEditRecord(null) } }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editRecord ? "Edit Air Test Record" : "Add Air Test Record"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tester Name</Label>
                <Input {...register("tester_name")} />
              </div>
              <div className="space-y-1">
                <Label>Pressure</Label>
                <Input {...register("pressure")} />
              </div>
              <div className="space-y-1">
                <Label>Duration</Label>
                <Input {...register("duration")} />
              </div>
              <div className="space-y-1">
                <Label>Result</Label>
                <select className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm" {...register("result")}>
                  <option value="pending">Pending</option>
                  <option value="pass">Pass</option>
                  <option value="fail">Fail</option>
                </select>
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Notes</Label>
                <Input {...register("notes")} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setAddOpen(false); setEditRecord(null) }}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? "Saving…" : "Save Record"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
