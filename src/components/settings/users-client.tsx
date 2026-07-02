"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { UserCog, Shield } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { updateUserRole, toggleUserActive } from "@/app/(app)/settings/actions"
import type { Profile, UserRole } from "@/types/database"

const ROLES: UserRole[] = ["admin", "operator", "engineer", "qa", "accounts", "management"]

const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-purple-100 text-purple-700",
  operator: "bg-blue-100 text-blue-700",
  engineer: "bg-cyan-100 text-cyan-700",
  qa: "bg-amber-100 text-amber-700",
  accounts: "bg-green-100 text-green-700",
  management: "bg-rose-100 text-rose-700",
  customer: "bg-slate-100 text-slate-700",
}

export function UsersClient({
  profiles,
  currentUserId,
  isAdmin,
}: {
  profiles: Profile[]
  currentUserId: string
  isAdmin: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [selectedRole, setSelectedRole] = useState<UserRole>("operator")

  function openEdit(profile: Profile) {
    setEditingProfile(profile)
    setSelectedRole(profile.role)
  }

  function saveRole() {
    if (!editingProfile) return
    startTransition(async () => {
      const result = await updateUserRole(editingProfile.id, selectedRole)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`Role updated to ${selectedRole}`)
        setEditingProfile(null)
      }
    })
  }

  function handleToggleActive(profile: Profile) {
    startTransition(async () => {
      const result = await toggleUserActive(profile.id, !profile.is_active)
      if (result.error) toast.error(result.error)
      else toast.success(profile.is_active ? "User deactivated" : "User activated")
    })
  }

  return (
    <>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage users and roles.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCog className="h-4 w-4" /> User Management
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {profiles.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No users found.</p>
            ) : (
              <div className="divide-y divide-border">
                {profiles.map((profile) => (
                  <div key={profile.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary/10 text-sm font-semibold text-brand-primary">
                        {profile.full_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {profile.full_name}
                          {profile.id === currentUserId && (
                            <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                          )}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${ROLE_COLORS[profile.role]}`}>
                            {profile.role}
                          </span>
                          {!profile.is_active && (
                            <span className="text-xs text-muted-foreground">inactive</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(profile)}
                          disabled={isPending}
                        >
                          Edit Role
                        </Button>
                        {profile.id !== currentUserId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleActive(profile)}
                            disabled={isPending}
                            className={profile.is_active ? "text-destructive hover:text-destructive" : "text-green-700 hover:text-green-700"}
                          >
                            {profile.is_active ? "Deactivate" : "Activate"}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" /> Role Permissions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ROLES.map((role) => (
                <div key={role} className="rounded-lg border border-border p-3">
                  <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${ROLE_COLORS[role]}`}>{role}</span>
                  <p className="text-xs text-muted-foreground mt-2">
                    {role === "admin" && "Full access — all pages, status changes, user management"}
                    {role === "operator" && "Create job cards, update basic status, view all jobs"}
                    {role === "engineer" && "View job cards, update process execution records"}
                    {role === "qa" && "Approve/reject WPS, upload reports, QA sign-off"}
                    {role === "accounts" && "View dispatch info, update invoice/payment records"}
                    {role === "management" && "Read-only dashboard and reports view"}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editingProfile} onOpenChange={(open) => !open && setEditingProfile(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Role — {editingProfile?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Role</Label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((role) => (
                <label
                  key={role}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    selectedRole === role
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    className="sr-only"
                    checked={selectedRole === role}
                    onChange={() => setSelectedRole(role)}
                  />
                  <span className={`h-3 w-3 rounded-full ${selectedRole === role ? "bg-primary" : "bg-muted-foreground/30"}`} />
                  {role}
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProfile(null)}>Cancel</Button>
            <Button onClick={saveRole} disabled={isPending}>
              {isPending ? "Saving..." : "Save Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
