import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { STORAGE_BUCKET } from "@/lib/documents/storage-utils"

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: report } = await supabase
    .from("dimension_reports")
    .select("generated_pdf_path")
    .eq("id", params.id)
    .single()

  const storagePath = (report as { generated_pdf_path?: string | null } | null)?.generated_pdf_path
  if (!storagePath) {
    return NextResponse.json({ error: "No PDF generated yet" }, { status: 404 })
  }

  const { data } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, 3600)

  return NextResponse.json({ url: data?.signedUrl ?? null })
}
