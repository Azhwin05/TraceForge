import { NextRequest, NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { createElement, type ReactElement } from "react"
import { createClient } from "@/lib/supabase/server"
import { STORAGE_BUCKET } from "@/lib/documents/storage-utils"
import { DimensionPdfTemplate } from "@/components/dimension/dimension-pdf-template"
import type { DimensionReport } from "@/types/database"

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || !["admin", "qa"].includes((profile as { role: string }).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Fetch report
  const { data: report, error: fetchErr } = await supabase
    .from("dimension_reports")
    .select("*")
    .eq("id", params.id)
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
  const storagePath = `dimension_report/${params.id}/dim-report-v${version}.pdf`

  const { error: uploadErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: "application/pdf",
      upsert: true,
    })

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 })
  }

  // Save path to dimension_reports
  await supabase
    .from("dimension_reports")
    .update({ generated_pdf_path: storagePath })
    .eq("id", params.id)

  // Deactivate previously generated PDFs for this report
  await supabase
    .from("documents")
    .update({ is_latest: false, is_active: false })
    .eq("entity_type", "dimension_report")
    .eq("entity_id", params.id)
    .eq("document_category", "generated")
    .eq("document_type", "dimension_report")

  // Register new generated PDF in documents table
  await supabase.from("documents").insert({
    entity_type:       "dimension_report",
    entity_id:         params.id,
    document_type:     "dimension_report",
    storage_path:      storagePath,
    file_name:         `dim-report-${typedReport.report_number ?? params.id}.pdf`,
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

  // Generate signed URL for immediate download
  const { data: signedData } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, 3600)

  return NextResponse.json({
    storagePath,
    downloadUrl: signedData?.signedUrl ?? null,
  })
}
