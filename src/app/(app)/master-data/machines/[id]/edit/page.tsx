import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth"
import { MachineForm, machineToFormValues } from "@/components/master-data/machine-form"
import { buttonVariants } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"

export default async function EditMachinePage({
  params,
}: {
  params: { id: string }
}) {
  const { supabase, profile } = await requireAuth()

  if (!["admin", "engineer"].includes(profile?.role ?? "")) {
    redirect(`/master-data/machines/${params.id}`)
  }

  const { data: record, error } = await supabase
    .from("machines")
    .select("*")
    .eq("id", params.id)
    .single()

  if (error || !record) notFound()

  const defaultValues = machineToFormValues(record)

  return (
    <div className="p-6 max-w-3xl space-y-4">
      <div className="flex items-center gap-2">
        <Link
          href={`/master-data/machines/${params.id}`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}
        >
          <ChevronLeft className="h-4 w-4" /> {record.name}
        </Link>
      </div>
      <h1 className="text-2xl font-bold tracking-tight">Edit Machine</h1>
      <MachineForm mode="edit" machineId={record.id} defaultValues={defaultValues} />
    </div>
  )
}
