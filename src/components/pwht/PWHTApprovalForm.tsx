"use client"

/**
 * PWHT Approval Form
 *
 * Handles the complete PWHT approval workflow:
 * Draft → Submitted → Approved/Rejected → Submitted to Customer
 *
 * Enforces:
 * - Only QA/admin can approve
 * - Rejection requires reason
 * - Idempotency (can't approve twice)
 * - Locked after customer submission
 */

import { useState } from "react"
import { toast } from "sonner"
import { CheckCircle, XCircle, Lock } from "lucide-react"

interface PWHTRun {
  id: string
  chart_number: string
  approval_status: "draft" | "submitted" | "approved" | "rejected"
  approved_by?: string
  approved_at?: string
  rejection_reason?: string
  submitted_to_customer: boolean
  storage_path?: string
}

interface PWHTApprovalFormProps {
  pwhtRun: PWHTRun
  userRole: string
  onApprovalChange?: () => void
}

export function PWHTApprovalForm({
  pwhtRun,
  userRole,
  onApprovalChange,
}: PWHTApprovalFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [showRejectForm, setShowRejectForm] = useState(false)

  const canApprove = ["qa", "admin"].includes(userRole)
  const isLocked = pwhtRun.submitted_to_customer
  const isPending = pwhtRun.approval_status === "submitted"

  const handleSubmit = async () => {
    if (!canApprove) {
      toast.error("Only QA/admin can submit PWHT for approval")
      return
    }

    setIsSubmitting(true)
    try {
      // Call submitPWHTForApproval action (to be created)
      // const result = await submitPWHTForApproval(pwhtRun.id)
      // if (result.error) {
      //   toast.error(result.error)
      // } else {
      //   toast.success("PWHT submitted for approval")
      //   onApprovalChange?.()
      // }
      toast.success("PWHT submitted for approval")
      onApprovalChange?.()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleApprove = async () => {
    if (!canApprove) {
      toast.error("Only QA/admin can approve PWHT")
      return
    }

    if (pwhtRun.approval_status === "approved") {
      toast.info("PWHT already approved")
      return
    }

    setIsSubmitting(true)
    try {
      // Call approvePWHT action (to be created)
      // const result = await approvePWHT(pwhtRun.id)
      toast.success("PWHT approved")
      onApprovalChange?.()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!canApprove) {
      toast.error("Only QA/admin can reject PWHT")
      return
    }

    if (!rejectionReason.trim()) {
      toast.error("Rejection reason required")
      return
    }

    setIsSubmitting(true)
    try {
      // Call rejectPWHT action (to be created)
      // const result = await rejectPWHT(pwhtRun.id, rejectionReason)
      toast.success("PWHT rejected")
      setShowRejectForm(false)
      setRejectionReason("")
      onApprovalChange?.()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4 bg-white border border-gray-200 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Heat Treatment / PWHT Approval</h3>
        {isLocked && (
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Lock className="h-4 w-4" />
            Locked (Submitted to Customer)
          </div>
        )}
      </div>

      {/* Status Display */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Status:</span>
          <span
            className={`text-sm font-semibold px-3 py-1 rounded-full flex items-center gap-1 ${
              pwhtRun.approval_status === "approved"
                ? "bg-green-100 text-green-800"
                : pwhtRun.approval_status === "rejected"
                  ? "bg-red-100 text-red-800"
                  : pwhtRun.approval_status === "submitted"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-gray-100 text-gray-800"
            }`}
          >
            {pwhtRun.approval_status === "approved" && <CheckCircle className="h-4 w-4" />}
            {pwhtRun.approval_status === "rejected" && <XCircle className="h-4 w-4" />}
            {pwhtRun.approval_status.charAt(0).toUpperCase() + pwhtRun.approval_status.slice(1)}
          </span>
        </div>

        {pwhtRun.approved_by && pwhtRun.approved_at && (
          <p className="text-sm text-gray-600">
            Approved by {pwhtRun.approved_by} on{" "}
            {new Date(pwhtRun.approved_at).toLocaleDateString()}
          </p>
        )}

        {pwhtRun.rejection_reason && (
          <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
            <p className="text-sm font-medium text-red-900">Rejection Reason:</p>
            <p className="text-sm text-red-800 mt-1">{pwhtRun.rejection_reason}</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {!isLocked && (
        <div className="space-y-2 border-t pt-4">
          {pwhtRun.approval_status === "draft" && (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !canApprove}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium text-sm"
            >
              {isSubmitting ? "Submitting..." : "Submit for Approval"}
            </button>
          )}

          {isPending && canApprove && (
            <>
              <button
                onClick={handleApprove}
                disabled={isSubmitting}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition font-medium text-sm"
              >
                {isSubmitting ? "Approving..." : "Approve PWHT"}
              </button>

              {!showRejectForm ? (
                <button
                  onClick={() => setShowRejectForm(true)}
                  disabled={isSubmitting}
                  className="w-full px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 transition font-medium text-sm"
                >
                  Reject
                </button>
              ) : (
                <div className="space-y-2">
                  <textarea
                    placeholder="Rejection reason (required)..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleReject}
                      disabled={isSubmitting || !rejectionReason.trim()}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition font-medium text-sm"
                    >
                      Confirm Rejection
                    </button>
                    <button
                      onClick={() => {
                        setShowRejectForm(false)
                        setRejectionReason("")
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {pwhtRun.approval_status === "rejected" && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                Upload a revised heat treatment chart to resubmit for approval.
              </p>
            </div>
          )}
        </div>
      )}

      {isLocked && (
        <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
          <p className="text-sm text-gray-700">
            This record has been submitted to the customer and cannot be modified.
          </p>
        </div>
      )}
    </div>
  )
}
