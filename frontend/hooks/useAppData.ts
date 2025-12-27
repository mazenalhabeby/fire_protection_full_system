"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tokensApi } from "@/lib/api/tokens";
import { lockingApi } from "@/lib/api/locking";
import { affiliatesApi } from "@/lib/api/affiliates";
import { useAuth } from "./useAuth";
import type { TokenBalance, Transaction, LockTier, TokenLock } from "@/types/api";
import type {
  Affiliate,
  AffiliateStats,
  Commission,
  ReferralDetails,
  LeaderboardEntry,
} from "@/types/api";

// ============================================
// QUERY KEYS - Centralized for consistency
// ============================================

export const queryKeys = {
  // Dashboard
  balance: ["balance"] as const,
  transactions: (page: number, limit: number) => ["transactions", page, limit] as const,
  referralCount: ["referralCount"] as const,

  // Locking
  lockTiers: ["lockTiers"] as const,
  userLocks: ["userLocks"] as const,

  // Affiliate
  affiliate: ["affiliate"] as const,
  affiliateStats: ["affiliateStats"] as const,
  commissions: (page: number, limit: number) => ["commissions", page, limit] as const,
  referrals: (page: number, limit: number) => ["referrals", page, limit] as const,
  leaderboard: ["leaderboard"] as const,

  // Token
  tokenPrice: ["tokenPrice"] as const,

  // All user data (for initial fetch)
  initialData: ["initialData"] as const,
};

// ============================================
// DASHBOARD HOOKS
// ============================================

/**
 * Fetch and cache token balance
 */
export function useBalance() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.balance,
    queryFn: async (): Promise<TokenBalance> => {
      return tokensApi.getBalance();
    },
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch and cache recent transactions
 */
export function useTransactions(page = 1, limit = 10) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.transactions(page, limit),
    queryFn: async () => {
      return tokensApi.getTransactions(page, limit);
    },
    enabled: isAuthenticated,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

// ============================================
// LOCKING HOOKS
// ============================================

/**
 * Fetch and cache lock tiers (rarely changes)
 */
export function useLockTiers() {
  return useQuery({
    queryKey: queryKeys.lockTiers,
    queryFn: async (): Promise<LockTier[]> => {
      return lockingApi.getTiers();
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - tiers rarely change
    refetchOnMount: true,
  });
}

/**
 * Fetch and cache user's locks
 */
export function useUserLocks() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.userLocks,
    queryFn: async () => {
      return lockingApi.getUserLocks();
    },
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

/**
 * Create lock mutation with optimistic update
 */
export function useCreateLock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { lockTierId: string; amount: number }) => {
      return lockingApi.createLock(data);
    },
    onMutate: async (newLock) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.userLocks });
      await queryClient.cancelQueries({ queryKey: queryKeys.balance });

      // Snapshot previous values
      const previousLocks = queryClient.getQueryData(queryKeys.userLocks);
      const previousBalance = queryClient.getQueryData(queryKeys.balance);

      // Optimistically update balance (reduce available)
      queryClient.setQueryData(queryKeys.balance, (old: TokenBalance | undefined) => {
        if (!old) return old;
        const available = parseFloat(old.availableBalance) - newLock.amount;
        const locked = parseFloat(old.lockedBalance) + newLock.amount;
        return {
          ...old,
          availableBalance: available.toFixed(2),
          lockedBalance: locked.toFixed(2),
        };
      });

      return { previousLocks, previousBalance };
    },
    onError: (_err, _newLock, context) => {
      // Rollback on error
      if (context?.previousLocks) {
        queryClient.setQueryData(queryKeys.userLocks, context.previousLocks);
      }
      if (context?.previousBalance) {
        queryClient.setQueryData(queryKeys.balance, context.previousBalance);
      }
    },
    onSettled: () => {
      // Refetch to ensure sync with server
      queryClient.invalidateQueries({ queryKey: queryKeys.userLocks });
      queryClient.invalidateQueries({ queryKey: queryKeys.balance });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions(1, 10) });
    },
  });
}

/**
 * Unlock mutation
 */
export function useUnlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lockId: string) => {
      return lockingApi.unlock(lockId);
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.userLocks });
      queryClient.invalidateQueries({ queryKey: queryKeys.balance });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions(1, 10) });
    },
  });
}

// ============================================
// AFFILIATE HOOKS
// ============================================

/**
 * Fetch and cache affiliate profile
 */
