"use server"

import { revalidatePath } from "next/cache"
import { requireAuth, requireRole } from "@/lib/auth"
import type { CreateJobCardInput, CreateClientInput, CreateWpsInput } from "@/lib/validations/job-card"
import type { JobCardStatus, UserRole } from "@/types/database"

// Roles allowed to move a job card TO each status
const STATUS_ALLOWED_ROLES: Record<JobCardStatus, UserRole[]> = {
  created:              ["admin", "operator"],
  wps_pending:          ["admin", "operator", "engineer"],
  wps_uploaded:         ["admin", "qa"],
  wps_approved:         ["admin", "qa"],
  process_assigned:     ["admin", "engineer"],
  in_process:           ["admin", "engineer"],
  process_complete:     ["admin", "engineer", "qa"],
  reports_pending:      ["admin", "qa"],
  reports_complete:     ["admin", "qa"],
  dispatch_ready:       ["admin"],
  dispatched:           ["admin"],
  accounts_processing:  ["admin", "accounts"],
  closed:               ["admin", "accounts"],
  on_hold:              ["admin", "operator", "engineer", "qa", "accounts"],
}

export async function createJobCard(
  data: CreateJobCardInput
): Promise<{ error?: string; id?: string }> {
  const guard = await requireRole(["admin", "operator", "qa", "engineer", "accounts", "management"])
  if (guard.error) return { error: guard.error }
  const { supabase, user } = guard

  // Atomic jc_number generation using a DB function (avoids COUNT+INSERT race)
  const { data: jcNumberRow, error: seqError } = await supabase
    .rpc("generate_jc_number")
  if (seqError) return { error: seqError.message }
  const jcNumber = jcNumberRow as string

  const { data: jobCard, error } = await supabase
    .from("job_cards")
    .insert({
      jc_number: jcNumber,
      client_id: data.client_id,
      nbdn_number: data.nbdn_number,
      po_number: data.po_number || null,
      description: data.description,
      drawing_number: data.drawing_number || null,
      heat_number: data.heat_number || null,
      part_number: data.part_number || null,
      quantity: data.quantity,
      process_type: data.process_type,
      received_date: data.received_date,
      status: "created",
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath("/job-cards")
  revalidatePath("/dashboard")
  return { id: jobCard.id }
}

export async function updateJobCardStatus(
  id: string,
  newStatus: JobCardStatus
): Promise<{ error?: string }> {
  const { profile, supabase } = await requireAuth()
  const role = profile!.role as UserRole

  const allowedRoles = STATUS_ALLOWED_ROLES[newStatus]
  if (!allowedRoles?.includes(role)) {
    return { error: "Unauthorized: your role cannot perform this transition" }
  }

  // Fetch current status to store as previous_status when going on_hold
  const { data: current } = await supabase
    .from("job_cards")
    .select("status")
    .eq("id", id)
    .single()

  const updatePayload: {
    status: JobCardStatus
    stage_entered_at: string
    previous_status?: JobCardStatus | null
  } = {
    status: newStatus,
    stage_entered_at: new Date().toISOString(),
  }

  if (newStatus === "on_hold" && current?.status) {
    updatePayload.previous_status = current.status as JobCardStatus
  }
  if (newStatus !== "on_hold") {
    updatePayload.previous_status = null
  }

  const { error } = await supabase
    .from("job_cards")
    .update(updatePayload)
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath(`/job-cards/${id}`)
  revalidatePath("/job-cards")
  revalidatePath("/dashboard")
  return {}
}

export async function createClient_(
  data: CreateClientInput
): Promise<{ error?: string; client?: { id: string; name: string } }> {
  const { supabase } = await requireAuth()

  const { data: client, error } = await supabase
    .from("clients")
    .insert({
      name: data.name,
      contact_name: data.contact_name || null,
      contact_email: data.contact_email || null,
      contact_phone: data.contact_phone || null,
      address: data.address || null,
    })
    .select("id, name")
    .single()

  if (error) return { error: error.message }
  return { client }
}

export async function submitWps(
  jobCardId: string,
  data: CreateWpsInput
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase, user } = guard

  const { error: wpsError } = await supabase
    .from("wps_qualifications")
    .insert({
      job_card_id: jobCardId,
      wps_number: data.wps_number,
      revision: data.revision,
      doc_url: data.doc_url || null,
      approval_status: "pending",
      uploaded_by: user.id,
    })

  if (wpsError) return { error: wpsError.message }

  const { error: statusError } = await supabase
    .from("job_cards")
    .update({ status: "wps_uploaded", stage_entered_at: new Date().toISOString() })
    .eq("id", jobCardId)

  if (statusError) return { error: statusError.message }

  revalidatePath(`/job-cards/${jobCardId}`)
  revalidatePath("/job-cards")
  return {}
}

export async function approveWps(
  wpsId: string,
  jobCardId: string
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase, user } = guard

  const { error: wpsError } = await supabase
    .from("wps_qualifications")
    .update({
      approval_status: "approved",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", wpsId)

  if (wpsError) return { error: wpsError.message }

  const { error: statusError } = await supabase
    .from("job_cards")
    .update({ status: "wps_approved", stage_entered_at: new Date().toISOString() })
    .eq("id", jobCardId)

  if (statusError) return { error: statusError.message }

  revalidatePath(`/job-cards/${jobCardId}`)
  revalidatePath("/job-cards")
  return {}
}

export async function rejectWps(
  wpsId: string,
  jobCardId: string,
  reason: string
): Promise<{ error?: string }> {
  const guard = await requireRole(["admin", "qa"])
  if (guard.error) return { error: guard.error }
  const { supabase } = guard

  const { error: wpsError } = await supabase
    .from("wps_qualifications")
    .update({
      approval_status: "rejected",
      rejection_reason: reason,
    })
    .eq("id", wpsId)

  if (wpsError) return { error: wpsError.message }

  const { error: statusError } = await supabase
    .from("job_cards")
    .update({ status: "wps_pending", stage_entered_at: new Date().toISOString() })
    .eq("id", jobCardId)

  if (statusError) return { error: statusError.message }

  revalidatePath(`/job-cards/${jobCardId}`)
  revalidatePath("/job-cards")
  return {}
}
