"use client"

import { useState } from "react"
import { QueryClient, QueryClientProvider, MutationCache, QueryCache } from "@tanstack/react-query"
import { toast } from "sonner"

// Lazily imported only in dev to keep the production bundle clean
let ReactQueryDevtools: React.ComponentType | null = null
if (process.env.NODE_ENV === "development") {
  import("@tanstack/react-query-devtools").then((mod) => {
    ReactQueryDevtools = mod.ReactQueryDevtools as unknown as React.ComponentType
  })
}

function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError(error, query) {
        // Only surface errors for queries that have data in cache already
        // (background refetch failures) to avoid noisy toasts on initial load.
        if (query.state.data !== undefined) {
          const msg =
            error instanceof Error ? error.message : "Failed to refresh data."
          toast.error(msg, { duration: 4000 })
        }
        console.error("[QueryCache]", error)
      },
    }),
    mutationCache: new MutationCache({
      onError(error) {
        const msg =
          error instanceof Error ? error.message : "An unexpected error occurred."
        toast.error(msg, { duration: 5000 })
        console.error("[MutationCache]", error)
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        retry(failureCount, error) {
          // Don't retry on 4xx auth/permission errors
          if (error instanceof Error && /401|403|404/.test(error.message)) return false
          return failureCount < 2
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
      },
      mutations: {
        retry: 0,
      },
    },
  })
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && ReactQueryDevtools && (
        <ReactQueryDevtools />
      )}
    </QueryClientProvider>
  )
}
