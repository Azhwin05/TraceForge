import { z } from "zod"

const pmiReadingItemSchema = z.object({
  reading_no: z.string().min(1),
  ni: z.string().nullish(),
  cr: z.string().nullish(),
  mo: z.string().nullish(),
  fe: z.string().nullish(),
  nb: z.string().nullish(),
  ti: z.string().nullish(),
})

const pmiLocationSchema = z.object({
  location_name: z.string().min(1, "Location name required"),
  heat_no:       z.string().nullish(),
  items:         z.array(pmiReadingItemSchema).min(1, "At least one reading per location"),
})

export const pmiReportSchema = z.object({
  // Header
  report_number:         z.string().min(1, "Report number is required"),
  report_date:           z.string().min(1, "Date is required"),
  customer:              z.string().nullish(),
  quantity:              z.string().nullish(),
  order_number:          z.string().nullish(),
  item_no:               z.string().nullish(),
  valve_size_class:      z.string().nullish(),
  valve_type_component:  z.string().nullish(),
  base_material:         z.string().nullish(),
  overlay_material:      z.string().nullish(),
  drawing_number:        z.string().nullish(),
  procedure_ref:         z.string().nullish(),
  heat_no:               z.string().nullish(),
  // Instrument
  instrument_name:       z.string().nullish(),
  instrument_serial:     z.string().nullish(),
  calibration_due:       z.string().nullish(),
  instrument_master_id:  z.string().nullish(),
  // Inspected by
  inspected_by:          z.string().nullish(),
  // Result / evaluation
  result:                z.enum(["acceptable", "not_acceptable"]),
  // Readings (stored as JSONB; serialised before DB insert)
  locations:             z.array(pmiLocationSchema).min(1, "At least one reading location required"),
})

export type PmiReportInput = z.infer<typeof pmiReportSchema>

// ── Default blank location for "add location" ────────────────────────────────
export function blankLocation() {
  return { location_name: "", heat_no: "", items: [blankReading()] }
}
export function blankReading() {
  return { reading_no: "1", ni: "", cr: "", mo: "", fe: "", nb: "", ti: "" }
}
