import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth"
import { ConsumableForm } from "@/components/master-data/consumable-form"
import { consumableToFormValues } from "@/lib/form-mappers/consumable-master"
import { buttonVariants } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"

export default async function EditConsumablePage({
  params,
}: {
  params: { id: string }
}) {
  const { supabase, profile } = await requireAuth()

  if (!["admin", "engineer"].includes(profile?.role ?? "")) {
    redirect(`/master-data/consumables/${params.id}`)
  }

  const { data: record, error } = await supabase
    .from("consumable_master")
    .select("*")
    .eq("id", params.id)
    .single()

  if (error || !record) notFound()

  const defaultValues = consumableToFormValues(record)

  return (
    <div className="p-6 max-w-3xl space-y-4">
      <div className="flex items-center gap-2">
        <Link
          href={`/master-data/consumables/${params.id}`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}
        >
          <ChevronLeft className="h-4 w-4" /> {record.product_name}
        </Link>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">Edit Consumable</h1>
      <ConsumableForm mode="edit" consumableId={record.id} defaultValues={defaultValues} />
    </div>
  )
}
