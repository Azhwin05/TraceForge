import { z } from "zod"

export const AIR_TEST_RESULTS = ["pending", "pass", "fail"] as const

export const airTestSchema = z.object({
  tester_name: z.string().optional(),
  pressure:    z.string().optional(),
  duration:    z.string().optional(),
  result:      z.enum(AIR_TEST_RESULTS).default("pending"),
  notes:       z.string().optional(),
})

export type AirTestInput = z.input<typeof airTestSchema>

export const BLANK_AIR_TEST: AirTestInput = {
  tester_name: "", pressure: "", duration: "", result: "pending", notes: "",
}
