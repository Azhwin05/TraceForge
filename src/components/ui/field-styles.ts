/**
 * Shared visual contract for text-entry controls (input, textarea, select) so
 * they line up pixel-for-pixel when placed side by side in a form row.
 */
export const fieldBase = [
  "w-full rounded-md border border-input bg-surface text-foreground",
  "transition-[border-color,box-shadow,background-color] duration-120 ease-out",
  "placeholder:text-muted-foreground/70",
  "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-0",
  "hover:border-border-strong focus-visible:hover:border-ring",
  "disabled:pointer-events-none disabled:bg-muted disabled:opacity-60",
  "aria-[invalid=true]:border-danger aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-danger/25",
].join(" ")

/** Matches Button's `default` size so inputs and buttons align in a toolbar. */
export const fieldSize = "h-8 px-2.5 py-1 text-sm"
