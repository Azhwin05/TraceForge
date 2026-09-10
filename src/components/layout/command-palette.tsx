"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Search, CornerDownLeft, Loader2, FileText } from "lucide-react"

import { cn } from "@/lib/utils"
import { MODULES, canSee } from "./app-sidebar"
import { searchJobCards } from "@/app/(app)/search/actions"
import type { JobCardWithRelations, UserRole } from "@/types/database"

type NavResult = {
  kind: "nav"
  href: string
  label: string
  group: string
  icon: React.ElementType
}
type JobResult = { kind: "job"; href: string; jc: JobCardWithRelations }
type Result = NavResult | JobResult

/** Flatten every route this role may open, so the palette can jump anywhere. */
function navTargets(role: UserRole): NavResult[] {
  const out: NavResult[] = []
  for (const mod of MODULES) {
    for (const group of mod.groups) {
      if (!canSee(group.roles, role)) continue
      for (const item of group.items) {
        if (!canSee(item.roles, role)) continue
        out.push({
          kind: "nav",
          href: item.href,
          label: item.label,
          group: group.heading ? `${mod.label} · ${group.heading}` : mod.label,
          icon: item.icon,
        })
      }
    }
  }
  return out
}

export function CommandPalette({ role }: { role: UserRole }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [jobs, setJobs] = React.useState<JobCardWithRelations[]>([])
  const [searching, setSearching] = React.useState(false)
  const [activeIndex, setActiveIndex] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)

  const allNav = React.useMemo(() => navTargets(role), [role])

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  React.useEffect(() => {
    if (open) {
      setQuery("")
      setJobs([])
      setActiveIndex(0)
      // Focus after the dialog paints, otherwise the caret lands nowhere
      const t = setTimeout(() => inputRef.current?.focus(), 20)
      return () => clearTimeout(t)
    }
  }, [open])

  // Debounced job-card lookup. Reuses the same server action as /search so the
  // palette and the search page can never disagree on what is findable.
  React.useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setJobs([])
      setSearching(false)
      return
    }
    setSearching(true)
    const t = setTimeout(async () => {
      try {
        const res = await searchJobCards(q)
        setJobs(res.results.slice(0, 6))
      } finally {
        setSearching(false)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  const navMatches = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allNav.slice(0, 8)
    return allNav
      .filter(
        (n) => n.label.toLowerCase().includes(q) || n.group.toLowerCase().includes(q)
      )
      .slice(0, 6)
  }, [allNav, query])

  const results: Result[] = React.useMemo(
    () => [...navMatches, ...jobs.map((jc) => ({ kind: "job" as const, href: `/job-cards/${jc.id}`, jc }))],
    [navMatches, jobs]
  )

  React.useEffect(() => {
    setActiveIndex(0)
  }, [results.length])

  function go(href: string) {
    setOpen(false)
    router.push(href)
  }

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((i) => (results.length ? (i + 1) % results.length : 0))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((i) => (results.length ? (i - 1 + results.length) % results.length : 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      const target = results[activeIndex]
      if (target) go(target.href)
    }
  }

  // Keep the highlighted row inside the scroll viewport during arrow navigation
  React.useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" })
  }, [activeIndex])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "group inline-flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 text-sm text-muted-foreground shadow-xs transition-colors",
          "h-8 w-full max-w-[15rem] hover:border-border-strong hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        )}
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 truncate text-left">Search…</span>
        <kbd className="hidden shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 font-sans text-2xs font-medium text-muted-foreground sm:inline-block">
          Ctrl K
        </kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-neutral-950/50 backdrop-blur-[2px] animate-in fade-in-0 duration-150"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="absolute left-1/2 top-[12vh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-popover shadow-xl animate-in fade-in-0 zoom-in-95 duration-150"
          >
            <div className="flex items-center gap-2.5 border-b border-border px-3.5">
              {searching ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
              ) : (
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="Jump to a page, or search job cards…"
                aria-label="Search pages and job cards"
                className="h-12 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <kbd className="shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 font-sans text-2xs text-muted-foreground">
                Esc
              </kbd>
            </div>

            <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-1.5">
              {results.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                  {query.trim().length >= 2
                    ? "Nothing matches that. Try a JC number, client or page name."
                    : "Type to search."}
                </p>
              ) : (
                results.map((r, i) => {
                  const active = i === activeIndex
                  return (
                    <button
                      key={`${r.kind}-${r.href}`}
                      data-index={i}
                      onClick={() => go(r.href)}
                      onMouseMove={() => setActiveIndex(i)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                        active ? "bg-muted text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {r.kind === "nav" ? (
                        <r.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}

                      {r.kind === "nav" ? (
                        <>
                          <span className="truncate font-medium text-foreground">{r.label}</span>
                          <span className="ml-auto truncate pl-3 text-2xs text-muted-foreground">
                            {r.group}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="shrink-0 font-mono text-xs font-semibold text-brand-700 dark:text-brand-600">
                            {r.jc.jc_number}
                          </span>
                          <span className="truncate text-foreground">
                            {r.jc.client?.name ?? "—"}
                          </span>
                          <span className="ml-auto truncate pl-3 text-2xs text-muted-foreground">
                            {r.jc.description}
                          </span>
                        </>
                      )}

                      {active && (
                        <CornerDownLeft className="h-3 w-3 shrink-0 text-muted-foreground" />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
