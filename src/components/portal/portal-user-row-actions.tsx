"use client"

import { InventoryRowActions } from "@/components/inventory/inventory-row-actions"
import { deletePortalUser, setPortalUserActive } from "@/app/(app)/portal-users/actions"

/**
 * Delete + Enable/Disable for one customer portal login.
 *
 * Reuses InventoryRowActions rather than duplicating its confirm dialog — the
 * component is generic (label / toggle / guarded delete) despite living under
 * components/inventory, and sharing it keeps delete-confirmation behaviour
 * identical everywhere in the app.
 */
export function PortalUserRowActions({
  userId,
  label,
  isActive,
}: {
  userId: string
  label: string
  isActive: boolean
}) {
  return (
    <InventoryRowActions
      label={label}
      isActive={isActive}
      canDeactivate
      canDelete
      onToggleActive={(next) => setPortalUserActive(userId, next)}
      onDelete={() => deletePortalUser(userId)}
      deleteDescription={
        "This permanently removes the customer's login — they will no longer be able to sign in. " +
        "Their job cards, reports and documents are not affected. " +
        "To revoke access temporarily instead, use Disable."
      }
    />
  )
}
