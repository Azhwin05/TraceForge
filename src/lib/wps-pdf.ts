import { renderToBuffer } from "@react-pdf/renderer"
import { createElement, type ReactElement } from "react"
import { WpsMasterPdfTemplate } from "@/components/master-data/wps-pdf-template"
import { STORAGE_BUCKET } from "@/lib/documents/storage-utils"
import type { WpsMaster } from "@/types/database"

/**
 * Renders the WPS Master PDF and uploads it to storage. Does NOT write to the
 * `documents` table — callers own that (the entity/versioning context differs
 * between "canonical WPS Master PDF" and "PDF attached to a job card's WPS
 * qualification").
 */
export async function renderAndStoreWpsPdf(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  wpsMasterId: string,
): Promise<{ storagePath: string; fileName: string; wps: WpsMaster } | { error: string }> {
  const { data: wps, error } = await supabase
    .from("wps_master")
    .select("*")
    .eq("id", wpsMasterId)
    .single()

  if (error || !wps) return { error: "WPS Master not found." }

  const typedWps = wps as WpsMaster
  const element = createElement(WpsMasterPdfTemplate, { wps: typedWps }) as ReactElement // eslint-disable-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(element)

  const version = Date.now()
  const safeWpsNo = typedWps.wps_no.replace(/[^a-zA-Z0-9._-]/g, "-")
  const storagePath = `wps_master/${wpsMasterId}/wps-v${version}.pdf`

  const { error: uploadErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, { contentType: "application/pdf", upsert: true })

  if (uploadErr) return { error: uploadErr.message }

  return { storagePath, fileName: `${safeWpsNo}.pdf`, wps: typedWps }
}
