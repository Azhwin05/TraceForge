import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"
import { fieldBase, fieldSize } from "./field-styles"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  function Input({ className, type, ...props }, ref) {
    return (
      <InputPrimitive
        ref={ref}
        type={type}
        data-slot="input"
        className={cn(
          fieldBase,
          fieldSize,
          "min-w-0",
          "file:mr-2 file:inline-flex file:h-6 file:cursor-pointer file:rounded file:border-0 file:bg-secondary file:px-2 file:text-xs file:font-medium file:text-secondary-foreground",
          // Date/time pickers render a near-invisible indicator in dark mode
          "[&::-webkit-calendar-picker-indicator]:cursor-pointer dark:[&::-webkit-calendar-picker-indicator]:invert",
          className
        )}
        {...props}
      />
    )
  }
)

export { Input }
