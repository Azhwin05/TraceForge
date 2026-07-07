"use client"

import { useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import {
  ArrowLeft, CheckCircle, XCircle, Send, Lock, Upload, Plus,
  Trash2, FileDown, Thermometer, Flame,
} from "lucide-react"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  addChartReading, deleteChartReading, importChartCsv,
  updatePwhtRunDetails, submitPwhtRun, approvePwhtRun, rejectPwhtRun,
} from "@/app/(app)/pwht-runs/actions"
import type { PwhtRun, PwhtChartReading, PwhtJobStatus, UserRole } from "@/types/database"

type RunJob = {
  id: string
  job_card_id: string
  status: PwhtJobStatus
  job_cards: { jc_number: string; description: string; pwht_required: boolean } | null
}

const APPROVAL_BADGE: Record<string, { label: string; className: string }> = {
  draft:     { label: "Draft",     className: "bg-gray-100 text-gray-700" },
  submitted: { label: "Submitted", className: "bg-blue-100 text-blue-700" },
  approved:  { label: "Approved",  className: "bg-green-100 text-green-700" },
  rejected:  { label: "Rejected",  className: "bg-red-100 text-red-700" },
}

const CHANNEL_COLORS = ["#0070f3", "#e6552e", "#0e9f6e", "#7c3aed", "#d97706", "#0891b2"]

