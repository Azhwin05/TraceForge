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
  chemicalMasterSchema,
  CHEMICAL_TYPES,
  type ChemicalMasterInput,
} from "@/lib/validations/chemical-master"
import {
  createChemicalMaster,
  updateChemicalMaster,
} from "@/app/(app)/master-data/chemicals/actions"
import type { ChemicalMaster } from "@/types/database"

function FieldError({ message }: { message?: unknown }) {
  if (!message || typeof message !== "string") return null
  return <p className="mt-1 text-xs text-destructive">{message}</p>
}

function chemicalToFormValues(c: ChemicalMaster): ChemicalMasterInput {
  return {
    chemical_name: c.chemical_name,
    type:          c.type,
    manufacturer:  c.manufacturer ?? undefined,
    notes:         c.notes ?? undefined,
    batch_no:      c.batch_no ?? undefined,
    expiry_date:   c.expiry_date ?? undefined,
  }
}

interface Props {
  mode: "create" | "edit"
  chemicalId?: string
  defaultValues?: Partial<ChemicalMasterInput>
}

export function ChemicalForm({ mode, chemicalId, defaultValues }: Props) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<any>({
    resolver: zodResolver(chemicalMasterSchema),
    defaultValues: {
      chemical_name: "",
      type: "penetrant",
      ...defaultValues,
    },
  })

  async function onSubmit(data: ChemicalMasterInput) {
    setServerError(null)
    if (mode === "create") {
      const result = await createChemicalMaster(data)
      if (result.error) { setServerError(result.error); return }
      router.push(`/master-data/chemicals/${result.id}`)
    } else {
      const result = await updateChemicalMaster(chemicalId!, data)
      if (result.error) { setServerError(result.error); return }
      router.push(`/master-data/chemicals/${chemicalId}`)
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
        <h2 className="font-semibold">Chemical Details</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="chemical_name">Chemical Name <span className="text-destructive">*</span></Label>
            <Input id="chemical_name" {...register("chemical_name")} className="mt-1" placeholder="e.g. Ardrox 9PR1B Penetrant" />
            <FieldError message={errors.chemical_name?.message} />
          </div>
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
              {CHEMICAL_TYPES.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
            <FieldError message={errors.type?.message} />
          </div>
        </div>

        <div>
          <Label htmlFor="manufacturer">Manufacturer</Label>
          <Input id="manufacturer" {...register("manufacturer")} className="mt-1" placeholder="e.g. Chemetall GmbH" />
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
            placeholder="Sensitivity level, shelf life, etc."
          />
        </div>
      </div>

      <div className="rounded-lg border border-border p-5 space-y-4">
        <h2 className="font-semibold">Batch / Traceability</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="batch_no">Batch Number</Label>
            <Input id="batch_no" {...register("batch_no")} className="mt-1" placeholder="e.g. BT-2024-001" />
          </div>
          <div>
            <Label htmlFor="expiry_date">Expiry Date</Label>
            <Input id="expiry_date" type="date" {...register("expiry_date")} className="mt-1" />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting} size="sm">
          {isSubmitting ? "Saving…" : mode === "create" ? "Create Chemical" : "Save Changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            router.push(
              mode === "edit" && chemicalId
                ? `/master-data/chemicals/${chemicalId}`
                : "/master-data/chemicals"
            )
          }
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}

export { chemicalToFormValues }
