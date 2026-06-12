"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { wpsMasterSchema, type WpsMasterInput } from "@/lib/validations/wps-master"
import { createWpsMaster, updateWpsMaster } from "@/app/(app)/master-data/wps/actions"
import type { WpsMaster } from "@/types/database"

type WpsFormProps =
  | { mode: "create" }
  | { mode: "edit"; wpsId: string; defaultValues: WpsMasterInput }

const WELDING_PROCESSES = ["SAW", "GTAW", "SMAW", "FCAW", "GMAW", "PAW", "FCAW-S", "Other"]
const TYPES = ["Manual", "Semi-Auto", "Auto", "Machine"]
const POSITIONS = ["1G", "2G", "3G", "4G", "5G", "6G", "All"]
const JOINT_DESIGNS = ["BW", "FW", "T-Joint", "Lap", "Corner"]

function FieldError({ message }: { message?: unknown }) {
  if (!message || typeof message !== "string") return null
  return <p className="mt-0.5 text-xs text-destructive">{message}</p>
}

export function WpsForm(props: WpsFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const defaults = props.mode === "edit" ? props.defaultValues : undefined
  const [pwhtRequired, setPwhtRequired] = useState(defaults?.pwht_required ?? false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<any>({
    resolver: zodResolver(wpsMasterSchema),
    defaultValues: {
      revision: "Rev 0",
      pwht_required: false,
      ...defaults,
    },
  })

  function handleFormSubmit(data: WpsMasterInput) {
    startTransition(async () => {
      let result: { error?: string; id?: string } | { error?: string }

      if (props.mode === "create") {
        result = await createWpsMaster(data)
        if (result.error) {
          toast.error("Failed to create WPS", { description: result.error })
          return
        }
        toast.success("WPS Master created")
        router.push(`/master-data/wps/${(result as { id: string }).id}`)
      } else {
        result = await updateWpsMaster(props.wpsId, data)
        if (result.error) {
          toast.error("Failed to update WPS", { description: result.error })
          return
        }
        toast.success("WPS Master updated")
        router.push(`/master-data/wps/${props.wpsId}`)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* ── Section 1: Basic Information ─────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="wps_no">WPS Number <span className="text-destructive">*</span></Label>
              <Input
                id="wps_no"
                placeholder="WPS/RE/703"
                {...register("wps_no")}
                aria-invalid={!!errors.wps_no}
              />
              <FieldError message={errors.wps_no?.message} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="pqr_no">PQR Number</Label>
              <Input id="pqr_no" placeholder="PQR/RE/703" {...register("pqr_no")} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="welding_process">Welding Process</Label>
              <Input
                id="welding_process"
                list="welding-processes"
                placeholder="SAW, GTAW, SMAW…"
                {...register("welding_process")}
              />
              <datalist id="welding-processes">
                {WELDING_PROCESSES.map((p) => <option key={p} value={p} />)}
              </datalist>
            </div>

            <div className="space-y-1">
              <Label htmlFor="type">Type</Label>
              <Input
                id="type"
                list="wps-types"
                placeholder="Manual, Semi-Auto, Auto…"
                {...register("type")}
              />
              <datalist id="wps-types">
                {TYPES.map((t) => <option key={t} value={t} />)}
              </datalist>
            </div>

            <div className="space-y-1">
              <Label htmlFor="revision">Revision</Label>
              <Input id="revision" placeholder="Rev 0" {...register("revision")} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="effective_date">Effective Date</Label>
              <Input id="effective_date" type="date" {...register("effective_date")} />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="scope">Scope</Label>
            <Textarea
              id="scope"
              placeholder="Scope of application…"
              className="min-h-[60px]"
              {...register("scope")}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Section 2: Materials & Joint ─────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Materials & Joint</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="joint_design">Joint Design</Label>
              <Input
                id="joint_design"
                list="joint-designs"
                placeholder="BW, FW…"
                {...register("joint_design")}
              />
              <datalist id="joint-designs">
                {JOINT_DESIGNS.map((j) => <option key={j} value={j} />)}
              </datalist>
            </div>

            <div className="space-y-1">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                list="positions"
                placeholder="1G, 2G…"
                {...register("position")}
              />
              <datalist id="positions">
                {POSITIONS.map((p) => <option key={p} value={p} />)}
              </datalist>
            </div>

            <div className="space-y-1">
              <Label htmlFor="base_material">Base Material</Label>
              <Input id="base_material" placeholder="SS316, P91…" {...register("base_material")} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="filler_material">Filler Material</Label>
              <Input id="filler_material" placeholder="ER316L…" {...register("filler_material")} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="filler_aws_class">Filler AWS Class</Label>
              <Input id="filler_aws_class" placeholder="ER430, E309L-16…" {...register("filler_aws_class")} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="filler_size">Filler Size</Label>
              <Input id="filler_size" placeholder="3.2 mm, 4.0 mm…" {...register("filler_size")} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 3: Temperature ────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Temperature Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="preheat_min">Preheat Min (°C)</Label>
              <Input
                id="preheat_min"
                type="number"
                placeholder="30"
                {...register("preheat_min")}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="interpass_max">Interpass Max (°C)</Label>
              <Input
                id="interpass_max"
                type="number"
                placeholder="250"
                {...register("interpass_max")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 4: PWHT ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">PWHT (Post Weld Heat Treatment)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="pwht_required"
              checked={pwhtRequired}
              onChange={(e) => {
                setPwhtRequired(e.target.checked)
                setValue("pwht_required", e.target.checked)
              }}
              className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
            />
            <Label htmlFor="pwht_required" className="cursor-pointer">
              PWHT Required
            </Label>
          </div>

          {pwhtRequired && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="pwht_temp_min">Temp Min (°C)</Label>
                <Input id="pwht_temp_min" type="number" placeholder="350" {...register("pwht_temp_min")} />
              </div>

              <div className="space-y-1">
                <Label htmlFor="pwht_temp_max">Temp Max (°C)</Label>
                <Input id="pwht_temp_max" type="number" placeholder="370" {...register("pwht_temp_max")} />
              </div>

              <div className="space-y-1">
                <Label htmlFor="pwht_time_range">Time Range</Label>
                <Input id="pwht_time_range" placeholder="30–60 min" {...register("pwht_time_range")} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section 5: Electrical Parameters ─────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Electrical Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="elec_polarity">Polarity</Label>
              <Input id="elec_polarity" placeholder="DCSP, DCEP, AC…" {...register("elec_polarity")} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="elec_current_range">Current Range (A)</Label>
              <Input id="elec_current_range" placeholder="200–250" {...register("elec_current_range")} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="elec_voltage_range">Voltage Range (V)</Label>
              <Input id="elec_voltage_range" placeholder="24–28" {...register("elec_voltage_range")} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="elec_travel_speed">Travel Speed (mm/min)</Label>
              <Input id="elec_travel_speed" placeholder="300–400" {...register("elec_travel_speed")} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="elec_heat_input">Heat Input (kJ/mm)</Label>
              <Input id="elec_heat_input" placeholder="1.0–2.0" {...register("elec_heat_input")} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 6: Gas ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Gas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="gas_shielding">Shielding Gas</Label>
              <Input id="gas_shielding" placeholder="Ar, 80%Ar+20%CO₂…" {...register("gas_shielding")} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="gas_backing">Backing Gas</Label>
              <Input id="gas_backing" placeholder="N₂, Ar…" {...register("gas_backing")} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 7: Technique ─────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Technique</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="tech_bead_type">String / Weave Bead</Label>
              <Input id="tech_bead_type" placeholder="String, Weave…" {...register("tech_bead_type")} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="tech_oscillation">Oscillation</Label>
              <Input id="tech_oscillation" placeholder="Yes / No" {...register("tech_oscillation")} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="tech_pass_type">Single / Multi Pass</Label>
              <Input id="tech_pass_type" placeholder="Multi…" {...register("tech_pass_type")} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="tech_back_gouging">Back Gouging</Label>
              <Input id="tech_back_gouging" placeholder="Yes / No" {...register("tech_back_gouging")} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 8: Approval & Notes ──────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Approval & Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="approved_by">Approved By</Label>
              <Input id="approved_by" placeholder="Name / designation" {...register("approved_by")} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="reviewed_by">Reviewed By</Label>
              <Input id="reviewed_by" placeholder="Name / designation" {...register("reviewed_by")} />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes or special instructions…"
              className="min-h-[80px]"
              {...register("notes")}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pb-8">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? props.mode === "create" ? "Creating…" : "Saving…"
            : props.mode === "create" ? "Create WPS Master" : "Save Changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: map a WpsMaster DB row back to WpsMasterInput (for edit pre-fill)
// ─────────────────────────────────────────────────────────────────────────────
export function wpsMasterToFormValues(wps: WpsMaster): WpsMasterInput {
  const gas  = (wps.gas_json  ?? {}) as Record<string, string>
  const elec = (wps.electrical_params_json ?? {}) as Record<string, string>
  const tech = (wps.technique_json ?? {}) as Record<string, string>

  return {
    wps_no:           wps.wps_no,
    pqr_no:           wps.pqr_no           ?? undefined,
    welding_process:  wps.welding_process  ?? undefined,
    type:             wps.type             ?? undefined,
    scope:            wps.scope            ?? undefined,
    joint_design:     wps.joint_design     ?? undefined,
    base_material:    wps.base_material    ?? undefined,
    filler_material:  wps.filler_material  ?? undefined,
    filler_aws_class: wps.filler_aws_class ?? undefined,
    filler_size:      wps.filler_size      ?? undefined,
    position:         wps.position         ?? undefined,
    preheat_min:      wps.preheat_min   != null ? String(wps.preheat_min)   : undefined,
    interpass_max:    wps.interpass_max != null ? String(wps.interpass_max) : undefined,
    pwht_required:    wps.pwht_required,
    pwht_temp_min:    wps.pwht_temp_min != null ? String(wps.pwht_temp_min) : undefined,
    pwht_temp_max:    wps.pwht_temp_max != null ? String(wps.pwht_temp_max) : undefined,
    pwht_time_range:  wps.pwht_time_range   ?? undefined,
    gas_shielding:    gas.shielding         ?? undefined,
    gas_backing:      gas.backing           ?? undefined,
    elec_polarity:      elec.polarity       ?? undefined,
    elec_current_range: elec.current_range  ?? undefined,
    elec_voltage_range: elec.voltage_range  ?? undefined,
    elec_travel_speed:  elec.travel_speed   ?? undefined,
    elec_heat_input:    elec.heat_input     ?? undefined,
    tech_bead_type:    tech.bead_type       ?? undefined,
    tech_oscillation:  tech.oscillation     ?? undefined,
    tech_pass_type:    tech.pass_type       ?? undefined,
    tech_back_gouging: tech.back_gouging    ?? undefined,
    approved_by:    wps.approved_by  ?? undefined,
    reviewed_by:    wps.reviewed_by  ?? undefined,
    revision:       wps.revision,
    effective_date: wps.effective_date ?? undefined,
    notes:          wps.notes         ?? undefined,
  }
}
