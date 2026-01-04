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

// User-scoped query key factory
// Including user ID ensures each user has their own cache entries
// This prevents data leakage between different users/accounts
export const createUserQueryKeys = (userId: string | null) => ({
  // Dashboard - user-specific
  balance: ["user", userId, "balance"] as const,
  transactions: (page: number, limit: number) => ["user", userId, "transactions", page, limit] as const,
  referralCount: ["user", userId, "referralCount"] as const,

  // Locking - user-specific (except tiers which are global)
  userLocks: ["user", userId, "userLocks"] as const,

  // Affiliate - user-specific
  affiliate: ["user", userId, "affiliate"] as const,
  affiliateStats: ["user", userId, "affiliateStats"] as const,
  commissions: (page: number, limit: number) => ["user", userId, "commissions", page, limit] as const,
  referrals: (page: number, limit: number) => ["user", userId, "referrals", page, limit] as const,
});

// Global query keys (not user-specific)
export const globalQueryKeys = {
  lockTiers: ["lockTiers"] as const,
  leaderboard: ["leaderboard"] as const,
  tokenPrice: ["tokenPrice"] as const,
};

// Legacy query keys - kept for backward compatibility
// TODO: Migrate all usages to use createUserQueryKeys with user ID
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
 * Hook to get user-scoped query keys
 * Returns query keys that include the current user's ID
 */
export function useUserQueryKeys() {
  const { user } = useAuth();
  return createUserQueryKeys(user?.id ?? null);
}

/**
 * Fetch and cache token balance from wallet
 * Uses the wallet API which is where purchased tokens are stored
 * Refreshes on window focus and when mutations invalidate the cache
 */
