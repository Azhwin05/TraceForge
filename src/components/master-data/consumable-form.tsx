"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  consumableMasterSchema,
  CONSUMABLE_TYPES,
  type ConsumableMasterInput,
} from "@/lib/validations/consumable-master"
import {
  createConsumableMaster,
  updateConsumableMaster,
} from "@/app/(app)/master-data/consumables/actions"
import type { ConsumableMaster } from "@/types/database"

function FieldError({ message }: { message?: unknown }) {
  if (!message || typeof message !== "string") return null
  return <p className="mt-1 text-xs text-destructive">{message}</p>
}

function consumableToFormValues(c: ConsumableMaster): ConsumableMasterInput {
  return {
    brand:               c.brand,
    product_name:        c.product_name,
    type:                c.type,
    aws_class:           c.aws_class ?? undefined,
    size:                c.size ?? undefined,
    manufacturer:        c.manufacturer ?? undefined,
    notes:               c.notes ?? undefined,
    batch_no:            c.batch_no ?? undefined,
    manufacturing_date:  c.manufacturing_date ?? undefined,
    expiry_date:         c.expiry_date ?? undefined,
  }
}

interface Props {
  mode: "create" | "edit"
  consumableId?: string
  defaultValues?: Partial<ConsumableMasterInput>
}

export function ConsumableForm({ mode, consumableId, defaultValues }: Props) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<any>({
    resolver: zodResolver(consumableMasterSchema),
    defaultValues: {
      brand: "",
      product_name: "",
      type: "electrode",
      ...defaultValues,
    },
  })

  async function onSubmit(data: ConsumableMasterInput) {
    setServerError(null)
    if (mode === "create") {
      const result = await createConsumableMaster(data)
      if (result.error) { setServerError(result.error); return }
      router.push(`/master-data/consumables/${result.id}`)
    } else {
      const result = await updateConsumableMaster(consumableId!, data)
      if (result.error) { setServerError(result.error); return }
      router.push(`/master-data/consumables/${consumableId}`)
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
        <h2 className="font-semibold">Consumable Details</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="brand">Brand <span className="text-destructive">*</span></Label>
            <Input id="brand" {...register("brand")} className="mt-1" placeholder="e.g. Lincoln Electric" />
            <FieldError message={errors.brand?.message} />
          </div>
          <div>
            <Label htmlFor="product_name">Product Name <span className="text-destructive">*</span></Label>
            <Input id="product_name" {...register("product_name")} className="mt-1" placeholder="e.g. Excalibur 7018-1 H4R" />
            <FieldError message={errors.product_name?.message} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="type">Type <span className="text-destructive">*</span></Label>
            <select
              id="type"
              {...register("type")}
              className={cn(
                "mt-1 flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm",
                "focus:outline-none focus:ring-2 focus:ring-ring/50"
              )}
            >
              {CONSUMABLE_TYPES.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
            <FieldError message={errors.type?.message} />
          </div>
          <div>
            <Label htmlFor="aws_class">AWS Classification</Label>
            <Input id="aws_class" {...register("aws_class")} className="mt-1" placeholder="e.g. E7018-1 H4R" />
          </div>
          <div>
            <Label htmlFor="size">Size</Label>
            <Input id="size" {...register("size")} className="mt-1" placeholder="e.g. 3.2mm, 4.0mm" />
          </div>
        </div>

        <div>
          <Label htmlFor="manufacturer">Manufacturer</Label>
          <Input id="manufacturer" {...register("manufacturer")} className="mt-1" placeholder="e.g. Lincoln Electric Co." />
        </div>

        <div>
          <Label htmlFor="notes">Notes</Label>
          <textarea
            id="notes"
            {...register("notes")}
            rows={3}
            className={cn(
              "mt-1 flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none"
            )}
            placeholder="Additional details or specifications"
          />
        </div>
      </div>

      <div className="rounded-lg border border-border p-5 space-y-4">
        <h2 className="font-semibold">Batch / Traceability</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="batch_no">Batch Number</Label>
            <Input id="batch_no" {...register("batch_no")} className="mt-1" placeholder="e.g. BT-2024-001" />
          </div>
          <div>
            <Label htmlFor="manufacturing_date">Manufacturing Date</Label>
            <Input id="manufacturing_date" type="date" {...register("manufacturing_date")} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="expiry_date">Expiry Date</Label>
            <Input id="expiry_date" type="date" {...register("expiry_date")} className="mt-1" />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting} size="sm">
          {isSubmitting ? "Saving…" : mode === "create" ? "Create Consumable" : "Save Changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            router.push(
              mode === "edit" && consumableId
                ? `/master-data/consumables/${consumableId}`
                : "/master-data/consumables"
            )
          }
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}

export { consumableToFormValues }
