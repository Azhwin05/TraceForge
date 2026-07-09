import dotenv from "dotenv"; import path from "path"
dotenv.config({ path: path.resolve("D:/ERP_RRenginerring/valvetrack/.env.local") })
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL, ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const JC = "583f405c-af02-42ce-b314-faf8add69c2c"
let TOKEN = null
function die(l, m) { console.error(`✗ ${l}:`, m); process.exit(1) }
async function login() {
  const r = await fetch(`${URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email: "admin@raghaveng.com", password: "Test@123" }) })
  const j = await r.json(); if (!r.ok) die("login", JSON.stringify(j)); TOKEN = j.access_token; return j.user.id
}
async function insert(table, row) {
  const r = await fetch(`${URL}/rest/v1/${table}`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify(row) })
  const j = await r.json(); if (!r.ok) die(`insert ${table}`, JSON.stringify(j)); return Array.isArray(j) ? j[0] : j
}
const STAGES = ["Milling", "Soft / Pre Machining", "Hard Facing"], MEAS = ["GSM", "PSM", "OAL", "OD", "ID", "Top / OAH"]
function grid() { const rows = []; for (const s of STAGES) for (const m of MEAS) rows.push({ dimension_name: `${s} — ${m}`, required_dimension: "—", tolerance: "±0.1", actual_value_1: "N/A", actual_value_2: "", actual_value_3: "", pass_fail: "na", remarks: "" }); return rows }
async function main() {
  const uid = await login()
  // Skip if a dimension report already exists for this JC
  const chk = await fetch(`${URL}/rest/v1/dimension_reports?job_card_id=eq.${JC}&select=id`, { headers: { apikey: ANON, Authorization: `Bearer ${TOKEN}` } })
  const existing = await chk.json()
  if (!existing.length) {
    const dims = [...grid(), { dimension_name: "Bore Diameter", required_dimension: "150.00", tolerance: "±0.05", actual_value_1: "150.02", actual_value_2: "150.01", actual_value_3: "150.03", pass_fail: "pass", remarks: "OK" }]
    await insert("dimension_reports", {
      job_card_id: JC, created_by: uid, dimension_status: "draft", result_status: "accepted", overall_result: "pass",
      required_dimensions: {}, tolerances: {}, sample_readings: {},
      report_number: "DIM-RRE-2026-0011", report_date: "2025-05-20", drawing_number: "U6129/22/4",
      inspected_by: "R. Nagaraj", approved_by: "S. Muthu", visual_satisfactory: true,
      machine_name: "CNC-VTL-01", operator: "K. Selvam", drawing_size: "A2",
      weld_deposit_thickness_before: "14mm", weld_deposit_thickness_after: "N/A", dimensions: dims,
    })
    console.log("✓ Dimension report + machining grid (19 rows)")
  } else console.log("• Dimension report already present")
  const chk2 = await fetch(`${URL}/rest/v1/dispatches?job_card_id=eq.${JC}&select=id`, { headers: { apikey: ANON, Authorization: `Bearer ${TOKEN}` } })
  if (!(await chk2.json()).length) {
    await insert("dispatches", { job_card_id: JC, dc_number: "DC-2025-0142", dispatch_date: "2025-05-30", vehicle_details: "TN-01-AB-1234", remarks: "Delivered to KSB Chennai", created_by: uid })
    console.log("✓ Dispatch")
  } else console.log("• Dispatch already present")
  console.log("\n=== SEED FINISHED for", JC, "===")
}
main().catch((e) => { console.error("FATAL", e); process.exit(1) })
