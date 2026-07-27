import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { CustomerItemsRecycleBinClient, type DeletedCustomerItem } from "@/components/inventory/customer-items-recycle-bin-client"

export default async function CustomerItemsRecycleBinPage() {
  const { supabase, profile } = await requireAuth()
  if (profile.role !== "admin") redirect("/inventory/customers")

  const { data } = await supabase
    .from("customer_items")
    .select("id, item_name, status, deleted_at, purge_at, client:clients(id, name), deleter:profiles!deleted_by(full_name)")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false })

  return (
    <div className="p-6">
      <CustomerItemsRecycleBinClient items={(data ?? []) as unknown as DeletedCustomerItem[]} />
    </div>
  )
}
