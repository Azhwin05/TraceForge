import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth"
import { isValidUUID } from "@/lib/security"

// GET /api/dossiers/[id]/generate-url?type=index|zip
// Returns a signed URL for the dossier index PDF or ZIP pack.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!isValidUUID(id)) {
    return NextResponse.json({ error: "Invalid dossier ID" }, { status: 400 })
  }

  try {
    await requireAuth()
    const supabase = await createClient()

    const fileType = req.nextUrl.searchParams.get("type") ?? "index"
    if (fileType !== "index" && fileType !== "zip") {
      return NextResponse.json({ error: "type must be 'index' or 'zip'" }, { status: 400 })
    }

    const { data: dossier } = await supabase
      .from("customer_dossiers")
      .select("generated_index_pdf_path, generated_zip_path")
      .eq("id", id)
      .single()

    if (!dossier) return NextResponse.json({ error: "Dossier not found" }, { status: 404 })

    const storagePath =
      fileType === "index"
        ? (dossier as { generated_index_pdf_path: string | null }).generated_index_pdf_path
        : (dossier as { generated_zip_path: string | null }).generated_zip_path

    if (!storagePath) {
      return NextResponse.json({ error: "File not yet generated" }, { status: 404 })
    }

    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(storagePath, 3600)

    if (error || !data?.signedUrl) {
      return NextResponse.json({ error: "Could not generate signed URL" }, { status: 500 })
    }

    return NextResponse.json({ url: data.signedUrl })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
