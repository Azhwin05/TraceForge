import { withSentryConfig } from "@sentry/nextjs"

const isDev = process.env.NODE_ENV === "development"

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Docker standalone deployment
  output: "standalone",
  experimental: {
    instrumentationHook: true,
  },
  compress: true,

  // ── Security Headers ──────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent clickjacking
          { key: "X-Frame-Options", value: "DENY" },
          // Prevent MIME-type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Enable XSS filter in legacy browsers
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // HSTS — 1 year, include subdomains (only in production)
          ...(isDev
            ? []
            : [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains; preload",
                },
              ]),
          // Referrer — don't leak URL to third parties
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Permissions Policy — disable dangerous APIs
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
          },
          // Content-Security-Policy
          // Supabase CDN and Sentry are the only external resources needed
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Scripts: self + Sentry CDN for error reporting
              isDev
                ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
                : "script-src 'self' https://browser.sentry-cdn.com https://js.sentry-cdn.com",
              // Styles: self + unsafe-inline required by shadcn/Tailwind
              "style-src 'self' 'unsafe-inline'",
              // Images: self + Supabase storage
              `img-src 'self' data: blob: ${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}`,
              // Fonts: self only
              "font-src 'self'",
              // API/data connections
              [
                "connect-src 'self'",
                process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
                "https://sentry.io",
                "https://*.sentry.io",
                isDev ? "ws://localhost:* http://localhost:*" : "",
              ]
                .filter(Boolean)
                .join(" "),
              // Workers: self (required by some PDF rendering libs)
              "worker-src 'self' blob:",
              // No framing
              "frame-ancestors 'none'",
              // No plugins
              "object-src 'none'",
              // Base URI restricted to self
              "base-uri 'self'",
              // Form actions restricted to self
              "form-action 'self'",
            ]
              .filter(Boolean)
              .join("; "),
          },
        ],
      },
      // Static assets: long-lived cache
      {
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  telemetry: false,
  sourcemaps: {
    disable: !process.env.SENTRY_DSN,
  },
})
