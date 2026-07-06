import { STATUS_ORDER, STATUS_LABEL, statusBadgeClass } from "@/lib/portal/status"
import type { JobCardStatus } from "@/types/database"

const ALL_STATUSES: JobCardStatus[] = [
  "created", "wps_pending", "wps_uploaded", "wps_approved",
  "process_assigned", "in_process", "process_complete",
  "reports_pending", "reports_complete", "dispatch_ready",
  "dispatched", "accounts_processing", "closed", "on_hold",
]

describe("portal status metadata", () => {
  it("labels every job status (incl. on_hold)", () => {
    for (const s of ALL_STATUSES) {
      expect(STATUS_LABEL[s]).toBeTruthy()
    }
  })

  it("timeline order excludes on_hold and covers the 13 linear states", () => {
    expect(STATUS_ORDER).toHaveLength(13)
    expect(STATUS_ORDER).not.toContain("on_hold")
    // order starts at created and ends at closed
    expect(STATUS_ORDER[0]).toBe("created")
    expect(STATUS_ORDER[STATUS_ORDER.length - 1]).toBe("closed")
  })

  it("returns a badge class for every status", () => {
    for (const s of ALL_STATUSES) {
      expect(typeof statusBadgeClass(s)).toBe("string")
      expect(statusBadgeClass(s).length).toBeGreaterThan(0)
    }
  })
})
