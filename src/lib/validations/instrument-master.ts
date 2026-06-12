import { z } from "zod"

const INSTRUMENT_TYPES = ["pmi", "dimensional", "visual", "hardness", "nde", "other"] as const

export const instrumentMasterSchema = z.object({
  instrument_name: z.string().min(1, "Instrument name is required"),
  instrument_type: z.enum(INSTRUMENT_TYPES),
  serial_number:   z.string().nullish(),
  manufacturer:    z.string().nullish(),
  calibration_due: z.string().nullish(), // ISO date string, action passes to DB as-is
})

export type InstrumentMasterInput = z.infer<typeof instrumentMasterSchema>
export { INSTRUMENT_TYPES }
