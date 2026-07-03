// Server-side file signature (magic byte) validation.
// The client's MIME type and extension are advisory only — this verifies the
// actual bytes match a permitted document format.
// Pure module — unit-testable without server deps.

export type AllowedKind = "pdf" | "png" | "jpeg" | "webp" | "office" | "csv-or-text"

const EXTENSION_KIND: Record<string, AllowedKind> = {
  pdf: "pdf",
  png: "png",
  jpg: "jpeg",
  jpeg: "jpeg",
  webp: "webp",
  doc: "office",
  docx: "office",
  xls: "office",
  xlsx: "office",
  csv: "csv-or-text",
  txt: "csv-or-text",
}

export function kindForFileName(fileName: string): AllowedKind | null {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? ""
  return EXTENSION_KIND[ext] ?? null
}

function startsWith(bytes: Uint8Array, sig: number[], offset = 0): boolean {
  if (bytes.length < offset + sig.length) return false
  return sig.every((b, i) => bytes[offset + i] === b)
}

/** Validates that the leading bytes of a file match its claimed extension. */
export function matchesSignature(bytes: Uint8Array, kind: AllowedKind): boolean {
  switch (kind) {
    case "pdf":
      return startsWith(bytes, [0x25, 0x50, 0x44, 0x46]) // %PDF
    case "png":
      return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    case "jpeg":
      return startsWith(bytes, [0xff, 0xd8, 0xff])
    case "webp":
      // RIFF....WEBP
      return startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
    case "office":
      // Modern Office (docx/xlsx) = ZIP container; legacy = OLE compound file
      return startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) || startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0])
    case "csv-or-text": {
      // No signature — require the sample to be printable text (no NUL bytes,
      // predominantly ASCII/UTF-8) which rules out disguised binaries.
      const sample = bytes.subarray(0, Math.min(bytes.length, 1024))
      if (sample.length === 0) return false
      let suspicious = 0
      for (let i = 0; i < sample.length; i++) {
        const b = sample[i]
        if (b === 0) return false
        if (b < 9 || (b > 13 && b < 32)) suspicious++
      }
      return suspicious / sample.length < 0.05
    }
  }
}

/**
 * Full check: extension must be in the allowlist AND the bytes must match.
 * Returns an error message, or null when the file is acceptable.
 */
export function validateFileSignature(fileName: string, bytes: Uint8Array): string | null {
  const kind = kindForFileName(fileName)
  if (!kind) {
    return `File type not allowed: .${fileName.split(".").pop() ?? "?"}. Allowed: pdf, png, jpg, webp, doc(x), xls(x), csv, txt.`
  }
  if (!matchesSignature(bytes, kind)) {
    return "File content does not match its extension — the upload was rejected."
  }
  return null
}
