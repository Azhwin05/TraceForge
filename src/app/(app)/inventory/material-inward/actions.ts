"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import {
  materialInwardSchema, type MaterialInwardInput,
  incomingInspectionSchema, type IncomingInspectionInput,
  qualityInspectionSchema, type QualityInspectionInput,
  grnSchema, type GrnInput,
} from "@/lib/validations/material-inward"

function sanitize(v: string | null | undefined): string | null {
  if (!v || v.trim() === "") return null
  return v.trim()
}

// ── Step 1: Material Inward (DC receipt) ────────────────────────────────
export async function createMaterialInward(
  raw: MaterialInwardInput,
): Promise<{ error?: string; id?: string }> {
  const guard = await requireRole(["admin", "operator", "engineer"])
  if (guard.error) return { error: guard.error }
  const { supabase, user } = guard

  const parsed = materialInwardSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }
  const data = parsed.data

  const { data: inward, error } = await supabase
    .from("material_inward")
    .insert({
      dc_number:    data.dc_number.trim(),
      dc_date:      data.dc_date,
      supplier_id:  data.supplier_id,
      po_number:    sanitize(data.po_number),
      vehicle_no:   sanitize(data.vehicle_no),
      remarks:      sanitize(data.remarks),
      received_by:  user.id,
    })
    .select("id")
    .single()

  if (error) return { error: error.message }
  const inwardId = (inward as { id: string }).id

  const { error: itemsError } = await supabase.from("material_inward_items").insert(
    data.items.map((it) => ({
      material_inward_id: inwardId,
      item_id:             it.item_id,
      dc_quantity:         it.dc_quantity,
      uom:                 it.uom,
      remarks:             sanitize(it.remarks),
    }))
  )

  if (itemsError) return { error: itemsError.message }

  revalidatePath("/inventory/material-inward")
  return { id: inwardId }
}

// ── Step 2: Incoming Inspection ─────────────────────────────────────────
export async function submitIncomingInspection(
  materialInwardId: string,
  raw: IncomingInspectionInput,
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "operator", "engineer", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase, user } = guard

  const parsed = incomingInspectionSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }
  const data = parsed.data

  const { error } = await supabase.from("incoming_inspections").insert({
    material_inward_id: materialInwardId,
    inspected_by:        user.id,
    quantity_ok:          data.quantity_ok,
    packaging_ok:         data.packaging_ok,
    documents_ok:         data.documents_ok,
    remarks:              sanitize(data.remarks),
  })

  if (error) return { error: error.message }

  revalidatePath(`/inventory/material-inward/${materialInwardId}`)
  return {}
}

// ── Step 3: Quality Inspection (per item) ───────────────────────────────
export async function submitQualityInspection(
  materialInwardId: string,
  raw: QualityInspectionInput,
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase, user } = guard

  const parsed = qualityInspectionSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }
  const data = parsed.data

  const { error } = await supabase.from("quality_inspections").insert({
    material_inward_id:       materialInwardId,
    material_inward_item_id:  data.material_inward_item_id,
    inspected_by:              user.id,
    result:                    data.result,
    accepted_qty:              data.accepted_qty,
    rejected_qty:              data.rejected_qty,
    rejection_reason:          sanitize(data.rejection_reason),
    remarks:                   sanitize(data.remarks),
  })

  if (error) return { error: error.message }

  revalidatePath(`/inventory/material-inward/${materialInwardId}`)
  return {}
}

// ── Step 4: Generate GRN — Move to Inventory ────────────────────────────
export async function generateGrn(raw: GrnInput): Promise<{ error?: string; id?: string }> {
  const guard = await requireRole(["admin", "engineer"])
  if (guard.error) return { error: guard.error }
  const { supabase, user } = guard

  const parsed = grnSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }
  const data = parsed.data

  const { data: grnNumberResult, error: numberError } = await supabase.rpc("generate_grn_number")
  if (numberError) return { error: numberError.message }

  const { data: grn, error } = await supabase
    .from("grn")
    .insert({
      grn_number:          grnNumberResult as string,
      material_inward_id:  data.material_inward_id,
      generated_by:        user.id,
      remarks:             sanitize(data.remarks),
    })
    .select("id")
    .single()

  if (error) return { error: error.message }
  const grnId = (grn as { id: string }).id

  // Insert line items one at a time: the DB trigger validates each against
  // its quality_inspection's accepted_qty and appends to stock_ledger, so a
  // batch insert would only surface the first row's error clearly.
  for (const item of data.items) {
    const { error: itemError } = await supabase.from("grn_items").insert({
      grn_id:                 grnId,
      item_id:                 item.item_id,
      quality_inspection_id:   item.quality_inspection_id,
      accepted_qty:             item.accepted_qty,
      uom:                      item.uom,
      storage_location_id:      item.storage_location_id,
      unit_rate:                item.unit_rate ?? null,
      remarks:                  sanitize(item.remarks),
    })
    if (itemError) return { error: itemError.message }
  }

  revalidatePath(`/inventory/material-inward/${data.material_inward_id}`)
  revalidatePath("/inventory/material-inward")
  revalidatePath("/inventory/stock")
  return { id: grnId }
}
