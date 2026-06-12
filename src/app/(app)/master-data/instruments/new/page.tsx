import { redirect } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth"
import { InstrumentForm } from "@/components/master-data/instrument-form"
import { buttonVariants } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"

export default async function NewInstrumentPage() {
  const { profile } = await requireAuth()

  if (!["admin", "qa"].includes(profile?.role ?? "")) {
    redirect("/master-data/instruments")
  }

  return (
    <div className="p-6 max-w-3xl space-y-4">
      <div className="flex items-center gap-2">
        <Link
          href="/master-data/instruments"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}
        >
          <ChevronLeft className="h-4 w-4" /> Instruments
        </Link>
      </div>
      <h1 className="text-2xl font-bold tracking-tight">New Instrument</h1>
      <InstrumentForm mode="create" />
    </div>
  )
}
