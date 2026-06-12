import { Resend } from "resend"
import type { JobCardStatus } from "@/types/database"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL ?? "ValveTrack <noreply@valvetrack.in>"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

const STATUS_LABELS: Partial<Record<JobCardStatus, string>> = {
  wps_pending: "WPS Pending",
  wps_uploaded: "WPS Uploaded",
  wps_approved: "WPS Approved",
  process_assigned: "Process Assigned",
  in_process: "In Process",
  process_complete: "Process Complete",
  reports_pending: "Reports Pending",
  reports_complete: "Reports Complete",
  dispatch_ready: "Ready for Dispatch",
  dispatched: "Dispatched",
  accounts_processing: "Accounts Processing",
  closed: "Closed",
  on_hold: "On Hold",
}

function isEmailEnabled() {
  return !!process.env.RESEND_API_KEY
}

export async function sendJobCardStatusEmail({
  to,
  jcNumber,
  jobCardId,
  clientName,
  newStatus,
  changedBy,
}: {
  to: string | string[]
  jcNumber: string
  jobCardId: string
  clientName: string
  newStatus: JobCardStatus
  changedBy: string
}) {
  if (!isEmailEnabled()) return

  const statusLabel = STATUS_LABELS[newStatus] ?? newStatus
  const jobUrl = `${APP_URL}/job-cards/${jobCardId}`

  await resend.emails.send({
    from: FROM,
    to: Array.isArray(to) ? to : [to],
    subject: `[ValveTrack] ${jcNumber} → ${statusLabel}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Job Card Status Update</h2>
        <table style="width:100%; border-collapse:collapse; margin: 16px 0;">
          <tr><td style="padding:8px; color:#666; width:140px;">Job Card</td><td style="padding:8px; font-weight:600; font-family:monospace;">${jcNumber}</td></tr>
          <tr style="background:#f9f9f9;"><td style="padding:8px; color:#666;">Client</td><td style="padding:8px;">${clientName}</td></tr>
          <tr><td style="padding:8px; color:#666;">New Status</td><td style="padding:8px; font-weight:600; color:#0070f3;">${statusLabel}</td></tr>
          <tr style="background:#f9f9f9;"><td style="padding:8px; color:#666;">Changed By</td><td style="padding:8px;">${changedBy}</td></tr>
        </table>
        <a href="${jobUrl}" style="display:inline-block; background:#0070f3; color:#fff; padding:10px 20px; border-radius:6px; text-decoration:none; font-weight:600;">
          View Job Card
        </a>
        <p style="color:#999; font-size:12px; margin-top:24px;">ValveTrack · Raghav Engineering</p>
      </div>
    `,
  })
}

export async function sendNewJobCardEmail({
  to,
  jcNumber,
  jobCardId,
  clientName,
  description,
  createdBy,
}: {
  to: string | string[]
  jcNumber: string
  jobCardId: string
  clientName: string
  description: string
  createdBy: string
}) {
  if (!isEmailEnabled()) return

  const jobUrl = `${APP_URL}/job-cards/${jobCardId}`

  await resend.emails.send({
    from: FROM,
    to: Array.isArray(to) ? to : [to],
    subject: `[ValveTrack] New Job Card Created: ${jcNumber}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">New Job Card Created</h2>
        <table style="width:100%; border-collapse:collapse; margin: 16px 0;">
          <tr><td style="padding:8px; color:#666; width:140px;">Job Card</td><td style="padding:8px; font-weight:600; font-family:monospace;">${jcNumber}</td></tr>
          <tr style="background:#f9f9f9;"><td style="padding:8px; color:#666;">Client</td><td style="padding:8px;">${clientName}</td></tr>
          <tr><td style="padding:8px; color:#666;">Description</td><td style="padding:8px;">${description}</td></tr>
          <tr style="background:#f9f9f9;"><td style="padding:8px; color:#666;">Created By</td><td style="padding:8px;">${createdBy}</td></tr>
        </table>
        <a href="${jobUrl}" style="display:inline-block; background:#0070f3; color:#fff; padding:10px 20px; border-radius:6px; text-decoration:none; font-weight:600;">
          View Job Card
        </a>
        <p style="color:#999; font-size:12px; margin-top:24px;">ValveTrack · Raghav Engineering</p>
      </div>
    `,
  })
}

export async function sendOverdueAlertEmail({
  to,
  overdueJobs,
}: {
  to: string | string[]
  overdueJobs: Array<{ jcNumber: string; id: string; clientName: string; daysAtStage: number; status: string }>
}) {
  if (!isEmailEnabled() || overdueJobs.length === 0) return

  const rows = overdueJobs
    .map(
      (jc) =>
        `<tr><td style="padding:8px; font-family:monospace;">${jc.jcNumber}</td>
         <td style="padding:8px;">${jc.clientName}</td>
         <td style="padding:8px; color:#e65;">${jc.daysAtStage}d</td>
         <td style="padding:8px;">${jc.status.replace(/_/g, " ")}</td></tr>`
    )
    .join("")

  await resend.emails.send({
    from: FROM,
    to: Array.isArray(to) ? to : [to],
    subject: `[ValveTrack] ${overdueJobs.length} overdue job${overdueJobs.length !== 1 ? "s" : ""} need attention`,
    html: `
      <div style="font-family: sans-serif; max-width: 700px; margin: 0 auto;">
        <h2 style="color: #c0392b;">Overdue Jobs Alert</h2>
        <p style="color:#666;">${overdueJobs.length} job card${overdueJobs.length !== 1 ? "s are" : " is"} overdue and require attention.</p>
        <table style="width:100%; border-collapse:collapse; margin:16px 0; font-size:13px;">
          <thead>
            <tr style="background:#f0f0f0;">
              <th style="padding:8px; text-align:left;">JC Number</th>
              <th style="padding:8px; text-align:left;">Client</th>
              <th style="padding:8px; text-align:left;">Days Overdue</th>
              <th style="padding:8px; text-align:left;">Status</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <a href="${APP_URL}/alerts" style="display:inline-block; background:#c0392b; color:#fff; padding:10px 20px; border-radius:6px; text-decoration:none; font-weight:600;">
          View Alerts
        </a>
        <p style="color:#999; font-size:12px; margin-top:24px;">ValveTrack · Raghav Engineering</p>
      </div>
    `,
  })
}
