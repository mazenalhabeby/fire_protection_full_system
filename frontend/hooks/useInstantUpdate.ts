"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { createUserQueryKeys } from "./useAppData";
import { createWalletQueryKeys } from "./useWalletData";

/**
 * Centralized hook for triggering instant UI updates after user actions
 *
 * This hook provides methods to immediately refresh cached data after
 * balance-changing operations like purchases, transfers, locks, etc.
 *
 * Usage:
 * ```
 * const { refreshBalances, refreshAll } = useInstantUpdate();
 *
 * // After a successful purchase
 * await purchaseMutation.mutateAsync(data);
 * refreshBalances(); // Instantly update all balance displays
 * ```
 */
export function useInstantUpdate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const userKeys = createUserQueryKeys(userId);
  const walletKeys = createWalletQueryKeys(userId);

  /**
   * Refresh all balance-related queries instantly
   * Call after: purchases, transfers, locks/unlocks, withdrawals
   */
  const refreshBalances = async () => {
    if (!userId) return;

    // Refetch immediately (not just invalidate - forces instant update)
    await Promise.all([
      // Dashboard balance (HBCT)
      queryClient.refetchQueries({ queryKey: userKeys.balance }),
      // All wallet balances (for navbar and wallet page)
      queryClient.refetchQueries({ queryKey: walletKeys.balances }),
      // Recent transactions
      queryClient.refetchQueries({ queryKey: walletKeys.recentTransactions }),
      // Recent activity
      queryClient.refetchQueries({
        predicate: (query) =>
          query.queryKey[0] === 'user' &&
          query.queryKey[1] === userId &&
          query.queryKey[2] === 'recentActivity'
      }),
    ]);
  };

  /**
   * Refresh transaction history
   * Call after: any transaction-creating action
   */
  const refreshTransactions = async () => {
    if (!userId) return;

    await Promise.all([
      queryClient.refetchQueries({ queryKey: walletKeys.recentTransactions }),
      // Refetch all transaction queries for this user
      queryClient.refetchQueries({
        predicate: (query) =>
          query.queryKey[0] === 'user' &&
          query.queryKey[1] === userId &&
          (query.queryKey[2] === 'transactions' || query.queryKey[2] === 'walletTransactions')
      }),
    ]);
  };

  /**
   * Refresh locking-related queries
   * Call after: lock, unlock, early unlock, cancel lock
   */
  const refreshLocks = async () => {
    if (!userId) return;

    await Promise.all([
      queryClient.refetchQueries({ queryKey: userKeys.userLocks }),
      queryClient.refetchQueries({ queryKey: userKeys.balance }),
      queryClient.refetchQueries({ queryKey: walletKeys.balances }),
      queryClient.refetchQueries({
        predicate: (query) =>
          query.queryKey[0] === 'user' &&
          query.queryKey[1] === userId &&
          query.queryKey[2] === 'lockHistory'
      }),
    ]);
  };

  /**
   * Refresh affiliate-related queries
   * Call after: commission claim, referral actions
   */
  const refreshAffiliate = async () => {
    if (!userId) return;

    await Promise.all([
      queryClient.refetchQueries({ queryKey: userKeys.affiliate }),
      queryClient.refetchQueries({ queryKey: userKeys.affiliateStats }),
      queryClient.refetchQueries({ queryKey: userKeys.balance }),
    ]);
  };

  /**
   * Refresh transfer-related queries
   * Call after: transfer initiate, confirm, cancel
   */
  const refreshTransfers = async () => {
    if (!userId) return;

    await Promise.all([
      queryClient.refetchQueries({ queryKey: walletKeys.balances }),
      queryClient.refetchQueries({ queryKey: walletKeys.pendingTransfers }),
      queryClient.refetchQueries({ queryKey: walletKeys.recentTransactions }),
      queryClient.refetchQueries({ queryKey: walletKeys.limits }),
    ]);
  };

  /**
   * Refresh ALL user data - use sparingly (e.g., after login)
   */
  const refreshAll = async () => {
    if (!userId) return;

    await Promise.all([
      refreshBalances(),
      refreshTransactions(),
      refreshLocks(),
      refreshAffiliate(),
      refreshTransfers(),
    ]);
  };

  /**
   * Invalidate without waiting (fire-and-forget)
   * Use when you want to mark data as stale but don't need to wait
   */
  const invalidateBalances = () => {
    if (!userId) return;

    queryClient.invalidateQueries({ queryKey: userKeys.balance });
    queryClient.invalidateQueries({ queryKey: walletKeys.balances });
    queryClient.invalidateQueries({ queryKey: walletKeys.recentTransactions });
  };

  return {
    // Async methods - wait for refresh to complete
    refreshBalances,
    refreshTransactions,
    refreshLocks,
    refreshAffiliate,
    refreshTransfers,
    refreshAll,

    // Fire-and-forget methods
    invalidateBalances,

    // Direct access to query client for custom invalidation
    queryClient,
    userKeys,
    walletKeys,
  };
}

/**
 * Event-based instant update system
 *
 * Components can dispatch events to trigger global updates
 * without needing to import the hook everywhere
 */
export const InstantUpdateEvents = {
  BALANCE_CHANGED: 'instant-update:balance',
  TRANSACTION_CREATED: 'instant-update:transaction',
  LOCK_CHANGED: 'instant-update:lock',
  TRANSFER_CHANGED: 'instant-update:transfer',
  AFFILIATE_CHANGED: 'instant-update:affiliate',
} as const;

/**
 * Dispatch an instant update event
 *
 * Usage:
 * ```
 * dispatchInstantUpdate('BALANCE_CHANGED');
 * ```
 */
export function dispatchInstantUpdate(event: keyof typeof InstantUpdateEvents) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(InstantUpdateEvents[event]));
  }
}
