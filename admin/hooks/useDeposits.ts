"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { depositsApi } from "@/lib/api";
import type {
  OnchainDeposit,
  OnchainDepositStatus,
  DepositListResponse,
  DepositStats,
  DepositListenerStatus,
} from "@/types";

// ============================================
// QUERY KEY FACTORY
// ============================================

export const depositKeys = {
  all: ["admin", "deposits"] as const,
  // Lists
  lists: () => [...depositKeys.all, "list"] as const,
  list: (params: { page: number; limit: number; status?: OnchainDepositStatus }) =>
    [...depositKeys.lists(), params] as const,
  unmapped: (params: { page: number; limit: number }) =>
    [...depositKeys.all, "unmapped", params] as const,
  locked: (params: { page: number; limit: number }) =>
    [...depositKeys.all, "locked", params] as const,
  // Stats & Status
  stats: () => [...depositKeys.all, "stats"] as const,
  listener: () => [...depositKeys.all, "listener"] as const,
};

// ============================================
// CACHE UPDATE UTILITIES
// ============================================

type DepositCacheUpdater = (
  old: DepositListResponse | undefined
) => DepositListResponse | undefined;

/**
 * Updates a deposit in the cache by ID
 */
function updateDepositInCache(
  depositId: string,
  updater: (deposit: OnchainDeposit) => OnchainDeposit
): DepositCacheUpdater {
  return (old) => {
    if (!old) return old;
    return {
      ...old,
      deposits: old.deposits.map((d) =>
        d.id === depositId ? updater(d) : d
      ),
    };
  };
}

/**
 * Removes a deposit from the cache
 */
function removeDepositFromCache(depositId: string): DepositCacheUpdater {
  return (old) => {
    if (!old) return old;
    return {
      ...old,
      deposits: old.deposits.filter((d) => d.id !== depositId),
      total: Math.max(0, old.total - 1),
    };
  };
}

// ============================================
// CACHE INVALIDATION HOOK
// ============================================

export function useInvalidateDeposits() {
  const queryClient = useQueryClient();

  return {
    invalidateLists: () => {
      queryClient.invalidateQueries({ queryKey: depositKeys.lists() });
    },
    invalidateUnmapped: () => {
      queryClient.invalidateQueries({ queryKey: [...depositKeys.all, "unmapped"] });
    },
    invalidateStats: () => {
      queryClient.invalidateQueries({ queryKey: depositKeys.stats() });
    },
    invalidateListener: () => {
      queryClient.invalidateQueries({ queryKey: depositKeys.listener() });
    },
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: depositKeys.all });
    },
  };
}

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Fetch deposits with pagination and status filter
 */
export function useAdminDeposits(params: {
  page: number;
  limit: number;
  status?: OnchainDepositStatus;
}) {
  return useQuery({
    queryKey: depositKeys.list(params),
    queryFn: (): Promise<DepositListResponse> => depositsApi.getDeposits(params),
    staleTime: 15 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch unmapped deposits
 */
export function useUnmappedDeposits(params: { page: number; limit: number }) {
  return useQuery({
    queryKey: depositKeys.unmapped(params),
    queryFn: (): Promise<DepositListResponse> => depositsApi.getUnmappedDeposits(params),
    staleTime: 15 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch locked deposits (pending release)
 */
export function useLockedDeposits(params: { page: number; limit: number }) {
  return useQuery({
    queryKey: depositKeys.locked(params),
    queryFn: (): Promise<DepositListResponse> => depositsApi.getLockedDeposits(params),
    staleTime: 15 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch deposit statistics
 */
export function useDepositStats() {
  return useQuery({
    queryKey: depositKeys.stats(),
    queryFn: (): Promise<DepositStats> => depositsApi.getStats(),
    staleTime: 30 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch deposit listener status
 */
export function useDepositListenerStatus() {
  return useQuery({
    queryKey: depositKeys.listener(),
    queryFn: (): Promise<DepositListenerStatus> => depositsApi.getListenerStatus(),
    staleTime: 10 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

// ============================================
// LISTENER CONTROL MUTATIONS
// ============================================

/**
 * Start deposit listener with optimistic update
 */
export function useStartDepositListener() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => depositsApi.startListener(),

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: depositKeys.listener() });

      const previousData = queryClient.getQueryData<DepositListenerStatus>(
        depositKeys.listener()
      );

      queryClient.setQueryData<DepositListenerStatus>(
        depositKeys.listener(),
        (old) => old ? { ...old, isRunning: true } : old
      );

      return { previousData };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(depositKeys.listener(), context.previousData);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: depositKeys.listener() });
    },
  });
}

/**
 * Stop deposit listener with optimistic update
 */
export function useStopDepositListener() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => depositsApi.stopListener(),

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: depositKeys.listener() });

      const previousData = queryClient.getQueryData<DepositListenerStatus>(
        depositKeys.listener()
      );

      queryClient.setQueryData<DepositListenerStatus>(
        depositKeys.listener(),
        (old) => old ? { ...old, isRunning: false } : old
      );

      return { previousData };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(depositKeys.listener(), context.previousData);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: depositKeys.listener() });
    },
  });
}

/**
 * Trigger manual deposit processing
 */
export function useTriggerDepositProcessing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => depositsApi.triggerProcessing(),

    onSettled: () => {
      // Refetch all deposit data after processing
      queryClient.invalidateQueries({ queryKey: depositKeys.all });
    },
  });
}

// ============================================
// DEPOSIT MAPPING MUTATION
// ============================================

/**
 * Map deposit to user with optimistic update
 */
