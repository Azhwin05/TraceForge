import { validateFileSignature, matchesSignature, kindForFileName } from "@/lib/documents/file-signature"

function bytes(...b: number[]): Uint8Array {
  return new Uint8Array(b)
}

describe("kindForFileName", () => {
  it("maps known extensions", () => {
    expect(kindForFileName("chart.pdf")).toBe("pdf")
    expect(kindForFileName("photo.JPG")).toBe("jpeg")
    expect(kindForFileName("report.docx")).toBe("office")
    expect(kindForFileName("data.csv")).toBe("csv-or-text")
  })

  it("rejects unknown extensions", () => {
    expect(kindForFileName("malware.exe")).toBeNull()
    expect(kindForFileName("script.sh")).toBeNull()
    expect(kindForFileName("noextension")).toBeNull()
  })
})

describe("matchesSignature", () => {
  it("accepts a real PDF header", () => {
    expect(matchesSignature(bytes(0x25, 0x50, 0x44, 0x46, 0x2d), "pdf")).toBe(true)
  })

  it("rejects a PE executable pretending to be a PDF", () => {
    // 'MZ' — Windows executable header
    expect(matchesSignature(bytes(0x4d, 0x5a, 0x90, 0x00), "pdf")).toBe(false)
  })

  it("accepts PNG / JPEG / WEBP signatures", () => {
    expect(matchesSignature(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), "png")).toBe(true)
    expect(matchesSignature(bytes(0xff, 0xd8, 0xff, 0xe0), "jpeg")).toBe(true)
    expect(
      matchesSignature(
        bytes(0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50),
        "webp",
      ),
    ).toBe(true)
  })

  it("accepts docx (ZIP) and legacy doc (OLE)", () => {
    expect(matchesSignature(bytes(0x50, 0x4b, 0x03, 0x04), "office")).toBe(true)
    expect(matchesSignature(bytes(0xd0, 0xcf, 0x11, 0xe0), "office")).toBe(true)
  })

  it("accepts plain text CSV and rejects binary content", () => {
    const csv = "time,temp\n0,100\n5,200\n"
    const text = new Uint8Array(csv.split("").map((c) => c.charCodeAt(0)))
    expect(matchesSignature(text, "csv-or-text")).toBe(true)
    expect(matchesSignature(bytes(0x00, 0x01, 0x02, 0x03), "csv-or-text")).toBe(false)
  })
})

describe("validateFileSignature", () => {
  it("returns null for a valid PDF", () => {
    expect(validateFileSignature("wps.pdf", bytes(0x25, 0x50, 0x44, 0x46))).toBeNull()
  })

  it("rejects a renamed executable", () => {
    const err = validateFileSignature("report.pdf", bytes(0x4d, 0x5a, 0x90, 0x00))
    expect(err).toMatch(/does not match/i)
  })

  it("rejects disallowed extensions outright", () => {
    const err = validateFileSignature("payload.exe", bytes(0x4d, 0x5a))
    expect(err).toMatch(/not allowed/i)
  })
})
