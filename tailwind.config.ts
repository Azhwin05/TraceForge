import type { Config } from "tailwindcss"
import animate from "tailwindcss-animate"

/**
 * Every colour is declared as `rgb(var(--token) / <alpha-value>)`.
 * The `<alpha-value>` placeholder is what lets Tailwind v3 generate opacity
 * modifiers (bg-primary/80, ring-ring/50). Declaring a token as a bare
 * `var(--token)` silently drops every one of those utilities.
 */
const withAlpha = (token: string) => `rgb(var(${token}) / <alpha-value>)`

const ramp = (name: string) => ({
  50: withAlpha(`--${name}-50`),
  100: withAlpha(`--${name}-100`),
  200: withAlpha(`--${name}-200`),
  300: withAlpha(`--${name}-300`),
  400: withAlpha(`--${name}-400`),
  500: withAlpha(`--${name}-500`),
  600: withAlpha(`--${name}-600`),
  700: withAlpha(`--${name}-700`),
  800: withAlpha(`--${name}-800`),
  900: withAlpha(`--${name}-900`),
  950: withAlpha(`--${name}-950`),
})

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  future: { hoverOnlyWhenSupported: true },
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-geist-sans)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "var(--font-geist-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },

      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.01em" }],
        xs: ["0.75rem", { lineHeight: "1.125rem" }],
        sm: ["0.8125rem", { lineHeight: "1.25rem" }],
        base: ["0.875rem", { lineHeight: "1.375rem" }],
        md: ["0.9375rem", { lineHeight: "1.5rem" }],
        lg: ["1.0625rem", { lineHeight: "1.625rem", letterSpacing: "-0.01em" }],
        xl: ["1.25rem", { lineHeight: "1.75rem", letterSpacing: "-0.015em" }],
        "2xl": ["1.5rem", { lineHeight: "2rem", letterSpacing: "-0.02em" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem", letterSpacing: "-0.025em" }],
        "4xl": ["2.25rem", { lineHeight: "2.5rem", letterSpacing: "-0.03em" }],
        "5xl": ["3rem", { lineHeight: "1.1", letterSpacing: "-0.035em" }],
      },

      colors: {
        neutral: ramp("neutral"),
        brand: {
          ...ramp("brand"),
          // Legacy aliases — these names are used across ~68 files; keeping them
          // pointed at the ramp avoids a risky find-and-replace of working code.
          DEFAULT: withAlpha("--brand-700"),
          primary: withAlpha("--brand-700"),
          accent: withAlpha("--brand-500"),
          sidebar: withAlpha("--sidebar"),
          blocked: withAlpha("--danger"),
          cleared: withAlpha("--success"),
          warning: withAlpha("--warning"),
        },

        background: withAlpha("--background"),
        foreground: withAlpha("--foreground"),
        surface: {
          DEFAULT: withAlpha("--surface"),
          foreground: withAlpha("--surface-foreground"),
          raised: withAlpha("--surface-raised"),
          sunken: withAlpha("--surface-sunken"),
        },
        card: {
          DEFAULT: withAlpha("--card"),
          foreground: withAlpha("--card-foreground"),
        },
        popover: {
          DEFAULT: withAlpha("--popover"),
          foreground: withAlpha("--popover-foreground"),
        },
        primary: {
          DEFAULT: withAlpha("--primary"),
          foreground: withAlpha("--primary-foreground"),
        },
        secondary: {
          DEFAULT: withAlpha("--secondary"),
          foreground: withAlpha("--secondary-foreground"),
        },
        muted: {
          DEFAULT: withAlpha("--muted"),
          foreground: withAlpha("--muted-foreground"),
        },
        accent: {
          DEFAULT: withAlpha("--accent"),
          foreground: withAlpha("--accent-foreground"),
        },
        destructive: {
          DEFAULT: withAlpha("--destructive"),
          foreground: withAlpha("--destructive-foreground"),
        },

        success: {
          DEFAULT: withAlpha("--success"),
          surface: withAlpha("--success-surface"),
          border: withAlpha("--success-border"),
        },
        warning: {
          DEFAULT: withAlpha("--warning"),
          surface: withAlpha("--warning-surface"),
          border: withAlpha("--warning-border"),
        },
        danger: {
          DEFAULT: withAlpha("--danger"),
          surface: withAlpha("--danger-surface"),
          border: withAlpha("--danger-border"),
        },
        info: {
          DEFAULT: withAlpha("--info"),
          surface: withAlpha("--info-surface"),
          border: withAlpha("--info-border"),
        },
        tone: {
          DEFAULT: withAlpha("--neutral-tone"),
          surface: withAlpha("--neutral-surface"),
          border: withAlpha("--neutral-border"),
        },

        border: {
          DEFAULT: withAlpha("--border"),
          strong: withAlpha("--border-strong"),
        },
        input: withAlpha("--input"),
        ring: withAlpha("--ring"),

        chart: {
          1: withAlpha("--chart-1"),
          2: withAlpha("--chart-2"),
          3: withAlpha("--chart-3"),
          4: withAlpha("--chart-4"),
          5: withAlpha("--chart-5"),
          6: withAlpha("--chart-6"),
        },

        sidebar: {
          DEFAULT: withAlpha("--sidebar"),
          foreground: withAlpha("--sidebar-foreground"),
          muted: withAlpha("--sidebar-muted"),
          accent: withAlpha("--sidebar-accent"),
          "accent-foreground": withAlpha("--sidebar-accent-foreground"),
          border: withAlpha("--sidebar-border"),
        },
      },

      borderRadius: {
        none: "0px",
        xs: "0.25rem",
        sm: "0.375rem",
        DEFAULT: "0.375rem",
        md: "0.5rem",
        lg: "var(--radius)",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
        full: "9999px",
      },

      /* Shadows tinted with the neutral hue rather than pure black — black
         shadows on a cool background read as dirty grey smudges. */
      boxShadow: {
        xs: "0 1px 2px 0 rgb(var(--neutral-900) / 0.05)",
        sm: "0 1px 2px -1px rgb(var(--neutral-900) / 0.08), 0 1px 3px 0 rgb(var(--neutral-900) / 0.06)",
        DEFAULT:
          "0 1px 2px -1px rgb(var(--neutral-900) / 0.08), 0 1px 3px 0 rgb(var(--neutral-900) / 0.06)",
        md: "0 2px 4px -2px rgb(var(--neutral-900) / 0.08), 0 4px 10px -2px rgb(var(--neutral-900) / 0.08)",
        lg: "0 4px 8px -4px rgb(var(--neutral-900) / 0.10), 0 10px 24px -6px rgb(var(--neutral-900) / 0.12)",
        xl: "0 8px 16px -8px rgb(var(--neutral-900) / 0.12), 0 20px 44px -12px rgb(var(--neutral-900) / 0.16)",
        popover:
          "0 0 0 1px rgb(var(--neutral-900) / 0.06), 0 8px 20px -6px rgb(var(--neutral-900) / 0.14), 0 18px 40px -12px rgb(var(--neutral-900) / 0.18)",
        focus: "0 0 0 3px rgb(var(--ring) / 0.35)",
        none: "none",
      },

      transitionTimingFunction: {
        out: "cubic-bezier(0.16, 1, 0.3, 1)",
        "in-out": "cubic-bezier(0.65, 0, 0.35, 1)",
      },
      transitionDuration: {
        120: "120ms",
        400: "400ms",
      },

      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "bar-grow": {
          from: { transform: "scaleY(0)" },
          to: { transform: "scaleY(1)" },
        },
      },
      animation: {
        "fade-up": "fade-up 260ms cubic-bezier(0.16, 1, 0.3, 1) both",
        shimmer: "shimmer 1.8s infinite",
        "bar-grow": "bar-grow 500ms cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
  plugins: [animate],
}

export default config
