"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Plus, Thermometer, Clock, Zap, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { DocumentCard } from "@/components/documents/document-card"
import { FileUpload } from "@/components/documents/file-upload"
import { createPwhtRunSchema, type CreatePwhtRunInput } from "@/lib/validations/pwht-run"
import { createPwhtRun, updatePwhtJobStatus } from "@/app/(app)/pwht-runs/actions"
import type { PwhtRun, JobCard, PwhtJobStatus, UserRole } from "@/types/database"

type RunJob = { id: string; job_card_id: string; status: PwhtJobStatus; job_cards: { jc_number: string; description: string } | null }
type PwhtRunWithJobs = PwhtRun & { pwht_run_jobs: RunJob[] }
type EligibleJC = JobCard & { clients: { name: string } | null }

const STATUS_COLOR: Record<PwhtJobStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  passed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 pb-2">
      <h3 className="text-sm font-semibold text-foreground whitespace-nowrap">{children}</h3>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

export function PwhtRunsClient({
  runs,
  eligibleJobCards,
  page,
  totalPages,
  totalCount,
  userRole,
}: {
  runs: PwhtRunWithJobs[]
  eligibleJobCards: EligibleJC[]
  page: number
  totalPages: number
  totalCount: number
  userRole: UserRole
}) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [selectedJCs, setSelectedJCs] = useState<string[]>([])
  const [jcSearch, setJcSearch] = useState("")

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreatePwhtRunInput>({
    resolver: zodResolver(createPwhtRunSchema),
    defaultValues: {
      date_of_cycle: new Date().toISOString().split("T")[0],
      job_card_ids: [],
    },
  })

  function toggleJC(id: string) {
    setSelectedJCs((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  function onSubmit(data: CreatePwhtRunInput) {
    if (selectedJCs.length === 0) {
      toast.error("Select at least one job card")
      return
    }
    startTransition(async () => {
      const result = await createPwhtRun({ ...data, job_card_ids: selectedJCs })
      if (result.error) {
        toast.error("Failed to create PWHT run", { description: result.error })
      } else {
        toast.success("PWHT run created")
        setDialogOpen(false)
        reset()
        setSelectedJCs([])
        setJcSearch("")
      }
    })
  }

  function handleStatusUpdate(jobId: string, status: PwhtJobStatus) {
    startTransition(async () => {
      const result = await updatePwhtJobStatus(jobId, status)
      if (result.error) toast.error(result.error)
      else toast.success("Status updated")
    })
  }

  const filteredJCs = eligibleJobCards.filter((jc) =>
    jc.jc_number.toLowerCase().includes(jcSearch.toLowerCase()) ||
    jc.description.toLowerCase().includes(jcSearch.toLowerCase())
  )

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">PWHT Runs</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {totalCount} run{totalCount !== 1 ? "s" : ""} total · page {page} of {Math.max(1, totalPages)}
            </p>
          </div>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> New PWHT Run
          </Button>
        </div>

        {runs.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Thermometer className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No PWHT runs yet.</p>
              <Button className="mt-4" size="sm" onClick={() => setDialogOpen(true)}>
                Create First Run
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {runs.map((run) => {
              const passCount = run.pwht_run_jobs.filter((j) => j.status === "passed").length
              const failCount = run.pwht_run_jobs.filter((j) => j.status === "failed").length
              const pendCount = run.pwht_run_jobs.filter((j) => j.status === "pending").length
              return (
                <Card key={run.id}>
                  <CardHeader>
                    <CardTitle className="flex items-start justify-between text-base">
                      <div>
                        <span className="font-mono text-brand-primary">{run.chart_number}</span>
                        <span className="text-muted-foreground font-normal ml-3 text-sm">Furnace: {run.furnace_id}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-normal">
                        {pendCount > 0 && <span className="bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 text-xs">{pendCount} pending</span>}
                        {passCount > 0 && <span className="bg-green-100 text-green-700 rounded-full px-2 py-0.5 text-xs">{passCount} passed</span>}
                        {failCount > 0 && <span className="bg-red-100 text-red-700 rounded-full px-2 py-0.5 text-xs">{failCount} failed</span>}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm mb-4 sm:grid-cols-4">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Thermometer className="h-3.5 w-3.5" />
                        <span>Soak: {run.soaking_temp}°C</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{run.soaking_time} min</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Zap className="h-3.5 w-3.5" />
                        <span>{run.rate_of_heating}°C/hr</span>
                      </div>
                      <div className="text-muted-foreground">
                        {new Date(run.date_of_cycle).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                    </div>

                    {run.pwht_run_jobs.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Job Cards</p>
                        {run.pwht_run_jobs.map((job) => (
                          <div key={job.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                            <div>
                              <span className="font-medium font-mono">{job.job_cards?.jc_number ?? job.job_card_id.slice(0, 8)}</span>
                              <span className="text-muted-foreground ml-2 text-xs truncate max-w-xs">{job.job_cards?.description}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[job.status]}`}>
                                {job.status}
                              </span>
                              {job.status === "pending" && (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleStatusUpdate(job.id, "passed")}
                                    className="text-xs text-green-700 hover:underline"
                                    disabled={isPending}
                                  >
                                    Pass
                                  </button>
                                  <span className="text-muted-foreground">·</span>
                                  <button
                                    onClick={() => handleStatusUpdate(job.id, "failed")}
                                    className="text-xs text-red-700 hover:underline"
                                    disabled={isPending}
                                  >
                                    Fail
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* PWHT chart document — storage file takes priority over legacy URL */}
                    <div className="mt-3 pt-3 border-t border-border space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">PWHT Chart</p>
                      <DocumentCard
                        storagePath={run.storage_path}
                        legacyDocUrl={run.doc_url}
                        compact
                      />
                      <FileUpload
                        entityType="pwht_run"
                        entityId={run.id}
                        documentType="pwht_chart"
                        userRole={userRole}
                        sourceModule="pwht_runs"
                        label={run.storage_path ? "Replace Chart" : "Upload PWHT Chart"}
                      />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => router.push(`/pwht-runs?page=${page - 1}`)}>
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => router.push(`/pwht-runs?page=${page + 1}`)}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New PWHT Run</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <SectionHeading>Run Details</SectionHeading>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="chart_number">Chart Number <span className="text-destructive">*</span></Label>
                  <Input id="chart_number" placeholder="CHT-2025-001" {...register("chart_number")} aria-invalid={!!errors.chart_number} />
                  {errors.chart_number && <p className="text-xs text-destructive">{errors.chart_number.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="furnace_id">Furnace ID <span className="text-destructive">*</span></Label>
                  <Input id="furnace_id" placeholder="F-01" {...register("furnace_id")} aria-invalid={!!errors.furnace_id} />
                  {errors.furnace_id && <p className="text-xs text-destructive">{errors.furnace_id.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="operator_name">Operator Name <span className="text-destructive">*</span></Label>
                  <Input id="operator_name" {...register("operator_name")} aria-invalid={!!errors.operator_name} />
                  {errors.operator_name && <p className="text-xs text-destructive">{errors.operator_name.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="date_of_cycle">Date of Cycle <span className="text-destructive">*</span></Label>
                  <Input id="date_of_cycle" type="date" {...register("date_of_cycle")} />
                </div>
              </div>
            </div>

            <div>
              <SectionHeading>Temperature & Time Parameters</SectionHeading>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="loading_temp">Loading Temp (°C) <span className="text-destructive">*</span></Label>
                  <Input id="loading_temp" type="number" placeholder="200" {...register("loading_temp", { valueAsNumber: true })} aria-invalid={!!errors.loading_temp} />
                  {errors.loading_temp && <p className="text-xs text-destructive">{errors.loading_temp.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="soaking_temp">Soaking Temp (°C) <span className="text-destructive">*</span></Label>
                  <Input id="soaking_temp" type="number" placeholder="620" {...register("soaking_temp", { valueAsNumber: true })} aria-invalid={!!errors.soaking_temp} />
                  {errors.soaking_temp && <p className="text-xs text-destructive">{errors.soaking_temp.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="soaking_time">Soaking Time (min) <span className="text-destructive">*</span></Label>
                  <Input id="soaking_time" type="number" placeholder="60" {...register("soaking_time", { valueAsNumber: true })} aria-invalid={!!errors.soaking_time} />
                  {errors.soaking_time && <p className="text-xs text-destructive">{errors.soaking_time.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="rate_of_heating">Rate of Heating (°C/hr) <span className="text-destructive">*</span></Label>
                  <Input id="rate_of_heating" type="number" placeholder="150" {...register("rate_of_heating", { valueAsNumber: true })} aria-invalid={!!errors.rate_of_heating} />
                  {errors.rate_of_heating && <p className="text-xs text-destructive">{errors.rate_of_heating.message}</p>}
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <Label htmlFor="doc_url">Document URL <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                <Input id="doc_url" placeholder="https://..." {...register("doc_url")} />
              </div>
            </div>

            <div>
              <SectionHeading>Job Cards <span className="text-destructive">*</span></SectionHeading>
              <p className="text-xs text-muted-foreground mb-2">Select active job cards to include in this run.</p>
              <Input
                placeholder="Search job cards..."
                value={jcSearch}
                onChange={(e) => setJcSearch(e.target.value)}
                className="mb-2"
              />
              {errors.job_card_ids && <p className="text-xs text-destructive mb-2">{errors.job_card_ids.message}</p>}
              <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                {filteredJCs.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground text-center">No eligible job cards found.</p>
                ) : (
                  filteredJCs.map((jc) => {
                    const checked = selectedJCs.includes(jc.id)
                    return (
                      <label key={jc.id} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer text-sm hover:bg-muted/50 transition-colors ${checked ? "bg-primary/5" : ""}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleJC(jc.id)}
                          className="rounded border-border"
                        />
                        <div className="min-w-0">
                          <span className="font-mono font-medium">{jc.jc_number}</span>
                          <span className="text-muted-foreground ml-2">{jc.clients?.name}</span>
                          <p className="text-xs text-muted-foreground truncate">{jc.description}</p>
                        </div>
                      </label>
                    )
                  })
                )}
              </div>
              {selectedJCs.length > 0 && (
                <p className="text-xs text-primary mt-1.5">{selectedJCs.length} job card{selectedJCs.length > 1 ? "s" : ""} selected</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating..." : "Create PWHT Run"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
