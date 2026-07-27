import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth"
import { ItemMasterForm } from "@/components/inventory/item-master-form"
import { itemToFormValues } from "@/lib/form-mappers/item-master"
import { buttonVariants } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"

export default async function EditItemMasterPage({
  params,
}: {
  params: { id: string }
}) {
  const { supabase, profile } = await requireAuth()

  if (!["admin", "engineer"].includes(profile?.role ?? "")) {
    redirect(`/inventory/items/${params.id}`)
  }

  const { data: record, error } = await supabase
    .from("item_master")
    .select("*")
    .eq("id", params.id)
    .single()

  if (error || !record) notFound()

  const defaultValues = itemToFormValues(record)

  return (
    <div className="p-6 max-w-3xl space-y-4">
      <div className="flex items-center gap-2">
        <Link href={`/inventory/items/${params.id}`} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}>
          <ChevronLeft className="h-4 w-4" /> {record.item_name}
        </Link>
      </div>
      <h1 className="text-2xl font-bold tracking-tight">Edit Item</h1>
      <ItemMasterForm mode="edit" itemId={record.id} defaultValues={defaultValues} />
    </div>
  )
}