export function useMapDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ depositId, userId }: { depositId: string; userId: string }) =>
      depositsApi.mapDepositToUser(depositId, userId),

    onMutate: async ({ depositId }) => {
      await queryClient.cancelQueries({ queryKey: depositKeys.lists() });
      await queryClient.cancelQueries({ queryKey: [...depositKeys.all, "unmapped"] });

      const previousLists = queryClient.getQueriesData<DepositListResponse>({
        queryKey: depositKeys.lists(),
      });
      const previousUnmapped = queryClient.getQueriesData<DepositListResponse>({
        queryKey: [...depositKeys.all, "unmapped"],
      });

      queryClient.setQueriesData<DepositListResponse>(
        { queryKey: depositKeys.lists() },
        updateDepositInCache(depositId, (d) => ({
          ...d,
          status: "CREDITED" as OnchainDepositStatus,
        }))
      );

      queryClient.setQueriesData<DepositListResponse>(
        { queryKey: [...depositKeys.all, "unmapped"] },
        removeDepositFromCache(depositId)
      );

      return { previousLists, previousUnmapped };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousUnmapped) {
        context.previousUnmapped.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    onSettled: async () => {
      await queryClient.refetchQueries({ queryKey: depositKeys.lists() });
      await queryClient.refetchQueries({ queryKey: [...depositKeys.all, "unmapped"] });
      await queryClient.refetchQueries({ queryKey: depositKeys.stats() });
    },
  });
}

/**
 * Get deposit with user balance info
 */
export function useDepositWithBalance(depositId: string | null) {
  return useQuery({
    queryKey: [...depositKeys.all, "balance-check", depositId],
    queryFn: () => depositId ? depositsApi.getDepositWithBalance(depositId) : null,
    enabled: !!depositId,
    staleTime: 0, // Always fetch fresh
  });
}

/**
 * Unmap deposit (reverse wrong mapping)
 */
export function useUnmapDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ depositId, reason, force }: { depositId: string; reason: string; force?: boolean }) =>
      depositsApi.unmapDeposit(depositId, reason, force),

    onMutate: async ({ depositId }) => {
      await queryClient.cancelQueries({ queryKey: depositKeys.lists() });

      const previousLists = queryClient.getQueriesData<DepositListResponse>({
        queryKey: depositKeys.lists(),
      });

      // Optimistically update to UNMAPPED status
      queryClient.setQueriesData<DepositListResponse>(
        { queryKey: depositKeys.lists() },
        updateDepositInCache(depositId, (d) => ({
          ...d,
          status: "UNMAPPED" as OnchainDepositStatus,
          userId: null,
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
      await queryClient.refetchQueries({ queryKey: depositKeys.lists() });
      await queryClient.refetchQueries({ queryKey: [...depositKeys.all, "unmapped"] });
      await queryClient.refetchQueries({ queryKey: depositKeys.stats() });
    },
  });
}

/**
 * Reassign deposit to different user
 */
export function useReassignDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ depositId, userId, reason, force }: { depositId: string; userId: string; reason: string; force?: boolean }) =>
      depositsApi.reassignDeposit(depositId, userId, reason, force),

    onSettled: async () => {
      await queryClient.refetchQueries({ queryKey: depositKeys.lists() });
      await queryClient.refetchQueries({ queryKey: [...depositKeys.all, "unmapped"] });
      await queryClient.refetchQueries({ queryKey: depositKeys.stats() });
    },
  });
}

/**
 * Release a locked deposit early
 */
export function useReleaseLockedDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ depositId, reason }: { depositId: string; reason: string }) =>
      depositsApi.releaseLockedDeposit(depositId, reason),

    onMutate: async ({ depositId }) => {
      await queryClient.cancelQueries({ queryKey: depositKeys.lists() });
      await queryClient.cancelQueries({ queryKey: [...depositKeys.all, "locked"] });

      const previousLists = queryClient.getQueriesData<DepositListResponse>({
        queryKey: depositKeys.lists(),
      });

      // Optimistically update status to CREDITED
      queryClient.setQueriesData<DepositListResponse>(
        { queryKey: depositKeys.lists() },
        updateDepositInCache(depositId, (d) => ({
          ...d,
          status: "CREDITED" as OnchainDepositStatus,
        }))
      );

      // Remove from locked list
      queryClient.setQueriesData<DepositListResponse>(
        { queryKey: [...depositKeys.all, "locked"] },
        removeDepositFromCache(depositId)
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
      await queryClient.refetchQueries({ queryKey: depositKeys.lists() });
      await queryClient.refetchQueries({ queryKey: [...depositKeys.all, "locked"] });
      await queryClient.refetchQueries({ queryKey: depositKeys.stats() });
    },
  });
}

// ============================================
// ADMIN: HISTORICAL SCAN MUTATIONS
// ============================================

/**
 * Lookup and process a specific transaction by hash
 */
export function useLookupTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (txHash: string) => depositsApi.lookupTransaction(txHash),

    onSuccess: (data) => {
      if (data.success && data.deposit) {
        // Invalidate all deposit queries to refresh the list
        queryClient.invalidateQueries({ queryKey: depositKeys.all });
      }
    },
  });
}

/**
 * Quick scan last N hours for missed deposits
 */
export function useQuickScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (hours?: number) => depositsApi.quickScan(hours),

    onSuccess: (data) => {
      if (data.newDeposits > 0) {
        // Invalidate all deposit queries to refresh the list
        queryClient.invalidateQueries({ queryKey: depositKeys.all });
      }
    },
  });
}

/**
 * Full historical scan for missed deposits
 */
export function useHistoricalScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (days?: number) => depositsApi.historicalScan(days),

    onSuccess: (data) => {
      if (data.newDeposits > 0) {
        // Invalidate all deposit queries to refresh the list
        queryClient.invalidateQueries({ queryKey: depositKeys.all });
      }
    },
  });
}
