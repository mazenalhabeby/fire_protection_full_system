/**
 * Centralized configuration for React Query stale times
 * This ensures consistency across all hooks and makes it easy to adjust caching behavior
 */

export const STALE_TIMES = {
  // Real-time data that changes frequently
  REALTIME: 15 * 1000, // 15 seconds

  // Balance and financial data
  BALANCE: 30 * 1000, // 30 seconds

  // Transaction and activity data
  TRANSACTIONS: 60 * 1000, // 1 minute

  // User preferences and settings
  PREFERENCES: 2 * 60 * 1000, // 2 minutes

  // Affiliate and referral data
  AFFILIATE: 5 * 60 * 1000, // 5 minutes

  // Price data (can change frequently)
  PRICE: 60 * 1000, // 1 minute

  // Configuration data (rarely changes)
  CONFIG: 30 * 60 * 1000, // 30 minutes

  // Static data (almost never changes)
  STATIC: 60 * 60 * 1000, // 1 hour
} as const;

export const REFETCH_INTERVALS = {
  // Notifications and real-time updates
  REALTIME: 60 * 1000, // 1 minute

  // Pending transactions/deposits/withdrawals
  PENDING: 30 * 1000, // 30 seconds

  // Status checks
  STATUS: 30 * 1000, // 30 seconds

  // Price updates
  PRICE: 5 * 60 * 1000, // 5 minutes
} as const;

/**
 * Default query options for consistent behavior across hooks
 */
export const DEFAULT_QUERY_OPTIONS = {
  refetchOnMount: true,
  refetchOnWindowFocus: true,
  retry: 3,
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
} as const;

/**
 * Query options for data that needs to stay fresh
 */
export const FRESH_QUERY_OPTIONS = {
  ...DEFAULT_QUERY_OPTIONS,
  staleTime: STALE_TIMES.REALTIME,
  refetchInterval: REFETCH_INTERVALS.REALTIME,
} as const;

/**
 * Query options for static/config data
 */
export const STATIC_QUERY_OPTIONS = {
  refetchOnMount: true,
  refetchOnWindowFocus: false,
  staleTime: STALE_TIMES.CONFIG,
  retry: 3,
} as const;
