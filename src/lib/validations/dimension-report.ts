import { z } from "zod"

export const dimensionRowSchema = z.object({
  dimension_name:     z.string().min(1, "Dimension name required"),
  required_dimension: z.string().min(1, "Required dimension required"),
  tolerance:          z.string().default(""),
  actual_value_1:     z.string().default(""),
  actual_value_2:     z.string().default(""),
  actual_value_3:     z.string().default(""),
  pass_fail:          z.enum(["pass", "fail", "na"]).default("na"),
  remarks:            z.string().default(""),
})

export const dimensionReportSchema = z.object({
  // Header
  report_number:        z.string().min(1, "Report number is required"),
  report_date:          z.string().min(1, "Report date is required"),
  vendor_name:          z.string().nullish(),
  customer:             z.string().nullish(),
  description:          z.string().nullish(),
  drawing_number:       z.string().min(1, "Drawing number is required"),
  drawing_revision:     z.string().nullish(),
  po_number:            z.string().nullish(),
  material_code:        z.string().nullish(),
  sample_number:        z.string().nullish(),
  heat_number:          z.string().nullish(),
  mp_dp_number:         z.string().nullish(),
  // Instrument
  instrument_master_id: z.string().nullish(),
  instrument_used:      z.string().nullish(),
  gauge_used:           z.string().nullish(),
  // Inspection
  visual_satisfactory:  z.boolean().default(true),
  inspected_by:         z.string().nullish(),
  approved_by:          z.string().nullish(),
  result_status:        z.enum(["accepted", "rejected", "hold"]),
  // Machining
  machine_name:         z.string().nullish(),
  operator:             z.string().nullish(),
  drawing_size:         z.string().nullish(),
  weld_deposit_thickness_before: z.string().nullish(),
  weld_deposit_thickness_after:  z.string().nullish(),
  // Dimension rows
  dimensions: z.array(dimensionRowSchema).min(1, "At least one dimension row is required"),
})

export type DimensionReportInput = z.input<typeof dimensionReportSchema>
export type DimensionRowInput = z.input<typeof dimensionRowSchema>

export function blankDimensionRow(): DimensionRowInput {
  return {
    dimension_name: "", required_dimension: "", tolerance: "",
    actual_value_1: "", actual_value_2: "", actual_value_3: "",
    pass_fail: "na", remarks: "",
  }
}

// Machining grid — Milling / Soft-Pre-Machining / Hard-Facing × GSM/PSM/OAL/OD/ID/Top-OAH.
// Inserted as preset-labeled rows into the same flexible `dimensions` array
// (no separate schema — reuses dimensionRowSchema).
export const MACHINING_STAGES = ["Milling", "Soft / Pre Machining", "Hard Facing"] as const
export const MACHINING_MEASURES = ["GSM", "PSM", "OAL", "OD", "ID", "Top / OAH"] as const

export function machiningGridRows(): DimensionRowInput[] {
  return MACHINING_STAGES.flatMap((stage) =>
    MACHINING_MEASURES.map((measure) => ({
      ...blankDimensionRow(),
      dimension_name: `${stage} — ${measure}`,
    }))
  )
}
