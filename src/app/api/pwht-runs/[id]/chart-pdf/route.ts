import { NextRequest, NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { createElement } from "react"
import { requireAuth } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { STORAGE_BUCKET } from "@/lib/documents/storage-utils"
import { isValidUUID, sanitizeError, isValidOrigin } from "@/lib/security"
import { PwhtChartPdf } from "@/components/pwht/pwht-chart-pdf"
import type { PwhtRun, PwhtChartReading } from "@/types/database"

export const maxDuration = 60

const ALLOWED_ROLES = ["admin", "qa", "engineer"] as const

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // CSRF — verify origin matches app URL
  if (!isValidOrigin(req.headers, req.method, process.env.NEXT_PUBLIC_APP_URL ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let session: Awaited<ReturnType<typeof requireAuth>>
  try {
    session = await requireAuth()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { profile } = session
  if (!ALLOWED_ROLES.includes(profile.role as (typeof ALLOWED_ROLES)[number])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  if (!isValidUUID(id)) {
    return NextResponse.json({ error: "Invalid PWHT run ID" }, { status: 400 })
  }

  const supabase = await createClient()

  const [{ data: run, error: runErr }, { data: readings }, { data: runJobs }] = await Promise.all([
    supabase.from("pwht_runs").select("*").eq("id", id).single(),
    supabase
      .from("pwht_chart_readings")
      .select("*")
      .eq("pwht_run_id", id)
      .order("recorded_at", { ascending: true })
      .limit(5000),
    supabase
      .from("pwht_run_jobs")
      .select("job_card_id, job_cards(jc_number, description)")
      .eq("pwht_run_id", id),
  ])

  if (runErr || !run) {
    return NextResponse.json({ error: "PWHT run not found" }, { status: 404 })
  }

  const typedReadings = (readings ?? []) as PwhtChartReading[]
  if (typedReadings.length === 0) {
    return NextResponse.json(
      { error: "No chart readings captured yet — nothing to plot." },
      { status: 400 },
    )
  }

  const typedRunJobs = (runJobs ?? []) as unknown as Array<{
    job_card_id: string
    job_cards: { jc_number: string; description: string } | null
  }>
  const jobs = typedRunJobs
    .map((rj) => rj.job_cards)
    .filter((j): j is { jc_number: string; description: string } => !!j)

  const element = createElement(PwhtChartPdf, {
    run: run as PwhtRun,
    readings: typedReadings,
    jobs,
  })
  const buffer = await renderToBuffer(element as Parameters<typeof renderToBuffer>[0])

  const version = Date.now()
  const storagePath = `pwht_run/${id}/pwht-chart-v${version}.pdf`

  const { error: uploadErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, { contentType: "application/pdf", upsert: true })

  if (uploadErr) {
    console.error("[PWHT chart-pdf] storage upload failed:", uploadErr)
    return NextResponse.json({ error: sanitizeError(uploadErr) }, { status: 500 })
  }

  // Save latest generated path to the run
  await supabase.from("pwht_runs").update({ storage_path: storagePath }).eq("id", id)

  // Deactivate any previously generated chart PDFs for this run
  await supabase
    .from("documents")
    .update({ is_latest: false, is_active: false })
    .eq("entity_type", "pwht_run")
    .eq("entity_id", id)
    .eq("document_category", "generated")
    .eq("document_type", "pwht_chart")

  // Register in the document registry (dossier/MDB-eligible)
  const { user } = session
  const typedRun = run as PwhtRun
  await supabase.from("documents").insert({
    entity_type:       "pwht_run",
    entity_id:         id,
    document_type:     "pwht_chart",
    storage_path:      storagePath,
    file_name:         `pwht-chart-${typedRun.chart_number}.pdf`,
    file_size:         buffer.length,
    mime_type:         "application/pdf",
    document_category: "generated",
    document_name:     `PWHT Chart ${typedRun.chart_number}`,
    // A run can span several job cards; register against the first for job-scoped views
    job_card_id:       typedRunJobs[0]?.job_card_id ?? null,
    source_module:     "pwht_run",
    is_latest:         true,
    is_active:         true,
    uploaded_by:       user.id,
  })

  return NextResponse.json({ storagePath }, { headers: { "Cache-Control": "no-store" } })
}
