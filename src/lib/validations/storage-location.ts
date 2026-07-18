import { z } from "zod"

export const storageLocationSchema = z.object({
  code:         z.string().min(1, "Code is required"),
  name:         z.string().min(1, "Name is required"),
  description:  z.string().nullish(),
})

export type StorageLocationInput = z.infer<typeof storageLocationSchema>
