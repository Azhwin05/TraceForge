import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin"
import { sanitizeError } from "@/lib/security"

/**
 * Fallback trigger for the Recycle Bin purge, for hosts where the DB's
 * pg_cron schedule (migration 0042) isn't available. Point any external
 * scheduler (Vercel Cron, a cron-job.info ping, etc.) at this route with:
 *   Authorization: Bearer <CRON_SECRET>
 * Set CRON_SECRET in the environment before relying on this — it's blank by
 * default, which this route treats as "not configured" and refuses to run.
 *
 * Uses the service-role client (no user session exists in a cron request);
 * purge_expired_job_cards() already checks auth.uid() IS NULL for this
 * trusted-system case, so this bypasses the "must be admin" check safely —
 * the CRON_SECRET check above is what actually gates this route.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get("authorization")

  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 })
  }
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not configured" }, { status: 503 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc("purge_expired_job_cards")

  if (error) {
    console.error("[cron] purge_expired_job_cards", error)
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
  }

  const rows = (data ?? []) as { purged_id: string; jc_number: string; skipped: boolean; reason: string | null }[]
  return NextResponse.json({
    purged: rows.filter((r) => !r.skipped).length,
    skipped: rows.filter((r) => r.skipped).length,
    details: rows,
  })
}
