"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Microscope, Plus, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ndeRecordSchema, NDE_TYPE_LABELS, type NdeRecordInput } from "@/lib/validations/nde-record"
import { upsertNdeRecord } from "@/app/(app)/job-cards/traveller-actions"
import type { NdeRecord, ChemicalMaster, JobCardStatus, UserRole } from "@/types/database"

const RESULT_BADGE = {
  pending:  "bg-amber-100 text-amber-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
}

function ndeToForm(r: NdeRecord): NdeRecordInput {
  return {
    nde_type:              r.nde_type,
    procedure_ref:         r.procedure_ref ?? "",
    report_number:         r.report_number ?? "",
    inspection_date:       r.inspection_date ?? "",
    inspected_by:          r.inspected_by ?? "",
    stage_of_test:         r.stage_of_test ?? "",
    surface_condition:     r.surface_condition ?? "",
    temperature_of_part:   r.temperature_of_part != null ? String(r.temperature_of_part) : "",
    type_of_penetrant:     r.type_of_penetrant ?? "",
    penetrant_application: r.penetrant_application ?? "",
    penetrant_removal:     r.penetrant_removal ?? "",
    penetrant_dwell_time:  r.penetrant_dwell_time != null ? String(r.penetrant_dwell_time) : "",
    developer_application: r.developer_application ?? "",
    developer_dwell_time:  r.developer_dwell_time != null ? String(r.developer_dwell_time) : "",
    post_cleaning:         r.post_cleaning ?? "",
    evaluation:            r.evaluation ?? "",
    result:                r.result ?? "pending",
    notes:                 r.notes ?? "",
    chemical_1_id:         r.chemical_1_id ?? null,
    chemical_2_id:         r.chemical_2_id ?? null,
    chemical_3_id:         r.chemical_3_id ?? null,
    chemical_4_id:         (r as NdeRecord & { chemical_4_id?: string | null }).chemical_4_id ?? null,
  }
}

const BLANK: NdeRecordInput = {
  nde_type: "lpt", procedure_ref: "", report_number: "", inspection_date: "",
  inspected_by: "", stage_of_test: "", surface_condition: "", temperature_of_part: "",
  type_of_penetrant: "", penetrant_application: "", penetrant_removal: "",
  penetrant_dwell_time: "", developer_application: "", developer_dwell_time: "",
  post_cleaning: "", evaluation: "", result: "pending", notes: "",
  chemical_1_id: null, chemical_2_id: null, chemical_3_id: null, chemical_4_id: null,
}

