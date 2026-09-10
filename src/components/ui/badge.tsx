import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * `rounded-4xl` (v4-only) meant these rendered as sharp rectangles in this
 * v3 project. Tone variants map to the semantic tokens in lib/tone.ts so status
 * colour stops being hand-written per file.
 */
const badgeVariants = cva(
  [
    "inline-flex w-fit shrink-0 items-center justify-center gap-1 whitespace-nowrap",
    "rounded-full border font-medium leading-none transition-colors duration-120",
    "focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
    "[&>svg]:pointer-events-none [&>svg]:h-3 [&>svg]:w-3",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border bg-surface text-foreground",
        success: "bg-success-surface text-success border-success-border",
        warning: "bg-warning-surface text-warning border-warning-border",
        danger: "bg-danger-surface text-danger border-danger-border",
        destructive: "bg-danger-surface text-danger border-danger-border",
        info: "bg-info-surface text-info border-info-border",
        neutral: "bg-tone-surface text-tone border-tone-border",
        brand:
          "bg-brand-500/10 text-brand-700 border-brand-500/25 dark:text-brand-600",
        ghost: "border-transparent text-muted-foreground hover:bg-muted",
      },
      size: {
        sm: "h-4 px-1.5 text-2xs",
        default: "h-5 px-2 text-xs",
        lg: "h-6 px-2.5 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Badge({
  className,
  variant,
  size,
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      { className: cn(badgeVariants({ variant, size }), className) },
      props
    ),
    render,
    state: { slot: "badge", variant },
  })
}

export { Badge, badgeVariants }
