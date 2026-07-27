import { blankLocation } from "@/lib/validations/pmi-report"
import type { PmiReportInput } from "@/lib/validations/pmi-report"
import type { PmiReport } from "@/types/database"

/** See item-master.ts for why this lives outside any "use client" file. */
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
