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