export function PwhtRunDetailClient({
  run,
  readings,
  runJobs,
  userRole,
}: {
  run: PwhtRun
  readings: PwhtChartReading[]
  runJobs: RunJob[]
  userRole: UserRole
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isLocked = run.approval_status === "approved" || run.submitted_to_customer
  const canEdit = ["admin", "engineer"].includes(userRole) && !isLocked
  const canCapture = ["admin", "engineer", "qa"].includes(userRole) && !isLocked
  const canApprove = ["admin", "qa"].includes(userRole)

  // ── Chart data: pivot readings into { time, TC1, TC2, ... } rows ────────────
  const channels = useMemo(
    () => Array.from(new Set(readings.map((r) => r.channel))).sort(),
    [readings]
  )

  const chartData = useMemo(() => {
    const byTime = new Map<string, Record<string, number | string>>()
    for (const r of readings) {
      const t = new Date(r.recorded_at).getTime()
      const key = String(t)
      if (!byTime.has(key)) {
        byTime.set(key, {
          t,
          label: new Date(r.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        })
      }
      byTime.get(key)![r.channel] = Number(r.temperature_c)
    }
    return Array.from(byTime.values()).sort((a, b) => Number(a.t) - Number(b.t))
  }, [readings])

  // ── Detail form state ───────────────────────────────────────────────────────
  const [details, setDetails] = useState({
    component_identification: run.component_identification ?? "",
    wps_number: run.wps_number ?? "",
    cycle_start: run.cycle_start ? run.cycle_start.slice(0, 16) : "",
    cycle_end: run.cycle_end ? run.cycle_end.slice(0, 16) : "",
    notes: run.notes ?? "",
    process_name: run.process_name ?? "",
    loading_time: run.loading_time != null ? String(run.loading_time) : "",
    unloading_time: run.unloading_time != null ? String(run.unloading_time) : "",
  })

  const [newReading, setNewReading] = useState({ recorded_at: "", temperature_c: "", channel: "TC1" })
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")

  // ── Handlers ────────────────────────────────────────────────────────────────
  function saveDetails() {
    startTransition(async () => {
      const res = await updatePwhtRunDetails(run.id, {
        component_identification: details.component_identification,
        wps_number: details.wps_number,
        cycle_start: details.cycle_start ? new Date(details.cycle_start).toISOString() : undefined,
        cycle_end: details.cycle_end ? new Date(details.cycle_end).toISOString() : undefined,
        notes: details.notes,
        process_name: details.process_name,
        loading_time: details.loading_time ? Number(details.loading_time) : null,
        unloading_time: details.unloading_time ? Number(details.unloading_time) : null,
      })
      if (res.error) toast.error(res.error)
      else { toast.success("Run details saved"); router.refresh() }
    })
  }

  function addReading() {
    if (!newReading.recorded_at || !newReading.temperature_c) {
      toast.error("Time and temperature are required")
      return
    }
    startTransition(async () => {
      const res = await addChartReading(run.id, {
        recorded_at: new Date(newReading.recorded_at).toISOString(),
        temperature_c: Number(newReading.temperature_c),
        channel: newReading.channel || "TC1",
      })
      if (res.error) toast.error(res.error)
      else {
        toast.success("Reading added")
        setNewReading((s) => ({ ...s, temperature_c: "" }))
        router.refresh()
      }
    })
  }

  function removeReading(id: string) {
    startTransition(async () => {
      const res = await deleteChartReading(id, run.id)
      if (res.error) toast.error(res.error)
      else router.refresh()
    })
  }

  function onCsvSelected(file: File | null) {
    if (!file) return
    if (file.size > 2_000_000) { toast.error("File too large (max 2 MB)"); return }
    const reader = new FileReader()
    reader.onload = () => {
      startTransition(async () => {
        const res = await importChartCsv(run.id, String(reader.result ?? ""))
        if (res.error) toast.error(res.error)
        else {
          toast.success(`Imported ${res.imported} readings${res.skipped ? ` (${res.skipped} lines skipped)` : ""}`)
          router.refresh()
        }
      })
    }
    reader.readAsText(file)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function doSubmit() {
    startTransition(async () => {
      const res = await submitPwhtRun(run.id)
      if (res.error) toast.error(res.error)
      else { toast.success("Submitted for QA approval"); router.refresh() }
    })
  }

  function doApprove() {
    startTransition(async () => {
      const res = await approvePwhtRun(run.id)
      if (res.error) toast.error(res.error)
      else { toast.success("PWHT run approved"); router.refresh() }
    })
  }

  function doReject() {
    startTransition(async () => {
      const res = await rejectPwhtRun(run.id, rejectReason)
      if (res.error) toast.error(res.error)
      else {
        toast.success("PWHT run rejected")
        setRejectOpen(false)
        setRejectReason("")
        router.refresh()
      }
    })
  }

  async function downloadChartPdf() {
    try {
      const res = await fetch(`/api/pwht-runs/${run.id}/chart-pdf`, { method: "POST" })
      const body = await res.json()
      if (!res.ok) { toast.error(body.error ?? "PDF generation failed"); return }
      const urlRes = await fetch(`/api/pwht-runs/${run.id}/chart-pdf-url`)
      const urlBody = await urlRes.json()
      if (urlBody.url) window.open(urlBody.url, "_blank")
      else toast.error("Could not fetch the generated PDF")
    } catch {
      toast.error("PDF generation failed")
    }
  }

  const badge = APPROVAL_BADGE[run.approval_status] ?? APPROVAL_BADGE.draft

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/pwht-runs">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <Flame className="h-6 w-6 text-orange-500" />
          <div>
            <h1 className="text-xl font-semibold">Chart {run.chart_number}</h1>
            <p className="text-sm text-muted-foreground">
              Furnace {run.furnace_id} · {run.date_of_cycle} · Operator: {run.operator_name}
            </p>
          </div>
          <Badge className={badge.className}>{badge.label}</Badge>
          {run.submitted_to_customer && (
            <Badge className="bg-purple-100 text-purple-700"><Lock className="mr-1 h-3 w-3" />Sent to customer</Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={downloadChartPdf} disabled={readings.length === 0}>
            <FileDown className="mr-1 h-4 w-4" /> Chart PDF
          </Button>
          {canCapture && run.approval_status === "draft" && (
            <Button size="sm" onClick={doSubmit} disabled={isPending || readings.length === 0}>
              <Send className="mr-1 h-4 w-4" /> Submit for approval
            </Button>
          )}
          {canApprove && run.approval_status === "submitted" && (
            <>
              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={doApprove} disabled={isPending}>
                <CheckCircle className="mr-1 h-4 w-4" /> Approve
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setRejectOpen(true)} disabled={isPending}>
                <XCircle className="mr-1 h-4 w-4" /> Reject
              </Button>
            </>
          )}
        </div>
      </div>

      {run.approval_status === "rejected" && run.rejection_reason && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <strong>Rejected:</strong> {run.rejection_reason}
        </div>
      )}

      {/* Cycle details + linked jobs */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Cycle Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Loading temp</span><div className="font-medium">{run.loading_temp} °C</div></div>
              <div><span className="text-muted-foreground">Soaking temp</span><div className="font-medium">{run.soaking_temp} °C</div></div>
              <div><span className="text-muted-foreground">Soaking time</span><div className="font-medium">{run.soaking_time} min</div></div>
              <div><span className="text-muted-foreground">Heating rate</span><div className="font-medium">{run.rate_of_heating} °C/hr</div></div>
              {run.loading_time != null && <div><span className="text-muted-foreground">Loading time</span><div className="font-medium">{run.loading_time} min</div></div>}
              {run.unloading_time != null && <div><span className="text-muted-foreground">Unloading time</span><div className="font-medium">{run.unloading_time} min</div></div>}
            </div>
            <div className="grid gap-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="wps">WPS Number</Label>
                  <Input id="wps" value={details.wps_number} disabled={!canEdit}
                    onChange={(e) => setDetails((s) => ({ ...s, wps_number: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="comp">Component Identification</Label>
                  <Input id="comp" value={details.component_identification} disabled={!canEdit}
                    onChange={(e) => setDetails((s) => ({ ...s, component_identification: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="cstart">Cycle Start</Label>
                  <Input id="cstart" type="datetime-local" value={details.cycle_start} disabled={!canEdit}
                    onChange={(e) => setDetails((s) => ({ ...s, cycle_start: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="cend">Cycle End</Label>
                  <Input id="cend" type="datetime-local" value={details.cycle_end} disabled={!canEdit}
                    onChange={(e) => setDetails((s) => ({ ...s, cycle_end: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="procname">Process Name</Label>
                  <Input id="procname" value={details.process_name} disabled={!canEdit}
                    onChange={(e) => setDetails((s) => ({ ...s, process_name: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="ltime">Loading Time (min)</Label>
                  <Input id="ltime" type="number" value={details.loading_time} disabled={!canEdit}
                    onChange={(e) => setDetails((s) => ({ ...s, loading_time: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="utime">Unloading Time (min)</Label>
                  <Input id="utime" type="number" value={details.unloading_time} disabled={!canEdit}
                    onChange={(e) => setDetails((s) => ({ ...s, unloading_time: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" rows={2} value={details.notes} disabled={!canEdit}
                  onChange={(e) => setDetails((s) => ({ ...s, notes: e.target.value }))} />
              </div>
              {canEdit && (
                <Button size="sm" className="w-fit" onClick={saveDetails} disabled={isPending}>Save details</Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Linked Job Cards</CardTitle></CardHeader>
          <CardContent>
            {runJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No job cards linked.</p>
            ) : (
              <ul className="space-y-2">
                {runJobs.map((rj) => (
                  <li key={rj.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                    <div>
                      <Link href={`/job-cards/${rj.job_card_id}`} className="font-mono font-medium text-blue-600 hover:underline">
                        {rj.job_cards?.jc_number ?? rj.job_card_id.slice(0, 8)}
                      </Link>
                      <p className="text-xs text-muted-foreground line-clamp-1">{rj.job_cards?.description}</p>
                    </div>
                    <Badge variant="outline">{rj.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Temperature vs Time chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Thermometer className="h-4 w-4" /> Temperature vs. Time
            <span className="text-sm font-normal text-muted-foreground">({readings.length} readings)</span>
          </CardTitle>
          {canCapture && (
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden"
                onChange={(e) => onCsvSelected(e.target.files?.[0] ?? null)}
              />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isPending}>
                <Upload className="mr-1 h-4 w-4" /> Import recorder CSV
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              No chart readings yet — add readings manually or import the recorder&apos;s CSV export.
            </div>
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={40} />
                  <YAxis tick={{ fontSize: 11 }} unit="°C" domain={["auto", "auto"]} />
                  <Tooltip formatter={(value) => `${value} °C`} />
                  <Legend />
                  {Number(run.soaking_temp) > 0 && (
                    <ReferenceLine
                      y={Number(run.soaking_temp)} stroke="#e6552e" strokeDasharray="6 4"
                      label={{ value: `Soak ${run.soaking_temp}°C`, fontSize: 11, fill: "#e6552e" }}
                    />
                  )}
                  {channels.map((ch, i) => (
                    <Line
                      key={ch} type="monotone" dataKey={ch} name={ch}
                      stroke={CHANNEL_COLORS[i % CHANNEL_COLORS.length]}
                      dot={chartData.length < 60} strokeWidth={2} connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual reading entry + table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Readings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {canCapture && (
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <Label htmlFor="r-time">Time</Label>
                <Input id="r-time" type="datetime-local" value={newReading.recorded_at}
                  onChange={(e) => setNewReading((s) => ({ ...s, recorded_at: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="r-temp">Temperature (°C)</Label>
                <Input id="r-temp" type="number" step="0.1" className="w-36" value={newReading.temperature_c}
                  onChange={(e) => setNewReading((s) => ({ ...s, temperature_c: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="r-ch">Channel</Label>
                <Input id="r-ch" className="w-24" value={newReading.channel}
                  onChange={(e) => setNewReading((s) => ({ ...s, channel: e.target.value }))} />
              </div>
              <Button size="sm" onClick={addReading} disabled={isPending}>
                <Plus className="mr-1 h-4 w-4" /> Add
              </Button>
            </div>
          )}

          <div className="max-h-72 overflow-y-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                <tr className="text-left">
                  <th className="p-2">Time</th>
                  <th className="p-2">Channel</th>
                  <th className="p-2">Temperature</th>
                  <th className="p-2">Source</th>
                  {canEdit && <th className="p-2 w-10" />}
                </tr>
              </thead>
              <tbody>
                {readings.length === 0 && (
                  <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No readings</td></tr>
                )}
                {readings.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2 font-mono text-xs">{new Date(r.recorded_at).toLocaleString()}</td>
                    <td className="p-2">{r.channel}</td>
                    <td className="p-2">{r.temperature_c} °C</td>
                    <td className="p-2"><Badge variant="outline">{r.source}</Badge></td>
                    {canEdit && (
                      <td className="p-2">
                        <Button variant="ghost" size="sm" onClick={() => removeReading(r.id)} disabled={isPending}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject PWHT Run</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Rejection reason</Label>
            <Textarea
              id="reject-reason" rows={3} value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explain why this heat treatment run is rejected…"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={doReject} disabled={isPending || rejectReason.trim().length < 5}>
              Reject run
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
