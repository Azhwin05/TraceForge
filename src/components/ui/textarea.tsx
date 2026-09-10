import * as React from "react"

import { cn } from "@/lib/utils"
import { fieldBase } from "./field-styles"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        data-slot="textarea"
        className={cn(fieldBase, "min-h-[80px] resize-y px-2.5 py-2 text-sm", className)}
        {...props}
      />
    )
  }
)

export { Textarea }
