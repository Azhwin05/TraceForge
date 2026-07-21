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
import { materialIssueSchema, type MaterialIssueInput } from "@/lib/validations/material-issue"
import { createMaterialIssue } from "@/app/(app)/inventory/material-issues/actions"

function FieldError({ message }: { message?: unknown }) {
  if (!message || typeof message !== "string") return null
  return <p className="mt-1 text-xs text-destructive">{message}</p>
}

type ItemOption = { id: string; item_code: string; item_name: string; uom: string }
type LocationOption = { id: string; code: string; name: string }
type JobCardOption = { id: string; jc_number: string }

export function MaterialIssueForm({
  items, storageLocations, jobCards,
}: {
  items: ItemOption[]
  storageLocations: LocationOption[]
  jobCards: JobCardOption[]
}) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register, control, handleSubmit, setValue,
    formState: { errors, isSubmitting },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<any>({
    resolver: zodResolver(materialIssueSchema),
    defaultValues: {
      job_card_id: "",
      issued_to: "",
      items: [{ item_id: "", storage_location_id: "", issued_qty: "", uom: "" }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: "items" })

  function onItemSelect(index: number, itemId: string) {
    const item = items.find((i) => i.id === itemId)
    if (item) setValue(`items.${index}.uom`, item.uom)
  }

  async function onSubmit(data: MaterialIssueInput) {
    setServerError(null)
    const result = await createMaterialIssue(data)
    if (result.error) { setServerError(result.error); return }
    router.push(`/inventory/material-issues/${result.id}`)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <div className="rounded-lg border border-border p-5 space-y-4">
        <h2 className="font-semibold">Issue Details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="job_card_id">Job Card (production order)</Label>
            <Select id="job_card_id" {...register("job_card_id")} className="mt-1">
              <option value="">No job card link</option>
              {jobCards.map((jc) => (
                <option key={jc.id} value={jc.id}>{jc.jc_number}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="issued_to">Issued to (operator)</Label>
            <Input id="issued_to" {...register("issued_to")} className="mt-1" placeholder="e.g. Suman" />
          </div>
        </div>
        <div>
          <Label htmlFor="remarks">Remarks</Label>
          <Textarea id="remarks" {...register("remarks")} className="mt-1" rows={2} />
        </div>
      </div>

      <div className="rounded-lg border border-border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Items to Issue</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ item_id: "", storage_location_id: "", issued_qty: "", uom: "" })}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add Item
          </Button>
        </div>
        <FieldError message={(errors.items as { message?: string } | undefined)?.message} />

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-1 gap-3 rounded-lg border border-border p-3 sm:grid-cols-[2fr_1.5fr_1fr_1fr_auto]">
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
                <Label className="text-xs">Storage Location</Label>
                <Select {...register(`items.${index}.storage_location_id`)} className="mt-1">
                  <option value="">Select…</option>
                  {storageLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.code} — {loc.name}</option>
                  ))}
                </Select>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- errors typed via useForm<any> above */}
                <FieldError message={(errors.items as any)?.[index]?.storage_location_id?.message} />
              </div>
              <div>
                <Label className="text-xs">Quantity</Label>
                <Input type="number" step="0.001" {...register(`items.${index}.issued_qty`)} className="mt-1" />
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- errors typed via useForm<any> above */}
                <FieldError message={(errors.items as any)?.[index]?.issued_qty?.message} />
              </div>
              <div>
                <Label className="text-xs">UOM</Label>
                <Input {...register(`items.${index}.uom`)} className="mt-1" readOnly />
              </div>
              <div className="flex items-end">
                <Button type="button" variant="ghost" size="sm" disabled={fields.length === 1} onClick={() => remove(index)}>
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
          {isSubmitting ? "Issuing…" : "Issue Material"}
        </Button>
      </div>
    </form>
  )
}
