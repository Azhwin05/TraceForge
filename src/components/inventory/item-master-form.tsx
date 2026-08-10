"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  itemMasterSchema,
  ITEM_CATEGORIES,
  CONSUMABLE_TYPES,
  type ItemMasterInput,
} from "@/lib/validations/item-master"
import { createItemMaster, updateItemMaster } from "@/app/(app)/inventory/items/actions"

function FieldError({ message }: { message?: unknown }) {
  if (!message || typeof message !== "string") return null
  return <p className="mt-1 text-xs text-destructive">{message}</p>
}

const CATEGORY_LABELS: Record<string, string> = {
  raw_material:   "Raw Material",
  consumable:     "Consumable",
  component:      "Component",
  finished_part:  "Finished Part",
  other:          "Other",
}

const CONSUMABLE_TYPE_LABELS: Record<string, string> = {
  powder: "Powder",
  rod:    "Rod",
  wire:   "Wire",
  other:  "Other",
}

interface Props {
  mode: "create" | "edit"
  itemId?: string
  defaultValues?: Partial<ItemMasterInput>
}

export function ItemMasterForm({ mode, itemId, defaultValues }: Props) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<any>({
    resolver: zodResolver(itemMasterSchema),
    defaultValues: {
      item_code: "",
      item_name: "",
      category: "raw_material",
      uom: "",
      min_stock_level: 0,
      ...defaultValues,
    },
  })

  const isConsumable = watch("category") === "consumable"
  const uomValue = watch("uom")
  // kg_per_unit is only meaningful when stock is NOT already held in kg.
  const isKgUom = (uomValue ?? "").trim().toLowerCase() === "kg"

  async function onSubmit(data: ItemMasterInput) {
    setServerError(null)
    if (mode === "create") {
      const result = await createItemMaster(data)
      if (result.error) { setServerError(result.error); return }
      if (result.pending) toast.info("Item submitted for admin approval")
      router.push(`/inventory/items/${result.id}`)
    } else {
      const result = await updateItemMaster(itemId!, data)
      if (result.error) { setServerError(result.error); return }
      router.push(`/inventory/items/${itemId}`)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <div className="rounded-lg border border-border p-5 space-y-4">
        <h2 className="font-semibold">Item Details</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="item_code">Item Code <span className="text-destructive">*</span></Label>
            <Input id="item_code" {...register("item_code")} className="mt-1" placeholder="e.g. RM-SS316-001" />
            <FieldError message={errors.item_code?.message} />
          </div>
          <div>
            <Label htmlFor="item_name">Item Name <span className="text-destructive">*</span></Label>
            <Input id="item_name" {...register("item_name")} className="mt-1" placeholder="e.g. SS316 Round Bar 50mm" />
            <FieldError message={errors.item_name?.message} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="category">Category <span className="text-destructive">*</span></Label>
            <Select id="category" {...register("category")} className="mt-1">
              {ITEM_CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </Select>
            <FieldError message={errors.category?.message} />
          </div>
          {isConsumable ? (
            <div>
              <Label htmlFor="consumable_type">Consumable Type <span className="text-destructive">*</span></Label>
              <Select id="consumable_type" {...register("consumable_type")} className="mt-1">
                <option value="">Select type…</option>
                {CONSUMABLE_TYPES.map((t) => (
                  <option key={t} value={t}>{CONSUMABLE_TYPE_LABELS[t]}</option>
                ))}
              </Select>
              <FieldError message={errors.consumable_type?.message} />
            </div>
          ) : (

            <div>
              <Label htmlFor="hsn_code">HSN Code</Label>
              <Input id="hsn_code" {...register("hsn_code")} className="mt-1" />
            </div>
          )}
          <div>
            <Label htmlFor="uom">Unit of Measure <span className="text-destructive">*</span></Label>
            <Input id="uom" {...register("uom")} className="mt-1" placeholder="e.g. kg, nos, m" />
            <FieldError message={errors.uom?.message} />
          </div>
        </div>

        {isConsumable && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="hsn_code">HSN Code</Label>
              <Input id="hsn_code" {...register("hsn_code")} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="kg_per_unit">Kg per {uomValue?.trim() || "unit"}</Label>
              <Input
                id="kg_per_unit" type="number" step="0.0001" min="0"
                {...register("kg_per_unit")}
                className="mt-1"
                placeholder="e.g. 15"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {isKgUom
                  ? "Not needed — this item is already stocked in kg."
                  : "Lets the ERP convert a before/after weight into used quantity."}
              </p>
              <FieldError message={errors.kg_per_unit?.message} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="min_stock_level">Minimum Stock Level</Label>
            <Input id="min_stock_level" type="number" step="0.001" {...register("min_stock_level")} className="mt-1" />
            <FieldError message={errors.min_stock_level?.message} />
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" {...register("description")} className="mt-1" rows={3} />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : mode === "create" ? "Create Item" : "Save Changes"}
        </Button>
      </div>
    </form>
  )
}
