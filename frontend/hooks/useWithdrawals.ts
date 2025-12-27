"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { withdrawalsApi } from "@/lib/api/withdrawals";
import { useAuth } from "./useAuth";
import type {
  WithdrawalRequest,
  WithdrawalResponse,
  WithdrawalListResponse,
  WithdrawalStats,
  HotWalletStatus,
  WithdrawalProcessorStatus,
  WithdrawalFilterParams,
  RequestWithdrawalParams,
} from "@/types/withdrawals";

// ============================================
// QUERY KEYS
// ============================================

export const withdrawalQueryKeys = {
  myWithdrawals: (params?: { page?: number; limit?: number }) =>
    ["myWithdrawals", params] as const,
  adminWithdrawals: (params?: WithdrawalFilterParams) =>
    ["adminWithdrawals", params] as const,
  withdrawalStats: ["withdrawalStats"] as const,
  hotWalletStatus: ["hotWalletStatus"] as const,
  processorStatus: ["withdrawalProcessorStatus"] as const,
};

// ============================================
// USER HOOKS
// ============================================

/**
 * Fetch user's withdrawals
 */
export function useMyWithdrawals(params?: { page?: number; limit?: number }) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: withdrawalQueryKeys.myWithdrawals(params),
    queryFn: async (): Promise<WithdrawalListResponse> => {
      return withdrawalsApi.getMyWithdrawals(params);
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // Auto-refresh every minute
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

/**
 * Request a new withdrawal
 */
export function useRequestWithdrawal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RequestWithdrawalParams): Promise<WithdrawalResponse> => {
      return withdrawalsApi.requestWithdrawal(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myWithdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["walletBalances"] });
    },
  });
}

/**
 * Confirm a withdrawal with email code
 */
export function useConfirmWithdrawal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      withdrawalId,
      confirmationCode,
    }: {
      withdrawalId: string;
      confirmationCode: string;
    }): Promise<WithdrawalResponse> => {
      return withdrawalsApi.confirmWithdrawal(withdrawalId, confirmationCode);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myWithdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["walletBalances"] });
    },
  });
}

/**
 * Cancel a pending withdrawal
 */
export function useCancelWithdrawal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (withdrawalId: string) => {
      return withdrawalsApi.cancelWithdrawal(withdrawalId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myWithdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["walletBalances"] });
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
    queryKey: withdrawalQueryKeys.adminWithdrawals(params),
    queryFn: async (): Promise<WithdrawalListResponse> => {
      return withdrawalsApi.getWithdrawals(params);
    },
    enabled: isAuthenticated && isAdmin,
    staleTime: 15 * 1000,
  });
}

/**
 * Admin: Approve a withdrawal
 */
export function useApproveWithdrawal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (withdrawalId: string): Promise<WithdrawalResponse> => {
      return withdrawalsApi.approveWithdrawal(withdrawalId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminWithdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["withdrawalStats"] });
    },
  });
}

/**
 * Admin: Reject a withdrawal
 */
export function useRejectWithdrawal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      withdrawalId,
      reason,
    }: {
      withdrawalId: string;
      reason: string;
    }): Promise<WithdrawalResponse> => {
      return withdrawalsApi.rejectWithdrawal(withdrawalId, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminWithdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["withdrawalStats"] });
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
    queryKey: withdrawalQueryKeys.withdrawalStats,
    queryFn: async (): Promise<WithdrawalStats> => {
      return withdrawalsApi.getStats();
    },
    enabled: isAuthenticated && isAdmin,
    staleTime: 30 * 1000,
  });
}

/**
 * Admin: Fetch hot wallet status
 */
export function useHotWalletStatus() {
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  return useQuery({
    queryKey: withdrawalQueryKeys.hotWalletStatus,
    queryFn: async (): Promise<HotWalletStatus> => {
      return withdrawalsApi.getHotWalletStatus();
    },
    enabled: isAuthenticated && isAdmin,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // Check every minute
  });
}

/**
 * Admin: Fetch processor status
 */
export function useWithdrawalProcessorStatus() {
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  return useQuery({
    queryKey: withdrawalQueryKeys.processorStatus,
    queryFn: async (): Promise<WithdrawalProcessorStatus> => {
      return withdrawalsApi.getProcessorStatus();
    },
    enabled: isAuthenticated && isAdmin,
    staleTime: 10 * 1000,
    refetchInterval: 30 * 1000,
  });
}

/**
 * Admin: Start withdrawal processor
 */
export function useStartWithdrawalProcessor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return withdrawalsApi.startProcessor();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: withdrawalQueryKeys.processorStatus });
    },
  });
}

/**
 * Admin: Stop withdrawal processor
 */
export function useStopWithdrawalProcessor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return withdrawalsApi.stopProcessor();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: withdrawalQueryKeys.processorStatus });
    },
  });
}

/**
 * Admin: Trigger processing manually
 */
export function useTriggerWithdrawalProcessing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return withdrawalsApi.triggerProcessing();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminWithdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["withdrawalStats"] });
    },
  });
}

/**
 * Admin: Process a specific withdrawal manually
 */
export function useProcessWithdrawal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (withdrawalId: string): Promise<WithdrawalResponse> => {
      return withdrawalsApi.processWithdrawal(withdrawalId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminWithdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["withdrawalStats"] });
      queryClient.invalidateQueries({ queryKey: ["hotWalletStatus"] });
    },
  });
}

// ============================================
// CACHE INVALIDATION
// ============================================

export function useInvalidateWithdrawals() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ["myWithdrawals"] });
    queryClient.invalidateQueries({ queryKey: ["adminWithdrawals"] });
    queryClient.invalidateQueries({ queryKey: ["withdrawalStats"] });
    queryClient.invalidateQueries({ queryKey: ["hotWalletStatus"] });
  };
}
