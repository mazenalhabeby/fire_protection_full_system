"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { depositsApi } from "@/lib/api/deposits";
import { useAuth } from "./useAuth";
import type {
  OnchainDeposit,
  DepositListResponse,
  DepositStats,
  DepositListenerStatus,
  DepositFilterParams,
} from "@/types/deposits";

// ============================================
// QUERY KEYS
// ============================================

export const depositQueryKeys = {
  myDeposits: (params?: { page?: number; limit?: number }) =>
    ["myDeposits", params] as const,
  myDeposit: (id: string) => ["myDeposit", id] as const,
  adminDeposits: (params?: DepositFilterParams) => ["adminDeposits", params] as const,
  unmappedDeposits: (params?: { page?: number; limit?: number }) =>
    ["unmappedDeposits", params] as const,
  depositStats: ["depositStats"] as const,
  listenerStatus: ["depositListenerStatus"] as const,
};

// ============================================
// USER HOOKS
// ============================================

/**
 * Fetch user's on-chain deposits
 */
export function useMyDeposits(params?: { page?: number; limit?: number }) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: depositQueryKeys.myDeposits(params),
    queryFn: async (): Promise<DepositListResponse> => {
      return depositsApi.getMyDeposits(params);
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Auto-refresh every minute
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch a specific deposit by ID
 */
export function useMyDeposit(id: string) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: depositQueryKeys.myDeposit(id),
    queryFn: async (): Promise<OnchainDeposit> => {
      return depositsApi.getMyDepositById(id);
    },
    enabled: isAuthenticated && !!id,
    staleTime: 30 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

// ============================================
// ADMIN HOOKS
// ============================================

/**
 * Admin: Fetch all deposits with filters
 */
export function useAdminDeposits(params?: DepositFilterParams) {
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  return useQuery({
    queryKey: depositQueryKeys.adminDeposits(params),
    queryFn: async (): Promise<DepositListResponse> => {
      return depositsApi.getDeposits(params);
    },
    enabled: isAuthenticated && isAdmin,
    staleTime: 15 * 1000,
  });
}

/**
 * Admin: Fetch unmapped deposits
 */
export function useUnmappedDeposits(params?: { page?: number; limit?: number }) {
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  return useQuery({
    queryKey: depositQueryKeys.unmappedDeposits(params),
    queryFn: async (): Promise<DepositListResponse> => {
      return depositsApi.getUnmappedDeposits(params);
    },
    enabled: isAuthenticated && isAdmin,
    staleTime: 15 * 1000,
  });
}

/**
 * Admin: Map a deposit to a user
 */
export function useMapDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      depositId,
      userId,
    }: {
      depositId: string;
      userId: string;
    }): Promise<OnchainDeposit> => {
      return depositsApi.mapDepositToUser(depositId, userId);
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["adminDeposits"] });
      queryClient.invalidateQueries({ queryKey: ["unmappedDeposits"] });
      queryClient.invalidateQueries({ queryKey: ["depositStats"] });
    },
  });
}

/**
 * Admin: Fetch deposit statistics
 */
export function useDepositStats() {
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  return useQuery({
    queryKey: depositQueryKeys.depositStats,
    queryFn: async (): Promise<DepositStats> => {
      return depositsApi.getStats();
    },
    enabled: isAuthenticated && isAdmin,
    staleTime: 30 * 1000,
  });
}

/**
 * Admin: Fetch listener status
 */
export function useDepositListenerStatus() {
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  return useQuery({
    queryKey: depositQueryKeys.listenerStatus,
    queryFn: async (): Promise<DepositListenerStatus> => {
      return depositsApi.getListenerStatus();
    },
    enabled: isAuthenticated && isAdmin,
    staleTime: 10 * 1000,
    refetchInterval: 30 * 1000, // Check status every 30s
  });
}

/**
 * Admin: Start deposit listener
 */
export function useStartDepositListener() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return depositsApi.startListener();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: depositQueryKeys.listenerStatus });
    },
  });
}

/**
 * Admin: Stop deposit listener
 */
export function useStopDepositListener() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return depositsApi.stopListener();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: depositQueryKeys.listenerStatus });
    },
  });
}

/**
 * Admin: Trigger deposit processing manually
 */
export function useTriggerDepositProcessing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return depositsApi.triggerProcessing();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminDeposits"] });
      queryClient.invalidateQueries({ queryKey: ["unmappedDeposits"] });
      queryClient.invalidateQueries({ queryKey: ["depositStats"] });
    },
  });
}

// ============================================
// CACHE INVALIDATION
// ============================================

export function useInvalidateDeposits() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ["myDeposits"] });
    queryClient.invalidateQueries({ queryKey: ["adminDeposits"] });
    queryClient.invalidateQueries({ queryKey: ["unmappedDeposits"] });
    queryClient.invalidateQueries({ queryKey: ["depositStats"] });
  };
}
