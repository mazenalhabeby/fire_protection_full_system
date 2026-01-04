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

// User-scoped wallet query key factory
// Including user ID ensures each user has their own cache entries
// This prevents data leakage between different users/accounts
export const createWalletQueryKeys = (userId: string | null) => ({
  // Balances
  balances: ["user", userId, "walletBalances"] as const,
  balance: (currency: WalletCurrency) => ["user", userId, "walletBalance", currency] as const,

  // Transfers
  transfers: (params?: TransferHistoryParams) => ["user", userId, "walletTransfers", params] as const,
  pendingTransfers: ["user", userId, "walletPendingTransfers"] as const,

  // Transactions
  transactions: (params?: TransactionHistoryParams) => ["user", userId, "walletTransactions", params] as const,
  transaction: (id: string) => ["user", userId, "walletTransaction", id] as const,
  transactionSummary: (currency?: WalletCurrency, period?: string) =>
    ["user", userId, "walletTransactionSummary", currency, period] as const,
  recentTransactions: ["user", userId, "walletRecentTransactions"] as const,

  // Limits
  limits: ["user", userId, "walletLimits"] as const,
});

// Legacy query keys - kept for backward compatibility
// TODO: Remove once all usages are migrated to createWalletQueryKeys
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
  const { isAuthenticated, user } = useAuth();
  const userKeys = createWalletQueryKeys(user?.id ?? null);

  return useQuery({
    queryKey: userKeys.balances,
    queryFn: async (): Promise<WalletBalances> => {
      return walletApi.getBalances();
    },
    enabled: isAuthenticated && !!user?.id,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });
}

/**
 * Fetch and cache balance for a specific currency
 */
export function useWalletBalance(currency: WalletCurrency) {
  const { isAuthenticated, user } = useAuth();
  const userKeys = createWalletQueryKeys(user?.id ?? null);

  return useQuery({
    queryKey: userKeys.balance(currency),
    queryFn: async (): Promise<WalletBalance> => {
      return walletApi.getBalance(currency);
    },
    enabled: isAuthenticated && !!user?.id,
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
  const { user } = useAuth();
  const userKeys = createWalletQueryKeys(user?.id ?? null);

  return useMutation({
    mutationFn: async (data: InitiateTransferRequest): Promise<InitiateTransferResponse> => {
      return walletApi.initiateTransfer(data);
    },
    onSuccess: () => {
      // Force instant refetch for immediate UI updates (funds are now locked in pendingBalance)
      queryClient.refetchQueries({ queryKey: userKeys.pendingTransfers });
      queryClient.refetchQueries({ queryKey: userKeys.balances });
      queryClient.refetchQueries({ queryKey: userKeys.recentTransactions });
    },
  });
}

/**
 * Confirm a transfer mutation with optimistic update
 */
export function useConfirmTransfer() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userKeys = createWalletQueryKeys(user?.id ?? null);

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
      await queryClient.cancelQueries({ queryKey: userKeys.pendingTransfers });

      // Snapshot previous value
      const previousPending = queryClient.getQueryData<{ transfers: TransferInfo[]; total: number }>(
        userKeys.pendingTransfers
      );

      // Optimistically remove from pending
      if (previousPending) {
        queryClient.setQueryData(userKeys.pendingTransfers, {
          transfers: previousPending.transfers.filter((t) => t.id !== transferId),
          total: previousPending.total - 1,
        });
      }

      return { previousPending };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousPending) {
        queryClient.setQueryData(userKeys.pendingTransfers, context.previousPending);
      }
    },
    onSettled: () => {
      // Force instant refetch for immediate UI updates
      queryClient.refetchQueries({ queryKey: userKeys.balances });
      queryClient.refetchQueries({ queryKey: userKeys.pendingTransfers });
      queryClient.refetchQueries({ queryKey: userKeys.recentTransactions });
      queryClient.refetchQueries({ queryKey: userKeys.limits });
      // Also refetch transaction history using predicate to match all user wallet transactions
      queryClient.refetchQueries({
        predicate: (query) =>
          query.queryKey[0] === 'user' &&
          query.queryKey[1] === user?.id &&
          query.queryKey[2] === 'walletTransactions'
      });
    },
  });
}

/**
 * Cancel a transfer mutation
 */
export function useCancelTransfer() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userKeys = createWalletQueryKeys(user?.id ?? null);

  return useMutation({
    mutationFn: async (transferId: string) => {
      return walletApi.cancelTransfer(transferId);
    },
    onMutate: async (transferId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: userKeys.pendingTransfers });

      // Snapshot previous value
      const previousPending = queryClient.getQueryData<{ transfers: TransferInfo[]; total: number }>(
        userKeys.pendingTransfers
      );

      // Optimistically remove from pending
      if (previousPending) {
        queryClient.setQueryData(userKeys.pendingTransfers, {
          transfers: previousPending.transfers.filter((t) => t.id !== transferId),
          total: previousPending.total - 1,
        });
      }

      return { previousPending };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousPending) {
        queryClient.setQueryData(userKeys.pendingTransfers, context.previousPending);
      }
    },
    onSettled: () => {
      // Force instant refetch for immediate UI updates
      queryClient.refetchQueries({ queryKey: userKeys.pendingTransfers });
      // Refetch balances since funds are returned from pendingBalance to availableBalance
      queryClient.refetchQueries({ queryKey: userKeys.balances });
      // Also refetch transaction history using predicate to match all user wallet transactions
      queryClient.refetchQueries({
        predicate: (query) =>
          query.queryKey[0] === 'user' &&
          query.queryKey[1] === user?.id &&
          query.queryKey[2] === 'walletTransactions'
      });
      queryClient.refetchQueries({ queryKey: userKeys.recentTransactions });
    },
  });
}

