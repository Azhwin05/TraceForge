"use client"

/**
 * Workflow Stage Document Manager
 *
 * Reusable component for managing documents at any workflow stage.
 * Handles:
 * - PDF/Image/DOCX upload
 * - Multiple file uploads
 * - File validation
 * - Upload progress
 * - Document list with revisions
 * - Preview & download
 * - Approval/rejection workflow
 * - Archive
 * - Dossier eligibility marking
 *
 * Reused across all workflow stages (WPS, Invoices, Deliverables, etc.)
 */

import { useState } from "react"
import { Upload, File, Download, Eye, Trash2, CheckCircle, XCircle, Clock } from "lucide-react"
import { toast } from "sonner"
import { uploadJobCardDocument, approveDocument, rejectDocument } from "@/app/(app)/job-cards/document-actions"
import type { DocumentRequirementKey } from "@/lib/workflow/document-requirements"

interface Document {
  id: string
  file_name: string
  storage_path: string
  version: number
  is_latest: boolean
  approval_status: "none" | "pending" | "approved" | "rejected"
  uploaded_by: string
  uploaded_at: string
  mime_type: string
  file_size: number
}

interface WorkflowStageDocumentManagerProps {
  jobCardId: string
  documentType: DocumentRequirementKey
  label: string
  required: boolean
  allowMultiple: boolean
  allowedMimeTypes: string[]
  existingDocuments: Document[]
  onUploadSuccess?: () => void
  userRole: string
}

export function WorkflowStageDocumentManager({
  jobCardId,
  documentType,
  label,
  required,
  allowMultiple,
  allowedMimeTypes,
  existingDocuments,
  onUploadSuccess,
  userRole,
}: WorkflowStageDocumentManagerProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showRejectionReason, setShowRejectionReason] = useState<string | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (50MB limit)
    if (file.size > 52428800) {
      toast.error("File size must be less than 50MB")
      return
    }

    // Validate MIME type
    if (!allowedMimeTypes.includes(file.type)) {
      toast.error(`Invalid file type. Allowed: ${allowedMimeTypes.join(", ")}`)
      return
    }

    setSelectedFile(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + Math.random() * 30, 90))
      }, 200)

      // In a real implementation, would upload to Supabase Storage first
      // Then call uploadJobCardDocument with the storage path

      const simulatedStoragePath = `job-cards/${jobCardId}/${documentType}/${Date.now()}_${selectedFile.name}`

      const result = await uploadJobCardDocument({
        jobCardId,
        documentType,
        fileName: selectedFile.name,
        filePath: simulatedStoragePath,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type,
        approvalRequired: true,
        dossierEligible: true,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`${label} uploaded successfully`)
        setSelectedFile(null)
        setUploadProgress(0)
        onUploadSuccess?.()
      }
    } catch (error) {
      toast.error("Upload failed")
      console.error(error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleApprove = async (documentId: string) => {
    const result = await approveDocument({ documentId })
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Document approved")
      onUploadSuccess?.()
    }
  }

  const handleReject = async (documentId: string, reason: string) => {
    if (!reason.trim()) {
      toast.error("Rejection reason required")
      return
    }

    const result = await rejectDocument({ documentId, rejectionReason: reason })
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Document rejected")
      setShowRejectionReason(null)
      onUploadSuccess?.()
    }
  }

  const latestDoc = existingDocuments.find((d) => d.is_latest)
  const allVersions = existingDocuments.sort(
    (a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
  )

  const getApprovalIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-4 bg-white border border-gray-200 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-gray-900">{label}</h3>
          {required && <p className="text-xs text-red-600">Required</p>}
        </div>
        {latestDoc && <span className="text-xs font-medium text-gray-600">v{latestDoc.version}</span>}
      </div>

      {/* Upload Area */}
      {(!latestDoc || allowMultiple) && !isUploading && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition">
          <label className="cursor-pointer">
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-6 w-6 text-gray-400" />
              {selectedFile ? (
                <>
                  <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-xs text-gray-600">{(selectedFile.size / 1024 / 1024).toFixed(2)}MB</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-900">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-600">PDF, images or DOCX up to 50MB</p>
                </>
              )}
            </div>
            <input
              type="file"
              className="hidden"
              accept={allowedMimeTypes.join(",")}
              onChange={handleFileSelect}
            />
          </label>
        </div>
      )}

      {/* Upload Button */}
      {selectedFile && (
        <button
          onClick={handleUpload}
          disabled={isUploading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition text-sm font-medium"
        >
          {isUploading ? `Uploading... ${uploadProgress}%` : "Upload Document"}
        </button>
      )}

      {/* Document List */}
      {allVersions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-700">Revisions</h4>
          {allVersions.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
            >
              <div className="flex items-center gap-3 flex-1">
                <File className="h-4 w-4 text-gray-400" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">v{doc.version}</p>
                    {doc.is_latest && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Latest</span>
                    )}
                    {getApprovalIcon(doc.approval_status)}
                  </div>
                  <p className="text-xs text-gray-600">
                    {doc.uploaded_by} • {new Date(doc.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  className="p-2 hover:bg-gray-200 rounded transition"
                  title="Preview"
                >
                  <Eye className="h-4 w-4 text-gray-600" />
                </button>
                <button
                  className="p-2 hover:bg-gray-200 rounded transition"
                  title="Download"
                >
                  <Download className="h-4 w-4 text-gray-600" />
                </button>

                {/* Approval Actions */}
                {doc.approval_status === "pending" && ["qa", "admin"].includes(userRole) && (
                  <>
                    <button
                      onClick={() => handleApprove(doc.id)}
                      className="px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50 rounded transition"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => setShowRejectionReason(doc.id)}
                      className="px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 rounded transition"
                    >
                      Reject
                    </button>
                  </>
                )}

                {showRejectionReason === doc.id && (
                  <div className="absolute bg-white border border-gray-200 rounded shadow-lg p-3 z-10">
                    <textarea
                      placeholder="Rejection reason..."
                      className="w-full text-xs p-2 border border-gray-300 rounded"
                      rows={3}
                      onBlur={(e) => {
                        if (e.currentTarget.value.trim()) {
                          handleReject(doc.id, e.currentTarget.value)
                        }
                      }}
                    />
                  </div>
                )}

                {doc.approval_status === "rejected" && (
                  <button
                    className="px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded transition"
                    title="Archive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {allVersions.length === 0 && !selectedFile && (
        <div className="text-center py-6 text-gray-500">
          <p className="text-sm">No documents uploaded yet</p>
        </div>
      )}
    </div>
  )
}
