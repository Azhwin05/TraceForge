import { z } from "zod"

export const createPwhtRunSchema = z.object({
  chart_number: z.string().min(1, "Chart number is required"),
  furnace_id: z.string().min(1, "Furnace ID is required"),
  operator_name: z.string().min(1, "Operator name is required"),
  loading_temp: z.number().min(0, "Must be ≥ 0"),
  soaking_temp: z.number().min(0, "Must be ≥ 0"),
  soaking_time: z.number().int().min(1, "Must be ≥ 1 min"),
  rate_of_heating: z.number().min(0, "Must be ≥ 0"),
  date_of_cycle: z.string().min(1, "Date is required"),
  doc_url: z.string().optional(),
  job_card_ids: z.array(z.string()).min(1, "Select at least one job card"),
})

export type CreatePwhtRunInput = z.infer<typeof createPwhtRunSchema>

// ── Chart recorder ───────────────────────────────────────────────────────────
export const chartReadingSchema = z.object({
  recorded_at: z.string().min(1, "Time is required"),
  temperature_c: z
    .number({ message: "Temperature must be a number" })
    .min(-50, "Temperature out of range")
    .max(2000, "Temperature out of range"),
  channel: z.string().max(20).optional(),
})

export type ChartReadingInput = z.infer<typeof chartReadingSchema>

export const updatePwhtDetailsSchema = z.object({
  component_identification: z.string().max(300).optional(),
  wps_number: z.string().max(100).optional(),
  cycle_start: z.string().optional(),
  cycle_end: z.string().optional(),
  rate_of_cooling: z.number().min(0).optional().nullable(),
  notes: z.string().max(2000).optional(),
  process_name: z.string().max(200).optional(),
  loading_time: z.number().int().min(0).optional().nullable(),
  unloading_time: z.number().int().min(0).optional().nullable(),
})

export type UpdatePwhtDetailsInput = z.infer<typeof updatePwhtDetailsSchema>
