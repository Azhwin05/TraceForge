"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import {
  materialInwardSchema, type MaterialInwardInput,
  materialInwardEditSchema, type MaterialInwardEditInput,
  incomingInspectionSchema, type IncomingInspectionInput,
  qualityInspectionSchema, type QualityInspectionInput,
  grnSchema, type GrnInput,
} from "@/lib/validations/material-inward"
import { sanitizeError } from "@/lib/security"

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

  const { data: inwardNumber, error: numberError } = await supabase.rpc("generate_material_inward_number")
  if (numberError) return { error: sanitizeError(numberError) }

  const { data: inward, error } = await supabase
    .from("material_inward")
    .insert({
      inward_number: inwardNumber as string,
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

  if (error) return { error: sanitizeError(error) }
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

  if (itemsError) return { error: sanitizeError(itemsError) }

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

  if (error) return { error: sanitizeError(error) }

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

  if (error) return { error: sanitizeError(error) }

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
  if (numberError) return { error: sanitizeError(numberError) }

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

  if (error) return { error: sanitizeError(error) }
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
      unit_rate:                item.unit_rate ?? 0,
      remarks:                  sanitize(item.remarks),
    })
    if (itemError) return { error: sanitizeError(itemError) }
  }

  revalidatePath(`/inventory/material-inward/${data.material_inward_id}`)
  revalidatePath("/inventory/material-inward")
  revalidatePath("/inventory/stock")
  return { id: grnId }
}

// ── Admin: edit + delete a Material Inward record ───────────────────────

/**
 * Edit the DC header (number, date, supplier, PO, vehicle, remarks) of an
 * existing Material Inward record. Deliberately does not touch the items —
 * those already feed inspection results and any generated GRN. Admin only.
 */
export async function updateMaterialInward(
  id: string,
  raw: MaterialInwardEditInput,
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const parsed = materialInwardEditSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" }
  const data = parsed.data

  const { error } = await supabase
    .from("material_inward")
    .update({
      dc_number:   data.dc_number.trim(),
      dc_date:     data.dc_date,
      supplier_id: data.supplier_id,
      po_number:   sanitize(data.po_number),
      vehicle_no:  sanitize(data.vehicle_no),
      remarks:     sanitize(data.remarks),
    })
    .eq("id", id)

  if (error) return { error: sanitizeError(error) }

  revalidatePath("/inventory/material-inward")
  revalidatePath(`/inventory/material-inward/${id}`)
  return {}
}

/**
 * Permanently delete a Material Inward record (and its cascading inspection/
 * item rows). Admin only. Blocked with a readable reason if a GRN was
 * already generated — that FK doesn't cascade, so material already moved
 * into stock can't actually be deleted regardless.
 */
export async function deleteMaterialInward(id: string): Promise<{ error?: string }> {
  const guard = await requireRole(["admin"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const { count: grnCount } = await supabase
    .from("grn")
    .select("*", { count: "exact", head: true })
    .eq("material_inward_id", id)

  if ((grnCount ?? 0) > 0) {
    return { error: "Cannot delete: a GRN has already been generated and material moved into stock for this record." }
  }

  const { data: deleted, error } = await supabase
    .from("material_inward")
    .delete()
    .eq("id", id)
    .select("id")

  if (error) return { error: sanitizeError(error) }
  if (!deleted || deleted.length === 0) {
    return { error: "Delete was not applied — administrator permission is required." }
  }

  revalidatePath("/inventory/material-inward")
  return {}
}