export function useBalance() {
  const { isAuthenticated, user } = useAuth();
  const userKeys = createUserQueryKeys(user?.id ?? null);

  return useQuery({
    queryKey: userKeys.balance,
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
    enabled: isAuthenticated && !!user?.id,
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
  const { isAuthenticated, user } = useAuth();
  const userKeys = createUserQueryKeys(user?.id ?? null);

  return useQuery({
    queryKey: userKeys.transactions(page, limit),
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
    enabled: isAuthenticated && !!user?.id,
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
// ACTIVITY TYPES FOR COMBINED VIEW
// ============================================

export type ActivityType = 'transaction' | 'lock';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  action: string;
  amount: string;
  status: string;
  createdAt: string;
  // Transaction specific
  txHash?: string;
  // Lock specific
  tierName?: string;
  rewardAmount?: string;
  penaltyAmount?: string;
}

/**
 * Fetch and cache combined recent activity (transactions + lock history)
 * Perfect for dashboard overview
 */
export function useRecentActivity(limit = 10) {
  const { isAuthenticated, user } = useAuth();
  const userKeys = createUserQueryKeys(user?.id ?? null);

  return useQuery({
    queryKey: ["user", user?.id, "recentActivity", limit] as const,
    queryFn: async (): Promise<ActivityItem[]> => {
      // Fetch both in parallel
      const [txResult, lockResult] = await Promise.all([
        walletApi.getTransactions({ currency: 'HBCT', page: 1, limit }),
        lockingApi.getLockHistory({ page: 1, limit }),
      ]);

      // Transform transactions to ActivityItem
      const txActivities: ActivityItem[] = txResult.transactions.map((tx) => ({
        id: tx.id,
        type: 'transaction' as const,
        action: mapWalletTypeToTransactionType(tx.type),
        amount: tx.amount,
        status: tx.status,
        createdAt: tx.createdAt,
        txHash: tx.txHash || tx.metadata?.txHash,
      }));

      // Transform lock history to ActivityItem
      const lockActivities: ActivityItem[] = lockResult.history.map((entry) => ({
        id: entry.id,
        type: 'lock' as const,
        action: entry.action,
        amount: entry.amount,
        status: 'COMPLETED', // Lock history entries are always completed
        createdAt: entry.createdAt,
        tierName: entry.tierName,
        rewardAmount: entry.rewardAmount,
        penaltyAmount: entry.penaltyAmount,
      }));

      // Combine and sort by date (newest first)
      const combined = [...txActivities, ...lockActivities].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Return only the requested limit
      return combined.slice(0, limit);
    },
    enabled: isAuthenticated && !!user?.id,
    staleTime: 60 * 1000, // 1 minute
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
  const { isAuthenticated, user } = useAuth();
  const userKeys = createUserQueryKeys(user?.id ?? null);

  return useQuery({
    queryKey: userKeys.userLocks,
    queryFn: () => lockingApi.getUserLocks(),
    enabled: isAuthenticated && !!user?.id,
    staleTime: 30 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

/**
 * Create lock mutation with optimistic update
 */
export function useCreateLock() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userKeys = createUserQueryKeys(user?.id ?? null);

  return useMutation({
    mutationFn: async (data: { lockTierId: string; amount: number }) => {
      return lockingApi.createLock(data);
    },
    onMutate: async (newLock) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: userKeys.userLocks });
      await queryClient.cancelQueries({ queryKey: userKeys.balance });

      // Snapshot previous values
      const previousLocks = queryClient.getQueryData(userKeys.userLocks);
      const previousBalance = queryClient.getQueryData(userKeys.balance);

      // Optimistically update balance (reduce available)
      queryClient.setQueryData(userKeys.balance, (old: TokenBalance | undefined) => {
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
        queryClient.setQueryData(userKeys.userLocks, context.previousLocks);
      }
      if (context?.previousBalance) {
        queryClient.setQueryData(userKeys.balance, context.previousBalance);
      }
    },
    onSettled: () => {
      // Force immediate refetch to ensure sync with server
      queryClient.refetchQueries({ queryKey: userKeys.userLocks });
      queryClient.refetchQueries({ queryKey: userKeys.balance });
      // Refetch wallet balances for navbar and wallet page
      queryClient.refetchQueries({ queryKey: ["user", user?.id, "walletBalances"] });
      // Refetch lock history and recent activity
      queryClient.refetchQueries({ queryKey: ["user", user?.id, "lockHistory"] });
      queryClient.refetchQueries({ queryKey: ["user", user?.id, "recentActivity"] });
      queryClient.invalidateQueries({ queryKey: userKeys.transactions(1, 10) });
    },
  });
}

/**
 * Unlock mutation
 */
export function useUnlock() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userKeys = createUserQueryKeys(user?.id ?? null);

  return useMutation({
    mutationFn: async (lockId: string) => {
      return lockingApi.unlock(lockId);
    },
    onSuccess: () => {
      // Force immediate refetch for instant updates
      queryClient.refetchQueries({ queryKey: userKeys.userLocks });
      queryClient.refetchQueries({ queryKey: userKeys.balance });
      queryClient.refetchQueries({ queryKey: ["user", user?.id, "walletBalances"] });
      queryClient.refetchQueries({ queryKey: ["user", user?.id, "lockHistory"] });
      queryClient.refetchQueries({ queryKey: ["user", user?.id, "recentActivity"] });
      queryClient.invalidateQueries({ queryKey: userKeys.transactions(1, 10) });
    },
  });
}

/**
 * Early unlock mutation with penalty
 */
export function useEarlyUnlock() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userKeys = createUserQueryKeys(user?.id ?? null);

  return useMutation({
    mutationFn: async (lockId: string) => {
      return lockingApi.earlyUnlock(lockId);
    },
    onSuccess: () => {
      // Force immediate refetch for instant updates
      queryClient.refetchQueries({ queryKey: userKeys.userLocks });
      queryClient.refetchQueries({ queryKey: userKeys.balance });
      queryClient.refetchQueries({ queryKey: ["user", user?.id, "walletBalances"] });
      queryClient.refetchQueries({ queryKey: ["user", user?.id, "lockHistory"] });
      queryClient.refetchQueries({ queryKey: ["user", user?.id, "recentActivity"] });
      queryClient.invalidateQueries({ queryKey: userKeys.transactions(1, 10) });
    },
  });
}

/**
 * Cancel lock mutation (within grace period)
 */
export function useCancelLock() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userKeys = createUserQueryKeys(user?.id ?? null);

  return useMutation({
    mutationFn: async (lockId: string) => {
      return lockingApi.cancelLock(lockId);
    },
    onSuccess: () => {
      // Force immediate refetch for instant updates
      queryClient.refetchQueries({ queryKey: userKeys.userLocks });
      queryClient.refetchQueries({ queryKey: userKeys.balance });
      queryClient.refetchQueries({ queryKey: ["user", user?.id, "walletBalances"] });
      queryClient.refetchQueries({ queryKey: ["user", user?.id, "lockHistory"] });
      queryClient.refetchQueries({ queryKey: ["user", user?.id, "recentActivity"] });
      queryClient.invalidateQueries({ queryKey: userKeys.transactions(1, 10) });
    },
  });
}

/**
 * Fetch lock history
 */
export function useLockHistory(params?: { page?: number; limit?: number }) {
  const { isAuthenticated, user } = useAuth();

  return useQuery({
    queryKey: ["user", user?.id, "lockHistory", params?.page, params?.limit],
    queryFn: async () => {
      return lockingApi.getLockHistory(params);
    },
    enabled: isAuthenticated && !!user?.id,
    staleTime: 1 * 60 * 1000, // 1 minute
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
  const { isAuthenticated, user } = useAuth();
  const userKeys = createUserQueryKeys(user?.id ?? null);

  return useQuery({
    queryKey: userKeys.affiliate,
    queryFn: async (): Promise<Affiliate | null> => {
      try {
        return await affiliatesApi.getMyAffiliate();
      } catch {
        return null;
      }
    },
    enabled: isAuthenticated && !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch and cache affiliate stats
 */
export function useAffiliateStats() {
  const { isAuthenticated, user } = useAuth();
  const userKeys = createUserQueryKeys(user?.id ?? null);

  return useQuery({
    queryKey: userKeys.affiliateStats,
    queryFn: async (): Promise<AffiliateStats | null> => {
      try {
        return await affiliatesApi.getStats();
      } catch {
        return null;
      }
    },
    enabled: isAuthenticated && !!user?.id,
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
  const { isAuthenticated, user } = useAuth();
  const userKeys = createUserQueryKeys(user?.id ?? null);
  const { page = 1, limit = 10, status, search } = params || {};

  return useQuery({
    queryKey: [...userKeys.referrals(page, limit), status, search],
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
    enabled: isAuthenticated && !!user?.id,
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
  const { isAuthenticated, user } = useAuth();
  const userKeys = createUserQueryKeys(user?.id ?? null);
  const { page = 1, limit = 10, status } = params || {};

  return useQuery({
    queryKey: [...userKeys.commissions(page, limit), status],
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
    enabled: isAuthenticated && !!user?.id,
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
  const { user } = useAuth();
  const userKeys = createUserQueryKeys(user?.id ?? null);

  return useMutation({
    mutationFn: async () => {
      return affiliatesApi.register();
    },
    onSuccess: (data) => {
      // Set the new affiliate data directly
      queryClient.setQueryData(userKeys.affiliate, data);
      // Invalidate stats to refetch
      queryClient.invalidateQueries({ queryKey: userKeys.affiliateStats });
    },
  });
}

/**
 * Claim commission mutation with optimistic update
 */
export function useClaimCommission() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userKeys = createUserQueryKeys(user?.id ?? null);

  return useMutation({
    mutationFn: async () => {
      return affiliatesApi.claimCommissions();
    },
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: userKeys.affiliateStats });

      // Snapshot previous value
      const previousStats = queryClient.getQueryData<AffiliateStats>(userKeys.affiliateStats);

      // Optimistically update stats (set pending to 0)
      if (previousStats) {
        queryClient.setQueryData(userKeys.affiliateStats, {
          ...previousStats,
          pendingCommission: "0",
        });
      }

      return { previousStats };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousStats) {
        queryClient.setQueryData(userKeys.affiliateStats, context.previousStats);
      }
    },
    onSettled: () => {
      // Force instant refetch for immediate UI updates
      queryClient.refetchQueries({ queryKey: userKeys.affiliateStats });
      queryClient.refetchQueries({ queryKey: userKeys.balance });
      queryClient.refetchQueries({ queryKey: ["user", user?.id, "walletBalances"] });
      queryClient.invalidateQueries({ queryKey: userKeys.transactions(1, 10) });
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
  const { user } = useAuth();
  const userKeys = createUserQueryKeys(user?.id ?? null);

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
      // Force instant refetch for immediate UI updates
      queryClient.refetchQueries({ queryKey: userKeys.balance });
      queryClient.refetchQueries({ queryKey: ["user", user?.id, "walletBalances"] });
      queryClient.refetchQueries({ queryKey: ["user", user?.id, "walletRecentTransactions"] });
      queryClient.invalidateQueries({ queryKey: userKeys.transactions(1, 10) });
    },
  });
}

// ============================================
// PREFETCH HELPERS
// ============================================

/**
 * Prefetch all initial data after login
 * Call this after successful authentication with the user ID
 * @deprecated Use prefetchUserData in useAuth.tsx instead for proper user-scoped caching
 */
export function usePrefetchInitialData() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return async () => {
    const userId = user?.id ?? null;
    const userKeys = createUserQueryKeys(userId);

    // Prefetch in parallel
    await Promise.all([
      // Dashboard data (user-scoped)
      queryClient.prefetchQuery({
        queryKey: userKeys.balance,
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
        queryKey: userKeys.transactions(1, 10),
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

      // Locking data - tiers are global, user locks are user-scoped
      queryClient.prefetchQuery({
        queryKey: globalQueryKeys.lockTiers,
        queryFn: () => lockingApi.getTiers(),
      }),
      queryClient.prefetchQuery({
        queryKey: userKeys.userLocks,
        queryFn: () => lockingApi.getUserLocks(),
      }),

      // Affiliate data (user-scoped)
      queryClient.prefetchQuery({
        queryKey: userKeys.affiliate,
        queryFn: async () => {
          try {
            return await affiliatesApi.getMyAffiliate();
          } catch {
            return null;
          }
        },
      }),
      queryClient.prefetchQuery({
        queryKey: userKeys.affiliateStats,
        queryFn: async () => {
          try {
            return await affiliatesApi.getStats();
          } catch {
            return null;
          }
        },
      }),
      // Leaderboard is global
      queryClient.prefetchQuery({
        queryKey: globalQueryKeys.leaderboard,
        queryFn: async () => {
          const response = await affiliatesApi.getLeaderboard({ limit: 10 });
          return response.leaderboard;
        },
      }),

      // Token price is global
      queryClient.prefetchQuery({
        queryKey: globalQueryKeys.tokenPrice,
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
  const { user } = useAuth();
  const userKeys = createUserQueryKeys(user?.id ?? null);

  return {
    // Invalidate all dashboard data
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.balance });
      // Use predicate to match all user transaction queries
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'user' &&
          query.queryKey[1] === user?.id &&
          query.queryKey[2] === 'transactions'
      });
      queryClient.invalidateQueries({ queryKey: userKeys.userLocks });
      queryClient.invalidateQueries({ queryKey: userKeys.affiliate });
      queryClient.invalidateQueries({ queryKey: userKeys.affiliateStats });
    },
    // Invalidate only balance and transactions
    invalidateBalance: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.balance });
      // Use predicate to match all user transaction queries
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'user' &&
          query.queryKey[1] === user?.id &&
          query.queryKey[2] === 'transactions'
      });
    },
    // Invalidate only affiliate data
    invalidateAffiliate: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.affiliate });
      queryClient.invalidateQueries({ queryKey: userKeys.affiliateStats });
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
