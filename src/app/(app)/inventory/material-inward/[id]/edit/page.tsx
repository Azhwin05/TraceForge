import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth"
import { MaterialInwardEditForm } from "@/components/inventory/material-inward-edit-form"
import { buttonVariants } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"

export default async function EditMaterialInwardPage({
  params,
}: {
  params: { id: string }
}) {
  const { supabase, profile } = await requireAuth()

  if (profile?.role !== "admin") {
    redirect(`/inventory/material-inward/${params.id}`)
  }

  const [{ data: record, error }, { data: jobCards }] = await Promise.all([
    supabase.from("material_inward").select("*, suppliers(name), clients(name)").eq("id", params.id).single(),
    supabase.from("job_cards").select("id, jc_number").is("deleted_at", null).order("created_at", { ascending: false }).limit(200),
  ])

  if (error || !record) notFound()

  const sourceLabel = record.source_type === "customer"
    ? (record.clients?.name ?? "Unknown client")
    : (record.suppliers?.name ?? "Unknown supplier")

  return (
    <div className="p-6 max-w-3xl space-y-4">
      <div className="flex items-center gap-2">
        <Link href={`/inventory/material-inward/${params.id}`} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}>
          <ChevronLeft className="h-4 w-4" /> {record.inward_number}
        </Link>
      </div>
      <h1 className="text-2xl font-bold tracking-tight">Edit Material Inward</h1>
      <MaterialInwardEditForm
        record={record}
        sourceLabel={sourceLabel}
        jobCards={jobCards ?? []}
      />
    </div>
  )
}
