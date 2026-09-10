"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme()

  return (
    <Sonner
      theme={(resolvedTheme as ToasterProps["theme"]) ?? "light"}
      className="toaster group"
      offset={16}
      gap={10}
      icons={{
        success: <CircleCheckIcon className="h-4 w-4 text-success" />,
        info: <InfoIcon className="h-4 w-4 text-info" />,
        warning: <TriangleAlertIcon className="h-4 w-4 text-warning" />,
        error: <OctagonXIcon className="h-4 w-4 text-danger" />,
        loading: <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" />,
      }}
      style={
        {
          // Tokens are RGB channel triplets, so they must be wrapped in rgb()
          // before being handed to a plain CSS custom property.
          "--normal-bg": "rgb(var(--popover))",
          "--normal-text": "rgb(var(--popover-foreground))",
          "--normal-border": "rgb(var(--border))",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "group toast flex items-center gap-3 rounded-lg border border-border bg-popover px-4 py-3 text-sm text-popover-foreground shadow-popover",
          title: "font-medium leading-snug",
          description: "text-xs text-muted-foreground leading-relaxed",
          actionButton:
            "rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground",
          cancelButton:
            "rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
