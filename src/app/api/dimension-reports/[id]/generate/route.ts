import { NextRequest, NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { createElement, type ReactElement } from "react"
import { requireAuth } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { STORAGE_BUCKET } from "@/lib/documents/storage-utils"
import { isValidUUID, sanitizeError, isValidOrigin } from "@/lib/security"
import { DimensionPdfTemplate } from "@/components/dimension/dimension-pdf-template"
import type { DimensionReport } from "@/types/database"

const ALLOWED_ROLES = ["admin", "qa"] as const

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

  const { profile } = session
  if (!ALLOWED_ROLES.includes(profile.role as (typeof ALLOWED_ROLES)[number])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  if (!isValidUUID(id)) {
    return NextResponse.json({ error: "Invalid report ID" }, { status: 400 })
  }

  const supabase = await createClient()

  // Fetch report
  const { data: report, error: fetchErr } = await supabase
    .from("dimension_reports")
    .select("*")
    .eq("id", id)
    .single()

  if (fetchErr || !report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 })
  }

  const typedReport = report as DimensionReport

  // Generate PDF buffer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = createElement(DimensionPdfTemplate, { report: typedReport }) as ReactElement<any>
  const buffer = await renderToBuffer(element)

  // Upload to Storage
  const version = Date.now()
  const storagePath = `dimension_report/${id}/dim-report-v${version}.pdf`

  const { error: uploadErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: "application/pdf",
      upsert: true,
    })

  if (uploadErr) {
    console.error("[Dimension generate] storage upload failed:", uploadErr)
    return NextResponse.json({ error: sanitizeError(uploadErr) }, { status: 500 })
  }

  // Save path to dimension_reports
  await supabase
    .from("dimension_reports")
    .update({ generated_pdf_path: storagePath })
    .eq("id", id)

  // Deactivate previously generated PDFs for this report
  await supabase
    .from("documents")
    .update({ is_latest: false, is_active: false })
    .eq("entity_type", "dimension_report")
    .eq("entity_id", id)
    .eq("document_category", "generated")
    .eq("document_type", "dimension_report")

  // Register new generated PDF in documents table
  const { user } = session
  await supabase.from("documents").insert({
    entity_type:       "dimension_report",
    entity_id:         id,
    document_type:     "dimension_report",
    storage_path:      storagePath,
    file_name:         `dim-report-${typedReport.report_number ?? id}.pdf`,
    file_size:         buffer.length,
    mime_type:         "application/pdf",
    document_category: "generated",
    document_name:     `Dimension Report ${typedReport.report_number ?? ""}`,
    job_card_id:       typedReport.job_card_id,
    source_module:     "dimension_report",
    is_latest:         true,
    is_active:         true,
    uploaded_by:       user.id,
  })

  // Sign a download URL up front so "Download PDF" works immediately after
  // generating, without a second request to /generate-url.
  const { data: signed } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, 3600)

  return NextResponse.json({ storagePath, downloadUrl: signed?.signedUrl ?? null }, {
    headers: { "Cache-Control": "no-store" },
  })
}
