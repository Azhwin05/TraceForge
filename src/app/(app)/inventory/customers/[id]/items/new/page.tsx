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
  if (userRole !== "admin" && userRole !== "operator") redirect(`/inventory/customers/${params.id}`)

  const { data: customer, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", params.id)
    .single()

  if (error || !customer) notFound()

  const contactLine = [customer.contact_name, customer.contact_phone, customer.contact_email]
    .filter(Boolean)
    .join(" · ")

  return (
    <div className="p-6 max-w-4xl space-y-4">
      <div className="flex items-center gap-2">
        <Link href={`/inventory/customers/${customer.id}`} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}>
          <ChevronLeft className="h-4 w-4" /> {customer.name}
        </Link>
      </div>
      <div>
        <h1 className="text-xl font-semibold">Add Items — {customer.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add as many items as you like in one go. If details for an item aren&rsquo;t ready yet,
          check &ldquo;Add details later&rdquo; and just give it a name — you can complete it any time.
        </p>
      </div>

      {/* Customer context — visible while filling out items, no need to leave the page. */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-sm font-semibold">{customer.name}</p>
        <dl className="mt-1.5 grid grid-cols-1 gap-x-6 gap-y-0.5 text-xs text-muted-foreground sm:grid-cols-2">
          {contactLine && <div>{contactLine}</div>}
          {customer.address && <div>{customer.address}</div>}
        </dl>
        {!contactLine && !customer.address && (
          <p className="mt-1 text-xs text-muted-foreground">No contact details on file.</p>
        )}
      </div>

      <CustomerItemsForm clientId={customer.id} />
    </div>
  )
}
