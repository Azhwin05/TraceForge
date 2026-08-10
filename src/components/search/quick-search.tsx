"use client"

import { useState, useTransition, useCallback, useRef, useEffect } from "react"
import Link from "next/link"
import { Search, Loader2, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/job-cards/status-badge"
import { searchJobCards } from "@/app/(app)/search/actions"
import type { JobCardWithRelations } from "@/types/database"

/**
 * Compact universal search, for embedding at the top of the Dashboard and Job
 * Cards pages (client request #4 — "add a universal search feature in the
 * Dashboard and Job Card modules").
 *
 * Deliberately shares searchJobCards with the full /search page so the two can
 * never drift apart on what is searchable.
 */
export function QuickSearch({
  placeholder = "Search job cards — JC number, client, PO, tag…",
  limit = 6,
}: {
  placeholder?: string
  limit?: number
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<JobCardWithRelations[]>([])
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Without this, a pending debounce fires after unmount and sets state on a
  // dead component.
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }, [])

  const runSearch = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (value.trim().length < 2) {
      setResults([]); setHasSearched(false); setError(null)
      return
    }

    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const res = await searchJobCards(value)
        // The full search page dropped this on the floor, so a failed search
        // was indistinguishable from "no matches".
        setError(res.error ?? null)
        setResults(res.results)
        setHasSearched(true)
      })
    }, 300)
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)
    runSearch(e.target.value)
  }

  function clear() {
    setQuery(""); setResults([]); setHasSearched(false); setError(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }

  const shown = results.slice(0, limit)
  const showPanel = hasSearched && query.trim().length >= 2

  return (
    <div className="relative">
      <div className="relative">
        {isPending ? (
          <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : (
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        )}
        <Input
          value={query}
          onChange={handleChange}
          placeholder={placeholder}
          className="h-10 pl-9 pr-9"
          aria-label="Search job cards"
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {showPanel && (
        <div className="mt-2 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {error ? (
            <p className="px-4 py-3 text-sm text-destructive">{error}</p>
          ) : shown.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">No matching job cards.</p>
          ) : (
            <>
              <div className="divide-y divide-border">
                {shown.map((jc) => (
                  <Link
                    key={jc.id}
                    href={`/job-cards/${jc.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-brand-primary">{jc.jc_number}</span>
                        <span className="truncate text-muted-foreground">{jc.client?.name}</span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{jc.description}</p>
                    </div>
                    <StatusBadge status={jc.status} />
                  </Link>
                ))}
              </div>
              {results.length > shown.length && (
                <Link
                  href="/search"
                  className="block border-t border-border px-4 py-2 text-center text-xs font-medium text-brand-primary hover:bg-muted/50"
                >
                  View all {results.length} results
                </Link>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
