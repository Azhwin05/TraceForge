import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { isAdminConfigured } from "@/lib/supabase/admin"
import { must, orEmpty } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PortalUsersClient } from "@/components/portal/portal-users-client"
import { PortalUserRowActions } from "@/components/portal/portal-user-row-actions"
import { PortalUserManageDialog } from "@/components/portal/portal-user-manage-dialog"

export const metadata = { title: "Customer Portal Users — ValveTrack" }

type CustomerProfile = {
  id: string
  full_name: string
  is_active: boolean
  created_at: string
  client_id: string | null
  clients: { name: string } | null
}

export default async function PortalUsersPage() {
  const { profile, supabase } = await requireAuth()
  if (profile.role !== "admin") redirect("/dashboard")

  const [customersRes, clientsRes, grantsRes] = await Promise.all([
    supabase
      .from("profiles")
      // The FK must be named explicitly: portal_user_clients gave profiles a
      // SECOND path to clients, so a bare clients(name) embed is ambiguous and
      // PostgREST rejects the whole query with PGRST201 (which rendered as an
      // empty "no portal users" list rather than an error).
      .select("id, full_name, is_active, created_at, client_id, clients!profiles_client_id_fkey(name)")
      .eq("role", "customer")
      .order("created_at", { ascending: false }),
    supabase.from("clients").select("id, name").order("name"),
    supabase.from("portal_user_clients").select("profile_id, client_id"),
  ])

  // must(): a failure here must surface, not render as an empty list — that is
  // exactly how the PGRST201 embed error hid six existing portal users.
  const customers = must(customersRes, "portal users")
  const clients = must(clientsRes, "client companies")
  const grants = orEmpty(grantsRes, "portal company grants")

  const clientList = (clients ?? []) as { id: string; name: string }[]
  const clientNameById = new Map(clientList.map((c) => [c.id, c.name]))

  // Additional companies granted per login, beyond their primary one
  const extrasByUser = new Map<string, string[]>()
  for (const g of (grants ?? []) as { profile_id: string; client_id: string }[]) {
    extrasByUser.set(g.profile_id, [...(extrasByUser.get(g.profile_id) ?? []), g.client_id])
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Customer Portal Users</h1>
        <p className="text-sm text-muted-foreground">
          Provision external logins so a client (e.g. L&amp;T Valves) can view the complete
          status, inspection reports, and documents for their own jobs — and nothing else.
        </p>
      </div>

      {!isAdminConfigured() && (
        <div className="rounded-md border border-warning-border bg-warning-surface p-3 text-sm text-warning">
          <strong>Provisioning disabled:</strong> set <code>SUPABASE_SERVICE_ROLE_KEY</code> in the
          environment to create portal logins. Existing customer accounts still work; you just
          can&apos;t create new ones from here until the key is configured.
        </div>
      )}

      <PortalUsersClient
        clients={clientList}
        provisioningEnabled={isAdminConfigured()}
      />

      <Card>
        <CardHeader><CardTitle className="text-base">Existing portal users</CardTitle></CardHeader>
        <CardContent>
          {(!customers || customers.length === 0) ? (
            <p className="text-sm text-muted-foreground">No customer portal users yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="p-2">Name</th>
                  <th className="p-2">Client</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Created</th>
                  <th className="p-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(customers as unknown as CustomerProfile[]).map((c) => {
                  const extras = extrasByUser.get(c.id) ?? []
                  return (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="p-2 font-medium">{c.full_name}</td>
                    <td className="p-2">
                      {c.clients?.name ?? "—"}
                      {extras.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          + {extras.map((id) => clientNameById.get(id) ?? "Unknown").join(", ")}
                        </div>
                      )}
                    </td>
                    <td className="p-2">
                      {c.is_active
                        ? <Badge className="bg-success-surface text-success">Active</Badge>
                        : <Badge className="bg-muted text-muted-foreground">Disabled</Badge>}
                    </td>
                    <td className="p-2 text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="p-2">
                      <div className="flex items-center justify-end">
                        <PortalUserManageDialog
                          userId={c.id}
                          userName={c.full_name}
                          primaryClientId={c.client_id}
                          clients={clientList}
                          extraClientIds={extras}
                        />
                        <PortalUserRowActions
                          userId={c.id}
                          label={`${c.full_name}${c.clients?.name ? ` — ${c.clients.name}` : ""}`}
                          isActive={c.is_active}
                        />
                      </div>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
