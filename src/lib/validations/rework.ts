import { z } from "zod"

/**
 * Rework record — client meeting request #2.
 *
 * `stage` is free text rather than an enum of job-card statuses on purpose:
 * rework is reported against where the work physically went wrong ("overlay",
 * "final machining"), which does not map cleanly onto the workflow status
 * machine and would otherwise force operators to pick a misleading value.
 */
export const reworkSchema = z.object({
  job_card_id:       z.string().uuid("Select a job card"),
  rework_date:       z.string().min(1, "Rework date is required"),
  stage:             z.string().min(1, "Stage is required").max(120),
  reason:            z.string().min(1, "A reason is required").max(2000),
  quantity:          z.coerce.number().int().positive("Quantity must be at least 1"),
  identified_by:     z.string().uuid().nullish(),
  performed_by:      z.string().uuid().nullish(),
  corrective_action: z.string().max(2000).nullish(),
  status:            z.enum(["open", "in_progress", "completed"]).default("open"),
  notes:             z.string().max(2000).nullish(),
})

export type ReworkInput = z.infer<typeof reworkSchema>

/** Editing reuses the same shape minus the job card, which cannot be moved. */
export const reworkUpdateSchema = reworkSchema.omit({ job_card_id: true })
export type ReworkUpdateInput = z.infer<typeof reworkUpdateSchema>
