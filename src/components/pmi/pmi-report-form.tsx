"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  pmiReportSchema,
  blankLocation,
  blankReading,
  type PmiReportInput,
} from "@/lib/validations/pmi-report"
import {
  createPmiReport,
  updatePmiReport,
} from "@/app/(app)/pmi-reports/actions"
import type { PmiReport, InstrumentMaster } from "@/types/database"

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function FieldError({ message }: { message?: unknown }) {
  if (!message || typeof message !== "string") return null
  return <p className="mt-1 text-xs text-destructive">{message}</p>
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-5 space-y-4">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Map DB row → form default values
// ─────────────────────────────────────────────────────────────────────────────
export function pmiReportToFormValues(r: PmiReport): PmiReportInput {
  // Convert stored PmiReadings (numbers) → form strings
  type StoredLocation = { location_name: string; heat_no?: string | null; items: Array<{ reading_no: number; ni?: number | null; cr?: number | null; mo?: number | null; fe?: number | null; nb?: number | null; ti?: number | null }> }
  const rawLocs: StoredLocation[] = Array.isArray(r.readings)
    ? (r.readings as unknown as StoredLocation[])
    : []

  const locations = rawLocs.length > 0
    ? rawLocs.map((loc) => ({
        location_name: loc.location_name,
        heat_no:       loc.heat_no ?? "",
        items: loc.items.map((item) => ({
          reading_no: String(item.reading_no ?? 1),
          ni: item.ni != null ? String(item.ni) : "",
          cr: item.cr != null ? String(item.cr) : "",
          mo: item.mo != null ? String(item.mo) : "",
          fe: item.fe != null ? String(item.fe) : "",
          nb: item.nb != null ? String(item.nb) : "",
          ti: item.ti != null ? String(item.ti) : "",
        })),
      }))
    : [blankLocation()]

  return {
    report_number:        r.report_number ?? "",
    report_date:          r.report_date ?? new Date().toISOString().split("T")[0],
    customer:             r.customer ?? "",
    quantity:             r.quantity ?? "",
    order_number:         r.order_number ?? "",
    item_no:              r.item_no ?? "",
    valve_size_class:     r.valve_size_class ?? "",
    valve_type_component: r.valve_type_component ?? "",
    base_material:        r.base_material ?? "",
    overlay_material:     r.overlay_material ?? "",
    drawing_number:       r.drawing_number ?? "",
    procedure_ref:        r.procedure_ref ?? "",
    heat_no:              r.heat_no ?? "",
    instrument_name:      r.instrument_name ?? "",
    instrument_serial:    r.instrument_serial ?? "",
    calibration_due:      r.calibration_due ?? "",
    instrument_master_id: r.instrument_master_id ?? "",
    inspected_by:         r.inspected_by ?? "",
    result:               r.result ?? "acceptable",
    locations,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Nested ReadingsSection — each location row
// ─────────────────────────────────────────────────────────────────────────────
const PCT_COLS = ["ni", "cr", "mo", "fe", "nb", "ti"] as const

function LocationBlock({
  locIndex,
  control,
  register,
  removeLocation,
  canRemoveLocation,
}: {
  locIndex: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: any
  removeLocation: () => void
  canRemoveLocation: boolean
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `locations.${locIndex}.items`,
  })

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
      {/* Location header row */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Label>Location Name <span className="text-destructive">*</span></Label>
          <Input
            {...register(`locations.${locIndex}.location_name`)}
            placeholder="e.g. Location A"
            className="mt-1"
          />
        </div>
        <div className="w-36">
          <Label>Heat No. (this location)</Label>
          <Input
            {...register(`locations.${locIndex}.heat_no`)}
            placeholder="e.g. H-2024-01"
            className="mt-1"
          />
        </div>
        {canRemoveLocation && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={removeLocation}
            className="text-destructive hover:text-destructive mb-0.5"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Readings mini-table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-muted text-muted-foreground">
              <th className="border border-border px-2 py-1 text-left w-12">#</th>
              {(["Ni %", "Cr %", "Mo %", "Fe %", "Nb %", "Ti %"] as const).map((h) => (
                <th key={h} className="border border-border px-2 py-1 text-center w-16">{h}</th>
              ))}
              <th className="border border-border px-1 py-1 w-8" />
            </tr>
          </thead>
          <tbody>
            {fields.map((field, ri) => (
              <tr key={field.id}>
                <td className="border border-border px-1 py-1">
                  <Input
                    {...register(`locations.${locIndex}.items.${ri}.reading_no`)}
                    className="h-6 w-10 px-1 text-center text-xs"
                    placeholder="1"
                  />
                </td>
                {PCT_COLS.map((col) => (
                  <td key={col} className="border border-border px-1 py-1">
                    <Input
                      {...register(`locations.${locIndex}.items.${ri}.${col}`)}
                      className="h-6 w-14 px-1 text-center text-xs"
                      placeholder="0.00"
                      inputMode="decimal"
                    />
                  </td>
                ))}
                <td className="border border-border px-1 py-1 text-center">
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(ri)}
                      className="text-destructive/70 hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append(blankReading())}
        className="text-xs"
      >
        <Plus className="h-3 w-3 mr-1" /> Add Reading
      </Button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Form
// ─────────────────────────────────────────────────────────────────────────────
interface Props {
  mode: "create" | "edit"
  jobCardId: string
  reportId?: string
  defaultValues?: Partial<PmiReportInput>
  instruments?: Pick<InstrumentMaster, "id" | "instrument_name" | "serial_number" | "calibration_due">[]
}

export function PmiReportForm({
  mode,
  jobCardId,
  reportId,
  defaultValues,
  instruments = [],
}: Props) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, control, setValue, formState: { errors, isSubmitting } } = useForm<any>({
    resolver: zodResolver(pmiReportSchema),
    defaultValues: {
      report_number: "",
      report_date:   new Date().toISOString().split("T")[0],
      result:        "acceptable",
      locations:     [blankLocation()],
      ...defaultValues,
    },
  })

  const { fields: locationFields, append: appendLocation, remove: removeLocation } = useFieldArray({
    control,
    name: "locations",
  })

  // Auto-fill instrument fields when instrument is selected from master
  function handleInstrumentSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value
    const inst = instruments.find((i) => i.id === id)
    setValue("instrument_master_id", id)
    if (inst) {
      setValue("instrument_name",   inst.instrument_name)
      setValue("instrument_serial", inst.serial_number ?? "")
      setValue("calibration_due",   inst.calibration_due ?? "")
    }
  }

  async function onSubmit(data: PmiReportInput) {
    setServerError(null)
    if (mode === "create") {
      const result = await createPmiReport(jobCardId, data)
      if (result.error) { setServerError(result.error); return }
      router.push(`/pmi-reports/${result.id}`)
    } else {
      const result = await updatePmiReport(reportId!, data)
      if (result.error) { setServerError(result.error); return }
      router.push(`/pmi-reports/${reportId}`)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      {/* ── Section 1: Report Header ─────────────────────────────────── */}
      <SectionCard title="Report Header">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="report_number">Report No. <span className="text-destructive">*</span></Label>
            <Input id="report_number" {...register("report_number")} className="mt-1" placeholder="PMI-2024-001" />
            <FieldError message={errors.report_number?.message} />
          </div>
          <div>
            <Label htmlFor="report_date">Date <span className="text-destructive">*</span></Label>
            <Input id="report_date" type="date" {...register("report_date")} className="mt-1" />
            <FieldError message={errors.report_date?.message} />
          </div>
          <div>
            <Label htmlFor="quantity">Quantity</Label>
            <Input id="quantity" {...register("quantity")} className="mt-1" placeholder="e.g. 1 No." />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="customer">Customer</Label>
            <Input id="customer" {...register("customer")} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="order_number">Order / PO No.</Label>
            <Input id="order_number" {...register("order_number")} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="item_no">Item No.</Label>
            <Input id="item_no" {...register("item_no")} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="drawing_number">Drawing No.</Label>
            <Input id="drawing_number" {...register("drawing_number")} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="valve_size_class">Valve Size & Class</Label>
            <Input id="valve_size_class" {...register("valve_size_class")} className="mt-1" placeholder="e.g. 4 inch Class 300" />
          </div>
          <div>
            <Label htmlFor="valve_type_component">Valve Type / Component</Label>
            <Input id="valve_type_component" {...register("valve_type_component")} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="base_material">Base Material</Label>
            <Input id="base_material" {...register("base_material")} className="mt-1" placeholder="e.g. A105" />
          </div>
          <div>
            <Label htmlFor="overlay_material">Overlay Material</Label>
            <Input id="overlay_material" {...register("overlay_material")} className="mt-1" placeholder="e.g. Stellite 6" />
          </div>
          <div>
            <Label htmlFor="procedure_ref">Procedure Ref.</Label>
            <Input id="procedure_ref" {...register("procedure_ref")} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="heat_no">Heat No.</Label>
            <Input id="heat_no" {...register("heat_no")} className="mt-1" />
          </div>
        </div>
      </SectionCard>

      {/* ── Section 2: Instrument ──────────────────────────────────────── */}
      <SectionCard title="Instrument Details">
        {instruments.length > 0 && (
          <div>
            <Label htmlFor="instrument_select">Select from Instrument Master</Label>
            <select
              id="instrument_select"
              onChange={handleInstrumentSelect}
              className={cn(
                "mt-1 flex h-8 w-full max-w-sm rounded-lg border border-input bg-background px-2.5 text-sm",
                "focus:outline-none focus:ring-2 focus:ring-ring/50"
              )}
              defaultValue=""
            >
              <option value="">— Select instrument —</option>
              {instruments.map((i) => (
                <option key={i.id} value={i.id}>{i.instrument_name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="instrument_name">Instrument Name</Label>
            <Input id="instrument_name" {...register("instrument_name")} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="instrument_serial">Serial No.</Label>
            <Input id="instrument_serial" {...register("instrument_serial")} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="calibration_due">Calibration Due</Label>
            <Input id="calibration_due" type="date" {...register("calibration_due")} className="mt-1" />
          </div>
        </div>
      </SectionCard>

      {/* ── Section 3: PMI Readings ────────────────────────────────────── */}
      <SectionCard title="PMI Readings">
        <p className="text-xs text-muted-foreground">
          Add one block per location. Each location can have multiple readings.
          Percentage values: enter as numbers (e.g. 8.52 for 8.52%).
        </p>
        <FieldError message={typeof errors.locations?.message === "string" ? errors.locations.message : undefined} />

        <div className="space-y-4">
          {locationFields.map((field, li) => (
            <LocationBlock
              key={field.id}
              locIndex={li}
              control={control}
              register={register}
              removeLocation={() => removeLocation(li)}
              canRemoveLocation={locationFields.length > 1}
            />
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => appendLocation(blankLocation())}
        >
          <Plus className="h-4 w-4 mr-1.5" /> Add Location
        </Button>
      </SectionCard>

      {/* ── Section 4: Evaluation & Inspected By ──────────────────────── */}
      <SectionCard title="Evaluation">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Result <span className="text-destructive">*</span></Label>
            <div className="mt-2 flex gap-6">
              {(["acceptable", "not_acceptable"] as const).map((val) => (
                <label key={val} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" {...register("result")} value={val} />
                  {val === "acceptable" ? "Accepted" : "Not Accepted"}
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="inspected_by">Inspected By</Label>
            <Input id="inspected_by" {...register("inspected_by")} className="mt-1" />
          </div>
        </div>
      </SectionCard>

      {/* ── Submit ─────────────────────────────────────────────────────── */}
      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting} size="sm">
          {isSubmitting ? "Saving…" : mode === "create" ? "Create PMI Report" : "Save Changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            router.push(
              mode === "edit" && reportId
                ? `/pmi-reports/${reportId}`
                : `/job-cards/${jobCardId}`
            )
          }
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
