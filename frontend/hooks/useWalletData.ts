"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { walletApi } from "@/lib/api/wallet";
import { useAuth } from "./useAuth";
import type {
  WalletBalance,
  WalletBalances,
  TransferLimits,
  InitiateTransferRequest,
  InitiateTransferResponse,
  ConfirmTransferResponse,
  TransferInfo,
  WalletTransaction,
  WalletTransactionSummary,
  WalletCurrency,
  TransferMethod,
  TransferHistoryParams,
  TransactionHistoryParams,
} from "@/types/api";

// ============================================
// QUERY KEYS - Centralized for consistency
// ============================================

export const walletQueryKeys = {
  // Balances
  balances: ["walletBalances"] as const,
  balance: (currency: WalletCurrency) => ["walletBalance", currency] as const,

  // Transfers
  transfers: (params?: TransferHistoryParams) => ["walletTransfers", params] as const,
  pendingTransfers: ["walletPendingTransfers"] as const,

  // Transactions
  transactions: (params?: TransactionHistoryParams) => ["walletTransactions", params] as const,
  transaction: (id: string) => ["walletTransaction", id] as const,
  transactionSummary: (currency?: WalletCurrency, period?: string) =>
    ["walletTransactionSummary", currency, period] as const,
  recentTransactions: ["walletRecentTransactions"] as const,

  // Limits
  limits: ["walletLimits"] as const,
};

// ============================================
// BALANCE HOOKS
// ============================================

/**
 * Fetch and cache all wallet balances
 */
export function useWalletBalances() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: walletQueryKeys.balances,
    queryFn: async (): Promise<WalletBalances> => {
      return walletApi.getBalances();
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });
}

/**
 * Fetch and cache balance for a specific currency
 */
export function useWalletBalance(currency: WalletCurrency) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: walletQueryKeys.balance(currency),
    queryFn: async (): Promise<WalletBalance> => {
      return walletApi.getBalance(currency);
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

// ============================================
// TRANSFER HOOKS
// ============================================

/**
 * Initiate a transfer mutation
 */
export function useInitiateTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: InitiateTransferRequest): Promise<InitiateTransferResponse> => {
      return walletApi.initiateTransfer(data);
    },
    onSuccess: () => {
      // Invalidate pending transfers
      queryClient.invalidateQueries({ queryKey: walletQueryKeys.pendingTransfers });
    },
  });
}

/**
 * Confirm a transfer mutation with optimistic update
 */
export function useConfirmTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transferId,
      confirmationCode,
    }: {
      transferId: string;
      confirmationCode: string;
    }): Promise<ConfirmTransferResponse> => {
      return walletApi.confirmTransfer(transferId, confirmationCode);
    },
    onMutate: async ({ transferId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: walletQueryKeys.pendingTransfers });

      // Snapshot previous value
      const previousPending = queryClient.getQueryData<{ transfers: TransferInfo[]; total: number }>(
        walletQueryKeys.pendingTransfers
      );

      // Optimistically remove from pending
      if (previousPending) {
        queryClient.setQueryData(walletQueryKeys.pendingTransfers, {
          transfers: previousPending.transfers.filter((t) => t.id !== transferId),
          total: previousPending.total - 1,
        });
      }

      return { previousPending };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousPending) {
        queryClient.setQueryData(walletQueryKeys.pendingTransfers, context.previousPending);
      }
    },
    onSettled: () => {
      // Refetch to ensure sync
      queryClient.invalidateQueries({ queryKey: walletQueryKeys.balances });
      queryClient.invalidateQueries({ queryKey: walletQueryKeys.pendingTransfers });
      queryClient.invalidateQueries({ queryKey: walletQueryKeys.recentTransactions });
      queryClient.invalidateQueries({ queryKey: walletQueryKeys.limits });
    },
  });
}

/**
 * Cancel a transfer mutation
 */
export function useCancelTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transferId: string) => {
      return walletApi.cancelTransfer(transferId);
    },
    onMutate: async (transferId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: walletQueryKeys.pendingTransfers });

      // Snapshot previous value
      const previousPending = queryClient.getQueryData<{ transfers: TransferInfo[]; total: number }>(
        walletQueryKeys.pendingTransfers
      );

      // Optimistically remove from pending
      if (previousPending) {
        queryClient.setQueryData(walletQueryKeys.pendingTransfers, {
          transfers: previousPending.transfers.filter((t) => t.id !== transferId),
          total: previousPending.total - 1,
        });
      }

      return { previousPending };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousPending) {
        queryClient.setQueryData(walletQueryKeys.pendingTransfers, context.previousPending);
      }
    },
    onSettled: () => {
      // Refetch to ensure sync
      queryClient.invalidateQueries({ queryKey: walletQueryKeys.pendingTransfers });
    },
  });
}

/**
 * Fetch and cache transfer history
 */
export function useTransferHistory(params?: TransferHistoryParams) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: walletQueryKeys.transfers(params),
    queryFn: async () => {
      return walletApi.getTransfers(params);
    },
    enabled: isAuthenticated,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Fetch and cache pending transfers
 */
