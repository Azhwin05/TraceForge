"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { grnSchema, type GrnInput } from "@/lib/validations/material-inward"
import { generateGrn } from "@/app/(app)/inventory/material-inward/actions"
import { formatInr } from "@/lib/format"
import type { QualityInspection, MaterialInwardItem, ItemMaster } from "@/types/database"

type AcceptedItem = QualityInspection & {
  material_inward_items: Pick<MaterialInwardItem, "item_id" | "uom"> & {
    item_master: Pick<ItemMaster, "item_code" | "item_name">
  }
}

export function GrnGenerator({
  materialInwardId, acceptedInspections, storageLocations,
}: {
  materialInwardId: string
  acceptedInspections: AcceptedItem[]
  storageLocations: { id: string; code: string; name: string }[]
}) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register, control, handleSubmit, watch,
    formState: { errors, isSubmitting },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<any>({
    resolver: zodResolver(grnSchema),
    defaultValues: {
      material_inward_id: materialInwardId,
      items: acceptedInspections.map((qi) => ({
        material_inward_item_id: qi.material_inward_item_id,
        quality_inspection_id:   qi.id,
        item_id:                  qi.material_inward_items.item_id,
        accepted_qty:              qi.accepted_qty,
        uom:                       qi.material_inward_items.uom,
        storage_location_id:       "",
        unit_rate:                 "",
      })),
    },
  })

  const { fields } = useFieldArray({ control, name: "items" })

  const watchedItems = watch("items") as { accepted_qty?: number | string; unit_rate?: number | string }[]
  const lineValue = (i: number) => {
    const qty = Number(watchedItems?.[i]?.accepted_qty) || 0
    const rate = Number(watchedItems?.[i]?.unit_rate) || 0
    return qty * rate
  }
  const totalValue = fields.reduce((sum, _f, i) => sum + lineValue(i), 0)

  async function onSubmit(data: GrnInput) {
    setServerError(null)
    const result = await generateGrn(data)
    if (result.error) { setServerError(result.error); return }
    router.refresh()
  }

  if (acceptedInspections.length === 0) return null

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {serverError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {serverError}
        </div>
      )}
      <div className="space-y-3">
        {fields.map((field, index) => {
          const qi = acceptedInspections[index]
          return (
            <div key={field.id} className="grid grid-cols-1 gap-3 rounded-lg border border-border p-3 sm:grid-cols-[2fr_1fr_1.5fr_1fr_1fr]">
              <div>
                <p className="text-sm font-medium">{qi.material_inward_items.item_master.item_code}</p>
                <p className="text-xs text-muted-foreground">{qi.material_inward_items.item_master.item_name}</p>
              </div>
              <div>
                <Label className="text-xs">Accepted Qty</Label>
                <Input type="number" step="0.001" {...register(`items.${index}.accepted_qty`)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Storage Location</Label>
                <Select {...register(`items.${index}.storage_location_id`)} className="mt-1">
                  <option value="">Select…</option>
                  {storageLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.code} — {loc.name}</option>
                  ))}
                </Select>
                {/* eslint-disable @typescript-eslint/no-explicit-any -- errors typed via useForm<any> above */}
                {(errors.items as any)?.[index]?.storage_location_id?.message && (
                  <p className="mt-1 text-xs text-destructive">{(errors.items as any)[index].storage_location_id.message}</p>
                )}
              </div>
              <div>
                <Label className="text-xs">Unit Rate (₹) <span className="text-destructive">*</span></Label>
                <Input type="number" step="0.01" placeholder="0.00" {...register(`items.${index}.unit_rate`)} className="mt-1" />
                {(errors.items as any)?.[index]?.unit_rate?.message && (
                  <p className="mt-1 text-xs text-destructive">{(errors.items as any)[index].unit_rate.message}</p>
                )}
                {/* eslint-enable @typescript-eslint/no-explicit-any */}
              </div>
              <div>
                <Label className="text-xs">Line Value</Label>
                <p className="mt-1 py-2 text-sm font-medium tabular-nums">{formatInr(lineValue(index))}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
        <span className="text-sm font-medium text-emerald-800">Total Stock Value entering inventory</span>
        <span className="text-lg font-bold text-emerald-800 tabular-nums">{formatInr(totalValue)}</span>
      </div>

      <div>
        <Label htmlFor="remarks">GRN Remarks</Label>
        <Textarea id="remarks" {...register("remarks")} className="mt-1" rows={2} />
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Generating…" : "Generate GRN & Move to Inventory"}
      </Button>
    </form>
  )
}
