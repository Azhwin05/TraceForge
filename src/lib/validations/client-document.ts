import { z } from "zod"

/**
 * Admin-to-client PDF handoff. One document, one client, PDF only — the
 * client meeting was explicit that this is not a reusable/multi-assign doc
 * like the client-logo carousel or a shared catalog.
 */
export const clientDocumentSchema = z.object({
  client_id:    z.string().uuid("Select a client"),
  title:        z.string().min(1, "Title is required").max(200),
  description:  z.string().max(2000).nullish(),
  label:        z.string().max(80).nullish(),
  // Admin-entered bill/invoice date, independent of when the file happened
  // to be uploaded. Optional — not every client document is an invoice.
  bill_date:    z.string().nullish().or(z.literal("")),
})

export type ClientDocumentInput = z.infer<typeof clientDocumentSchema>