/**
 * Fetch and cache transfer history
 */
export function useTransferHistory(params?: TransferHistoryParams) {
  const { isAuthenticated, user } = useAuth();
  const userKeys = createWalletQueryKeys(user?.id ?? null);

  return useQuery({
    queryKey: userKeys.transfers(params),
    queryFn: async () => {
      return walletApi.getTransfers(params);
    },
    enabled: isAuthenticated && !!user?.id,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Fetch and cache pending transfers
 */
export function usePendingTransfers() {
  const { isAuthenticated, user } = useAuth();
  const userKeys = createWalletQueryKeys(user?.id ?? null);

  return useQuery({
    queryKey: userKeys.pendingTransfers,
    queryFn: async () => {
      return walletApi.getPendingTransfers();
    },
    enabled: isAuthenticated && !!user?.id,
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
  const { isAuthenticated, user } = useAuth();
  const userKeys = createWalletQueryKeys(user?.id ?? null);

  return useQuery({
    queryKey: userKeys.transactions(params),
    queryFn: async () => {
      return walletApi.getTransactions(params);
    },
    enabled: isAuthenticated && !!user?.id,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Fetch and cache a single transaction
 */
export function useWalletTransaction(transactionId: string) {
  const { isAuthenticated, user } = useAuth();
  const userKeys = createWalletQueryKeys(user?.id ?? null);

  return useQuery({
    queryKey: userKeys.transaction(transactionId),
    queryFn: async (): Promise<WalletTransaction> => {
      return walletApi.getTransaction(transactionId);
    },
    enabled: isAuthenticated && !!user?.id && !!transactionId,
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
  const { isAuthenticated, user } = useAuth();
  const userKeys = createWalletQueryKeys(user?.id ?? null);

  return useQuery({
    queryKey: userKeys.transactionSummary(options?.currency, options?.period),
    queryFn: async (): Promise<WalletTransactionSummary> => {
      return walletApi.getTransactionSummary(options);
    },
    enabled: isAuthenticated && !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch and cache recent transactions for dashboard
 */
export function useRecentWalletTransactions() {
  const { isAuthenticated, user } = useAuth();
  const userKeys = createWalletQueryKeys(user?.id ?? null);

  return useQuery({
    queryKey: userKeys.recentTransactions,
    queryFn: async () => {
      return walletApi.getRecentTransactions();
    },
    enabled: isAuthenticated && !!user?.id,
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
  const { isAuthenticated, user } = useAuth();
  const userKeys = createWalletQueryKeys(user?.id ?? null);

  return useQuery({
    queryKey: userKeys.limits,
    queryFn: async (): Promise<TransferLimits> => {
      return walletApi.getLimits();
    },
    enabled: isAuthenticated && !!user?.id,
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
 * Invalidate all wallet-related caches for the current user
 */
export function useInvalidateWalletCache() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userKeys = createWalletQueryKeys(user?.id ?? null);

  return () => {
    queryClient.invalidateQueries({ queryKey: userKeys.balances });
    queryClient.invalidateQueries({ queryKey: userKeys.pendingTransfers });
    queryClient.invalidateQueries({ queryKey: userKeys.recentTransactions });
    queryClient.invalidateQueries({ queryKey: userKeys.limits });
    // Also invalidate all user wallet queries using predicate
    queryClient.invalidateQueries({
      predicate: (query) =>
        query.queryKey[0] === 'user' &&
        query.queryKey[1] === user?.id &&
        (query.queryKey[2] as string)?.startsWith('wallet')
    });
  };
}

/**
 * Prefetch wallet data (call after login or when navigating to wallet)
 */
export function usePrefetchWalletData() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return async () => {
    const userKeys = createWalletQueryKeys(user?.id ?? null);

    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: userKeys.balances,
        queryFn: () => walletApi.getBalances(),
      }),
      queryClient.prefetchQuery({
        queryKey: userKeys.pendingTransfers,
        queryFn: () => walletApi.getPendingTransfers(),
      }),
      queryClient.prefetchQuery({
        queryKey: userKeys.recentTransactions,
        queryFn: () => walletApi.getRecentTransactions(),
      }),
      queryClient.prefetchQuery({
        queryKey: userKeys.limits,
        queryFn: () => walletApi.getLimits(),
      }),
    ]);
  };
}
