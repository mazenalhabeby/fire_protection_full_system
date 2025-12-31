"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import {
  purchaseApi,
  GetQuoteRequest,
  PurchaseOffChainRequest,
  PurchaseOnChainRequest,
  PurchaseHistoryParams,
} from "@/lib/api/purchase";

// Query keys
export const purchaseKeys = {
  all: ["purchase"] as const,
  price: () => [...purchaseKeys.all, "price"] as const,
  limits: () => [...purchaseKeys.all, "limits"] as const,
  quote: (params: GetQuoteRequest | null) => [...purchaseKeys.all, "quote", params] as const,
  history: (params?: PurchaseHistoryParams) => [...purchaseKeys.all, "history", params] as const,
  detail: (id: string) => [...purchaseKeys.all, "detail", id] as const,
  linkedWallets: () => [...purchaseKeys.all, "linkedWallets"] as const,
};

/**
 * Get current token prices (dynamic market prices from PancakeSwap)
 * Refreshes every 30 seconds for real-time pricing
 */
export function usePurchasePrice() {
  return useQuery({
    queryKey: purchaseKeys.price(),
    queryFn: () => purchaseApi.getPrice(),
    staleTime: 30 * 1000, // 30 seconds - more real-time
    refetchInterval: 30 * 1000, // Refetch every 30 seconds for live prices
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnMount: true, // Fetch when page loads
    refetchOnReconnect: true, // Refetch on reconnect for fresh prices
  });
}

/**
 * Get purchase limits for current user
 */
export function usePurchaseLimits() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: purchaseKeys.limits(),
    queryFn: () => purchaseApi.getLimits(),
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

/**
 * Get purchase quote (debounced)
 */
export function usePurchaseQuote(params: GetQuoteRequest | null) {
  return useQuery({
    queryKey: purchaseKeys.quote(params),
    queryFn: () => purchaseApi.getQuote(params!),
    enabled: !!params && !!(params.paymentAmount || params.hbctAmount),
    staleTime: 30 * 1000, // 30 seconds
    retry: false,
  });
}

/**
 * Get linked wallets for on-chain delivery
 */
export function useLinkedWalletsForPurchase() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: purchaseKeys.linkedWallets(),
    queryFn: () => purchaseApi.getLinkedWallets(),
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });
}

/**
 * Purchase off-chain (store in wallet)
 */
export function usePurchaseOffChain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PurchaseOffChainRequest) => purchaseApi.purchaseOffChain(data),
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: purchaseKeys.limits() });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.history() });
      queryClient.invalidateQueries({ queryKey: ["walletBalances"] });
      queryClient.invalidateQueries({ queryKey: ["walletOverview"] });
    },
  });
}

/**
 * Purchase on-chain (send to external wallet)
 */
export function usePurchaseOnChain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PurchaseOnChainRequest) => purchaseApi.purchaseOnChain(data),
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: purchaseKeys.limits() });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.history() });
      queryClient.invalidateQueries({ queryKey: ["walletBalances"] });
      queryClient.invalidateQueries({ queryKey: ["walletOverview"] });
    },
  });
}

/**
 * Get purchase history
 */
export function usePurchaseHistory(params?: PurchaseHistoryParams) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: purchaseKeys.history(params),
    queryFn: () => purchaseApi.getHistory(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Get purchase by ID
 */
export function usePurchaseDetail(id: string) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: purchaseKeys.detail(id),
    queryFn: () => purchaseApi.getPurchase(id),
    enabled: isAuthenticated && !!id,
  });
}
