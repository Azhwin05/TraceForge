"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { qualityInspectionSchema, type QualityInspectionInput } from "@/lib/validations/material-inward"
import { submitQualityInspection } from "@/app/(app)/inventory/material-inward/actions"
import type { MaterialInwardItem, ItemMaster, QualityInspection } from "@/types/database"

type ItemRow = MaterialInwardItem & { item_master: Pick<ItemMaster, "item_code" | "item_name"> }

function QualityInspectionRowForm({
  materialInwardId, item,
}: {
  materialInwardId: string
  item: ItemRow
}) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register, handleSubmit, watch,
    formState: { errors, isSubmitting },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<any>({
    resolver: zodResolver(qualityInspectionSchema),
    defaultValues: {
      material_inward_item_id: item.id,
      result: "accepted",
      accepted_qty: item.dc_quantity,
      rejected_qty: 0,
    },
  })

  const result = watch("result")

  async function onSubmit(data: QualityInspectionInput) {
    setServerError(null)
    const res = await submitQualityInspection(materialInwardId, data)
    if (res.error) { setServerError(res.error); return }
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-3 space-y-3 rounded-lg bg-muted/30 p-3">
      {serverError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {serverError}
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <Label className="text-xs">Result</Label>
          <Select {...register("result")} className="mt-1">
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Accepted Qty</Label>
          <Input type="number" step="0.001" {...register("accepted_qty")} className="mt-1" disabled={result === "rejected"} />
        </div>
        <div>
          <Label className="text-xs">Rejected Qty</Label>
          <Input type="number" step="0.001" {...register("rejected_qty")} className="mt-1" disabled={result === "accepted"} />
        </div>
      </div>
      {result === "rejected" && (
        <div>
          <Label className="text-xs">Rejection Reason</Label>
          <Input {...register("rejection_reason")} className="mt-1" placeholder="e.g. Dimensional mismatch, damaged in transit" />
          {errors.rejection_reason?.message && (
            <p className="mt-1 text-xs text-destructive">{errors.rejection_reason.message as string}</p>
          )}
        </div>
      )}
      <div>
        <Label className="text-xs">Remarks</Label>
        <Textarea {...register("remarks")} className="mt-1" rows={2} />
      </div>
      <Button type="submit" size="sm" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : "Submit Quality Inspection"}
      </Button>
    </form>
  )
}

export function QualityInspectionPanel({
  materialInwardId, items, inspections, canInspect,
}: {
  materialInwardId: string
  items: ItemRow[]
  inspections: QualityInspection[]
  canInspect: boolean
}) {
  const byItem = new Map(inspections.map((i) => [i.material_inward_item_id, i]))

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const inspection = byItem.get(item.id)
        return (
          <div key={item.id} className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="font-medium">{item.item_master.item_code}</span>
                <span className="text-muted-foreground"> — {item.item_master.item_name}</span>
                <p className="text-xs text-muted-foreground">DC Qty: {item.dc_quantity} {item.uom}</p>
              </div>
              {inspection && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    inspection.result === "accepted" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  )}
                >
                  {inspection.result === "accepted"
                    ? `Accepted ${inspection.accepted_qty} ${item.uom}`
                    : `Rejected ${inspection.rejected_qty} ${item.uom}`}
                </span>
              )}
            </div>
            {inspection?.rejection_reason && (
              <p className="mt-1 text-xs text-muted-foreground">Reason: {inspection.rejection_reason}</p>
            )}
            {!inspection && canInspect && (
              <QualityInspectionRowForm materialInwardId={materialInwardId} item={item} />
            )}
          </div>
        )
      })}
    </div>
  )
}
