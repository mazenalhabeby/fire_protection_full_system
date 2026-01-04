"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";
import type { WithdrawalRequestStatus } from "@/types";

export function useAdminWithdrawals(params: { page: number; limit: number; status?: WithdrawalRequestStatus }) {
  return useQuery({
    queryKey: ["admin", "withdrawals", params],
    queryFn: () => adminApi.getWithdrawals(params),
  });
}

export function useWithdrawalStats() {
  return useQuery({
    queryKey: ["admin", "withdrawals", "stats"],
    queryFn: () => adminApi.getWithdrawalStats(),
  });
}

export function useHotWalletStatus() {
  return useQuery({
    queryKey: ["admin", "withdrawals", "hot-wallet"],
    queryFn: () => adminApi.getHotWalletStatus(),
    refetchInterval: 30000,
  });
}

export function useWithdrawalProcessorStatus() {
  return useQuery({
    queryKey: ["admin", "withdrawals", "processor-status"],
    queryFn: () => adminApi.getWithdrawalProcessorStatus(),
    refetchInterval: 10000,
  });
}

export function useStartWithdrawalProcessor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => adminApi.startWithdrawalProcessor(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "withdrawals", "processor-status"] });
    },
  });
}

export function useStopWithdrawalProcessor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => adminApi.stopWithdrawalProcessor(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "withdrawals", "processor-status"] });
    },
  });
}

export function useTriggerWithdrawalProcessing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => adminApi.triggerWithdrawalProcessing(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "withdrawals"] });
    },
  });
}

export function useApproveWithdrawal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (withdrawalId: string) => adminApi.approveWithdrawal(withdrawalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "withdrawals"] });
    },
  });
}

export function useRejectWithdrawal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ withdrawalId, reason }: { withdrawalId: string; reason: string }) =>
      adminApi.rejectWithdrawal(withdrawalId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "withdrawals"] });
    },
  });
}

export function useProcessWithdrawal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (withdrawalId: string) => adminApi.processWithdrawal(withdrawalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "withdrawals"] });
    },
  });
}