export function usePendingTransfers() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: walletQueryKeys.pendingTransfers,
    queryFn: async () => {
      return walletApi.getPendingTransfers();
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute to check for expired transfers
  });
}

// ============================================
// RECIPIENT LOOKUP HOOK
// ============================================

/**
 * Lookup recipient mutation
 */
export function useLookupRecipient() {
  return useMutation({
    mutationFn: async ({
      method,
      identifier,
    }: {
      method: TransferMethod;
      identifier: string;
    }) => {
      return walletApi.lookupRecipient(method, identifier);
    },
  });
}

// ============================================
// TRANSACTION HISTORY HOOKS
// ============================================

/**
 * Fetch and cache transaction history
 */
export function useWalletTransactionHistory(params?: TransactionHistoryParams) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: walletQueryKeys.transactions(params),
    queryFn: async () => {
      return walletApi.getTransactions(params);
    },
    enabled: isAuthenticated,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Fetch and cache a single transaction
 */
export function useWalletTransaction(transactionId: string) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: walletQueryKeys.transaction(transactionId),
    queryFn: async (): Promise<WalletTransaction> => {
      return walletApi.getTransaction(transactionId);
    },
    enabled: isAuthenticated && !!transactionId,
    staleTime: 5 * 60 * 1000, // 5 minutes - transactions don't change
  });
}

/**
 * Fetch and cache transaction summary
 */
export function useWalletTransactionSummary(options?: {
  currency?: WalletCurrency;
  period?: "day" | "week" | "month" | "all";
}) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: walletQueryKeys.transactionSummary(options?.currency, options?.period),
    queryFn: async (): Promise<WalletTransactionSummary> => {
      return walletApi.getTransactionSummary(options);
    },
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch and cache recent transactions for dashboard
 */
export function useRecentWalletTransactions() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: walletQueryKeys.recentTransactions,
    queryFn: async () => {
      return walletApi.getRecentTransactions();
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// ============================================
// TRANSFER LIMITS HOOK
// ============================================

/**
 * Fetch and cache transfer limits
 */
export function useTransferLimits() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: walletQueryKeys.limits,
    queryFn: async (): Promise<TransferLimits> => {
      return walletApi.getLimits();
    },
    enabled: isAuthenticated,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// ============================================
// QR CODE HOOKS
// ============================================

/**
 * Generate QR code mutation
 */
export function useGenerateQRCode() {
  return useMutation({
    mutationFn: async (data: {
      currency?: WalletCurrency;
      amount?: number;
      expiresInHours?: number;
    }) => {
      return walletApi.generateQRCode(data);
    },
  });
}

// ============================================
// COMBINED DATA HOOKS
// ============================================

/**
 * Get all wallet overview data at once
 */
export function useWalletOverview() {
  const balances = useWalletBalances();
  const pending = usePendingTransfers();
  const recent = useRecentWalletTransactions();
  const limits = useTransferLimits();

  return {
    balances: balances.data?.balances ?? [],
    totalValueUsd: balances.data?.totalValueUsd,
    pendingTransfers: pending.data?.transfers ?? [],
    pendingCount: pending.data?.total ?? 0,
    recentTransactions: recent.data?.transactions ?? [],
    limits: limits.data,
    isLoading: balances.isLoading || pending.isLoading || recent.isLoading,
    isError: balances.isError || pending.isError || recent.isError,
    refetch: async () => {
      await Promise.all([
        balances.refetch(),
        pending.refetch(),
        recent.refetch(),
        limits.refetch(),
      ]);
    },
  };
}

/**
 * Get transfer summary data
 */
export function useTransferSummary(currency?: WalletCurrency) {
  const summary = useWalletTransactionSummary({ currency, period: "month" });
  const limits = useTransferLimits();

  return {
    summary: summary.data,
    limits: limits.data,
    isLoading: summary.isLoading || limits.isLoading,
    isError: summary.isError || limits.isError,
  };
}

// ============================================
// CACHE INVALIDATION HELPERS
// ============================================

/**
 * Invalidate all wallet-related caches
 */
export function useInvalidateWalletCache() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ["wallet"] });
    queryClient.invalidateQueries({ queryKey: walletQueryKeys.balances });
    queryClient.invalidateQueries({ queryKey: walletQueryKeys.pendingTransfers });
    queryClient.invalidateQueries({ queryKey: walletQueryKeys.recentTransactions });
    queryClient.invalidateQueries({ queryKey: walletQueryKeys.limits });
  };
}

/**
 * Prefetch wallet data (call after login or when navigating to wallet)
 */
export function usePrefetchWalletData() {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: walletQueryKeys.balances,
        queryFn: () => walletApi.getBalances(),
      }),
      queryClient.prefetchQuery({
        queryKey: walletQueryKeys.pendingTransfers,
        queryFn: () => walletApi.getPendingTransfers(),
      }),
      queryClient.prefetchQuery({
        queryKey: walletQueryKeys.recentTransactions,
        queryFn: () => walletApi.getRecentTransactions(),
      }),
      queryClient.prefetchQuery({
        queryKey: walletQueryKeys.limits,
        queryFn: () => walletApi.getLimits(),
      }),
    ]);
  };
}
