"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tokensApi } from "@/lib/api/tokens";
import { walletApi } from "@/lib/api/wallet";
import { lockingApi } from "@/lib/api/locking";
import { affiliatesApi } from "@/lib/api/affiliates";
import { useAuth } from "./useAuth";
import type { TokenBalance, Transaction, LockTier, TokenLock, WalletBalance } from "@/types/api";
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
 * Fetch and cache token balance from wallet
 * Uses the wallet API which is where purchased tokens are stored
 * Refreshes on window focus and when mutations invalidate the cache
 */
export function useBalance() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.balance,
    queryFn: async (): Promise<TokenBalance> => {
      // Get HBCT balance from wallet
      const walletBalance = await walletApi.getBalance('HBCT');

      // Transform WalletBalance to TokenBalance format for dashboard compatibility
      return {
        availableBalance: walletBalance.availableBalance,
        lockedBalance: walletBalance.lockedBalance,
        totalBalance: walletBalance.totalBalance,
      };
    },
    enabled: isAuthenticated,
    staleTime: 60 * 1000, // 1 minute
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch and cache recent transactions from wallet
 * Uses wallet transactions which include all HBCT activity
 * Refreshes on window focus and when mutations invalidate the cache
 */
export function useTransactions(page = 1, limit = 10) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.transactions(page, limit),
    queryFn: async () => {
      const result = await walletApi.getTransactions({
        currency: 'HBCT',
        page,
        limit,
      });

      // Transform WalletTransaction[] to Transaction[] format for dashboard compatibility
      const transactions: Transaction[] = result.transactions.map((tx) => ({
        id: tx.id,
        type: mapWalletTypeToTransactionType(tx.type),
        amount: tx.amount,
        status: tx.status as Transaction['status'],
        txHash: tx.txHash || tx.metadata?.txHash,
        createdAt: tx.createdAt,
        completedAt: tx.completedAt,
      }));

      return {
        transactions,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      };
    },
    enabled: isAuthenticated,
    staleTime: 60 * 1000, // 1 minute
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

// Helper to map wallet transaction types to dashboard transaction types
function mapWalletTypeToTransactionType(walletType: string): Transaction['type'] {
  const typeMap: Record<string, Transaction['type']> = {
    'TOKEN_PURCHASE': 'BUY_WEBSITE',
    'DEPOSIT': 'BUY_WEBSITE',
    'WITHDRAWAL': 'TRANSFER',
    'INTERNAL_TRANSFER_SEND': 'TRANSFER',
    'INTERNAL_TRANSFER_RECEIVE': 'TRANSFER_RECEIVE',
    'LOCK': 'LOCK',
    'UNLOCK': 'UNLOCK',
    'REWARD': 'REWARD_DISTRIBUTION',
    'AIRDROP': 'AIRDROP',
    'AFFILIATE_COMMISSION': 'AFFILIATE_BONUS',
    'FEE': 'TRANSFER',
    'REFUND': 'MARKETPLACE_REFUND',
  };
  return typeMap[walletType] || 'TRANSFER';
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
 * Refreshes on window focus and when mutations invalidate the cache
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
    staleTime: 2 * 60 * 1000, // 2 minutes
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
 * Fetch and cache referrals with pagination
 */
export function useReferrals(params?: {
  page?: number;
  limit?: number;
  status?: 'all' | 'pending' | 'active' | 'converted' | 'inactive';
  search?: string;
}) {
  const { isAuthenticated } = useAuth();
  const { page = 1, limit = 10, status, search } = params || {};

  return useQuery({
    queryKey: [...queryKeys.referrals(page, limit), status, search],
    queryFn: async () => {
      try {
        const response = await affiliatesApi.getReferrals({
          page,
          limit,
          status: status === 'all' ? undefined : status,
          search,
        });
        return response;
      } catch {
        return {
          referrals: [] as ReferralDetails[],
          summary: { total: 0, active: 0, converted: 0, inactive: 0 },
          pagination: { page, limit, total: 0, totalPages: 0 },
        };
      }
    },
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch and cache commissions with pagination
 */
export function useCommissions(params?: {
  page?: number;
  limit?: number;
  status?: 'all' | 'paid' | 'pending';
}) {
  const { isAuthenticated } = useAuth();
  const { page = 1, limit = 10, status } = params || {};

  return useQuery({
    queryKey: [...queryKeys.commissions(page, limit), status],
    queryFn: async () => {
      try {
        const response = await affiliatesApi.getCommissions({
          page,
          limit,
          status: status === 'all' ? undefined : status,
        });
        return response;
      } catch {
        return {
          commissions: [] as Commission[],
          summary: { totalEarned: '0', totalPending: '0', totalPaid: '0' },
          pagination: { page, limit, total: 0, totalPages: 0 },
        };
      }
    },
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000, // 2 minutes
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
        queryFn: async () => {
          const walletBalance = await walletApi.getBalance('HBCT');
          return {
            availableBalance: walletBalance.availableBalance,
            lockedBalance: walletBalance.lockedBalance,
            totalBalance: walletBalance.totalBalance,
          };
        },
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.transactions(1, 10),
        queryFn: async () => {
          const result = await walletApi.getTransactions({ currency: 'HBCT', page: 1, limit: 10 });
          return {
            transactions: result.transactions.map((tx) => ({
              id: tx.id,
              type: mapWalletTypeToTransactionType(tx.type),
              amount: tx.amount,
              status: tx.status,
              txHash: tx.txHash || tx.metadata?.txHash,
              createdAt: tx.createdAt,
              completedAt: tx.completedAt,
            })),
            pagination: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages },
          };
        },
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

/**
 * Invalidate dashboard data (call after balance-changing actions)
 * Use this after transfers, purchases, locks, etc.
 */
export function useInvalidateDashboard() {
  const queryClient = useQueryClient();

  return {
    // Invalidate all dashboard data
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.balance });
      // Use predicate to match all transaction queries regardless of page/limit
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'transactions'
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.userLocks });
      queryClient.invalidateQueries({ queryKey: queryKeys.affiliate });
      queryClient.invalidateQueries({ queryKey: queryKeys.affiliateStats });
    },
    // Invalidate only balance and transactions
    invalidateBalance: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.balance });
      // Use predicate to match all transaction queries regardless of page/limit
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'transactions'
      });
    },
    // Invalidate only affiliate data
    invalidateAffiliate: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.affiliate });
      queryClient.invalidateQueries({ queryKey: queryKeys.affiliateStats });
    },
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
