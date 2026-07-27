"use client"

import { useState, useTransition } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  wpsMasterSchema, blankWeldPassRow, blankTensileTestRow,
  type WpsMasterInput,
} from "@/lib/validations/wps-master"
import { createWpsMaster, updateWpsMaster } from "@/app/(app)/master-data/wps/actions"

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

function Field({ id, label, register, placeholder, list }: {
  id: string; label: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: any; placeholder?: string; list?: string
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} placeholder={placeholder} list={list} {...register(id)} />
    </div>
  )
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
    control,
    formState: { errors },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<any>({
    resolver: zodResolver(wpsMasterSchema),
    defaultValues: {
      revision: "Rev 0",
      pwht_required: false,
      weld_passes: [blankWeldPassRow(), blankWeldPassRow()],
      tensile_tests: [blankTensileTestRow(), blankTensileTestRow()],
      ...defaults,
    },
  })

  const passRows = useFieldArray({ control, name: "weld_passes" })
  const tensileRows = useFieldArray({ control, name: "tensile_tests" })

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
              <Input id="wps_no" placeholder="WPS/RE/301" {...register("wps_no")} aria-invalid={!!errors.wps_no} />
              <FieldError message={errors.wps_no?.message} />
            </div>
            <Field id="pqr_no" label="PQR Number" register={register} placeholder="PQR/RE/301" />
            <div className="space-y-1">
              <Label htmlFor="welding_process">Welding Process</Label>
              <Input id="welding_process" list="welding-processes" placeholder="SAW, GTAW, SMAW…" {...register("welding_process")} />
              <datalist id="welding-processes">{WELDING_PROCESSES.map((p) => <option key={p} value={p} />)}</datalist>
            </div>
            <div className="space-y-1">
              <Label htmlFor="type">Type</Label>
              <Input id="type" list="wps-types" placeholder="Manual, Semi-Auto, Auto…" {...register("type")} />
              <datalist id="wps-types">{TYPES.map((t) => <option key={t} value={t} />)}</datalist>
            </div>
            <Field id="revision" label="Revision" register={register} placeholder="Rev 0" />
            <div className="space-y-1">
              <Label htmlFor="effective_date">Effective Date</Label>
              <Input id="effective_date" type="date" {...register("effective_date")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="date_of_welding">Date of Welding</Label>
              <Input id="date_of_welding" type="date" {...register("date_of_welding")} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="scope">Scope</Label>
            <Textarea id="scope" placeholder="Scope of application…" className="min-h-[60px]" {...register("scope")} />
          </div>
        </CardContent>
      </Card>

      {/* ── Section 2: Joints (QW-402) ────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Joints (QW-402)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="joint_design">Groove Type</Label>
              <Input id="joint_design" list="joint-designs" placeholder="Double V Groove…" {...register("joint_design")} />
              <datalist id="joint-designs">{JOINT_DESIGNS.map((j) => <option key={j} value={j} />)}</datalist>
            </div>
            <Field id="joint_root_gap"      label="Root Gap"      register={register} placeholder="1.5 – 2 mm" />
            <Field id="joint_root_face"     label="Root Face"     register={register} placeholder="1.5 – 2 mm" />
            <Field id="joint_groove_angle"  label="Groove Angle"  register={register} placeholder="60° ± 5°" />
            <Field id="joint_groove_length" label="Groove Length" register={register} placeholder="300 mm" />
            <Field id="joint_groove_width"  label="Groove Width"  register={register} placeholder="150 mm" />
            <Field id="joint_backing"       label="Backing"       register={register} placeholder="Base metal" />
            <Field id="joint_retainer"      label="Retainer"      register={register} placeholder="Nil" />
          </div>
        </CardContent>
      </Card>

      {/* ── Section 3: Base Metals (QW-403) ──────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Base Metals (QW-403)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field id="base_material_spec"       label="Material Specification" register={register} placeholder="ASTM A217" />
            <Field id="base_material_type_grade" label="Type or Grade"          register={register} placeholder="WC6" />
            <Field id="base_material_pno"        label="P.No."                  register={register} placeholder="P.No.4 Gr.1 to P.No.4 Gr.1" />
            <Field id="base_material_heat_no"    label="Heat No."                register={register} placeholder="M1687" />
            <Field id="test_coupon_thickness"    label="Thickness of Test Coupon" register={register} placeholder="40 mm" />
            <Field id="test_coupon_diameter"     label="Diameter of Test Coupon"  register={register} placeholder="40 mm thk" />
            <Field id="base_material" label="Base Material (summary)" register={register} placeholder="SS316, P91…" />
          </div>
        </CardContent>
      </Card>

      {/* ── Section 4: Filler Metals (QW-404) ────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Filler Metals (QW-404)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field id="filler_sfa_spec"    label="SFA Specification" register={register} placeholder="A5.5" />
            <div className="space-y-1">
              <Label htmlFor="filler_aws_class">AWS Classification</Label>
              <Input id="filler_aws_class" placeholder="E 8018-B2" {...register("filler_aws_class")} />
            </div>
            <Field id="filler_fno"         label="Filler Metal F.No." register={register} placeholder="4" />
            <Field id="filler_ano"         label="Weld Metal Analysis A.No." register={register} placeholder="3" />
            <div className="space-y-1">
              <Label htmlFor="filler_size">Size of Filler Metal</Label>
              <Input id="filler_size" placeholder="4.00 mm dia electrode" {...register("filler_size")} />
            </div>
            <Field id="filler_feed_rate"        label="Filler Metal / Powder Feed Rate" register={register} placeholder="N/A" />
            <Field id="weld_metal_thickness"    label="Weld Metal Thickness"           register={register} placeholder="40 mm" />
            <div className="space-y-1">
              <Label htmlFor="filler_material">Filler Material (summary)</Label>
              <Input id="filler_material" placeholder="ER316L…" {...register("filler_material")} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 5: Position (QW-405) ─────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Position (QW-405)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="position">Position of Groove</Label>
              <Input id="position" list="positions" placeholder="Flat, 1G, 2G…" {...register("position")} />
              <datalist id="positions">{POSITIONS.map((p) => <option key={p} value={p} />)}</datalist>
            </div>
            <Field id="weld_progression" label="Weld Progression" register={register} placeholder="N/A" />
          </div>
        </CardContent>
      </Card>

      {/* ── Section 6: Preheat (QW-406) ──────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Preheat (QW-406)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="preheat_min">Preheat Temperature (°C)</Label>
              <Input id="preheat_min" type="number" placeholder="150" {...register("preheat_min")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="interpass_max">Interpass Temperature (°C)</Label>
              <Input id="interpass_max" type="number" placeholder="300" {...register("interpass_max")} />
            </div>
            <Field id="preheat_other" label="Others" register={register} placeholder="N/A" />
          </div>
        </CardContent>
      </Card>

      {/* ── Section 7: PWHT (QW-407) ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Post Weld Heat Treatment (QW-407)</CardTitle>
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
            <Label htmlFor="pwht_required" className="cursor-pointer">PWHT Required</Label>
          </div>

          {pwhtRequired && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="pwht_temp_min">Temperature Min (°C)</Label>
                <Input id="pwht_temp_min" type="number" placeholder="705" {...register("pwht_temp_min")} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pwht_temp_max">Temperature Max (°C)</Label>
                <Input id="pwht_temp_max" type="number" placeholder="715" {...register("pwht_temp_max")} />
              </div>
              <Field id="pwht_time_range"      label="Time Range"              register={register} placeholder="2 Hours" />
              <Field id="pwht_cooling_method"   label="Cooling"                  register={register} placeholder="Furnace cool" />
              <Field id="pwht_rate_of_heating"  label="Rate of Heating/Cooling"  register={register} placeholder="100°C / hour" />
              <Field id="pwht_loading_temp"     label="Loading Temperature"      register={register} placeholder="300°C" />
              <Field id="pwht_unloading_temp"   label="Unloading Temperature"    register={register} placeholder="300°C" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section 8: Gas (QW-408) ──────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Gas (QW-408)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field id="gas_shielding"   label="Shielding Gas"          register={register} placeholder="N/A" />
            <Field id="gas_trailing"    label="Trailing Gas"           register={register} placeholder="N/A" />
            <Field id="gas_backing"     label="Backing Gas"            register={register} placeholder="N/A" />
            <Field id="gas_composition" label="% Composition / Mixture" register={register} placeholder="N/A" />
            <Field id="gas_flow_rate"   label="Flow Rate (lpm)"        register={register} placeholder="—" />
          </div>
        </CardContent>
      </Card>

      {/* ── Section 9: Electrical Characteristics (QW-409) ───────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Electrical Characteristics (QW-409)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field id="elec_current_type"  label="Current (AC or DC)" register={register} placeholder="DC" />
            <Field id="elec_polarity"      label="Polarity"           register={register} placeholder="Reverse (Electrode +ve) (EP)" />
            <Field id="elec_current_range" label="Amps (Range)"       register={register} placeholder="160 – 185 A" />
            <Field id="elec_voltage_range" label="Volts (Range)"      register={register} placeholder="26 – 27 V" />
            <Field id="elec_tungsten_electrode_size" label="Tungsten Electrode Size" register={register} placeholder="N/A" />
            <Field id="elec_travel_speed"  label="Travel Speed (mm/min)" register={register} placeholder="100 – 110" />
            <Field id="elec_heat_input"    label="Heat Input (kJ/mm)"    register={register} placeholder="N/A" />
          </div>
        </CardContent>
      </Card>

      {/* ── Section 10: Per-Pass Weld Parameters (QW-409/410 table) ──────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Weld Pass Parameters</CardTitle>
            <Button
              type="button" size="sm" variant="outline"
              onClick={() => passRows.append(blankWeldPassRow())}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Pass
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-muted/70">
                  <th className="border border-border px-2 py-1.5 text-left font-medium min-w-[120px]">Weld Pass</th>
                  <th className="border border-border px-2 py-1.5 text-left font-medium w-20">Process</th>
                  <th className="border border-border px-2 py-1.5 text-left font-medium w-24">Filler Classification</th>
                  <th className="border border-border px-2 py-1.5 text-left font-medium w-20">Diameter</th>
                  <th className="border border-border px-2 py-1.5 text-left font-medium w-24">Current Type &amp; Polarity</th>
                  <th className="border border-border px-2 py-1.5 text-left font-medium w-20">Amps (Range)</th>
                  <th className="border border-border px-2 py-1.5 text-left font-medium w-20">Volts (Range)</th>
                  <th className="border border-border px-2 py-1.5 text-left font-medium w-24">Travel Speed (Range)</th>
                  <th className="border border-border px-2 py-1.5 text-left font-medium w-20">Heat Input</th>
                  <th className="border border-border px-2 py-1.5 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {passRows.fields.map((row, idx) => (
                  <tr key={row.id}>
                    <td className="border border-border p-0.5">
                      <Input {...register(`weld_passes.${idx}.pass_label`)} className="h-7 text-xs border-0 bg-transparent" placeholder="Root Pass" />
                    </td>
                    <td className="border border-border p-0.5">
                      <Input {...register(`weld_passes.${idx}.process`)} className="h-7 text-xs border-0 bg-transparent" placeholder="SMAW" />
                    </td>
                    <td className="border border-border p-0.5">
                      <Input {...register(`weld_passes.${idx}.filler_classification`)} className="h-7 text-xs border-0 bg-transparent" placeholder="E8018-B2" />
                    </td>
                    <td className="border border-border p-0.5">
                      <Input {...register(`weld_passes.${idx}.filler_diameter`)} className="h-7 text-xs border-0 bg-transparent" placeholder="3.15" />
                    </td>
                    <td className="border border-border p-0.5">
                      <Input {...register(`weld_passes.${idx}.current_type_polarity`)} className="h-7 text-xs border-0 bg-transparent" placeholder="DCRP" />
                    </td>
                    <td className="border border-border p-0.5">
                      <Input {...register(`weld_passes.${idx}.amps_range`)} className="h-7 text-xs border-0 bg-transparent" placeholder="100-140" />
                    </td>
                    <td className="border border-border p-0.5">
                      <Input {...register(`weld_passes.${idx}.volts_range`)} className="h-7 text-xs border-0 bg-transparent" placeholder="24-28" />
                    </td>
                    <td className="border border-border p-0.5">
                      <Input {...register(`weld_passes.${idx}.travel_speed_range`)} className="h-7 text-xs border-0 bg-transparent" placeholder="75-100" />
                    </td>
                    <td className="border border-border p-0.5">
                      <Input {...register(`weld_passes.${idx}.heat_input`)} className="h-7 text-xs border-0 bg-transparent" placeholder="N/A" />
                    </td>
                    <td className="border border-border p-0.5 text-center">
                      <button type="button" onClick={() => passRows.remove(idx)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 11: Technique (QW-410) ───────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Technique (QW-410)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field id="tech_bead_type"             label="String or Weave Bead"            register={register} placeholder="Both (weave ≤ 3× dia of electrode)" />
            <Field id="tech_oscillation"           label="Oscillation"                       register={register} placeholder="N/A" />
            <Field id="tech_pass_type"             label="Multi/Single Pass per Side"        register={register} placeholder="Multi pass" />
            <Field id="tech_multi_single_layer"    label="Multi/Single Layer"                register={register} placeholder="Multiple layer" />
            <Field id="tech_multi_single_electrode" label="Multi/Single Electrode"           register={register} placeholder="Single" />
            <Field id="tech_contact_tube_distance" label="Contact Tube to Work Distance"     register={register} placeholder="N/A" />
            <Field id="tech_orifice_gas_cup_size"  label="Orifice, Nozzle or Gas Cup Size"   register={register} placeholder="N/A" />
            <Field id="tech_cleaning_method"       label="Initial &amp; Interpass Cleaning"  register={register} placeholder="Wire Brushing and Grinding" />
            <Field id="tech_back_gouging"          label="Method of Back Gouging"            register={register} placeholder="Grinding" />
            <Field id="tech_electrode_spacing"     label="Electrode Spacing"                 register={register} placeholder="N/A" />
            <Field id="tech_change_of_process"     label="Change of Process"                 register={register} placeholder="N/A (manual only)" />
            <Field id="tech_peening"               label="Peening"                           register={register} placeholder="Not allowed" />
            <Field id="tech_transfer_mode"         label="Transfer Mode"                     register={register} placeholder="N/A" />
            <Field id="tech_torch_orifice_dia"     label="Torch Orifice Dia."                register={register} placeholder="N/A" />
            <Field id="tech_filler_metal_delivery" label="Filler Metal Delivery"             register={register} placeholder="N/A" />
            <Field id="tech_use_of_thermal_process" label="Use of Thermal Process"           register={register} placeholder="Nil" />
          </div>
        </CardContent>
      </Card>

      {/* ── Section 12: Tensile Test Results (QW-150) ────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Tensile Test Results (QW-150)</CardTitle>
            <Button
              type="button" size="sm" variant="outline"
              onClick={() => tensileRows.append(blankTensileTestRow())}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Specimen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-muted/70">
                  <th className="border border-border px-2 py-1.5 text-left font-medium w-20">Specimen No.</th>
                  <th className="border border-border px-2 py-1.5 text-left font-medium w-20">Width (mm)</th>
                  <th className="border border-border px-2 py-1.5 text-left font-medium w-20">Thickness (mm)</th>
                  <th className="border border-border px-2 py-1.5 text-left font-medium w-20">Area (mm²)</th>
                  <th className="border border-border px-2 py-1.5 text-left font-medium w-24">Ultimate Load (KN)</th>
                  <th className="border border-border px-2 py-1.5 text-left font-medium w-24">Ultimate Stress (MPa)</th>
                  <th className="border border-border px-2 py-1.5 text-left font-medium min-w-[140px]">Type of Failure &amp; Location</th>
                  <th className="border border-border px-2 py-1.5 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {tensileRows.fields.map((row, idx) => (
                  <tr key={row.id}>
                    <td className="border border-border p-0.5">
                      <Input {...register(`tensile_tests.${idx}.specimen_no`)} className="h-7 text-xs border-0 bg-transparent" placeholder="TT-1" />
                    </td>
                    <td className="border border-border p-0.5">
                      <Input {...register(`tensile_tests.${idx}.width`)} className="h-7 text-xs border-0 bg-transparent" placeholder="19.40" />
                    </td>
                    <td className="border border-border p-0.5">
                      <Input {...register(`tensile_tests.${idx}.thickness`)} className="h-7 text-xs border-0 bg-transparent" placeholder="40.02" />
                    </td>
                    <td className="border border-border p-0.5">
                      <Input {...register(`tensile_tests.${idx}.area`)} className="h-7 text-xs border-0 bg-transparent" placeholder="776.39" />
                    </td>
                    <td className="border border-border p-0.5">
                      <Input {...register(`tensile_tests.${idx}.ultimate_load`)} className="h-7 text-xs border-0 bg-transparent" placeholder="425" />
                    </td>
                    <td className="border border-border p-0.5">
                      <Input {...register(`tensile_tests.${idx}.ultimate_stress`)} className="h-7 text-xs border-0 bg-transparent" placeholder="547.41" />
                    </td>
                    <td className="border border-border p-0.5">
                      <Input {...register(`tensile_tests.${idx}.failure_type_location`)} className="h-7 text-xs border-0 bg-transparent" placeholder="Ductile &amp; on base metal" />
                    </td>
                    <td className="border border-border p-0.5 text-center">
                      <button type="button" onClick={() => tensileRows.remove(idx)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 13: Approval & Notes ──────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Approval &amp; Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="approved_by" label="Prepared &amp; Approved By" register={register} placeholder="Name / designation" />
            <Field id="reviewed_by" label="Reviewed By"                register={register} placeholder="Name / designation" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" placeholder="Additional notes or special instructions…" className="min-h-[80px]" {...register("notes")} />
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
        <Button type="button" variant="outline" disabled={isPending} onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
