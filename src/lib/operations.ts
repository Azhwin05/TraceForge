import type { OperationType, MachineCategory } from "@/types/database"

// Canonical shop-floor operation order (matches the client's process flow):
// Pre-Machining → Welding → Final Machining → Milling → Slitting → Deburring
export const OPERATION_ORDER: OperationType[] = [
  "pre_machining",
  "welding",
  "final_machining",
  "milling",
  "slitting",
  "deburring",
]

export const OPERATION_LABELS: Record<OperationType, string> = {
  pre_machining:   "Pre-Machining",
  welding:         "Welding",
  final_machining: "Final Machining",
  milling:         "Milling",
  slitting:        "Slitting",
  deburring:       "Deburring",
}

// Which machine category an operation draws from.
export const OPERATION_MACHINE_CATEGORY: Record<OperationType, MachineCategory> = {
  pre_machining:   "machining",
  welding:         "welding",
  final_machining: "machining",
  milling:         "machining",
  slitting:        "machining",
  deburring:       "machining",
}

export function operationLabel(op: OperationType | null | undefined): string {
  if (!op) return "Other"
  return OPERATION_LABELS[op] ?? op
}
