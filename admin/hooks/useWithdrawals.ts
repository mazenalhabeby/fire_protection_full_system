"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { withdrawalsApi } from "@/lib/api";
import type {
  WithdrawalRequest,
  WithdrawalRequestStatus,
  WithdrawalListResponse,
  WithdrawalStats,
  HotWalletStatus,
  WithdrawalProcessorStatus,
} from "@/types";

// ============================================
// QUERY KEY FACTORY
// ============================================

export const withdrawalKeys = {
  all: ["admin", "withdrawals"] as const,
  // Lists
  lists: () => [...withdrawalKeys.all, "list"] as const,
  list: (params: { page: number; limit: number; status?: WithdrawalRequestStatus }) =>
    [...withdrawalKeys.lists(), params] as const,
  // Stats & Status
  stats: () => [...withdrawalKeys.all, "stats"] as const,
  hotWallet: () => [...withdrawalKeys.all, "hot-wallet"] as const,
  processor: () => [...withdrawalKeys.all, "processor"] as const,
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
 * Removes a withdrawal from the cache (for status filter changes)
 */
function removeWithdrawalFromCache(withdrawalId: string): WithdrawalCacheUpdater {
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
// CACHE INVALIDATION HOOK
// ============================================

export function useInvalidateWithdrawals() {
  const queryClient = useQueryClient();

  return {
    // Invalidate all withdrawal lists
    invalidateLists: () => {
      queryClient.invalidateQueries({ queryKey: withdrawalKeys.lists() });
    },
    // Invalidate stats
    invalidateStats: () => {
      queryClient.invalidateQueries({ queryKey: withdrawalKeys.stats() });
    },
    // Invalidate hot wallet
    invalidateHotWallet: () => {
      queryClient.invalidateQueries({ queryKey: withdrawalKeys.hotWallet() });
    },
    // Invalidate processor status
    invalidateProcessor: () => {
      queryClient.invalidateQueries({ queryKey: withdrawalKeys.processor() });
    },
    // Invalidate all
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: withdrawalKeys.all });
    },
  };
}

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Fetch withdrawals with pagination and status filter
 */
export function useAdminWithdrawals(params: {
  page: number;
  limit: number;
  status?: WithdrawalRequestStatus;
}) {
  return useQuery({
    queryKey: withdrawalKeys.list(params),
    queryFn: (): Promise<WithdrawalListResponse> => withdrawalsApi.getWithdrawals(params),
    staleTime: 15 * 1000, // Fresh for 15s
    gcTime: 5 * 60 * 1000, // Cache for 5min
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch withdrawal statistics
 */
export function useWithdrawalStats() {
  return useQuery({
    queryKey: withdrawalKeys.stats(),
    queryFn: (): Promise<WithdrawalStats> => withdrawalsApi.getStats(),
    staleTime: 30 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch hot wallet status
 */
export function useHotWalletStatus() {
  return useQuery({
    queryKey: withdrawalKeys.hotWallet(),
    queryFn: (): Promise<HotWalletStatus> => withdrawalsApi.getHotWalletStatus(),
    staleTime: 30 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch processor status
 */
export function useWithdrawalProcessorStatus() {
  return useQuery({
    queryKey: withdrawalKeys.processor(),
    queryFn: (): Promise<WithdrawalProcessorStatus> => withdrawalsApi.getProcessorStatus(),
    staleTime: 10 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

// ============================================
// PROCESSOR CONTROL MUTATIONS
// ============================================

/**
 * Start withdrawal processor
 */
export function useStartWithdrawalProcessor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => withdrawalsApi.startProcessor(),

    // Optimistic update - show as running immediately
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: withdrawalKeys.processor() });

      const previousData = queryClient.getQueryData<WithdrawalProcessorStatus>(
        withdrawalKeys.processor()
      );

      queryClient.setQueryData<WithdrawalProcessorStatus>(
        withdrawalKeys.processor(),
        (old) => old ? { ...old, isRunning: true } : old
      );

      return { previousData };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(withdrawalKeys.processor(), context.previousData);
      }
    },

    onSettled: async () => {
      await queryClient.refetchQueries({ queryKey: withdrawalKeys.processor() });
    },
  });
}

/**
 * Stop withdrawal processor
 */
export function useStopWithdrawalProcessor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => withdrawalsApi.stopProcessor(),

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: withdrawalKeys.processor() });

      const previousData = queryClient.getQueryData<WithdrawalProcessorStatus>(
        withdrawalKeys.processor()
      );

      queryClient.setQueryData<WithdrawalProcessorStatus>(
        withdrawalKeys.processor(),
        (old) => old ? { ...old, isRunning: false } : old
      );

      return { previousData };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(withdrawalKeys.processor(), context.previousData);
      }
    },

    onSettled: async () => {
      await queryClient.refetchQueries({ queryKey: withdrawalKeys.processor() });
    },
  });
}

/**
 * Trigger manual processing
 */
export function useTriggerWithdrawalProcessing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => withdrawalsApi.triggerProcessing(),

    onSettled: async () => {
      // Force immediate refetch of all withdrawal data after processing
      await queryClient.refetchQueries({ queryKey: withdrawalKeys.all });
    },
  });
}

// ============================================
// WITHDRAWAL ACTION MUTATIONS
// ============================================

/**
 * Approve a withdrawal with optimistic update
 */
