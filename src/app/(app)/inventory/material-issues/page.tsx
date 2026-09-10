import { requireAuth } from "@/lib/auth"
import { MaterialIssuesListClient, type IssueRow } from "@/components/inventory/material-issues-list-client"
import type { UserRole } from "@/types/database"

export default async function MaterialIssuesPage() {
  const { supabase, profile } = await requireAuth()
  const userRole = (profile?.role ?? "operator") as UserRole
  const canCreate = ["admin", "operator", "engineer"].includes(userRole)

  const { data: records } = await supabase
    .from("material_issues")
    .select(`
      id, issue_number, issue_date, status, consumption_status, issued_to, destination, remarks,
      job_cards(jc_number),
      material_issue_items(issued_qty, consumed_qty, returned_qty, uom, remarks, item_master(item_code, item_name, consumable_type))
    `)
    .order("issue_date", { ascending: false })
    .limit(500)

  return (
    <div className="p-6">
      <MaterialIssuesListClient
        records={(records ?? []) as unknown as IssueRow[]}
        canCreate={canCreate}
      />
    </div>
  )
}
