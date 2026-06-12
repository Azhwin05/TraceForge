import { NextRequest, NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { createElement, type ReactElement } from "react"
import { createClient } from "@/lib/supabase/server"
import { STORAGE_BUCKET } from "@/lib/documents/storage-utils"
import { OverlayPdfTemplate } from "@/components/overlay/overlay-pdf-template"
import type { OverlayReport } from "@/types/database"

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient()

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

  const { data: report, error: fetchErr } = await supabase
    .from("overlay_welding_reports")
    .select("*")
    .eq("id", params.id)
    .single()

  if (fetchErr || !report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 })
  }

  const typedReport = report as OverlayReport

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = createElement(OverlayPdfTemplate, { report: typedReport }) as ReactElement<any>
  const buffer = await renderToBuffer(element)

  const version = Date.now()
  const storagePath = `overlay_report/${params.id}/overlay-report-v${version}.pdf`

  const { error: uploadErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, { contentType: "application/pdf", upsert: true })

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 })
  }

  await supabase
    .from("overlay_welding_reports")
    .update({ generated_pdf_path: storagePath })
    .eq("id", params.id)

  // Deactivate previous generated PDFs for this report
  await supabase
    .from("documents")
    .update({ is_latest: false, is_active: false })
    .eq("entity_type", "overlay_report")
    .eq("entity_id", params.id)
    .eq("document_category", "generated")
    .eq("document_type", "overlay_welding_report")

  await supabase.from("documents").insert({
    entity_type:       "overlay_report",
    entity_id:         params.id,
    document_type:     "overlay_welding_report",
    storage_path:      storagePath,
    file_name:         `overlay-report-${typedReport.report_number ?? params.id}.pdf`,
    file_size:         buffer.length,
    mime_type:         "application/pdf",
    document_category: "generated",
    document_name:     `Overlay Welding Report ${typedReport.report_number ?? ""}`,
    job_card_id:       typedReport.job_card_id,
    source_module:     "overlay_report",
    is_latest:         true,
    is_active:         true,
    uploaded_by:       user.id,
  })

  const { data: signedData } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, 3600)

  return NextResponse.json({
    storagePath,
    downloadUrl: signedData?.signedUrl ?? null,
  })
}
