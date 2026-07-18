"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { materialInwardSchema, type MaterialInwardInput } from "@/lib/validations/material-inward"
import { createMaterialInward } from "@/app/(app)/inventory/material-inward/actions"

function FieldError({ message }: { message?: unknown }) {
  if (!message || typeof message !== "string") return null
  return <p className="mt-1 text-xs text-destructive">{message}</p>
}

type SupplierOption = { id: string; name: string }
type ItemOption = { id: string; item_code: string; item_name: string; uom: string }

export function MaterialInwardForm({
  suppliers, items,
}: {
  suppliers: SupplierOption[]
  items: ItemOption[]
}) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register, control, handleSubmit, setValue,
    formState: { errors, isSubmitting },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<any>({
    resolver: zodResolver(materialInwardSchema),
    defaultValues: {
      dc_number: "",
      dc_date: new Date().toISOString().slice(0, 10),
      supplier_id: "",
      items: [{ item_id: "", dc_quantity: "", uom: "" }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: "items" })

  function onItemSelect(index: number, itemId: string) {
    const item = items.find((i) => i.id === itemId)
    if (item) setValue(`items.${index}.uom`, item.uom)
  }

  async function onSubmit(data: MaterialInwardInput) {
    setServerError(null)
    const result = await createMaterialInward(data)
    if (result.error) { setServerError(result.error); return }
    router.push(`/inventory/material-inward/${result.id}`)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <div className="rounded-lg border border-border p-5 space-y-4">
        <h2 className="font-semibold">Delivery Challan</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="dc_number">DC Number <span className="text-destructive">*</span></Label>
            <Input id="dc_number" {...register("dc_number")} className="mt-1" />
            <FieldError message={errors.dc_number?.message} />
          </div>
          <div>
            <Label htmlFor="dc_date">DC Date <span className="text-destructive">*</span></Label>
            <Input id="dc_date" type="date" {...register("dc_date")} className="mt-1" />
            <FieldError message={errors.dc_date?.message} />
          </div>
          <div>
            <Label htmlFor="supplier_id">Supplier <span className="text-destructive">*</span></Label>
            <Select id="supplier_id" {...register("supplier_id")} className="mt-1">
              <option value="">Select supplier…</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
            <FieldError message={errors.supplier_id?.message} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="po_number">PO Number</Label>
            <Input id="po_number" {...register("po_number")} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="vehicle_no">Vehicle No.</Label>
            <Input id="vehicle_no" {...register("vehicle_no")} className="mt-1" />
          </div>
        </div>
        <div>
          <Label htmlFor="remarks">Remarks</Label>
          <Textarea id="remarks" {...register("remarks")} className="mt-1" rows={2} />
        </div>
      </div>

      <div className="rounded-lg border border-border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">DC Items</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ item_id: "", dc_quantity: "", uom: "" })}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add Item
          </Button>
        </div>
        <FieldError message={(errors.items as { message?: string } | undefined)?.message} />

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-1 gap-3 rounded-lg border border-border p-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
              <div>
                <Label className="text-xs">Item</Label>
                <Select
                  {...register(`items.${index}.item_id`)}
                  className="mt-1"
                  onChange={(e) => {
                    register(`items.${index}.item_id`).onChange(e)
                    onItemSelect(index, e.target.value)
                  }}
                >
                  <option value="">Select item…</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>{it.item_code} — {it.item_name}</option>
                  ))}
                </Select>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- errors typed via useForm<any> above */}
                <FieldError message={(errors.items as any)?.[index]?.item_id?.message} />
              </div>
              <div>
                <Label className="text-xs">DC Quantity</Label>
                <Input type="number" step="0.001" {...register(`items.${index}.dc_quantity`)} className="mt-1" />
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- errors typed via useForm<any> above */}
                <FieldError message={(errors.items as any)?.[index]?.dc_quantity?.message} />
              </div>
              <div>
                <Label className="text-xs">UOM</Label>
                <Input {...register(`items.${index}.uom`)} className="mt-1" readOnly />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={fields.length === 1}
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Create Material Inward"}
        </Button>
      </div>
    </form>
  )
}
