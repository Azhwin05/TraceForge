import { z } from "zod";

export const createJobCardSchema = z.object({
  client_id: z.string().min(1, "Select a client"),
  nbdn_number: z.string().min(1, "NBDN number is required"),
  po_number: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  drawing_number: z.string().optional(),
  heat_number: z.string().optional(),
  part_number: z.string().optional(),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  process_type: z
    .array(z.enum(["welding", "machining", "cladding", "overlay"]))
    .min(1, "Select at least one process type"),
  received_date: z.string().min(1, "Received date is required"),
  due_date: z.string().optional(),
});

export type CreateJobCardInput = z.infer<typeof createJobCardSchema>;

// ── Full paper Job Card capture ──────────────────────────────────────────────
// One form mirroring the paper Job Card: header/identity + consumable + welding
// details + closing block. Only the core intake fields are required; everything
// else is optional so staff can save now and complete later (and edit afterward).
const optStr = z.string().trim().optional();
// Numbers that may be blank. Inputs register with { valueAsNumber: true }, so an
// empty box arrives as NaN — accept it here (input type stays number|undefined so
// the RHF resolver types line up) and normalise NaN → null in the server action.
const optNum = z.number().or(z.nan()).optional();

export const fullJobCardSchema = z.object({
  // Core intake (required)
  client_id: z.string().min(1, "Select a client"),
  nbdn_number: z.string().min(1, "NBDN number is required"),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  process_type: z
    .array(z.enum(["welding", "machining", "cladding", "overlay"]))
    .min(1, "Select at least one process type"),
  received_date: z.string().min(1, "Received date is required"),

  // Header / identity (optional)
  po_number: optStr,
  drawing_number: optStr,
  heat_number: optStr,
  part_number: optStr,
  due_date: optStr,
  product_group: optStr,
  buyer: optStr,
  material_code: optStr,
  valve_size_class: optStr,
  valve_type_component: optStr,
  base_material: optStr,
  overlay_material: optStr,
  base_material_grade: optStr,
  regularization: optStr,
  wps_no: optStr,
  ring: optStr,
  ring_heat_no: optStr,
  mpi_rt_no: optStr,
  welding_process: optStr,

  // Consumable data (optional)
  consumable_brand: optStr,
  consumable_aws_class: optStr,
  consumable_size: optStr,
  consumable_batch_no: optStr,
  consumable_mfg_date: optStr,

  // Welding details — persisted to the welding process_executions row (optional)
  welder_name: optStr,
  welder_id: optStr,
  weld_metal: optStr,
  weld_height: optNum,
  weld_qty_planned: optNum,
  weld_qty_actual: optNum,
  weld_date: optStr,
  pre_heat_temp_planned: optNum,
  pre_heat_temp: optNum,
  inter_pass_temp_planned: optNum,
  inter_pass_temp: optNum,
  post_heat_temp_planned: optNum,
  post_heat_temp: optNum,
  amps_required: optStr,
  amps_actual: optNum,
  volts_required: optStr,
  volts_actual: optNum,
  travel_speed_planned: optNum,
  travel_speed: optNum,
  gas_flow_rate_planned: optNum,
  gas_flow_rate: optNum,
  consumable_feed_rate_planned: optNum,
  consumable_feed_rate: optNum,
  polarity_planned: optStr,
  polarity: optStr,

  // Closing block (optional)
  weld_deposit_thickness_before: optStr,
  weld_deposit_thickness_after: optStr,
  punching_details: optStr,
  despatch_dc_no: optStr,
  despatch_date: optStr,
  other_details: optStr,
  production_checked_by: optStr,
  production_checked_date: optStr,
  qc_checked_by: optStr,
  qc_checked_date: optStr,
  stores_checked_by: optStr,
  stores_checked_date: optStr,
});

export type FullJobCardInput = z.infer<typeof fullJobCardSchema>;

export const createClientSchema = z.object({
  name: z.string().min(1, "Client name is required"),
  contact_name: z.string().optional(),
  contact_email: z.string().email("Invalid email").optional().or(z.literal("")),
  contact_phone: z.string().optional(),
  address: z.string().optional(),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;

export const createWpsSchema = z.object({
  wps_number: z.string().min(1, "WPS number is required"),
  revision: z.string().min(1, "Revision is required"),
  doc_url: z.string().url("Enter a valid URL").optional().or(z.literal("")),
});

export type CreateWpsInput = z.infer<typeof createWpsSchema>;

export const rejectWpsSchema = z.object({
  rejection_reason: z.string().min(1, "Rejection reason is required"),
});

export type RejectWpsInput = z.infer<typeof rejectWpsSchema>;

export const advancedJobCardSchema = z.object({
  // Product / material details
  product_group:         z.string().optional(),
  buyer:                 z.string().optional(),
  material_code:         z.string().optional(),
  valve_size_class:      z.string().optional(),
  valve_type_component:  z.string().optional(),
  base_material:         z.string().optional(),
  overlay_material:      z.string().optional(),
  base_material_grade:   z.string().optional(),
  regularization:        z.string().optional(),
  ring:                  z.string().optional(),
  ring_heat_no:          z.string().optional(),
  mpi_rt_no:             z.string().optional(),
  welding_process:       z.string().optional(),
  punching_details:      z.string().optional(),
  other_details:         z.string().optional(),
});

export type AdvancedJobCardInput = z.infer<typeof advancedJobCardSchema>;

export const signOffSchema = z.object({
  production_checked_by:   z.string().optional(),
  production_checked_date: z.string().optional(),
  qc_checked_by:           z.string().optional(),
  qc_checked_date:         z.string().optional(),
  stores_checked_by:       z.string().optional(),
  stores_checked_date:     z.string().optional(),
});

export type SignOffInput = z.infer<typeof signOffSchema>;

export const linkWpsMasterSchema = z.object({
  wps_master_id: z.string().uuid("Select a valid WPS Master"),
});

export type LinkWpsMasterInput = z.infer<typeof linkWpsMasterSchema>;
