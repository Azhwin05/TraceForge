import { z } from "zod"

export const dossierSchema = z.object({
  dossier_number:  z.string().min(1, "Dossier number is required"),
  dossier_date:    z.string().min(1, "Dossier date is required"),
  customer_name:   z.string().nullable().default(null),
  po_number:       z.string().nullable().default(null),
  nbdn_number:     z.string().nullable().default(null),
  drawing_number:  z.string().nullable().default(null),
  heat_number:     z.string().nullable().default(null),
  prepared_by:     z.string().nullable().default(null),
  approved_by:     z.string().nullable().default(null),
  remarks:         z.string().nullable().default(null),
  document_ids:    z.array(z.string().uuid()).min(1, "Select at least one document"),
})

export type DossierInput = z.input<typeof dossierSchema>
export type DossierOutput = z.output<typeof dossierSchema>
