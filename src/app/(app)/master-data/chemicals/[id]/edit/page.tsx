import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth"
import { ChemicalForm } from "@/components/master-data/chemical-form"
import { chemicalToFormValues } from "@/lib/form-mappers/chemical-master"
import { buttonVariants } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"

export default async function EditChemicalPage({
  params,
}: {
  params: { id: string }
}) {
  const { supabase, profile } = await requireAuth()

  if (!["admin", "qa"].includes(profile?.role ?? "")) {
    redirect(`/master-data/chemicals/${params.id}`)
  }

  const { data: record, error } = await supabase
    .from("chemical_master")
    .select("*")
    .eq("id", params.id)
    .single()

  if (error || !record) notFound()

  const defaultValues = chemicalToFormValues(record)

  return (
    <div className="p-6 max-w-3xl space-y-4">
      <div className="flex items-center gap-2">
        <Link
          href={`/master-data/chemicals/${params.id}`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}
        >
          <ChevronLeft className="h-4 w-4" /> {record.chemical_name}
        </Link>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">Edit Chemical</h1>
      <ChemicalForm mode="edit" chemicalId={record.id} defaultValues={defaultValues} />
    </div>
  )
}
