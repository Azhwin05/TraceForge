import { FileText } from "lucide-react"
import { requireCustomer } from "@/lib/auth"
import { must } from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Badge } from "@/components/ui/badge"
import { ClientDocumentDownloadButton } from "@/components/portal/client-document-download-button"
import { formatFileSize } from "@/lib/documents/storage-utils"

export const metadata = { title: "Documents — ValveTrack" }

type ClientDocRow = {
  id: string
  title: string
  description: string | null
  label: string | null
  bill_date: string | null
  file_name: string
  file_size_bytes: number | null
  uploaded_at: string
}

/**
 * Documents pushed directly by admin to this customer's company — independent
 * of any job card. RLS on client_documents scopes this to the caller's own
 * companies and to is_active rows only; must() still surfaces a genuine
 * query failure rather than letting it look like "no documents".
 */
export default async function PortalDocumentsPage() {
  const { supabase } = await requireCustomer()

  const docsRes = await supabase
    .from("client_documents")
    .select("id, title, description, label, bill_date, file_name, file_size_bytes, uploaded_at")
    .order("uploaded_at", { ascending: false })

  const docs = must(docsRes, "your documents") as ClientDocRow[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Documents</h1>
        <p className="text-sm text-muted-foreground">Documents shared with you by Raghav Engineering.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {docs.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No documents yet"
              description="Test certificates, inspection reports and dispatch paperwork appear here as Raghav Engineering shares them with you."
              className="border-0 bg-transparent"
            />
          ) : (
            <div className="divide-y divide-border">
              {docs.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-4 px-4 py-3.5">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="font-medium">{d.title}</span>
                      {d.label && <Badge className="bg-info-surface text-info">{d.label}</Badge>}
                    </div>
                    {d.description && <p className="text-xs text-muted-foreground">{d.description}</p>}
                    <p className="text-xs text-muted-foreground">
                      {d.file_name}
                      {d.file_size_bytes != null && ` (${formatFileSize(d.file_size_bytes)})`}
                      {" · uploaded "}
                      {new Date(d.uploaded_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      {d.bill_date && (
                        <>
                          {" · Bill date "}
                          {new Date(d.bill_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </>
                      )}
                    </p>
                  </div>
                  <ClientDocumentDownloadButton documentId={d.id} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
