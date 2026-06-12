import { redirect } from "next/navigation"
import { requireRole } from "@/lib/auth"
import { AuditClient } from "@/components/audit/audit-client"
import type { AuditLog } from "@/types/database"

export const metadata = { title: "Audit Trail — ValveTrack" }
export const revalidate = 60

type AuditEntry = AuditLog & { performer: { full_name: string } | null }

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const guard = await requireRole(["admin", "management"])
  if (guard.error) redirect("/dashboard")

  const { supabase } = guard
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? "1", 10))
  const pageSize = 100
  const offset = (page - 1) * pageSize

  const { data, count } = await supabase
    .from("audit_log")
    .select("*, performer:profiles!performed_by(full_name)", { count: "exact" })
    .order("performed_at", { ascending: false })
    .range(offset, offset + pageSize - 1)

  const totalPages = Math.ceil((count ?? 0) / pageSize)

  return (
    <AuditClient
      entries={(data ?? []) as unknown as AuditEntry[]}
      page={page}
      totalPages={totalPages}
      totalCount={count ?? 0}
    />
  )
}
