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
});

export type CreateJobCardInput = z.infer<typeof createJobCardSchema>;

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
  ring_heat_no:          z.string().optional(),
  mpi_rt_no:             z.string().optional(),
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
