// Full-workflow Job Card seed via PostgREST (no supabase-js → no WS dependency).
import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve("D:/ERP_RRenginerring/valvetrack/.env.local") })

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!URL || !ANON) { console.error("Missing SUPABASE env"); process.exit(1) }

let TOKEN = null
function die(label, msg) { console.error(`✗ ${label}:`, msg); process.exit(1) }

async function login() {
  const r = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@raghaveng.com", password: "Test@123" }),
  })
  const j = await r.json()
  if (!r.ok) die("login", JSON.stringify(j))
  TOKEN = j.access_token
  return j.user.id
}

async function insert(table, row) {
  const r = await fetch(`${URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(row),
  })
  const j = await r.json()
  if (!r.ok) die(`insert ${table}`, JSON.stringify(j))
  return Array.isArray(j) ? j[0] : j
}

async function patch(table, filter, row) {
  const r = await fetch(`${URL}/rest/v1/${table}?${filter}`, {
    method: "PATCH",
    headers: { apikey: ANON, Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(row),
  })
  const j = await r.json()
  if (!r.ok) die(`patch ${table}`, JSON.stringify(j))
  return Array.isArray(j) ? j[0] : j
}

async function rpc(fn, args = {}) {
  const r = await fetch(`${URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  })
  const j = await r.json()
  if (!r.ok) die(`rpc ${fn}`, JSON.stringify(j))
  return j
}

async function get(pathq) {
  const r = await fetch(`${URL}/rest/v1/${pathq}`, {
    headers: { apikey: ANON, Authorization: `Bearer ${TOKEN}` },
  })
  const j = await r.json()
  if (!r.ok) die(`get ${pathq}`, JSON.stringify(j))
  return j
}

const MACHINING_STAGES = ["Milling", "Soft / Pre Machining", "Hard Facing"]
const MACHINING_MEASURES = ["GSM", "PSM", "OAL", "OD", "ID", "Top / OAH"]
function machiningGridRows() {
  const rows = []
  for (const stage of MACHINING_STAGES)
    for (const m of MACHINING_MEASURES)
      rows.push({ dimension_name: `${stage} — ${m}`, required_dimension: "—", tolerance: "±0.1", actual_value_1: "N/A", actual_value_2: "", actual_value_3: "", pass_fail: "na", remarks: "" })
  return rows
}

