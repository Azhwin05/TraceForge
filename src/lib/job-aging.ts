import type { JobCardStatus } from "@/types/database"

// Jobs at or past these statuses are considered off the shop floor — no urgency colour.
const DONE_STATUSES: JobCardStatus[] = ["dispatched", "accounts_processing", "closed"]

// Window (in days) before the due date within which a job is "due soon" (yellow).
export const NEAR_DUE_DAYS = 3

export type DueLevel = "none" | "on_schedule" | "due_soon" | "overdue" | "done"

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** Whole days between two dates (b - a), truncated. */
function dayDiff(a: Date, b: Date): number {
  return Math.round((startOfDay(b) - startOfDay(a)) / 86_400_000)
}

/** Days since the job card was created (aging). */
export function jobAging(createdAt: string, now: Date = new Date()): number {
  return Math.max(0, dayDiff(new Date(createdAt), now))
}

export interface DueInfo {
  level: DueLevel
  /** Positive when overdue (days past due), 0 or negative otherwise. */
  overdueDays: number
  /** Days until the due date (negative when overdue). null when no due date. */
  daysToDue: number | null
}

export function dueInfo(
  dueDate: string | null | undefined,
  status: JobCardStatus,
  now: Date = new Date(),
): DueInfo {
  if (DONE_STATUSES.includes(status)) {
    return { level: "done", overdueDays: 0, daysToDue: null }
  }
  if (!dueDate) {
    return { level: "none", overdueDays: 0, daysToDue: null }
  }
  const daysToDue = dayDiff(now, new Date(dueDate))
  if (daysToDue < 0) {
    return { level: "overdue", overdueDays: -daysToDue, daysToDue }
  }
  if (daysToDue <= NEAR_DUE_DAYS) {
    return { level: "due_soon", overdueDays: 0, daysToDue }
  }
  return { level: "on_schedule", overdueDays: 0, daysToDue }
}

export const DUE_LEVEL_STYLE: Record<DueLevel, { dot: string; badge: string; label: string }> = {
  overdue:     { dot: "bg-red-500",    badge: "bg-red-100 text-red-700",       label: "Overdue" },
  due_soon:    { dot: "bg-amber-500",  badge: "bg-amber-100 text-amber-700",   label: "Due soon" },
  on_schedule: { dot: "bg-green-500",  badge: "bg-green-100 text-green-700",   label: "On schedule" },
  done:        { dot: "bg-slate-400",  badge: "bg-slate-100 text-slate-600",   label: "Done" },
  none:        { dot: "bg-slate-300",  badge: "bg-slate-100 text-slate-500",   label: "No due date" },
}
