"use client";

import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ApiError } from "@/lib/api/client";

// Global handler for 401 errors from React Query
function handleGlobalError(error: unknown): void {
  // Check if it's a 401 ApiError that slipped through the client refresh logic
  // This can happen if the client already tried to refresh and failed
  if (error instanceof ApiError && error.status === 401) {
    // Dispatch session-revoked event to show the modal
    // The client.ts already handles most 401s, this is a fallback safety net
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('session-revoked', {
        detail: { reason: 'expired' }
      }));
    }
  }
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => {
            handleGlobalError(error);
          },
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            handleGlobalError(error);
          },
        }),
        defaultOptions: {
          queries: {
            // Data is fresh for 5 minutes
            staleTime: 5 * 60 * 1000,
            // Cache data for 30 minutes
            gcTime: 30 * 60 * 1000,
            // Don't refetch on window focus (reduces API calls)
            refetchOnWindowFocus: false,
            // Don't retry 401 errors - let the client handle refresh
            retry: (failureCount, error) => {
              // Don't retry auth errors
              if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
                return false;
              }
              // Retry other errors once
              return failureCount < 1;
            },
            // Don't refetch on mount if data is fresh
            refetchOnMount: false,
          },
          mutations: {
            // Don't retry 401 errors
            retry: (failureCount, error) => {
              if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
                return false;
              }
              return failureCount < 1;
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
