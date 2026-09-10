import Image from "next/image"

import { cn } from "@/lib/utils"

/**
 * The Raghav Engineering brand lockup: circular RE mark, wordmark, and the
 * "Since 2003" line. Replaces the "VT" placeholder square that stood in for the
 * real logo in the sidebar, mobile drawer, module hub and sign-in screen.
 *
 * The mark lives at /public/logo.png so it can be swapped without touching
 * layout code.
 */
export function BrandMark({
  className,
  size = 32,
  /**
   * Light circular backing. The logo is a deep red designed for white stock;
   * placed straight onto the near-black sidebar it composites to roughly
   * rgb(110,5,8), which is 1.5:1 against that background — far below the 3:1
   * a graphic needs, and visibly a dark smudge. The plate restores it to 12:1.
   */
  plate = false,
}: {
  className?: string
  size?: number
  plate?: boolean
}) {
  const img = (
    <Image
      src="/logo.png"
      alt="Raghav Engineering"
      width={size}
      height={size}
      priority
      quality={90}
      className="shrink-0 object-contain"
      style={{ width: plate ? Math.round(size * 0.76) : size, height: plate ? Math.round(size * 0.76) : size }}
    />
  )

  if (!plate) return <span className={cn("shrink-0", className)}>{img}</span>

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-inset ring-black/10",
        className
      )}
      style={{ width: size, height: size }}
    >
      {img}
    </span>
  )
}

export function BrandLockup({
  /** Light text for dark surfaces (sidebar, sign-in panel); dark for light ones. */
  tone = "light",
  size = 34,
  showTagline = true,
  className,
}: {
  tone?: "light" | "dark"
  size?: number
  showTagline?: boolean
  className?: string
}) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", className)}>
      {/* Dark surfaces get the plate; on light ones the logo already reads. */}
      <BrandMark size={size} plate={tone === "light"} />

      {/* Hairline rule between mark and wordmark, as in the brand lockup */}
      <span
        aria-hidden
        className={cn(
          "h-7 w-px shrink-0",
          tone === "light" ? "bg-white/15" : "bg-border"
        )}
      />

      <span className="min-w-0 leading-none">
        <span
          className={cn(
            "block truncate text-[0.9375rem] font-semibold tracking-tight",
            tone === "light" ? "text-white" : "text-foreground"
          )}
        >
          Raghav{" "}
          <span
            className={
              tone === "light" ? "font-normal text-white/85" : "font-normal text-muted-foreground"
            }
          >
            Engineering
          </span>
        </span>
        {showTagline && (
          <span
            className={cn(
              "mt-1 block truncate text-[0.5625rem] uppercase tracking-[0.28em]",
              tone === "light" ? "text-white/45" : "text-muted-foreground"
            )}
          >
            Since 2003
          </span>
        )}
      </span>
    </span>
  )
}
