import { type NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"
import { rateLimit } from "@/lib/rate-limit"

// Rate limit login attempts: 10 requests per 60 seconds per IP
const LOGIN_LIMIT = 10
const LOGIN_WINDOW_MS = 60 * 1000

// Rate limit API / server actions: 120 requests per 60 seconds per IP
const API_LIMIT = 120
const API_WINDOW_MS = 60 * 1000

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = getIp(request)

  // Stricter rate limit on login route
  if (pathname.startsWith("/login")) {
    const { allowed, remaining, resetAt } = rateLimit(
      `login:${ip}`,
      LOGIN_LIMIT,
      LOGIN_WINDOW_MS
    )
    if (!allowed) {
      return new NextResponse("Too many requests. Please try again later.", {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)),
          "X-RateLimit-Remaining": String(remaining),
        },
      })
    }
  }

  // General rate limit for all app routes and API calls
  if (pathname.startsWith("/(app)") || pathname.startsWith("/api")) {
    const { allowed } = rateLimit(`api:${ip}`, API_LIMIT, API_WINDOW_MS)
    if (!allowed) {
      return new NextResponse("Too many requests.", { status: 429 })
    }
  }

  return updateSession(request)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
