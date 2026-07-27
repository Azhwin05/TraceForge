import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth"
import { InstrumentForm } from "@/components/master-data/instrument-form"
import { instrumentToFormValues } from "@/lib/form-mappers/instrument-master"
import { buttonVariants } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"

export default async function EditInstrumentPage({
  params,
}: {
  params: { id: string }
}) {
  const { supabase, profile } = await requireAuth()

  if (!["admin", "qa"].includes(profile?.role ?? "")) {
    redirect(`/master-data/instruments/${params.id}`)
  }

  const { data: record, error } = await supabase
    .from("instrument_master")
    .select("*")
    .eq("id", params.id)
    .single()

  if (error || !record) notFound()

  const defaultValues = instrumentToFormValues(record)

  return (
    <div className="p-6 max-w-3xl space-y-4">
      <div className="flex items-center gap-2">
        <Link
          href={`/master-data/instruments/${params.id}`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}
        >
          <ChevronLeft className="h-4 w-4" /> {record.instrument_name}
        </Link>
      </div>
      <h1 className="text-2xl font-bold tracking-tight">Edit Instrument</h1>
      <InstrumentForm mode="edit" instrumentId={record.id} defaultValues={defaultValues} />
    </div>
  )
}
