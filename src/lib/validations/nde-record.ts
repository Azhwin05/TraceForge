import { z } from "zod"

export const NDE_TYPES = ["lpt", "mpi", "rt", "ut", "vt", "other"] as const
export const NDE_RESULTS = ["pending", "accepted", "rejected"] as const

export const ndeRecordSchema = z.object({
  nde_type:             z.enum(NDE_TYPES),
  procedure_ref:        z.string().optional(),
  report_number:        z.string().optional(),
  inspection_date:      z.string().optional(),
  inspected_by:         z.string().optional(),
  stage_of_test:        z.string().optional(),
  surface_condition:    z.string().optional(),
  temperature_of_part:  z.string().optional(), // stored as string in form, converted to number
  // LPT / penetrant specific
  type_of_penetrant:    z.string().optional(),
  penetrant_application: z.string().optional(),
  penetrant_removal:    z.string().optional(),
  penetrant_dwell_time: z.string().optional(),
  developer_application: z.string().optional(),
  developer_dwell_time:  z.string().optional(),
  post_cleaning:        z.string().optional(),
  evaluation:           z.string().optional(),
  // Result
  result:               z.enum(NDE_RESULTS).default("pending"),
  notes:                z.string().optional(),
  // Chemicals (by type: cleaner, penetrant, developer, remover)
  chemical_1_id:        z.string().uuid().nullable().optional(),
  chemical_2_id:        z.string().uuid().nullable().optional(),
  chemical_3_id:        z.string().uuid().nullable().optional(),
  chemical_4_id:        z.string().uuid().nullable().optional(),
})

// z.input<> so .default("pending") on result is optional in the form (RHF resolver compat)
export type NdeRecordInput = z.input<typeof ndeRecordSchema>

export const NDE_TYPE_LABELS: Record<string, string> = {
  lpt:   "LPT (Liquid Penetrant)",
  mpi:   "MPI (Magnetic Particle)",
  rt:    "RT (Radiographic)",
  ut:    "UT (Ultrasonic)",
  vt:    "VT (Visual)",
  other: "Other",
}
