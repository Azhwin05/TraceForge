import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getSessionWithProfile } from "@/lib/auth"
import { DossierForm, type DossierDocOption } from "@/components/dossier/dossier-form"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { UserRole, JobCard } from "@/types/database"

export const metadata = { title: "New Dossier — ValveTrack" }

export default async function NewDossierPage({
  searchParams,
}: {
  searchParams: Promise<{ job_card_id?: string }>
}) {
  const sp = await searchParams
  const jobCardId = sp.job_card_id

  const session = await getSessionWithProfile()
  const userRole = (session?.profile?.role ?? "operator") as UserRole
  if (!["admin", "qa"].includes(userRole)) redirect("/dossiers")
  if (!jobCardId) redirect("/job-cards")

  const supabase = await createClient()

  const [{ data: rawJc }, { data: rawDocs }] = await Promise.all([
    supabase
      .from("job_cards")
      .select("*, client:clients(id, name)")
      .eq("id", jobCardId)
      .single(),
    supabase
      .from("documents")
      .select("id, document_name, file_name, document_type, document_category, source_module, version, approval_status, uploaded_at")
      .eq("job_card_id", jobCardId)
      .eq("is_active", true)
      .eq("is_latest", true)
      // Exclude previously generated dossier files
      .not("document_type", "in", '("dossier_index","dossier_zip")')
      .order("uploaded_at", { ascending: false }),
  ])

  if (!rawJc) notFound()

  const jc = rawJc as JobCard & { client?: { name?: string } }
  const jcNumber = jc.jc_number

  // Build default values from job card
  const defaultValues = {
    customer_name:  jc.client?.name ?? null,
    po_number:      jc.po_number ?? null,
    nbdn_number:    jc.nbdn_number ?? null,
    drawing_number: jc.drawing_number ?? null,
    heat_number:    jc.heat_number ?? null,
  }

  const documents = (rawDocs ?? []) as DossierDocOption[]

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2">
        <Link
          href={`/job-cards/${jobCardId}`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}
        >
          <ChevronLeft className="h-4 w-4" /> Back to Job Card
        </Link>
        <span className="text-muted-foreground text-sm">/ New Dossier</span>
      </div>

      <div>
        <h1 className="text-xl font-bold">New Customer Submission Dossier</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Job Card: <span className="font-medium text-foreground font-mono">{jcNumber}</span>
          {jc.client?.name && (
            <> · Customer: <span className="font-medium text-foreground">{jc.client.name}</span></>
          )}
        </p>
      </div>

      <DossierForm
        jobCardId={jobCardId}
        jobCardNumber={jcNumber}
        defaultValues={defaultValues}
        documents={documents}
      />
    </div>
  )
}
