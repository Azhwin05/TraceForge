/**
 * Semantic status tones.
 *
 * Before this existed, status colour was written inline as `bg-green-100
 * text-green-700` in ~68 files. That made every status look slightly different
 * depending on who wrote it, and it hard-codes a light-mode palette, so none of
 * it survives a dark theme. Route status colour through these tokens instead.
 */
export type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "brand"

/** Filled chip — coloured surface, coloured text, matching hairline border. */
export const TONE_CHIP: Record<Tone, string> = {
  success: "bg-success-surface text-success border-success-border",
  warning: "bg-warning-surface text-warning border-warning-border",
  danger: "bg-danger-surface text-danger border-danger-border",
  info: "bg-info-surface text-info border-info-border",
  neutral: "bg-tone-surface text-tone border-tone-border",
  brand: "bg-brand-500/10 text-brand-700 border-brand-500/25 dark:text-brand-600",
}

/** Just the foreground colour — for icons and inline text. */
export const TONE_TEXT: Record<Tone, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
  neutral: "text-muted-foreground",
  brand: "text-brand-700 dark:text-brand-600",
}

/** Solid fill — for dots, bars and progress indicators. */
export const TONE_SOLID: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  neutral: "bg-tone",
  brand: "bg-brand-500",
}

/** Tinted icon plate — used by stat cards and section headers. */
export const TONE_PLATE: Record<Tone, string> = {
  success: "bg-success-surface text-success",
  warning: "bg-warning-surface text-warning",
  danger: "bg-danger-surface text-danger",
  info: "bg-info-surface text-info",
  neutral: "bg-tone-surface text-tone",
  brand: "bg-brand-500/10 text-brand-700 dark:text-brand-600",
}
