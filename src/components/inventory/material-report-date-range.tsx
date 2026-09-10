"use client"

import { useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export function MaterialReportDateRange({ from, to }: { from: string; to: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [fromDate, setFromDate] = useState(from)
  const [toDate, setToDate] = useState(to)

  function apply() {
    const params = new URLSearchParams(searchParams.toString())
    params.set("from", fromDate)
    params.set("to", toDate)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-end gap-3 print:hidden">
      <div>
        <Label className="text-xs">From</Label>
        <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="mt-1" />
      </div>
      <div>
        <Label className="text-xs">To</Label>
        <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="mt-1" />
      </div>
      <Button size="sm" onClick={apply}>Apply</Button>
    </div>
  )
}