export function useAffiliate() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.affiliate,
    queryFn: async (): Promise<Affiliate | null> => {
      try {
        return await affiliatesApi.getMyAffiliate();
      } catch {
        return null;
      }
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch and cache affiliate stats
 */
export function useAffiliateStats() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.affiliateStats,
    queryFn: async (): Promise<AffiliateStats | null> => {
      try {
        return await affiliatesApi.getStats();
      } catch {
        return null;
      }
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch and cache leaderboard
 */
export function useLeaderboard(limit = 10) {
  return useQuery({
    queryKey: queryKeys.leaderboard,
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      try {
        const response = await affiliatesApi.getLeaderboard({ limit });
        return response.leaderboard || [];
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

/**
 * Register as affiliate mutation
 */
export function useRegisterAffiliate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return affiliatesApi.register();
    },
    onSuccess: (data) => {
      // Set the new affiliate data directly
      queryClient.setQueryData(queryKeys.affiliate, data);
      // Invalidate stats to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.affiliateStats });
    },
  });
}

/**
 * Claim commission mutation with optimistic update
 */
export function useClaimCommission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return affiliatesApi.claimCommissions();
    },
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.affiliateStats });

      // Snapshot previous value
      const previousStats = queryClient.getQueryData<AffiliateStats>(queryKeys.affiliateStats);

      // Optimistically update stats (set pending to 0)
      if (previousStats) {
        queryClient.setQueryData(queryKeys.affiliateStats, {
          ...previousStats,
          pendingCommission: "0",
        });
      }

      return { previousStats };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousStats) {
        queryClient.setQueryData(queryKeys.affiliateStats, context.previousStats);
      }
    },
    onSettled: () => {
      // Refetch to ensure sync
      queryClient.invalidateQueries({ queryKey: queryKeys.affiliateStats });
      queryClient.invalidateQueries({ queryKey: queryKeys.balance });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions(1, 10) });
    },
  });
}

// ============================================
// TOKEN HOOKS
// ============================================

/**
 * Fetch and cache token price
 */
export function useTokenPrice() {
  return useQuery({
    queryKey: queryKeys.tokenPrice,
    queryFn: async (): Promise<number> => {
      const response = await tokensApi.getPrice();
      return parseFloat(response.price);
    },
    staleTime: 1 * 60 * 1000, // 1 minute - price can change
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

/**
 * Buy tokens mutation with optimistic update
 */
export function useBuyTokens() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { amountUsd: number; tokenPrice: number; paymentMethod?: string; referralCode?: string }) => {
      return tokensApi.buyTokens({
        amountUsd: data.amountUsd,
        tokenPrice: data.tokenPrice,
        paymentToken: data.paymentMethod,
        referralCode: data.referralCode,
      });
    },
    onSuccess: () => {
      // Invalidate balance and transactions to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.balance });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions(1, 10) });
    },
  });
}

// ============================================
// PREFETCH HELPERS
// ============================================

/**
 * Prefetch all initial data after login
 * Call this after successful authentication
 */
export function usePrefetchInitialData() {
  const queryClient = useQueryClient();

  return async () => {
    // Prefetch in parallel
    await Promise.all([
      // Dashboard data
      queryClient.prefetchQuery({
        queryKey: queryKeys.balance,
        queryFn: () => tokensApi.getBalance(),
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.transactions(1, 10),
        queryFn: () => tokensApi.getTransactions(1, 10),
      }),

      // Locking data
      queryClient.prefetchQuery({
        queryKey: queryKeys.lockTiers,
        queryFn: () => lockingApi.getTiers(),
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.userLocks,
        queryFn: () => lockingApi.getUserLocks(),
      }),

      // Affiliate data
      queryClient.prefetchQuery({
        queryKey: queryKeys.affiliate,
        queryFn: async () => {
          try {
            return await affiliatesApi.getMyAffiliate();
          } catch {
            return null;
          }
        },
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.affiliateStats,
        queryFn: async () => {
          try {
            return await affiliatesApi.getStats();
          } catch {
            return null;
          }
        },
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.leaderboard,
        queryFn: async () => {
          const response = await affiliatesApi.getLeaderboard({ limit: 10 });
          return response.leaderboard;
        },
      }),

      // Token price
      queryClient.prefetchQuery({
        queryKey: queryKeys.tokenPrice,
        queryFn: async () => {
          const response = await tokensApi.getPrice();
          return parseFloat(response.price);
        },
      }),
    ]);
  };
}

/**
 * Clear all cached data (call on logout)
 */
export function useClearCache() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.clear();
  };
}

// ============================================
// COMBINED DATA HOOK
// ============================================

/**
 * Get all dashboard data at once (uses cached data if available)
 */
export function useDashboardData() {
  const balance = useBalance();
  const transactions = useTransactions(1, 5);
  const affiliate = useAffiliate();

  return {
    balance: balance.data,
    transactions: transactions.data?.transactions ?? [],
    referralCount: affiliate.data?.totalReferrals ?? 0,
    isLoading: balance.isLoading || transactions.isLoading,
    isError: balance.isError || transactions.isError,
  };
}

/**
 * Get all locking data at once
 */
export function useLockingData() {
  const tiers = useLockTiers();
  const locks = useUserLocks();

  return {
    tiers: tiers.data ?? [],
    locks: locks.data?.locks ?? [],
    isLoading: tiers.isLoading || locks.isLoading,
    isError: tiers.isError || locks.isError,
  };
}

/**
 * Get all affiliate data at once
 */
export function useAffiliateData() {
  const affiliate = useAffiliate();
  const stats = useAffiliateStats();
  const leaderboard = useLeaderboard();

  return {
    affiliate: affiliate.data,
    stats: stats.data,
    leaderboard: leaderboard.data ?? [],
    isLoading: affiliate.isLoading || stats.isLoading || leaderboard.isLoading,
    isError: affiliate.isError || stats.isError || leaderboard.isError,
  };
}
