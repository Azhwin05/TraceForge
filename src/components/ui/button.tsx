import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Rewritten for Tailwind v3. The previous definition was copied from shadcn's
 * v4 registry and leaned on `ring-3`, `in-data-[…]` and `not-aria-[…]`, none of
 * which exist in v3 — so buttons shipped with no focus ring, no hover state on
 * the primary variant, and a fully transparent destructive variant.
 */
const buttonVariants = cva(
  [
    "group/button relative inline-flex shrink-0 select-none items-center justify-center gap-1.5",
    "whitespace-nowrap rounded-md border border-transparent text-sm font-medium",
    "transition-[background-color,border-color,color,box-shadow,transform] duration-120 ease-out",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-brand-800 active:bg-brand-900 active:translate-y-px",
        accent:
          "bg-accent text-accent-foreground shadow-xs hover:bg-brand-600 active:bg-brand-700 active:translate-y-px",
        outline:
          "border-border bg-surface text-foreground shadow-xs hover:border-border-strong hover:bg-muted active:translate-y-px",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-neutral-200 active:translate-y-px",
        ghost:
          "text-muted-foreground hover:bg-muted hover:text-foreground active:translate-y-px",
        // `text-neutral-0` auto-inverts: white in light mode, near-black in
        // dark, so the label stays legible on the lighter dark-mode green.
        success:
          "bg-success text-neutral-0 shadow-xs hover:bg-success/90 active:translate-y-px focus-visible:ring-success/50",
        destructive:
          "bg-destructive text-destructive-foreground shadow-xs hover:bg-danger/90 active:translate-y-px focus-visible:ring-danger/50",
        "destructive-soft":
          "bg-danger-surface text-danger border-danger-border hover:bg-danger/15 active:translate-y-px focus-visible:ring-danger/50",
        link: "h-auto p-0 text-primary underline-offset-4 hover:underline",
      },
      size: {
        xs: "h-6 gap-1 rounded px-2 text-2xs [&_svg]:h-3 [&_svg]:w-3",
        sm: "h-7 rounded px-2.5 text-xs [&_svg]:h-3.5 [&_svg]:w-3.5",
        default: "h-8 px-3 [&_svg]:h-4 [&_svg]:w-4",
        lg: "h-9 px-4 text-md [&_svg]:h-4 [&_svg]:w-4",
        xl: "h-11 rounded-lg px-6 text-md [&_svg]:h-4 [&_svg]:w-4",
        icon: "h-8 w-8 [&_svg]:h-4 [&_svg]:w-4",
        "icon-xs": "h-6 w-6 rounded [&_svg]:h-3 [&_svg]:w-3",
        "icon-sm": "h-7 w-7 rounded [&_svg]:h-3.5 [&_svg]:w-3.5",
        "icon-lg": "h-9 w-9 [&_svg]:h-4 [&_svg]:w-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
