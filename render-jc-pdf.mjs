// Render the Job Card PDF using the REAL production template, fed with the
// seeded live data. Transpiles the TSX template at runtime via the TS compiler.
import dotenv from "dotenv"; import path from "path"; import fs from "fs"
import { createRequire } from "module"
const require = createRequire(import.meta.url)
const ts = require("typescript")
dotenv.config({ path: path.resolve("D:/ERP_RRenginerring/valvetrack/.env.local") })

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL, ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const JC = process.argv[2] || "583f405c-af02-42ce-b314-faf8add69c2c"
let TOKEN = null
async function login() {
  const r = await fetch(`${URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email: "admin@raghaveng.com", password: "Test@123" }) })
  const j = await r.json(); TOKEN = j.access_token
}
async function get(pathq) {
  const r = await fetch(`${URL}/rest/v1/${pathq}`, { headers: { apikey: ANON, Authorization: `Bearer ${TOKEN}` } })
  const j = await r.json(); if (!r.ok) { console.error("GET", pathq, JSON.stringify(j)); process.exit(1) }
  return j
}

// ── Transpile the TSX template → temp .mjs ──
const tplPath = path.resolve("D:/ERP_RRenginerring/valvetrack/src/components/job-cards/job-card-pdf-template.tsx")
const src = fs.readFileSync(tplPath, "utf8")
const out = ts.transpileModule(src, { compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText
const tmp = path.resolve("D:/ERP_RRenginerring/valvetrack/.jc-tpl.mjs")
fs.writeFileSync(tmp, out)

async function main() {
  await login()
  const [jc] = await get(`job_cards?id=eq.${JC}&select=*,client:clients(*)`)
  const executions = await get(`process_executions?job_card_id=eq.${JC}&select=*,consumable:consumable_master(id,brand,product_name,aws_class,size,batch_no,manufacturing_date,expiry_date),machine:machines(id,machine_code,name)&order=sequence_no.asc.nullslast,started_at.asc`)
  const ndeRecords = await get(`nde_records?job_card_id=eq.${JC}&select=*&order=created_at.asc`)
  const airTests = await get(`air_test_records?job_card_id=eq.${JC}&select=*&order=created_at.asc`)
  const dimensionReports = await get(`dimension_reports?job_card_id=eq.${JC}&select=*&order=created_at.asc`)
  const dispatches = await get(`dispatches?job_card_id=eq.${JC}&select=*&order=created_at.asc`)
  const runJobs = await get(`pwht_run_jobs?job_card_id=eq.${JC}&select=pwht_run:pwht_runs(*)`)
  const pwhtRuns = runJobs.map(r => r.pwht_run).filter(Boolean)

  const { JobCardPdfTemplate } = await import("file://" + tmp)
  const React = (await import("react")).default
  const { renderToBuffer } = await import("@react-pdf/renderer")

  const element = React.createElement(JobCardPdfTemplate, {
    jobCard: jc, client: jc.client, executions, ndeRecords, airTests, dimensionReports, dispatches, pwhtRuns,
  })
  const buffer = await renderToBuffer(element)
  const outPath = path.resolve("D:/ERP_RRenginerring/valvetrack/job-card-seeded.pdf")
  fs.writeFileSync(outPath, buffer)
  fs.unlinkSync(tmp)
  console.log("✓ PDF written:", outPath, buffer.length, "bytes")
}
main().catch(e => { console.error("FATAL", e); process.exit(1) })
