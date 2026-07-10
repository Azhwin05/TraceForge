import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { isValidUUID, sanitizeError, isValidOrigin } from "@/lib/security"
import { renderAndStoreWpsPdf } from "@/lib/wps-pdf"

const ALLOWED_ROLES = ["admin", "qa", "engineer"] as const

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
    return NextResponse.json({ error: "Invalid WPS Master ID" }, { status: 400 })
  }

  const supabase = await createClient()

  const result = await renderAndStoreWpsPdf(supabase, id)
  if ("error" in result) {
    return NextResponse.json({ error: sanitizeError(result.error) }, { status: 500 })
  }
  const { storagePath, fileName, wps } = result

  await supabase
    .from("documents")
    .update({ is_latest: false, is_active: false })
    .eq("entity_type", "wps_master")
    .eq("entity_id", id)
    .eq("document_category", "generated")
    .eq("document_type", "wps_pdf")

  await supabase.from("documents").insert({
    entity_type:       "wps_master",
    entity_id:         id,
    document_type:     "wps_pdf",
    storage_path:      storagePath,
    file_name:         fileName,
    mime_type:         "application/pdf",
    document_category: "generated",
    document_name:     `WPS ${wps.wps_no} ${wps.revision}`,
    source_module:     "wps_master",
    is_latest:         true,
    is_active:         true,
    uploaded_by:       user.id,
  })

  return NextResponse.json({ storagePath }, { headers: { "Cache-Control": "no-store" } })
}
