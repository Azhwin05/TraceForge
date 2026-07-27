import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { JobCardFullForm } from "@/components/job-cards/job-card-full-form"
import type { Client } from "@/types/database"
import type { FullJobCardInput } from "@/lib/validations/job-card"

export const metadata = { title: "Edit Job Card — ValveTrack" }

// Nulls → undefined; date-ish strings → YYYY-MM-DD for <input type="date">.
const str = (v: unknown): string | undefined => (v == null ? undefined : String(v))
const day = (v: unknown): string | undefined => (v == null ? undefined : String(v).slice(0, 10))
const nOrU = (v: unknown): number | undefined => (v == null ? undefined : Number(v))

export default async function EditJobCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: jc }, { data: clients }] = await Promise.all([
    supabase.from("job_cards").select("*").eq("id", id).single(),
    supabase.from("clients").select("*").order("name"),
  ])
  if (!jc) notFound()
  if (jc.deleted_at) notFound()

  const { data: rows } = await supabase
    .from("process_executions")
    .select("*")
    .eq("job_card_id", id)
    .or("operation_type.eq.welding,process_type.eq.welding")
    .order("sequence_no", { ascending: true, nullsFirst: false })
  const w = rows?.find((r) => r.operation_type === "welding") ?? rows?.[0] ?? null

  const defaults: Partial<FullJobCardInput> = {
    client_id: jc.client_id,
    nbdn_number: jc.nbdn_number,
    description: jc.description,
    quantity: jc.quantity,
    process_type: jc.process_type,
    received_date: day(jc.received_date)!,
    po_number: str(jc.po_number),
    drawing_number: str(jc.drawing_number),
    heat_number: str(jc.heat_number),
    part_number: str(jc.part_number),
    due_date: day(jc.due_date),
    product_group: str(jc.product_group),
    buyer: str(jc.buyer),
    material_code: str(jc.material_code),
    valve_size_class: str(jc.valve_size_class),
    valve_type_component: str(jc.valve_type_component),
    base_material: str(jc.base_material),
    overlay_material: str(jc.overlay_material),
    base_material_grade: str(jc.base_material_grade),
    regularization: str(jc.regularization),
    wps_no: str(jc.wps_no),
    ring: str(jc.ring),
    ring_heat_no: str(jc.ring_heat_no),
    mpi_rt_no: str(jc.mpi_rt_no),
    welding_process: str(jc.welding_process),
    consumable_brand: str(jc.consumable_brand),
    consumable_aws_class: str(jc.consumable_aws_class),
    consumable_size: str(jc.consumable_size),
    consumable_batch_no: str(jc.consumable_batch_no),
    consumable_mfg_date: day(jc.consumable_mfg_date),
    weld_deposit_thickness_before: str(jc.weld_deposit_thickness_before),
    weld_deposit_thickness_after: str(jc.weld_deposit_thickness_after),
    punching_details: str(jc.punching_details),
    despatch_dc_no: str(jc.despatch_dc_no),
    despatch_date: day(jc.despatch_date),
    other_details: str(jc.other_details),
    production_checked_by: str(jc.production_checked_by),
    production_checked_date: day(jc.production_checked_date),
    qc_checked_by: str(jc.qc_checked_by),
    qc_checked_date: day(jc.qc_checked_date),
    stores_checked_by: str(jc.stores_checked_by),
    stores_checked_date: day(jc.stores_checked_date),
    // Welding details from the welding operation row
    welder_name: str(w?.welder_name),
    welder_id: str(w?.welder_id),
    weld_metal: str(w?.weld_metal),
    weld_height: nOrU(w?.weld_height),
    weld_qty_planned: nOrU(w?.weld_qty_planned),
    weld_qty_actual: nOrU(w?.weld_qty_actual),
    weld_date: day(w?.weld_date),
    pre_heat_temp_planned: nOrU(w?.pre_heat_temp_planned),
    pre_heat_temp: nOrU(w?.pre_heat_temp),
    inter_pass_temp_planned: nOrU(w?.inter_pass_temp_planned),
    inter_pass_temp: nOrU(w?.inter_pass_temp),
    post_heat_temp_planned: nOrU(w?.post_heat_temp_planned),
    post_heat_temp: nOrU(w?.post_heat_temp),
    amps_required: str(w?.amps_required),
    amps_actual: nOrU(w?.amps_actual),
    volts_required: str(w?.volts_required),
    volts_actual: nOrU(w?.volts_actual),
    travel_speed_planned: nOrU(w?.travel_speed_planned),
    travel_speed: nOrU(w?.travel_speed),
    gas_flow_rate_planned: nOrU(w?.gas_flow_rate_planned),
    gas_flow_rate: nOrU(w?.gas_flow_rate),
    consumable_feed_rate_planned: nOrU(w?.consumable_feed_rate_planned),
    consumable_feed_rate: nOrU(w?.consumable_feed_rate),
    polarity_planned: str(w?.polarity_planned),
    polarity: str(w?.polarity),
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <Link href={`/job-cards/${id}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Job Card
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Edit Job Card · {jc.jc_number}</h1>
        <p className="text-sm text-muted-foreground mt-1">Update any Job Card field, including the welding details.</p>
      </div>

      <JobCardFullForm
        initialClients={(clients ?? []) as Client[]}
        mode="edit"
        jobCardId={id}
        defaultValues={defaults}
      />
    </div>
  )
}
