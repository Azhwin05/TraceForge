// Parser for PWHT chart recorder CSV exports.
//
// Accepted shapes (header row optional, case-insensitive):
//   time,temperature            → "2026-06-30T10:00:00Z,180.5"
//   time,channel,temperature    → "2026-06-30T10:00:00Z,TC2,180.5"
//   elapsed_minutes,temperature → "0,30" / "15,180" (relative to a base time)
//
// Pure module — no server/Supabase imports — so it is unit-testable.

export type ParsedReading = {
  recorded_at: string // ISO timestamp
  channel: string
  temperature_c: number
}

export type ChartCsvResult =
  | { readings: ParsedReading[]; skipped: number; error: null }
  | { readings: null; skipped: 0; error: string }

export const MAX_CHART_READINGS = 5000

const HEADER_WORDS = ["time", "timestamp", "date", "elapsed", "minutes", "temp", "temperature", "channel", "tc"]

function isHeaderLine(line: string): boolean {
  const lower = line.toLowerCase()
  return HEADER_WORDS.some((w) => lower.includes(w)) && !/\d{2,}/.test(lower)
}

function parseTemperature(raw: string): number | null {
  const t = Number(raw.trim())
  if (!Number.isFinite(t)) return null
  // Sanity window for PWHT furnace temperatures
  if (t < -50 || t > 2000) return null
  return t
}

export function parseChartCsv(
  csvText: string,
  opts?: { baseTime?: Date; defaultChannel?: string },
): ChartCsvResult {
  if (!csvText || !csvText.trim()) {
    return { readings: null, skipped: 0, error: "The file is empty." }
  }

  const baseTime = opts?.baseTime ?? new Date()
  const defaultChannel = (opts?.defaultChannel ?? "TC1").trim() || "TC1"

  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const readings: ParsedReading[] = []
  let skipped = 0

  for (const line of lines) {
    if (isHeaderLine(line)) continue

    const parts = line.split(/[,;\t]/).map((p) => p.trim())
    if (parts.length < 2) { skipped++; continue }

    let timePart: string
    let channel = defaultChannel
    let tempPart: string

    if (parts.length >= 3 && /^[A-Za-z]/.test(parts[1])) {
      // time, channel, temperature
      timePart = parts[0]; channel = parts[1]; tempPart = parts[2]
    } else {
      // time, temperature
      timePart = parts[0]; tempPart = parts[1]
    }

    const temperature = parseTemperature(tempPart)
    if (temperature === null) { skipped++; continue }

    let recordedAt: Date
    if (/^\d+(\.\d+)?$/.test(timePart)) {
      // Elapsed minutes relative to base time
      recordedAt = new Date(baseTime.getTime() + Number(timePart) * 60_000)
    } else {
      recordedAt = new Date(timePart)
      if (Number.isNaN(recordedAt.getTime())) { skipped++; continue }
    }

    readings.push({
      recorded_at: recordedAt.toISOString(),
      channel: channel.slice(0, 20),
      temperature_c: temperature,
    })

    if (readings.length > MAX_CHART_READINGS) {
      return {
        readings: null,
        skipped: 0,
        error: `Too many readings — the maximum per import is ${MAX_CHART_READINGS}.`,
      }
    }
  }

  if (readings.length === 0) {
    return { readings: null, skipped: 0, error: "No valid readings found. Expected lines like 'time,temperature'." }
  }

  return { readings, skipped, error: null }
}
