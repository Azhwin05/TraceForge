"use client"

import { useState } from "react"
import { toast } from "sonner"
import { FileDown } from "lucide-react"
import { Button } from "@/components/ui/button"

export function JobCardPdfButton({ jobCardId }: { jobCardId: string }) {
  const [isGenerating, setIsGenerating] = useState(false)

  async function downloadJobCardPdf() {
    setIsGenerating(true)
    try {
      const res = await fetch(`/api/job-cards/${jobCardId}/generate`, { method: "POST" })
      const body = await res.json()
      if (!res.ok) { toast.error(body.error ?? "PDF generation failed"); return }
      const urlRes = await fetch(`/api/job-cards/${jobCardId}/generate-url`)
      const urlBody = await urlRes.json()
      if (urlBody.url) window.open(urlBody.url, "_blank")
      else toast.error("Could not fetch the generated PDF")
    } catch {
      toast.error("PDF generation failed")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={downloadJobCardPdf} disabled={isGenerating}>
      <FileDown className="h-4 w-4 mr-1" /> {isGenerating ? "Generating…" : "Download Job Card PDF"}
    </Button>
  )
}
