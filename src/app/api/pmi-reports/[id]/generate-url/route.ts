import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { STORAGE_BUCKET } from "@/lib/documents/storage-utils"
import type { PmiReport } from "@/types/database"

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: report } = await supabase
    .from("pmi_reports")
    .select("generated_pdf_path")
    .eq("id", params.id)
    .single()

  const path = (report as Pick<PmiReport, "generated_pdf_path"> | null)?.generated_pdf_path
  if (!path) return NextResponse.json({ error: "No PDF generated yet" }, { status: 404 })

  const { data: urlData } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, 3600)

  return NextResponse.json({ url: urlData?.signedUrl ?? null })
}
