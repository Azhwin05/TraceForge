import { z } from "zod"

export const overlayChemicalSchema = z.object({
  chemical_type: z.string().default(""),
  chemical_name: z.string().default(""),
  manufacturer:  z.string().default(""),
  batch_no:      z.string().default(""),
  expiry_date:   z.string().default(""),
})

export const overlayReportSchema = z.object({
  // Header
  report_number:           z.string().min(1, "Report number is required"),
  report_date:             z.string().min(1, "Report date is required"),
  vendor_name:             z.string().nullish(),
  vendor_number:           z.string().nullish(),
  customer_name:           z.string().min(1, "Customer name is required"),
  po_number:               z.string().nullish(),
  nbdn_number:             z.string().nullish(),
  material_code:           z.string().nullish(),
  drawing_number:          z.string().nullish(),
  wps_number:              z.string().nullish(),
  item_description:        z.string().nullish(),
  quantity:                z.string().nullish(),
  base_material_grade:     z.string().nullish(),
  heat_number:             z.string().nullish(),
  test_coupon_number:      z.string().nullish(),
  dimension_report_number: z.string().nullish(),

  // Welding / consumable
  welder_name:                 z.string().nullish(),
  visual_examination:          z.string().nullish(),
  process:                     z.string().nullish(),
  job_card_number:             z.string().nullish(),
  job_card_date:               z.string().nullish(),
  deposit_material:            z.string().nullish(),
  aws_class_number:            z.string().nullish(),
  consumable_make:             z.string().nullish(),
  consumable_batch_number:     z.string().nullish(),
  date_of_welding:             z.string().nullish(),
  heat_treatment_chart_number: z.string().nullish(),
  hardness_required:           z.string().nullish(),
  hardness_actual:             z.string().nullish(),
  deposit_thickness_condition: z.string().nullish(),
  deposit_thickness_required:  z.string().nullish(),
  deposit_thickness_actual:    z.string().nullish(),

  // LPT / NDE
  lpt_procedure_ref:    z.string().nullish(),
  type_of_penetrant:    z.string().nullish(),
  stage_of_test:        z.string().nullish(),
  penetrant_application: z.string().nullish(),
  penetrant_removal:    z.string().nullish(),
  evaluation_of_dp_test: z.string().nullish(),
  temperature_of_part:  z.string().nullish(),
  penetrant_dwell_time: z.string().nullish(),
  surface_condition:    z.string().nullish(),
  developer_application: z.string().nullish(),
  post_cleaning:        z.string().nullish(),
  developer_dwell_time: z.string().nullish(),
  chemicals_used:       z.array(overlayChemicalSchema).default([]),
  result_status:        z.enum(["accepted", "rejected", "hold"]).nullable().default(null),

  // Sign-off
  remarks:      z.string().nullish(),
  inspected_by: z.string().nullish(),
  approved_by:  z.string().nullish(),
})

export type OverlayReportInput = z.input<typeof overlayReportSchema>
export type OverlayChemicalInput = z.input<typeof overlayChemicalSchema>

export function blankChemical(): OverlayChemicalInput {
  return { chemical_type: "", chemical_name: "", manufacturer: "", batch_no: "", expiry_date: "" }
}
