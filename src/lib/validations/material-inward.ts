import { z } from "zod"

export const materialInwardItemSchema = z.object({
  item_id:      z.string().uuid("Select an item"),
  dc_quantity:  z.coerce.number().positive("Quantity must be greater than 0"),
  uom:          z.string().min(1, "UOM is required"),
  remarks:      z.string().nullish(),
})

// Material can now arrive from an outside supplier OR from the client
// sending their own material for a specific job — a discriminated union so
// "customer source with a supplier_id" (or vice versa) is rejected by the
// schema itself, not just by the database constraint.
const materialInwardHeaderBase = {
  dc_number:   z.string().min(1, "DC number is required"),
  dc_date:     z.string().min(1, "DC date is required"),
  po_number:   z.string().nullish(),
  vehicle_no:  z.string().nullish(),
  remarks:     z.string().nullish(),
  // Optional for either source — which job this delivery is earmarked for.
  job_card_id: z.string().uuid().nullish().or(z.literal("")),
}

const materialInwardHeaderSchema = z.discriminatedUnion("source_type", [
  z.object({ source_type: z.literal("supplier"), supplier_id: z.string().uuid("Select a supplier"), client_id: z.string().nullish(), ...materialInwardHeaderBase }),
  z.object({ source_type: z.literal("customer"), client_id: z.string().uuid("Select a client"), supplier_id: z.string().nullish(), ...materialInwardHeaderBase }),
])

export const materialInwardSchema = materialInwardHeaderSchema.and(
  z.object({ items: z.array(materialInwardItemSchema).min(1, "Add at least one item") })
)

export type MaterialInwardItemInput = z.infer<typeof materialInwardItemSchema>
export type MaterialInwardInput = z.infer<typeof materialInwardSchema>

// Editing an existing inward record only touches the DC header — not the
// items, which already feed the inspection/GRN workflow and quantities that
// have been checked against. Source type is NOT editable here — changing who
// sent material after QC has started against it is a new delivery, not an
// edit; see the comment on updateMaterialInward.
export const materialInwardEditSchema = z.object({
  dc_number:   z.string().min(1, "DC number is required"),
  dc_date:     z.string().min(1, "DC date is required"),
  po_number:   z.string().nullish(),
  vehicle_no:  z.string().nullish(),
  remarks:     z.string().nullish(),
  job_card_id: z.string().uuid().nullish().or(z.literal("")),
})

export type MaterialInwardEditInput = z.infer<typeof materialInwardEditSchema>

export const incomingInspectionSchema = z.object({
  quantity_ok:   z.boolean(),
  packaging_ok:  z.boolean(),
  documents_ok:  z.boolean(),
  remarks:       z.string().nullish(),
})

export type IncomingInspectionInput = z.infer<typeof incomingInspectionSchema>

export const qualityInspectionSchema = z.object({
  material_inward_item_id:  z.string().uuid(),
  result:            z.enum(["accepted", "rejected"]),
  accepted_qty:      z.coerce.number().min(0),
  rejected_qty:      z.coerce.number().min(0),
  rejection_reason:  z.string().nullish(),
  remarks:           z.string().nullish(),
}).refine((d) => d.result === "accepted" ? d.accepted_qty > 0 : d.rejected_qty > 0, {
  message: "Quantity must be greater than 0 for the chosen result",
  path: ["accepted_qty"],
}).refine((d) => d.result === "rejected" ? !!d.rejection_reason?.trim() : true, {
  message: "Rejection reason is required when rejecting material",
  path: ["rejection_reason"],
})

export type QualityInspectionInput = z.infer<typeof qualityInspectionSchema>

export const grnItemSchema = z.object({
  material_inward_item_id:  z.string().uuid(),
  quality_inspection_id:    z.string().uuid(),
  item_id:                  z.string().uuid(),
  accepted_qty:              z.coerce.number().positive(),
  uom:                       z.string().min(1),
  storage_location_id:       z.string().uuid("Select a storage location"),
  unit_rate:                 z.preprocess(
                               (v) => (v === "" || v === null || v === undefined ? undefined : v),
                               z.coerce.number({ error: "Rate is required" }).min(0, "Rate must be 0 or more"),
                             ),
  remarks:                   z.string().nullish(),
})

export const grnSchema = z.object({
  material_inward_id: z.string().uuid(),
  remarks:             z.string().nullish(),
  items:               z.array(grnItemSchema).min(1, "GRN requires at least one accepted item"),
})

export type GrnItemInput = z.infer<typeof grnItemSchema>
export type GrnInput = z.infer<typeof grnSchema>
