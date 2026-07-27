import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth"
import { buttonVariants } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { CustomerItemsForm } from "@/components/inventory/customer-items-form"
import type { UserRole } from "@/types/database"

export default async function NewCustomerItemsPage({
  params,
}: {
  params: { id: string }
}) {
  const { supabase, profile } = await requireAuth()
  const userRole = (profile?.role ?? "operator") as UserRole
  if (userRole !== "admin") redirect(`/inventory/customers/${params.id}`)

  const { data: customer, error } = await supabase
    .from("clients")
    .select("id, name")
    .eq("id", params.id)
    .single()

  if (error || !customer) notFound()

  return (
    <div className="p-6 max-w-4xl space-y-4">
      <div className="flex items-center gap-2">
        <Link href={`/inventory/customers/${customer.id}`} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}>
          <ChevronLeft className="h-4 w-4" /> {customer.name}
        </Link>
      </div>
      <div>
        <h1 className="text-xl font-bold">Add Items — {customer.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add as many items as you like in one go. If details for an item aren&rsquo;t ready yet,
          check &ldquo;Add details later&rdquo; and just give it a name — you can complete it any time.
        </p>
      </div>
      <CustomerItemsForm clientId={customer.id} />
    </div>
  )
}
