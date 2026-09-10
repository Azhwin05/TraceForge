import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { must } from "@/lib/db"
import { ClientDocumentUploadForm } from "@/components/client-documents/client-document-upload-form"
import { ClientDocumentsList, type ClientDocRow } from "@/components/client-documents/client-documents-list"

export const metadata = { title: "Client Documents — ValveTrack" }

export default async function ClientDocumentsPage() {
  const { supabase, profile } = await requireAuth()
  if (profile.role !== "admin") redirect("/dashboard")

  const [clientsRes, docsRes] = await Promise.all([
    supabase.from("clients").select("id, name").order("name"),
    supabase
      .from("client_documents")
      // client_documents has TWO FKs to profiles (uploaded_by, removed_by), so
      // the embed must name the constraint explicitly — a bare
      // profiles!uploaded_by is ambiguous and PostgREST rejects the whole
      // query with PGRST201 (the same failure mode fixed earlier on
      // portal_user_clients/profiles: it renders as an empty list, not an
      // error, unless the query result is checked with must()).
      .select("id, title, description, label, bill_date, file_name, file_size_bytes, is_active, uploaded_at, clients(name), uploader:profiles!client_documents_uploaded_by_fkey(full_name)")
      .order("uploaded_at", { ascending: false })
      .limit(200),
  ])

  const clients = must(clientsRes, "clients")
  const records = must(docsRes, "client documents")

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Client Documents</h1>
        <p className="text-sm text-muted-foreground">
          Send a PDF directly to one client — they&rsquo;ll see it in their portal under Documents.
        </p>
      </div>

      <ClientDocumentUploadForm clients={(clients ?? []) as { id: string; name: string }[]} />

      <div>
        <h2 className="mb-3 font-semibold">Sent Documents</h2>
        <ClientDocumentsList records={(records ?? []) as unknown as ClientDocRow[]} />
      </div>
    </div>
  )
}
