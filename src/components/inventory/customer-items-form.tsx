"use client"

import { useTransition } from "react"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Trash2, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  customerItemsBatchSchema, blankCustomerItemRow, type CustomerItemsBatchInput,
} from "@/lib/validations/customer"
import { createCustomerItems } from "@/app/(app)/inventory/customers/actions"

export function CustomerItemsForm({ clientId }: { clientId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const {
    register, control, handleSubmit, watch,
    formState: { errors },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<any>({
    resolver: zodResolver(customerItemsBatchSchema),
    defaultValues: { items: [blankCustomerItemRow()] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: "items" })
  const watchedItems = watch("items") as { deferred?: boolean }[]

  function onSubmit(data: CustomerItemsBatchInput) {
    startTransition(async () => {
      const result = await createCustomerItems(clientId, data)
      if (result.error) {
        toast.error("Save failed", { description: result.error })
        return
      }
      const deferredCount = data.items.filter((i) => i.deferred).length
      toast.success(
        `${data.items.length} item${data.items.length > 1 ? "s" : ""} added`,
        deferredCount > 0 ? { description: `${deferredCount} marked pending — complete them any time.` } : undefined,
      )
      router.push(`/inventory/customers/${clientId}`)
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-3">
        {fields.map((field, idx) => {
          const isDeferred = !!watchedItems?.[idx]?.deferred
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- errors typed via useForm<any> above
          const errs = (errors.items as any)?.[idx]
          return (
            <div key={field.id} className="rounded-lg border border-border p-3 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Item Name <span className="text-destructive">*</span></Label>
                  <Input
                    {...register(`items.${idx}.item_name`)}
                    placeholder={`e.g. Item ${idx + 1}`}
                    className="h-8 text-sm"
                  />
                  {errs?.item_name && <p className="text-xs text-destructive">{errs.item_name.message}</p>}
                </div>
                <div className="w-36 space-y-1">
                  <Label className="text-xs">Date</Label>
                  <Input type="date" {...register(`items.${idx}.item_date`)} className="h-8 text-sm" />
                </div>
                <Button
                  type="button" variant="ghost" size="sm" disabled={fields.length === 1}
                  onClick={() => remove(idx)} className="mt-5"
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>

              <Controller
                control={control}
                name={`items.${idx}.deferred`}
                render={({ field: f }) => (
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={f.value ?? false}
                      onChange={(e) => f.onChange(e.target.checked)}
                      className="h-4 w-4 rounded border border-input"
                    />
                    <span className="flex items-center gap-1 text-amber-700">
                      <Clock className="h-3.5 w-3.5" /> Add details later — save with just the name for now
                    </span>
                  </label>
                )}
              />

              {!isDeferred && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="col-span-2 sm:col-span-2 space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Input {...register(`items.${idx}.description`)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Drawing No.</Label>
                    <Input {...register(`items.${idx}.drawing_number`)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Quantity</Label>
                    <Input type="number" step="0.001" {...register(`items.${idx}.quantity`)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Unit</Label>
                    <Input {...register(`items.${idx}.uom`)} placeholder="nos, kg…" className="h-8 text-sm" />
                  </div>
                  <div className="col-span-2 sm:col-span-3 space-y-1">
                    <Label className="text-xs">Remarks</Label>
                    <Input {...register(`items.${idx}.remarks`)} className="h-8 text-sm" />
                  </div>
                </div>
              )}
              {isDeferred && (
                <div className="space-y-1">
                  <Label className="text-xs">Note (optional)</Label>
                  <Input {...register(`items.${idx}.remarks`)} placeholder="e.g. waiting on drawing from customer" className="h-8 text-sm" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={() => append(blankCustomerItemRow())}>
        <Plus className="mr-1.5 h-4 w-4" /> Add Another Item
      </Button>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : `Save ${fields.length} Item${fields.length > 1 ? "s" : ""}`}
        </Button>
      </div>
    </form>
  )
}
