import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { STORAGE_BUCKET } from "@/lib/documents/storage-utils"
import { isValidUUID } from "@/lib/security"

// GET /api/pwht-runs/[id]/chart-pdf-url — signed URL for the generated chart PDF
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!isValidUUID(id)) {
    return NextResponse.json({ error: "Invalid PWHT run ID" }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: run } = await supabase
    .from("pwht_runs")
    .select("storage_path")
    .eq("id", id)
    .single()

  const path = (run as { storage_path: string | null } | null)?.storage_path
  if (!path) return NextResponse.json({ error: "No PDF generated yet" }, { status: 404 })

  const { data } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, 3600)

  return NextResponse.json({ url: data?.signedUrl ?? null })
}
