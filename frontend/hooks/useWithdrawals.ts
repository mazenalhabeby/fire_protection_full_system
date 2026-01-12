"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { withdrawalsApi } from "@/lib/api/withdrawals";
import { useAuth } from "./useAuth";
import { createUserQueryKeys } from "./useAppData";
import { createWalletQueryKeys } from "./useWalletData";
import type {
  WithdrawalRequest,
  WithdrawalResponse,
  WithdrawalListResponse,
  WithdrawalStats,
  HotWalletStatus,
  WithdrawalProcessorStatus,
  WithdrawalFilterParams,
  RequestWithdrawalParams,
  WithdrawalRequestStatus,
} from "@/types/withdrawals";

// ============================================
// QUERY KEY FACTORY (Best Practice)
// ============================================

export const withdrawalKeys = {
  all: ["withdrawals"] as const,
  // User withdrawals
  user: () => [...withdrawalKeys.all, "user"] as const,
  userList: (params?: { page?: number; limit?: number }) =>
    [...withdrawalKeys.user(), "list", params] as const,
  // Admin withdrawals
  admin: () => [...withdrawalKeys.all, "admin"] as const,
  adminList: (params?: WithdrawalFilterParams) =>
    [...withdrawalKeys.admin(), "list", params] as const,
  adminStats: () => [...withdrawalKeys.admin(), "stats"] as const,
  // System status
  hotWallet: () => [...withdrawalKeys.all, "hotWallet"] as const,
  processor: () => [...withdrawalKeys.all, "processor"] as const,
};

// Legacy keys for backward compatibility
export const withdrawalQueryKeys = {
  myWithdrawals: (params?: { page?: number; limit?: number }) =>
    withdrawalKeys.userList(params),
  adminWithdrawals: (params?: WithdrawalFilterParams) =>
    withdrawalKeys.adminList(params),
  withdrawalStats: withdrawalKeys.adminStats(),
  hotWalletStatus: withdrawalKeys.hotWallet(),
  processorStatus: withdrawalKeys.processor(),
};

// ============================================
// CACHE UPDATE UTILITIES
// ============================================

type WithdrawalCacheUpdater = (
  old: WithdrawalListResponse | undefined
) => WithdrawalListResponse | undefined;

/**
 * Updates a withdrawal in the cache by ID
 */
function updateWithdrawalInCache(
  withdrawalId: string,
  updater: (withdrawal: WithdrawalRequest) => WithdrawalRequest
): WithdrawalCacheUpdater {
  return (old) => {
    if (!old) return old;
    return {
      ...old,
      withdrawals: old.withdrawals.map((w) =>
        w.id === withdrawalId ? updater(w) : w
      ),
    };
  };
}

/**
 * Adds a new withdrawal to the cache
 */
function addWithdrawalToCache(
  withdrawal: WithdrawalRequest
): WithdrawalCacheUpdater {
  return (old) => {
    if (!old) return old;
    return {
      ...old,
      withdrawals: [withdrawal, ...old.withdrawals],
      total: old.total + 1,
    };
  };
}

/**
 * Removes a withdrawal from the cache
 */
function removeWithdrawalFromCache(
  withdrawalId: string
): WithdrawalCacheUpdater {
  return (old) => {
    if (!old) return old;
    return {
      ...old,
      withdrawals: old.withdrawals.filter((w) => w.id !== withdrawalId),
      total: Math.max(0, old.total - 1),
    };
  };
}

// ============================================
// SHARED HOOKS
// ============================================

/**
 * Hook to invalidate all withdrawal-related caches
 */
export function useInvalidateWithdrawals() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return {
    // Invalidate user withdrawals only
    invalidateUserWithdrawals: () => {
      queryClient.invalidateQueries({ queryKey: withdrawalKeys.user() });
    },
    // Invalidate admin withdrawals only
    invalidateAdminWithdrawals: () => {
      queryClient.invalidateQueries({ queryKey: withdrawalKeys.admin() });
    },
    // Invalidate all withdrawal data
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: withdrawalKeys.all });
    },
    // Invalidate user's balance-related queries
    invalidateBalances: () => {
      const userId = user?.id ?? null;
      const userKeys = createUserQueryKeys(userId);
      const walletKeys = createWalletQueryKeys(userId);
      queryClient.invalidateQueries({ queryKey: userKeys.balance });
      queryClient.invalidateQueries({ queryKey: walletKeys.balances });
      queryClient.invalidateQueries({ queryKey: walletKeys.recentTransactions });
    },
  };
}

// ============================================
// USER HOOKS
// ============================================

