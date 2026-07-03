import { parseChartCsv, MAX_CHART_READINGS } from "@/lib/pwht/chart-csv"

describe("parseChartCsv", () => {
  const base = new Date("2026-06-30T08:00:00Z")

  it("parses time,temperature lines", () => {
    const res = parseChartCsv(
      "2026-06-30T10:00:00Z,180.5\n2026-06-30T10:15:00Z,220",
      { baseTime: base },
    )
    expect(res.error).toBeNull()
    expect(res.readings).toHaveLength(2)
    expect(res.readings![0].temperature_c).toBe(180.5)
    expect(res.readings![0].channel).toBe("TC1")
  })

  it("parses time,channel,temperature lines", () => {
    const res = parseChartCsv("2026-06-30T10:00:00Z,TC2,300", { baseTime: base })
    expect(res.error).toBeNull()
    expect(res.readings![0].channel).toBe("TC2")
    expect(res.readings![0].temperature_c).toBe(300)
  })

  it("parses elapsed-minutes relative to base time", () => {
    const res = parseChartCsv("0,30\n15,180\n30,350", { baseTime: base })
    expect(res.error).toBeNull()
    expect(res.readings).toHaveLength(3)
    expect(res.readings![1].recorded_at).toBe(
      new Date(base.getTime() + 15 * 60_000).toISOString(),
    )
  })

  it("skips a header row", () => {
    const res = parseChartCsv("Time,Temperature\n0,100", { baseTime: base })
    expect(res.error).toBeNull()
    expect(res.readings).toHaveLength(1)
  })

  it("skips malformed lines but keeps good ones", () => {
    const res = parseChartCsv("0,100\ngarbage-line\n5,abc\n10,200", { baseTime: base })
    expect(res.error).toBeNull()
    expect(res.readings).toHaveLength(2)
    expect(res.skipped).toBe(2)
  })

  it("rejects out-of-range temperatures", () => {
    const res = parseChartCsv("0,5000\n5,-100", { baseTime: base })
    expect(res.error).not.toBeNull()
  })

  it("rejects empty input", () => {
    expect(parseChartCsv("").error).not.toBeNull()
    expect(parseChartCsv("   \n  ").error).not.toBeNull()
  })

  it("enforces the maximum reading count", () => {
    const lines = Array.from({ length: MAX_CHART_READINGS + 2 }, (_, i) => `${i},100`).join("\n")
    const res = parseChartCsv(lines, { baseTime: base })
    expect(res.error).toMatch(/maximum/i)
  })

  it("supports semicolon and tab separators", () => {
    const res = parseChartCsv("0;150\n5\t250", { baseTime: base })
    expect(res.error).toBeNull()
    expect(res.readings).toHaveLength(2)
  })
})
