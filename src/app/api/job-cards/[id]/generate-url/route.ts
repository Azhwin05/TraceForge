import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { STORAGE_BUCKET } from "@/lib/documents/storage-utils"
import { isValidUUID } from "@/lib/security"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!isValidUUID(id)) {
    return NextResponse.json({ error: "Invalid job card ID" }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: doc } = await supabase
    .from("documents")
    .select("storage_path")
    .eq("entity_type", "job_card")
    .eq("entity_id", id)
    .eq("document_type", "job_card_pdf")
    .eq("is_latest", true)
    .eq("is_active", true)
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const path = (doc as { storage_path: string } | null)?.storage_path
  if (!path) return NextResponse.json({ error: "No PDF generated yet" }, { status: 404 })

  const { data } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, 3600)

  return NextResponse.json({ url: data?.signedUrl ?? null })
}