async function main() {
  const uid = await login()
  console.log("✓ Logged in as admin", uid)

  const client = await insert("clients", { name: "KSB — Seed Demo " + Date.now().toString().slice(-5), contact_name: "P. Gunasekaran", contact_email: "buyer@ksb.example", contact_phone: "9876543210", address: "Chennai" })
  console.log("✓ Client", client.name)

  const jcNumber = await rpc("generate_jc_number")
  const jc = await insert("job_cards", {
    jc_number: jcNumber, client_id: client.id,
    nbdn_number: "TN25/0002/" + Date.now().toString().slice(-4),
    po_number: "4507514470", description: "20 900 WCB Body — Overlay + Machining",
    drawing_number: "U6129/22/4", heat_number: "9752", part_number: "05439662",
    quantity: 5, process_type: ["welding", "machining"], received_date: "2025-05-11", due_date: "2025-05-28", status: "created", created_by: uid,
  })
  console.log("✓ Job card", jc.jc_number, jc.id)

  await patch("job_cards", `id=eq.${jc.id}`, {
    product_group: "CBE", buyer: "P. Gunasekaran", material_code: "01N0",
    valve_size_class: '6" 900#', valve_type_component: "Body",
    base_material: "WCB", overlay_material: "E8018-B2", base_material_grade: "E8018-B2",
    regularization: "WPS/RE/301", ring: "FIIV", ring_heat_no: "A274", mpi_rt_no: "M000216",
    welding_process: "SMAW", punching_details: "RE/FIIV/DPOR/SROR", other_details: "RAG7208/25-26",
    production_checked_by: "Gopi Krishnan", production_checked_date: "2025-05-19",
    qc_checked_by: "R. Nagaraj", qc_checked_date: "2025-05-20",
    stores_checked_by: "S. Muthu", stores_checked_date: "2025-05-21",
  })
  console.log("✓ Advanced details + sign-off + new fields")

  await insert("wps_qualifications", { job_card_id: jc.id, wps_number: "WPS/RE/301", revision: "Rev 0", approval_status: "approved", approved_by: uid, approved_at: new Date().toISOString(), uploaded_by: uid })
  console.log("✓ WPS qualification")

  const consumable = await insert("consumable_master", {
    brand: "D&H Secheron", product_name: "Chromet 8018-B2", type: "electrode",
    aws_class: "E8018-B2", size: "4.0mm", manufacturer: "D&H Secheron",
    batch_no: "D042934547", manufacturing_date: "2025-04-07", expiry_date: "2027-04-06", created_by: uid,
  })
  console.log("✓ Consumable master", consumable.brand)

  // Build the operation routing (Pre-Machining → Welding → … → Deburring) via the RPC,
  // then populate each operation with machine, operator, qty and status.
  const seededCount = await rpc("seed_process_operations", { p_job_card_id: jc.id })
  const ops = await get(`process_executions?job_card_id=eq.${jc.id}&select=id,operation_type,sequence_no&order=sequence_no.asc`)
  const machines = await get(`machines?select=id,machine_code&is_active=eq.true`)
  const machineByCode = Object.fromEntries(machines.map((m) => [m.machine_code, m.id]))
  const now = new Date().toISOString()
  const MACHINE_FOR_OP = {
    pre_machining: "CNC-VTL-01", welding: "WLD-01", final_machining: "CNC-VTL-01",
    milling: "MILL-01", slitting: "SLOT-01", deburring: "CNC-VTL-01",
  }
  for (const op of ops) {
    const base = {
      machine_id: machineByCode[MACHINE_FOR_OP[op.operation_type]] ?? null,
      planned_qty: 5, completed_qty: 5, rejected_qty: 0,
      status: "completed", started_at: now, completed_at: now,
    }
    if (op.operation_type === "welding") {
      await patch("process_executions", `id=eq.${op.id}`, {
        ...base,
        welder_name: "Gopi Krishnan", welder_id: "W-001", weld_date: "2025-05-19",
        weld_metal: "E8018-B2", weld_height: 4, consumable_batch: "D042934547",
        consumable_master_id: consumable.id,
        weld_qty_planned: 5, weld_qty_actual: 5,
        amps_required: "140-180", amps_actual: 170, volts_required: "24-30", volts_actual: 26,
        pre_heat_temp_planned: 150, pre_heat_temp: 145,
        inter_pass_temp_planned: 300, inter_pass_temp: 297,
        // post_heat / gas_flow / feed_rate left null — SMAW has no gas/wire-feed and this WPS
        // doesn't call for post-heat; matches the paper traveller's dashes.
        travel_speed_planned: 130, travel_speed: 142,
        polarity_planned: "DCRP", polarity: "DCRP",
      })
    } else {
      await patch("process_executions", `id=eq.${op.id}`, {
        ...base, welder_name: "K. Selvam",
      })
    }
  }
  console.log("✓ Operation routing (" + seededCount + " ops) — machines, qty, welding params")

  await insert("nde_records", {
    job_card_id: jc.id, nde_type: "lpt", result: "accepted",
    report_number: "WPF/909", nde_number: "003 / Rev.07", inspection_date: "2025-05-19",
    inspected_by: "R. Nagaraj", observer: "S. Kumar", stage_of_test: "Post weld",
    test_coupon_number: "TC-14", deposit_thickness: "14mm", hardness_requirement: "OK",
    duration: "10 Min", type_of_penetrant: "Type II",
    chemicals_used_json: [
      { chemical_type: "penetrant", chemical_name: "24K32", manufacturer: "Magnaflux", batch_no: "24K32", expiry_date: "2029-10-01" },
      { chemical_type: "cleaner",   chemical_name: "22K01", manufacturer: "Magnaflux", batch_no: "22K01", expiry_date: "2029-10-01" },
      { chemical_type: "developer", chemical_name: "22K16", manufacturer: "Magnaflux", batch_no: "22K16", expiry_date: "2029-10-01" },
    ],
    created_by: uid,
  })
  console.log("✓ NDE record + chemicals")

  await insert("air_test_records", { job_card_id: jc.id, tester_name: "R. Nagaraj", pressure: "6 bar", duration: "10 min", result: "pass", notes: "No leakage observed", created_by: uid })
  console.log("✓ Air test")

  const pwht = await insert("pwht_runs", {
    chart_number: "A816", furnace_id: "F-1", operator_name: "Gopi Krishnan", process_name: "Stress Relieving",
    loading_temp: 170, loading_time: 21, soaking_temp: 700, soaking_time: 240,
    unloading_temp: 175, unloading_time: 9, rate_of_heating: 100, date_of_cycle: "2025-05-19", created_by: uid,
  })
  await insert("pwht_run_jobs", { pwht_run_id: pwht.id, job_card_id: jc.id, status: "pending", is_final: true })
  console.log("✓ PWHT run + link")

  const dims = [...machiningGridRows(), { dimension_name: "Bore Diameter", required_dimension: "150.00", tolerance: "±0.05", actual_value_1: "150.02", actual_value_2: "150.01", actual_value_3: "150.03", pass_fail: "pass", remarks: "OK" }]
  await insert("dimension_reports", {
    job_card_id: jc.id, created_by: uid, dimension_status: "draft", result_status: "accepted", overall_result: "pass",
    required_dimensions: {}, tolerances: {}, sample_readings: {},
    report_number: "DIM-" + jc.jc_number, report_date: "2025-05-20", drawing_number: "U6129/22/4",
    inspected_by: "R. Nagaraj", approved_by: "S. Muthu", visual_satisfactory: true,
    machine_name: "CNC-VTL-01", operator: "K. Selvam", drawing_size: "A2",
    weld_deposit_thickness_before: "14mm", weld_deposit_thickness_after: "N/A", dimensions: dims,
  })
  console.log("✓ Dimension report + machining grid (" + dims.length + " rows)")

  await insert("dispatches", { job_card_id: jc.id, dc_number: "DC-2025-" + Date.now().toString().slice(-6), dispatch_date: "2025-05-30", vehicle_details: "TN-01-AB-1234", remarks: "Delivered to KSB Chennai", created_by: uid })
  console.log("✓ Dispatch")

  console.log("\n=== SEED COMPLETE ===")
  console.log("JOB_CARD_ID=" + jc.id)
  console.log("JC_NUMBER=" + jc.jc_number)
}
main().catch((e) => { console.error("FATAL", e); process.exit(1) })
