"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Settings2, Play, CheckCircle, Pencil, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { processExecutionSchema, type ProcessExecutionInput } from "@/lib/validations/process-execution"
import { upsertProcessExecution, updateProcessStatus } from "@/app/(app)/job-cards/detail-actions"
import type { ProcessExecution, ProcessType, JobCardStatus, UserRole, ConsumableMaster } from "@/types/database"

const PROCESS_LABELS: Record<ProcessType, string> = {
  welding: "Welding", machining: "Machining", cladding: "Cladding", overlay: "Overlay",
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  assigned:    { label: "Assigned",    className: "bg-blue-100 text-blue-700" },
  in_progress: { label: "In Progress", className: "bg-amber-100 text-amber-700" },
  completed:   { label: "Completed",   className: "bg-green-100 text-green-700" },
}

function fmtExpiry(date?: string | null) {
  if (!date) return null
  const d = new Date(date)
  const today = new Date()
  const daysLeft = Math.ceil((d.getTime() - today.getTime()) / 86400000)
  if (daysLeft < 0) return { label: "Expired", className: "bg-red-100 text-red-700" }
  if (daysLeft <= 30) return { label: `Exp: ${d.toLocaleDateString("en-IN")}`, className: "bg-amber-100 text-amber-700" }
  return null
}

