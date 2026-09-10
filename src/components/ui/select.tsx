import * as React from "react"

import { cn } from "@/lib/utils"
import { fieldBase, fieldSize } from "./field-styles"

const Select = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        data-slot="select"
        className={cn(
          fieldBase,
          fieldSize,
          // Native chevron is inconsistent across platforms; draw our own so the
          // control matches the rest of the system on Windows shop terminals.
          "cursor-pointer appearance-none bg-[length:14px] bg-[right_0.5rem_center] bg-no-repeat pr-8",
          "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')]",
          className
        )}
        {...props}
      >
        {children}
      </select>
    )
  }
)

export { Select }