/**
 * Fetch user's withdrawals with smart caching
 */
export function useMyWithdrawals(params?: { page?: number; limit?: number }) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: withdrawalKeys.userList(params),
    queryFn: () => withdrawalsApi.getMyWithdrawals(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000, // Fresh for 30s
    gcTime: 5 * 60 * 1000, // Cache for 5min
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch withdrawal limits and fees
 */
export function useWithdrawalLimits() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: [...withdrawalKeys.all, 'limits'],
    queryFn: () => withdrawalsApi.getLimits(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // Fresh for 5 minutes
    gcTime: 30 * 60 * 1000, // Cache for 30 minutes
  });
}

/**
 * Request a new withdrawal with optimistic update
 */
export function useRequestWithdrawal() {
  const queryClient = useQueryClient();
  const { invalidateBalances } = useInvalidateWithdrawals();

  return useMutation({
    mutationFn: (data: RequestWithdrawalParams) =>
      withdrawalsApi.requestWithdrawal(data),

    onSuccess: (newWithdrawal) => {
      // Update cache with new withdrawal
      queryClient.setQueriesData<WithdrawalListResponse>(
        { queryKey: withdrawalKeys.user() },
        addWithdrawalToCache(newWithdrawal)
      );
      // Invalidate balances (amount is now locked)
      invalidateBalances();
    },

    onError: () => {
      // Refetch to ensure consistency on error
      queryClient.invalidateQueries({ queryKey: withdrawalKeys.user() });
    },
  });
}

/**
 * Confirm a withdrawal with optimistic status update
 */
export function useConfirmWithdrawal() {
  const queryClient = useQueryClient();
  const { invalidateBalances } = useInvalidateWithdrawals();

  return useMutation({
    mutationFn: ({ withdrawalId, confirmationCode }: {
      withdrawalId: string;
      confirmationCode: string;
    }) => withdrawalsApi.confirmWithdrawal(withdrawalId, confirmationCode),

    // Optimistic update - show pending approval immediately
    onMutate: async ({ withdrawalId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: withdrawalKeys.user() });

      // Snapshot current data for rollback
      const previousData = queryClient.getQueriesData<WithdrawalListResponse>({
        queryKey: withdrawalKeys.user(),
      });

      // Optimistically update status
      queryClient.setQueriesData<WithdrawalListResponse>(
        { queryKey: withdrawalKeys.user() },
        updateWithdrawalInCache(withdrawalId, (w) => ({
          ...w,
          status: "PENDING_APPROVAL" as WithdrawalRequestStatus,
        }))
      );

      return { previousData };
    },

    onSuccess: (updatedWithdrawal) => {
      // Replace with actual server response
      queryClient.setQueriesData<WithdrawalListResponse>(
        { queryKey: withdrawalKeys.user() },
        updateWithdrawalInCache(updatedWithdrawal.id, () => updatedWithdrawal)
      );
      invalidateBalances();
    },

    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: withdrawalKeys.user() });
    },
  });
}

/**
 * Cancel a withdrawal with optimistic removal
 */
export function useCancelWithdrawal() {
  const queryClient = useQueryClient();
  const { invalidateBalances } = useInvalidateWithdrawals();

  return useMutation({
    mutationFn: (withdrawalId: string) =>
      withdrawalsApi.cancelWithdrawal(withdrawalId),

    // Optimistic update - remove from list immediately
    onMutate: async (withdrawalId) => {
      await queryClient.cancelQueries({ queryKey: withdrawalKeys.user() });

      const previousData = queryClient.getQueriesData<WithdrawalListResponse>({
        queryKey: withdrawalKeys.user(),
      });

      // Optimistically update status to cancelled
      queryClient.setQueriesData<WithdrawalListResponse>(
        { queryKey: withdrawalKeys.user() },
        updateWithdrawalInCache(withdrawalId, (w) => ({
          ...w,
          status: "CANCELLED" as WithdrawalRequestStatus,
        }))
      );

      return { previousData };
    },

    onSuccess: () => {
      // Balance is restored after cancellation
      invalidateBalances();
    },

    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: withdrawalKeys.user() });
    },
  });
}

// ============================================
// ADMIN HOOKS
// ============================================

/**
 * Admin: Fetch all withdrawals with filters
 */
