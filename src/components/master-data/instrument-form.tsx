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
  instrumentMasterSchema,
  INSTRUMENT_TYPES,
  type InstrumentMasterInput,
} from "@/lib/validations/instrument-master"
import {
  createInstrumentMaster,
  updateInstrumentMaster,
} from "@/app/(app)/master-data/instruments/actions"
import type { InstrumentMaster } from "@/types/database"

function FieldError({ message }: { message?: unknown }) {
  if (!message || typeof message !== "string") return null
  return <p className="mt-1 text-xs text-destructive">{message}</p>
}

function instrumentToFormValues(i: InstrumentMaster): InstrumentMasterInput {
  return {
    instrument_name: i.instrument_name,
    instrument_type: i.instrument_type,
    serial_number:   i.serial_number ?? undefined,
    manufacturer:    i.manufacturer ?? undefined,
    calibration_due: i.calibration_due ?? undefined,
  }
}

interface Props {
  mode: "create" | "edit"
  instrumentId?: string
  defaultValues?: Partial<InstrumentMasterInput>
}

export function InstrumentForm({ mode, instrumentId, defaultValues }: Props) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<any>({
    resolver: zodResolver(instrumentMasterSchema),
    defaultValues: {
      instrument_name: "",
      instrument_type: "pmi",
      ...defaultValues,
    },
  })

  async function onSubmit(data: InstrumentMasterInput) {
    setServerError(null)
    if (mode === "create") {
      const result = await createInstrumentMaster(data)
      if (result.error) { setServerError(result.error); return }
      router.push(`/master-data/instruments/${result.id}`)
    } else {
      const result = await updateInstrumentMaster(instrumentId!, data)
      if (result.error) { setServerError(result.error); return }
      router.push(`/master-data/instruments/${instrumentId}`)
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
        <h2 className="font-semibold">Instrument Details</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="instrument_name">Instrument Name <span className="text-destructive">*</span></Label>
            <Input id="instrument_name" {...register("instrument_name")} className="mt-1" placeholder="e.g. PMI Analyzer #1" />
            <FieldError message={errors.instrument_name?.message} />
          </div>
          <div>
            <Label htmlFor="instrument_type">Type <span className="text-destructive">*</span></Label>
            <select
              id="instrument_type"
              {...register("instrument_type")}
              className={cn(
                "mt-1 flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm",
                "focus:outline-none focus:ring-2 focus:ring-ring/50"
              )}
            >
              {INSTRUMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t === "pmi" ? "PMI" : t === "nde" ? "NDE" : t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
            <FieldError message={errors.instrument_type?.message} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="serial_number">Serial Number</Label>
            <Input id="serial_number" {...register("serial_number")} className="mt-1" placeholder="e.g. SN-20241201-001" />
          </div>
          <div>
            <Label htmlFor="manufacturer">Manufacturer</Label>
            <Input id="manufacturer" {...register("manufacturer")} className="mt-1" placeholder="e.g. Olympus Corp" />
          </div>
        </div>

        <div>
          <Label htmlFor="calibration_due">Calibration Due Date</Label>
          <Input
            id="calibration_due"
            type="date"
            {...register("calibration_due")}
            className="mt-1 max-w-xs"
          />
        </div>

      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting} size="sm">
          {isSubmitting ? "Saving…" : mode === "create" ? "Create Instrument" : "Save Changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            router.push(
              mode === "edit" && instrumentId
                ? `/master-data/instruments/${instrumentId}`
                : "/master-data/instruments"
            )
          }
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}

export { instrumentToFormValues }