export function ProcessExecutionSection({
  jobCardId,
  status,
  userRole,
  processTypes,
  executions,
  consumables = [],
}: {
  jobCardId: string
  status: JobCardStatus
  userRole: UserRole
  processTypes: ProcessType[]
  executions: ProcessExecution[]
  consumables?: ConsumableMaster[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editExecution, setEditExecution] = useState<ProcessExecution | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [, setSelectedConsumableId] = useState<string>("")

  const canEdit = ["admin", "engineer"].includes(userRole)
  const isActive = ["process_assigned", "in_process", "process_complete"].includes(status)

  const { register, handleSubmit, reset, setValue, watch } = useForm<ProcessExecutionInput>({
    resolver: zodResolver(processExecutionSchema),
    defaultValues: { process_type: processTypes[0] },
  })

  const watchedConsumableId = watch("consumable_master_id")
  const linkedConsumable = consumables.find((c) => c.id === watchedConsumableId)

  function openAdd() {
    reset({ process_type: processTypes[0] })
    setSelectedConsumableId("")
    setAddOpen(true)
  }

  function openEdit(exec: ProcessExecution) {
    reset({
      process_type:         exec.process_type as ProcessType,
      welder_name:          exec.welder_name ?? "",
      welder_id:            exec.welder_id ?? "",
      weld_date:            exec.weld_date ?? "",
      weld_qty_actual:      exec.weld_qty_actual ?? undefined,
      consumable_master_id: exec.consumable_master_id ?? null,
      consumable_batch:     exec.consumable_batch ?? "",
      weld_metal:           (exec as ProcessExecution & { weld_metal?: string }).weld_metal ?? "",
      consumable_feed_rate: exec.consumable_feed_rate ?? undefined,
      amps_required:        exec.amps_required ?? "",
      amps_actual:          exec.amps_actual ?? undefined,
      volts_required:       exec.volts_required ?? "",
      volts_actual:         exec.volts_actual ?? undefined,
      polarity:             exec.polarity ?? "",
      pre_heat_temp:        exec.pre_heat_temp ?? undefined,
      inter_pass_temp:      exec.inter_pass_temp ?? undefined,
      post_heat_temp:       exec.post_heat_temp ?? undefined,
      travel_speed:         exec.travel_speed ?? undefined,
      gas_flow_rate:        exec.gas_flow_rate ?? undefined,
      weld_height:          exec.weld_height ?? undefined,
      notes:                exec.notes ?? "",
    })
    setSelectedConsumableId(exec.consumable_master_id ?? "")
    setEditExecution(exec)
  }

  function onSubmit(data: ProcessExecutionInput) {
    startTransition(async () => {
      const result = await upsertProcessExecution(jobCardId, editExecution?.id ?? null, data)
      if (result.error) {
        toast.error("Failed to save", { description: result.error })
      } else {
        toast.success(editExecution ? "Execution updated" : "Execution added")
        reset()
        setAddOpen(false)
        setEditExecution(null)
        router.refresh()
      }
    })
  }

  function handleStatusChange(execId: string, newStatus: "assigned" | "in_progress" | "completed") {
    startTransition(async () => {
      const result = await updateProcessStatus(execId, jobCardId, newStatus)
      if (result.error) {
        toast.error("Update failed", { description: result.error })
      } else {
        toast.success("Status updated")
        router.refresh()
      }
    })
  }

  if (!isActive && executions.length === 0) return null

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings2 className="h-4 w-4" /> Process Execution
            </CardTitle>
            {canEdit && isActive && (
              <Button size="sm" variant="outline" onClick={openAdd}>
                Add Execution Record
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {executions.length === 0 && (
            <p className="text-sm text-muted-foreground">No execution records yet.</p>
          )}
          {executions.map((exec) => {
            const badge = STATUS_BADGE[exec.status] ?? STATUS_BADGE.assigned
            const expiryWarn = fmtExpiry((exec as ProcessExecution & { consumable?: ConsumableMaster }).consumable?.expiry_date)
            return (
              <div key={exec.id} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{PROCESS_LABELS[exec.process_type as ProcessType]}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                      {badge.label}
                    </span>
                    {expiryWarn && (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${expiryWarn.className}`}>
                        <AlertTriangle className="h-3 w-3" /> {expiryWarn.label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {canEdit && (
                      <Button size="xs" variant="ghost" onClick={() => openEdit(exec)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                    {canEdit && exec.status === "assigned" && (
                      <Button size="xs" variant="outline" disabled={isPending} onClick={() => handleStatusChange(exec.id, "in_progress")}>
                        <Play className="h-3 w-3 mr-1" /> Start
                      </Button>
                    )}
                    {canEdit && exec.status === "in_progress" && (
                      <Button size="xs" disabled={isPending} onClick={() => handleStatusChange(exec.id, "completed")}>
                        <CheckCircle className="h-3 w-3 mr-1" /> Complete
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-xs text-muted-foreground sm:grid-cols-4">
                  {exec.welder_name && <span>Operator: {exec.welder_name}</span>}
                  {exec.welder_id && <span>Welder ID: {exec.welder_id}</span>}
                  {exec.weld_date && <span>Date: {new Date(exec.weld_date).toLocaleDateString("en-IN")}</span>}
                  {exec.weld_qty_actual != null && <span>Actual Qty: {exec.weld_qty_actual}</span>}
                  {exec.amps_actual != null && <span>Amps: {exec.amps_actual}A</span>}
                  {exec.volts_actual != null && <span>Volts: {exec.volts_actual}V</span>}
                  {exec.pre_heat_temp != null && <span>Pre-heat: {exec.pre_heat_temp}°C</span>}
                  {exec.inter_pass_temp != null && <span>Inter-pass: {exec.inter_pass_temp}°C</span>}
                  {exec.post_heat_temp != null && <span>Post-heat: {exec.post_heat_temp}°C</span>}
                  {exec.polarity && <span>Polarity: {exec.polarity}</span>}
                  {exec.consumable_batch && <span>Batch: {exec.consumable_batch}</span>}
                  {exec.weld_height != null && <span>Weld H: {exec.weld_height}mm</span>}
                </div>

                {/* Consumable master details */}
                {exec.consumable_master_id && (() => {
                  const cm = consumables.find((c) => c.id === exec.consumable_master_id)
                  if (!cm) return null
                  return (
                    <div className="rounded bg-muted/50 px-2 py-1.5 text-xs space-y-0.5">
                      <span className="font-medium">{cm.brand} — {cm.product_name}</span>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-muted-foreground">
                        {cm.aws_class && <span>AWS: {cm.aws_class}</span>}
                        {cm.size && <span>Size: {cm.size}</span>}
                        {cm.batch_no && <span>Batch: {cm.batch_no}</span>}
                        {cm.expiry_date && <span>Exp: {new Date(cm.expiry_date).toLocaleDateString("en-IN")}</span>}
                      </div>
                    </div>
                  )
                })()}

                {exec.notes && (
                  <p className="text-xs text-muted-foreground border-t border-border pt-1.5">{exec.notes}</p>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Dialog
        open={addOpen || !!editExecution}
        onOpenChange={(v) => { if (!v) { setAddOpen(false); setEditExecution(null) } }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editExecution ? "Edit Execution Record" : "Add Execution Record"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* Identity */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Process Type</Label>
                <select className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm" {...register("process_type")}>
                  {processTypes.map((t) => <option key={t} value={t}>{PROCESS_LABELS[t]}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Operator / Welder Name</Label>
                <Input {...register("welder_name")} />
              </div>
              <div className="space-y-1">
                <Label>Welder ID</Label>
                <Input {...register("welder_id")} />
              </div>
              <div className="space-y-1">
                <Label>Weld Date</Label>
                <Input type="date" {...register("weld_date")} />
              </div>
              <div className="space-y-1">
                <Label>Actual Weld Qty</Label>
                <Input type="number" step="1" {...register("weld_qty_actual", { valueAsNumber: true })} />
              </div>
            </div>

            {/* Consumable */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Consumable</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2">
                  <Label>Consumable Master</Label>
                  <select
                    className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                    {...register("consumable_master_id")}
                    onChange={(e) => {
                      const v = e.target.value || null
                      setValue("consumable_master_id", v)
                      setSelectedConsumableId(v ?? "")
                      const cm = consumables.find((c) => c.id === v)
                      if (cm?.batch_no) setValue("consumable_batch", cm.batch_no)
                    }}
                  >
                    <option value="">— Select from master —</option>
                    {consumables.filter((c) => c.is_active).map((c) => (
                      <option key={c.id} value={c.id}>{c.brand} — {c.product_name} ({c.type})</option>
                    ))}
                  </select>
                </div>
                {linkedConsumable && (
                  <div className="col-span-2 rounded bg-muted/50 px-3 py-2 text-xs space-y-1">
                    <p className="font-medium">{linkedConsumable.brand} — {linkedConsumable.product_name}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-muted-foreground">
                      {linkedConsumable.aws_class && <span>AWS: {linkedConsumable.aws_class}</span>}
                      {linkedConsumable.size && <span>Size: {linkedConsumable.size}mm</span>}
                      {linkedConsumable.batch_no && <span>Batch: {linkedConsumable.batch_no}</span>}
                      {linkedConsumable.manufacturing_date && <span>Mfg: {new Date(linkedConsumable.manufacturing_date).toLocaleDateString("en-IN")}</span>}
                      {linkedConsumable.expiry_date && <span>Exp: {new Date(linkedConsumable.expiry_date).toLocaleDateString("en-IN")}</span>}
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  <Label>Consumable Batch (override)</Label>
                  <Input placeholder="Batch no." {...register("consumable_batch")} />
                </div>
                <div className="space-y-1">
                  <Label>Weld Metal / Grade</Label>
                  <Input placeholder="e.g. ERNiCrMo-3" {...register("weld_metal")} />
                </div>
                <div className="space-y-1">
                  <Label>Feed Rate (m/min)</Label>
                  <Input type="number" step="0.1" {...register("consumable_feed_rate", { valueAsNumber: true })} />
                </div>
              </div>
            </div>

            {/* Electrical */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Electrical Parameters</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Amps Required (range)</Label>
                  <Input placeholder="e.g. 120-150" {...register("amps_required")} />
                </div>
                <div className="space-y-1">
                  <Label>Amps Actual</Label>
                  <Input type="number" step="0.1" {...register("amps_actual", { valueAsNumber: true })} />
                </div>
                <div className="space-y-1">
                  <Label>Volts Required (range)</Label>
                  <Input placeholder="e.g. 24-26" {...register("volts_required")} />
                </div>
                <div className="space-y-1">
                  <Label>Volts Actual</Label>
                  <Input type="number" step="0.1" {...register("volts_actual", { valueAsNumber: true })} />
                </div>
                <div className="space-y-1">
                  <Label>Polarity</Label>
                  <select className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm" {...register("polarity")}>
                    <option value="">—</option>
                    <option value="DCRP">DCRP</option>
                    <option value="DCSP">DCSP</option>
                    <option value="AC">AC</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Thermal */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Thermal Parameters</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Pre-heat Temp (°C)</Label>
                  <Input type="number" {...register("pre_heat_temp", { valueAsNumber: true })} />
                </div>
                <div className="space-y-1">
                  <Label>Inter-pass Temp (°C)</Label>
                  <Input type="number" {...register("inter_pass_temp", { valueAsNumber: true })} />
                </div>
                <div className="space-y-1">
                  <Label>Post-heat Temp (°C)</Label>
                  <Input type="number" {...register("post_heat_temp", { valueAsNumber: true })} />
                </div>
              </div>
            </div>

            {/* Other */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Other</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Travel Speed (mm/min)</Label>
                  <Input type="number" step="0.1" {...register("travel_speed", { valueAsNumber: true })} />
                </div>
                <div className="space-y-1">
                  <Label>Gas Flow Rate (l/min)</Label>
                  <Input type="number" step="0.1" {...register("gas_flow_rate", { valueAsNumber: true })} />
                </div>
                <div className="space-y-1">
                  <Label>Weld Height (mm)</Label>
                  <Input type="number" step="0.1" {...register("weld_height", { valueAsNumber: true })} />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Notes</Label>
              <Input {...register("notes")} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setAddOpen(false); setEditExecution(null) }}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? "Saving…" : "Save Record"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
