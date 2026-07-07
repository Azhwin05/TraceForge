import { NextRequest, NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { createElement, type ReactElement } from "react"
import { requireAuth } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { STORAGE_BUCKET } from "@/lib/documents/storage-utils"
import { isValidUUID, sanitizeError, isValidOrigin } from "@/lib/security"
import { JobCardPdfTemplate } from "@/components/job-cards/job-card-pdf-template"
import type {
  JobCard, Client, ProcessExecution, NdeRecord, AirTestRecord,
  DimensionReport, Dispatch,
} from "@/types/database"

const ALLOWED_ROLES = ["admin", "operator", "engineer", "qa", "accounts", "management"] as const

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isValidOrigin(req.headers, req.method, process.env.NEXT_PUBLIC_APP_URL ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let session: Awaited<ReturnType<typeof requireAuth>>
  try {
    session = await requireAuth()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { profile, user } = session
  if (!ALLOWED_ROLES.includes(profile.role as (typeof ALLOWED_ROLES)[number])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  if (!isValidUUID(id)) {
    return NextResponse.json({ error: "Invalid job card ID" }, { status: 400 })
  }

  const supabase = await createClient()

  const [
    { data: jobCard, error: jcErr },
    { data: executions },
    { data: ndeRecords },
    { data: airTests },
    { data: dimensionReports },
    { data: dispatches },
    { data: pwhtRunJobs },
  ] = await Promise.all([
    supabase.from("job_cards").select("*, client:clients(*)").eq("id", id).single(),
    supabase.from("process_executions").select("*").eq("job_card_id", id).order("started_at", { ascending: true }),
    supabase.from("nde_records").select("*").eq("job_card_id", id).order("created_at", { ascending: true }),
    supabase.from("air_test_records").select("*").eq("job_card_id", id).order("created_at", { ascending: true }),
    supabase.from("dimension_reports").select("*").eq("job_card_id", id).order("created_at", { ascending: true }),
    supabase.from("dispatches").select("*").eq("job_card_id", id).order("created_at", { ascending: true }),
    supabase.from("pwht_run_jobs").select("pwht_run:pwht_runs(*)").eq("job_card_id", id),
  ])

  if (jcErr || !jobCard) {
    return NextResponse.json({ error: "Job card not found" }, { status: 404 })
  }

  const typedJobCard = jobCard as unknown as JobCard & { client: Client | null }
  const pwhtRuns = ((pwhtRunJobs ?? []) as unknown as Array<{ pwht_run: {
    chart_number: string; process_name: string | null
    loading_temp: number; loading_time: number | null
    soaking_temp: number; soaking_time: number
    unloading_temp: number | null; unloading_time: number | null
  } | null }>)
    .map((rj) => rj.pwht_run)
    .filter((r): r is NonNullable<typeof r> => !!r)

  const element = createElement(JobCardPdfTemplate, {
    jobCard: typedJobCard,
    client: typedJobCard.client,
    executions: (executions ?? []) as ProcessExecution[],
    ndeRecords: (ndeRecords ?? []) as NdeRecord[],
    airTests: (airTests ?? []) as AirTestRecord[],
    dimensionReports: (dimensionReports ?? []) as DimensionReport[],
    dispatches: (dispatches ?? []) as Dispatch[],
    pwhtRuns,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as ReactElement<any>
  const buffer = await renderToBuffer(element)

  const version = Date.now()
  const storagePath = `job_card/${id}/job-card-v${version}.pdf`

  const { error: uploadErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, { contentType: "application/pdf", upsert: true })

  if (uploadErr) {
    console.error("[Job card generate] storage upload failed:", uploadErr)
    return NextResponse.json({ error: sanitizeError(uploadErr) }, { status: 500 })
  }

  await supabase
    .from("documents")
    .update({ is_latest: false, is_active: false })
    .eq("entity_type", "job_card")
    .eq("entity_id", id)
    .eq("document_category", "generated")
    .eq("document_type", "job_card_pdf")

  await supabase.from("documents").insert({
    entity_type:       "job_card",
    entity_id:         id,
    document_type:     "job_card_pdf",
    storage_path:      storagePath,
    file_name:         `job-card-${typedJobCard.jc_number}.pdf`,
    file_size:         buffer.length,
    mime_type:         "application/pdf",
    document_category: "generated",
    document_name:     `Job Card ${typedJobCard.jc_number}`,
    job_card_id:       id,
    source_module:     "job_card",
    is_latest:         true,
    is_active:         true,
    uploaded_by:       user.id,
  })

  return NextResponse.json({ storagePath }, { headers: { "Cache-Control": "no-store" } })
}
