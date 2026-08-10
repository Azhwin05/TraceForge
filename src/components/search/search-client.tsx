"use client"

import { useState, useTransition, useCallback, useRef } from "react"
import Link from "next/link"
import { Search, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/job-cards/status-badge"
import { searchJobCards } from "@/app/(app)/search/actions"
import type { JobCardWithRelations } from "@/types/database"

export function SearchClient() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<JobCardWithRelations[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const runSearch = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (value.trim().length < 2) {
      setResults([])
      setHasSearched(false)
      setError(null)
      return
    }

    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const res = await searchJobCards(value)
        // Surfacing this matters: a failed search previously rendered as
        // "No results found.", which reads as a confident answer.
        setError(res.error ?? null)
        setResults(res.results)
        setHasSearched(true)
      })
    }, 300)
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setQuery(value)
    runSearch(value)
  }

  const showResults = hasSearched && query.trim().length >= 2

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Search</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Search job cards by JC number, NBDN, client, description, PO, heat, or part number.
        </p>
      </div>

      <div className="relative">
        {isPending ? (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        ) : (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        )}
        <Input
          autoFocus
          placeholder="Type at least 2 characters — JC number, NBDN, description, client..."
          className="pl-9 h-10 text-base"
          value={query}
          onChange={handleChange}
        />
      </div>

      {query.trim().length > 0 && query.trim().length < 2 && (
        <p className="text-sm text-muted-foreground">Type at least 2 characters...</p>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {showResults && !error && (
        <div>
          <p className="text-sm text-muted-foreground mb-3">
            {results.length === 0
              ? "No results found."
              : `${results.length} result${results.length !== 1 ? "s" : ""}${results.length === 50 ? " (showing first 50)" : ""}`}
          </p>
          <div className="space-y-2">
            {results.map((jc) => (
              <Link
                key={jc.id}
                href={`/job-cards/${jc.id}`}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5 text-sm hover:bg-muted/50 transition-colors shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono font-semibold text-brand-primary">{jc.jc_number}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{jc.client?.name}</span>
                  </div>
                  <p className="text-muted-foreground text-xs truncate">{jc.description}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>NBDN: {jc.nbdn_number}</span>
                    {jc.po_number && <span>PO: {jc.po_number}</span>}
                    {jc.heat_number && <span>Heat: {jc.heat_number}</span>}
                  </div>
                </div>
                <div className="ml-4 shrink-0">
                  <StatusBadge status={jc.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {query.trim().length === 0 && (
        <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          <Search className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Start typing to search job cards.</p>
          <p className="text-xs text-muted-foreground mt-1">Searches across JC number, NBDN, description, PO, heat and part numbers.</p>
        </div>
      )}
    </div>
  )
}