export function NdeLptSection({
  jobCardId,
  userRole,
  records,
  chemicals,
}: {
  jobCardId: string
  status: JobCardStatus
  userRole: UserRole
  records: NdeRecord[]
  chemicals: ChemicalMaster[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editRecord, setEditRecord] = useState<NdeRecord | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const canEdit = ["admin", "qa"].includes(userRole)
  const showSection = records.length > 0 || canEdit

  const { register, handleSubmit, reset } = useForm<NdeRecordInput>({
    resolver: zodResolver(ndeRecordSchema),
    defaultValues: BLANK,
  })

  const byType = (type: string) => chemicals.filter((c) => c.type === type && c.is_active)

  function openAdd() {
    reset(BLANK)
    setAddOpen(true)
  }

  function openEdit(r: NdeRecord) {
    reset(ndeToForm(r))
    setEditRecord(r)
  }

  function onSubmit(data: NdeRecordInput) {
    startTransition(async () => {
      const result = await upsertNdeRecord(
        jobCardId,
        editRecord?.id ?? null,
        data,
      )
      if (result.error) {
        toast.error("Save failed", { description: result.error })
      } else {
        toast.success(editRecord ? "NDE record updated" : "NDE record added")
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
              <Microscope className="h-4 w-4" /> NDE / LPT Details
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
            <p className="text-sm text-muted-foreground">No NDE records yet.</p>
          )}
          {records.map((r) => {
            const badge = RESULT_BADGE[r.result ?? "pending"]
            return (
              <div key={r.id} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span>{NDE_TYPE_LABELS[r.nde_type] ?? r.nde_type}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge}`}>
                      {r.result ?? "pending"}
                    </span>
                  </div>
                  {canEdit && (
                    <Button size="xs" variant="ghost" onClick={() => openEdit(r)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-xs text-muted-foreground sm:grid-cols-3">
                  {r.report_number && <span>Report: {r.report_number}</span>}
                  {r.inspection_date && <span>Date: {new Date(r.inspection_date).toLocaleDateString("en-IN")}</span>}
                  {r.inspected_by && <span>By: {r.inspected_by}</span>}
                  {r.procedure_ref && <span>Proc: {r.procedure_ref}</span>}
                  {r.stage_of_test && <span>Stage: {r.stage_of_test}</span>}
                  {r.temperature_of_part != null && <span>Temp: {r.temperature_of_part}°C</span>}
                </div>
                {r.evaluation && (
                  <p className="text-xs text-muted-foreground border-t border-border pt-1.5">
                    Evaluation: {r.evaluation}
                  </p>
                )}
                {r.notes && (
                  <p className="text-xs text-muted-foreground">Remarks: {r.notes}</p>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Dialog
        open={addOpen || !!editRecord}
        onOpenChange={(v) => { if (!v) { setAddOpen(false); setEditRecord(null) } }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editRecord ? "Edit NDE / LPT Record" : "Add NDE / LPT Record"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Identification */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Identification</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>NDE Type</Label>
                  <select className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm" {...register("nde_type")}>
                    {Object.entries(NDE_TYPE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Report Number</Label>
                  <Input {...register("report_number")} />
                </div>
                <div className="space-y-1">
                  <Label>Inspection Date</Label>
                  <Input type="date" {...register("inspection_date")} />
                </div>
                <div className="space-y-1">
                  <Label>Inspected By</Label>
                  <Input {...register("inspected_by")} />
                </div>
                <div className="space-y-1">
                  <Label>Procedure Ref.</Label>
                  <Input {...register("procedure_ref")} />
                </div>
                <div className="space-y-1">
                  <Label>Stage of Test</Label>
                  <Input placeholder="Pre / Post weld" {...register("stage_of_test")} />
                </div>
              </div>
            </div>

            {/* Test Conditions */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Test Conditions</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Surface Condition</Label>
                  <Input {...register("surface_condition")} />
                </div>
                <div className="space-y-1">
                  <Label>Temperature of Part (°C)</Label>
                  <Input type="number" step="0.1" {...register("temperature_of_part")} />
                </div>
              </div>
            </div>

            {/* Penetrant Details */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Penetrant Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Type of Penetrant</Label>
                  <Input {...register("type_of_penetrant")} />
                </div>
                <div className="space-y-1">
                  <Label>Penetrant Application</Label>
                  <Input {...register("penetrant_application")} />
                </div>
                <div className="space-y-1">
                  <Label>Penetrant Dwell Time (min)</Label>
                  <Input type="number" step="0.5" {...register("penetrant_dwell_time")} />
                </div>
                <div className="space-y-1">
                  <Label>Penetrant Removal</Label>
                  <Input {...register("penetrant_removal")} />
                </div>
                <div className="space-y-1">
                  <Label>Developer Application</Label>
                  <Input {...register("developer_application")} />
                </div>
                <div className="space-y-1">
                  <Label>Developer Dwell Time (min)</Label>
                  <Input type="number" step="0.5" {...register("developer_dwell_time")} />
                </div>
                <div className="space-y-1">
                  <Label>Post Cleaning</Label>
                  <Input {...register("post_cleaning")} />
                </div>
              </div>
            </div>

            {/* Chemicals */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Chemicals Used</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Cleaner</Label>
                  <select className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm" {...register("chemical_1_id")}>
                    <option value="">— None —</option>
                    {byType("cleaner").map((c) => <option key={c.id} value={c.id}>{c.chemical_name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Penetrant</Label>
                  <select className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm" {...register("chemical_2_id")}>
                    <option value="">— None —</option>
                    {byType("penetrant").map((c) => <option key={c.id} value={c.id}>{c.chemical_name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Developer</Label>
                  <select className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm" {...register("chemical_3_id")}>
                    <option value="">— None —</option>
                    {byType("developer").map((c) => <option key={c.id} value={c.id}>{c.chemical_name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Remover</Label>
                  <select className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm" {...register("chemical_4_id")}>
                    <option value="">— None —</option>
                    {byType("remover").map((c) => <option key={c.id} value={c.id}>{c.chemical_name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Evaluation & Result */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Evaluation</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2">
                  <Label>Evaluation of DP Test</Label>
                  <Input placeholder="Pass / Fail notes…" {...register("evaluation")} />
                </div>
                <div className="space-y-1">
                  <Label>Result</Label>
                  <select className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm" {...register("result")}>
                    <option value="pending">Pending</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Remarks</Label>
                  <Input {...register("notes")} />
                </div>
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
