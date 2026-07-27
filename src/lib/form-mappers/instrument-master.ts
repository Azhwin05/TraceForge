import type { InstrumentMasterInput } from "@/lib/validations/instrument-master"
import type { InstrumentMaster } from "@/types/database"

/** See item-master.ts for why this lives outside any "use client" file. */
export function instrumentToFormValues(i: InstrumentMaster): InstrumentMasterInput {
  return {
    instrument_name: i.instrument_name,
    instrument_type: i.instrument_type,
    serial_number:   i.serial_number ?? undefined,
    manufacturer:    i.manufacturer ?? undefined,
    calibration_due: i.calibration_due ?? undefined,
  }
}