export function useAdminWithdrawals(params?: WithdrawalFilterParams) {
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  return useQuery({
    queryKey: withdrawalKeys.adminList(params),
    queryFn: () => withdrawalsApi.getWithdrawals(params),
    enabled: isAuthenticated && isAdmin,
    staleTime: 15 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

/**
 * Admin: Approve a withdrawal with optimistic update
 */
export function useApproveWithdrawal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (withdrawalId: string) =>
      withdrawalsApi.approveWithdrawal(withdrawalId),

    onMutate: async (withdrawalId) => {
      await queryClient.cancelQueries({ queryKey: withdrawalKeys.admin() });

      const previousData = queryClient.getQueriesData<WithdrawalListResponse>({
        queryKey: withdrawalKeys.admin(),
      });

      queryClient.setQueriesData<WithdrawalListResponse>(
        { queryKey: withdrawalKeys.admin() },
        updateWithdrawalInCache(withdrawalId, (w) => ({
          ...w,
          status: "APPROVED" as WithdrawalRequestStatus,
        }))
      );

      return { previousData };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: withdrawalKeys.admin() });
      queryClient.invalidateQueries({ queryKey: withdrawalKeys.adminStats() });
    },
  });
}

/**
 * Admin: Reject a withdrawal with optimistic update
 */
export function useRejectWithdrawal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ withdrawalId, reason }: { withdrawalId: string; reason: string }) =>
      withdrawalsApi.rejectWithdrawal(withdrawalId, reason),

    onMutate: async ({ withdrawalId, reason }) => {
      await queryClient.cancelQueries({ queryKey: withdrawalKeys.admin() });

      const previousData = queryClient.getQueriesData<WithdrawalListResponse>({
        queryKey: withdrawalKeys.admin(),
      });

      queryClient.setQueriesData<WithdrawalListResponse>(
        { queryKey: withdrawalKeys.admin() },
        updateWithdrawalInCache(withdrawalId, (w) => ({
          ...w,
          status: "REJECTED" as WithdrawalRequestStatus,
          rejectionReason: reason,
        }))
      );

      return { previousData };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: withdrawalKeys.admin() });
      queryClient.invalidateQueries({ queryKey: withdrawalKeys.adminStats() });
    },
  });
}

/**
 * Admin: Fetch withdrawal statistics
 */
export function useWithdrawalStats() {
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  return useQuery({
    queryKey: withdrawalKeys.adminStats(),
    queryFn: () => withdrawalsApi.getStats(),
    enabled: isAuthenticated && isAdmin,
    staleTime: 30 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

/**
 * Admin: Fetch hot wallet status
 */
export function useHotWalletStatus() {
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  return useQuery({
    queryKey: withdrawalKeys.hotWallet(),
    queryFn: () => withdrawalsApi.getHotWalletStatus(),
    enabled: isAuthenticated && isAdmin,
    staleTime: 30 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

/**
 * Admin: Fetch processor status
 */
export function useWithdrawalProcessorStatus() {
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  return useQuery({
    queryKey: withdrawalKeys.processor(),
    queryFn: () => withdrawalsApi.getProcessorStatus(),
    enabled: isAuthenticated && isAdmin,
    staleTime: 10 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

/**
 * Admin: Start withdrawal processor
 */
export function useStartWithdrawalProcessor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => withdrawalsApi.startProcessor(),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: withdrawalKeys.processor() });
    },
  });
}

/**
 * Admin: Stop withdrawal processor
 */
export function useStopWithdrawalProcessor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => withdrawalsApi.stopProcessor(),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: withdrawalKeys.processor() });
    },
  });
}

/**
 * Admin: Trigger processing manually
 */
export function useTriggerWithdrawalProcessing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => withdrawalsApi.triggerProcessing(),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: withdrawalKeys.admin() });
      queryClient.invalidateQueries({ queryKey: withdrawalKeys.adminStats() });
    },
  });
}

/**
 * Admin: Process a specific withdrawal manually
 */
export function useProcessWithdrawal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (withdrawalId: string) =>
      withdrawalsApi.processWithdrawal(withdrawalId),

    onMutate: async (withdrawalId) => {
      await queryClient.cancelQueries({ queryKey: withdrawalKeys.admin() });

      const previousData = queryClient.getQueriesData<WithdrawalListResponse>({
        queryKey: withdrawalKeys.admin(),
      });

      queryClient.setQueriesData<WithdrawalListResponse>(
        { queryKey: withdrawalKeys.admin() },
        updateWithdrawalInCache(withdrawalId, (w) => ({
          ...w,
          status: "PROCESSING" as WithdrawalRequestStatus,
        }))
      );

      return { previousData };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: withdrawalKeys.admin() });
      queryClient.invalidateQueries({ queryKey: withdrawalKeys.adminStats() });
      queryClient.invalidateQueries({ queryKey: withdrawalKeys.hotWallet() });
    },
  });
}
