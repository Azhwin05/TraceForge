import { NextRequest, NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import JSZip from "jszip"
import { createElement } from "react"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth"
import { isValidUUID, sanitizeError, isValidOrigin } from "@/lib/security"
import { DossierIndexPdf } from "@/components/dossier/dossier-index-pdf"
import type { CustomerDossier, DossierDocument, Document as DocRecord, UserRole } from "@/types/database"

export const maxDuration = 60

type DossierDocWithDoc = DossierDocument & {
  document: Pick<DocRecord, "id" | "document_type" | "document_name" | "file_name" | "storage_path" | "version" | "approval_status" | "source_module" | "is_active">
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._\-() ]/g, "_").replace(/_{2,}/g, "_").trim()
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // CSRF guard
  if (!isValidOrigin(req.headers, req.method, process.env.NEXT_PUBLIC_APP_URL ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  // UUID validation
  if (!isValidUUID(id)) {
    return NextResponse.json({ error: "Invalid dossier ID" }, { status: 400 })
  }

  try {
    const session = await requireAuth()
    const { profile } = session
    const userRole = (profile?.role ?? "operator") as UserRole
    if (!["admin", "qa"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const supabase = await createClient()

    // ── Fetch dossier + linked documents ─────────────────────────────────────
    const { data: rawDossier } = await supabase
      .from("customer_dossiers")
      .select("*")
      .eq("id", id)
      .single()

    if (!rawDossier) {
      return NextResponse.json({ error: "Dossier not found" }, { status: 404 })
    }
    const dossier = rawDossier as CustomerDossier

    if (dossier.status === "submitted") {
      return NextResponse.json({ error: "Submitted dossiers cannot be regenerated" }, { status: 400 })
    }

    const { data: rawDossierDocs } = await supabase
      .from("customer_dossier_documents")
      .select("*, document:documents(id, document_type, document_name, file_name, storage_path, version, approval_status, source_module, is_active)")
      .eq("dossier_id", id)
      .order("sort_order")

    const dossierDocs = (rawDossierDocs ?? []) as DossierDocWithDoc[]
    const includedDocs = dossierDocs.filter((dd) => dd.included && dd.document?.is_active)

    // ── Fetch job card number ─────────────────────────────────────────────────
    const { data: jcRow } = await supabase
      .from("job_cards")
      .select("jc_number")
      .eq("id", dossier.job_card_id)
      .single()
    const jcNumber: string = (jcRow as { jc_number: string } | null)?.jc_number ?? ""

    // ── Version: find existing generated docs to determine next version ───────
    const { data: existingIdxDocs } = await supabase
      .from("documents")
      .select("version")
      .eq("entity_type", "dossier")
      .eq("entity_id", id)
      .eq("document_type", "dossier_index")
      .order("version", { ascending: false })
      .limit(1)

    const existingIdx = (existingIdxDocs ?? []) as { version: number }[]
    const indexVersion = (existingIdx[0]?.version ?? 0) + 1

    // ── Generate Index PDF ────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfElement = createElement(DossierIndexPdf as any, {
      dossier,
      dossierDocs,
      jcNumber,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(pdfElement as any)
    const indexStoragePath = `dossier/${id}/index-v${indexVersion}.pdf`

    // Deactivate old index docs
    await supabase
      .from("documents")
      .update({ is_latest: false })
      .eq("entity_type", "dossier")
      .eq("entity_id", id)
      .eq("document_type", "dossier_index")
      .eq("is_latest", true)

    // Upload index PDF
    const { error: indexUploadErr } = await supabase.storage
      .from("documents")
      .upload(indexStoragePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: false,
      })

    if (indexUploadErr) {
      console.error("[Dossier generate] index PDF upload failed:", indexUploadErr)
      return NextResponse.json({ error: "Index PDF upload failed. Please try again." }, { status: 500 })
    }

    // Insert index document row
    const { error: indexDocErr } = await supabase.from("documents").insert({
      entity_type:       "dossier",
      entity_id:         id,
      document_type:     "dossier_index",
      document_category: "generated",
      document_name:     `Dossier Index — ${dossier.dossier_number}`,
      file_name:         `dossier-index-${dossier.dossier_number}.pdf`,
      storage_path:      indexStoragePath,
      file_size:         pdfBuffer.length,
      mime_type:         "application/pdf",
      version:           indexVersion,
      is_latest:         true,
      is_active:         true,
      job_card_id:       dossier.job_card_id,
      source_module:     "dossier",
    })

    if (indexDocErr) {
      console.error("[Dossier generate] index doc insert failed:", indexDocErr)
      return NextResponse.json({ error: sanitizeError(indexDocErr) }, { status: 500 })
    }

    // ── Generate ZIP ──────────────────────────────────────────────────────────
    const zip = new JSZip()

    // Add index PDF
    zip.file(`00_Dossier-Index.pdf`, pdfBuffer)

    // Track skipped files for reporting
    const skipped: string[] = []
    let slotNum = 1

    for (const dd of includedDocs) {
      const doc = dd.document
      if (!doc?.storage_path) {
        skipped.push(doc?.file_name ?? "unknown")
        continue
      }

      const { data: fileBlob, error: downloadErr } = await supabase.storage
        .from("documents")
        .download(doc.storage_path)

      if (downloadErr || !fileBlob) {
        skipped.push(doc.file_name)
        continue
      }

      const arrayBuffer = await fileBlob.arrayBuffer()
      const ext = doc.file_name.split(".").pop() ?? "pdf"
      const slug = sanitizeFileName(doc.document_name ?? doc.file_name)
      const zipFileName = `${String(slotNum).padStart(2, "0")}_${slug}.${ext}`
      zip.file(zipFileName, arrayBuffer)
      slotNum++
    }

    const zipArrayBuffer = await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE", compressionOptions: { level: 6 } })

    const { data: existingZipDocs } = await supabase
      .from("documents")
      .select("version")
      .eq("entity_type", "dossier")
      .eq("entity_id", id)
      .eq("document_type", "dossier_zip")
      .order("version", { ascending: false })
      .limit(1)

    const existingZip = (existingZipDocs ?? []) as { version: number }[]
    const zipVersion = (existingZip[0]?.version ?? 0) + 1
    const zipStoragePath = `dossier/${id}/pack-v${zipVersion}.zip`

    // Deactivate old zip docs
    await supabase
      .from("documents")
      .update({ is_latest: false })
      .eq("entity_type", "dossier")
      .eq("entity_id", id)
      .eq("document_type", "dossier_zip")
      .eq("is_latest", true)

    const { error: zipUploadErr } = await supabase.storage
      .from("documents")
      .upload(zipStoragePath, zipArrayBuffer, {
        contentType: "application/zip",
        upsert: false,
      })

    if (zipUploadErr) {
      console.error("[Dossier generate] ZIP upload failed:", zipUploadErr)
      // ZIP failed — still mark as generated (index succeeded)
      await supabase
        .from("customer_dossiers")
        .update({ status: "generated", generated_index_pdf_path: indexStoragePath })
        .eq("id", id)
      return NextResponse.json({
        success: true,
        indexPath: indexStoragePath,
        zipPath: null,
        warning: "ZIP archive generation failed. Index PDF was saved successfully.",
        skipped,
      })
    }

    // Insert zip document row
    await supabase.from("documents").insert({
      entity_type:       "dossier",
      entity_id:         id,
      document_type:     "dossier_zip",
      document_category: "generated",
      document_name:     `Dossier Pack — ${dossier.dossier_number}`,
      file_name:         `dossier-pack-${dossier.dossier_number}.zip`,
      storage_path:      zipStoragePath,
      file_size:         zipArrayBuffer.byteLength,
      mime_type:         "application/zip",
      version:           zipVersion,
      is_latest:         true,
      is_active:         true,
      job_card_id:       dossier.job_card_id,
      source_module:     "dossier",
    })

    // ── Update dossier status ─────────────────────────────────────────────────
    await supabase
      .from("customer_dossiers")
      .update({
        status:                   "generated",
        generated_index_pdf_path: indexStoragePath,
        generated_zip_path:       zipStoragePath,
      })
      .eq("id", id)

    return NextResponse.json({
      success: true,
      indexPath: indexStoragePath,
      zipPath: zipStoragePath,
      skipped,
    })
  } catch (err) {
    console.error("[Dossier generate] unexpected error:", err)
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 })
  }
}