export function useApproveWithdrawal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (withdrawalId: string) => withdrawalsApi.approveWithdrawal(withdrawalId),

    onMutate: async (withdrawalId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: withdrawalKeys.lists() });

      // Snapshot all list queries for rollback
      const previousLists = queryClient.getQueriesData<WithdrawalListResponse>({
        queryKey: withdrawalKeys.lists(),
      });

      // Optimistically update status in all cached lists
      queryClient.setQueriesData<WithdrawalListResponse>(
        { queryKey: withdrawalKeys.lists() },
        updateWithdrawalInCache(withdrawalId, (w) => ({
          ...w,
          status: "APPROVED" as WithdrawalRequestStatus,
          approvedAt: new Date().toISOString(),
        }))
      );

      return { previousLists };
    },

    onError: (_err, _vars, context) => {
      // Rollback all lists on error
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    onSettled: async () => {
      // Force immediate refetch to ensure UI updates
      await queryClient.refetchQueries({ queryKey: withdrawalKeys.lists() });
      await queryClient.refetchQueries({ queryKey: withdrawalKeys.stats() });
    },
  });
}

/**
 * Reject a withdrawal with optimistic update
 */
export function useRejectWithdrawal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ withdrawalId, reason }: { withdrawalId: string; reason: string }) =>
      withdrawalsApi.rejectWithdrawal(withdrawalId, reason),

    onMutate: async ({ withdrawalId, reason }) => {
      await queryClient.cancelQueries({ queryKey: withdrawalKeys.lists() });

      const previousLists = queryClient.getQueriesData<WithdrawalListResponse>({
        queryKey: withdrawalKeys.lists(),
      });

      queryClient.setQueriesData<WithdrawalListResponse>(
        { queryKey: withdrawalKeys.lists() },
        updateWithdrawalInCache(withdrawalId, (w) => ({
          ...w,
          status: "REJECTED" as WithdrawalRequestStatus,
          rejectionReason: reason,
        }))
      );

      return { previousLists };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    onSettled: async () => {
      // Force immediate refetch to ensure UI updates
      await queryClient.refetchQueries({ queryKey: withdrawalKeys.lists() });
      await queryClient.refetchQueries({ queryKey: withdrawalKeys.stats() });
    },
  });
}

/**
 * Process a specific withdrawal with optimistic update
 */
export function useProcessWithdrawal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (withdrawalId: string) => withdrawalsApi.processWithdrawal(withdrawalId),

    onMutate: async (withdrawalId) => {
      await queryClient.cancelQueries({ queryKey: withdrawalKeys.lists() });

      const previousLists = queryClient.getQueriesData<WithdrawalListResponse>({
        queryKey: withdrawalKeys.lists(),
      });

      // Show as "PROCESSING" immediately
      queryClient.setQueriesData<WithdrawalListResponse>(
        { queryKey: withdrawalKeys.lists() },
        updateWithdrawalInCache(withdrawalId, (w) => ({
          ...w,
          status: "PROCESSING" as WithdrawalRequestStatus,
        }))
      );

      return { previousLists };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    onSettled: async () => {
      // Force immediate refetch to ensure UI updates
      await queryClient.refetchQueries({ queryKey: withdrawalKeys.lists() });
      await queryClient.refetchQueries({ queryKey: withdrawalKeys.stats() });
      await queryClient.refetchQueries({ queryKey: withdrawalKeys.hotWallet() });
    },
  });
}

// ============================================
// BATCH OPERATIONS (Optional - for future use)
// ============================================

/**
 * Approve multiple withdrawals
 */
export function useBatchApproveWithdrawals() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (withdrawalIds: string[]) => {
      // Process in parallel
      const results = await Promise.allSettled(
        withdrawalIds.map((id) => withdrawalsApi.approveWithdrawal(id))
      );
      return results;
    },

    onMutate: async (withdrawalIds) => {
      await queryClient.cancelQueries({ queryKey: withdrawalKeys.lists() });

      const previousLists = queryClient.getQueriesData<WithdrawalListResponse>({
        queryKey: withdrawalKeys.lists(),
      });

      // Optimistically update all selected withdrawals
      withdrawalIds.forEach((id) => {
        queryClient.setQueriesData<WithdrawalListResponse>(
          { queryKey: withdrawalKeys.lists() },
          updateWithdrawalInCache(id, (w) => ({
            ...w,
            status: "APPROVED" as WithdrawalRequestStatus,
            approvedAt: new Date().toISOString(),
          }))
        );
      });

      return { previousLists };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    onSettled: async () => {
      // Force immediate refetch to ensure UI updates
      await queryClient.refetchQueries({ queryKey: withdrawalKeys.lists() });
      await queryClient.refetchQueries({ queryKey: withdrawalKeys.stats() });
    },
  });
}

/**
 * Process multiple withdrawals
 */
export function useBatchProcessWithdrawals() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (withdrawalIds: string[]) => {
      const results = await Promise.allSettled(
        withdrawalIds.map((id) => withdrawalsApi.processWithdrawal(id))
      );
      return results;
    },

    onMutate: async (withdrawalIds) => {
      await queryClient.cancelQueries({ queryKey: withdrawalKeys.lists() });

      const previousLists = queryClient.getQueriesData<WithdrawalListResponse>({
        queryKey: withdrawalKeys.lists(),
      });

      withdrawalIds.forEach((id) => {
        queryClient.setQueriesData<WithdrawalListResponse>(
          { queryKey: withdrawalKeys.lists() },
          updateWithdrawalInCache(id, (w) => ({
            ...w,
            status: "PROCESSING" as WithdrawalRequestStatus,
          }))
        );
      });

      return { previousLists };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    onSettled: async () => {
      // Force immediate refetch to ensure UI updates
      await queryClient.refetchQueries({ queryKey: withdrawalKeys.lists() });
      await queryClient.refetchQueries({ queryKey: withdrawalKeys.stats() });
      await queryClient.refetchQueries({ queryKey: withdrawalKeys.hotWallet() });
    },
  });
}
