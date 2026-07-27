import { NextRequest, NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { createElement, type ReactElement } from "react"
import { requireAuth } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { STORAGE_BUCKET } from "@/lib/documents/storage-utils"
import { isValidUUID, sanitizeError, isValidOrigin } from "@/lib/security"
import { PmiPdfTemplate } from "@/components/pmi/pmi-pdf-template"
import type { PmiReport } from "@/types/database"

const ALLOWED_ROLES = ["admin", "qa"] as const

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // CSRF — verify origin matches app URL
  if (!isValidOrigin(req.headers, req.method, process.env.NEXT_PUBLIC_APP_URL ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Auth — enforces is_active and profile existence
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

  // Validate UUID param
  const { id } = await params
  if (!isValidUUID(id)) {
    return NextResponse.json({ error: "Invalid report ID" }, { status: 400 })
  }

  const supabase = await createClient()

  // Fetch report
  const { data: report, error: fetchErr } = await supabase
    .from("pmi_reports")
    .select("*")
    .eq("id", id)
    .single()

  if (fetchErr || !report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 })
  }

  const typedReport = report as PmiReport

  // Resolve annotated drawing signed URL (image embed in PDF)
  let signedDrawingUrl: string | null = null
  if (typedReport.annotated_drawing_path) {
    const { data: urlData } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(typedReport.annotated_drawing_path, 120)
    signedDrawingUrl = urlData?.signedUrl ?? null
  }

  // Generate PDF buffer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = createElement(PmiPdfTemplate, { report: typedReport, signedDrawingUrl }) as ReactElement<any>
  const buffer = await renderToBuffer(element)

  // Upload to Storage
  const version = Date.now()
  const storagePath = `pmi_report/${id}/pmi-report-v${version}.pdf`

  const { error: uploadErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: "application/pdf",
      upsert: true,
    })

  if (uploadErr) {
    console.error("[PMI generate] storage upload failed:", uploadErr)
    return NextResponse.json({ error: sanitizeError(uploadErr) }, { status: 500 })
  }

  // Save path to pmi_reports
  await supabase
    .from("pmi_reports")
    .update({ generated_pdf_path: storagePath })
    .eq("id", id)

  // Deactivate any previously generated PDF docs for this report
  await supabase
    .from("documents")
    .update({ is_latest: false, is_active: false })
    .eq("entity_type", "pmi_report")
    .eq("entity_id", id)
    .eq("document_category", "generated")
    .eq("document_type", "pmi_report")

  // Register new generated PDF in documents table
  const { user } = session
  await supabase.from("documents").insert({
    entity_type:       "pmi_report",
    entity_id:         id,
    document_type:     "pmi_report",
    storage_path:      storagePath,
    file_name:         `pmi-report-${typedReport.report_number ?? id}.pdf`,
    file_size:         buffer.length,
    mime_type:         "application/pdf",
    document_category: "generated",
    document_name:     `PMI Report ${typedReport.report_number ?? ""}`,
    job_card_id:       typedReport.job_card_id,
    source_module:     "pmi_report",
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
