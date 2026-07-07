import { z } from "zod"

export const processExecutionSchema = z.object({
  process_type:        z.enum(["welding", "machining", "cladding", "overlay"]),
  welder_name:         z.string().optional(),
  welder_id:           z.string().optional(),
  weld_date:           z.string().optional(),
  weld_qty_actual:     z.number().optional(),
  // Consumable
  consumable_master_id: z.string().uuid().nullable().optional(),
  consumable_batch:    z.string().optional(),
  weld_metal:          z.string().optional(),
  consumable_feed_rate: z.number().optional(),
  // Electrical parameters
  amps_required:       z.string().optional(),
  amps_actual:         z.number().optional(),
  volts_required:      z.string().optional(),
  volts_actual:        z.number().optional(),
  polarity:            z.string().optional(),
  // Thermal
  pre_heat_temp:       z.number().optional(),
  inter_pass_temp:     z.number().optional(),
  post_heat_temp:      z.number().optional(),
  // Other
  travel_speed:        z.number().optional(),
  gas_flow_rate:       z.number().optional(),
  weld_height:         z.number().optional(),
  notes:               z.string().optional(),
  assigned_to:         z.string().uuid().optional(),
})

export type ProcessExecutionInput = z.infer<typeof processExecutionSchema>

export const dispatchSchema = z.object({
  dc_number: z.string().min(1, "DC number is required"),
  dispatch_date: z.string().min(1, "Dispatch date is required"),
  vehicle_details: z.string().optional(),
  remarks: z.string().optional(),
  doc_url: z.string().url("Enter a valid URL").optional().or(z.literal("")),
})

export type DispatchInput = z.infer<typeof dispatchSchema>

export const accountsSchema = z.object({
  po_number: z.string().optional(),
  po_value: z.number().optional(),
  invoice_number: z.string().optional(),
  invoice_date: z.string().optional(),
  invoice_value: z.number().optional(),
  grn_status: z.enum(["pending", "received", "held"]).optional(),
  grn_date: z.string().optional(),
  payment_status: z.enum(["pending", "partial", "received"]).optional(),
  payment_date: z.string().optional(),
  payment_amount: z.number().optional(),
  due_date: z.string().optional(),
  tally_reference: z.string().optional(),
  notes: z.string().optional(),
})

export type AccountsInput = z.infer<typeof accountsSchema>
