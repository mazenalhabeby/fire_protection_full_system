"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";
import type { OnchainDepositStatus } from "@/types";

export function useAdminDeposits(params: { page: number; limit: number; status?: OnchainDepositStatus }) {
  return useQuery({
    queryKey: ["admin", "deposits", params],
    queryFn: () => adminApi.getDeposits(params),
  });
}

export function useUnmappedDeposits(params: { page: number; limit: number }) {
  return useQuery({
    queryKey: ["admin", "deposits", "unmapped", params],
    queryFn: () => adminApi.getUnmappedDeposits(params),
  });
}

export function useDepositStats() {
  return useQuery({
    queryKey: ["admin", "deposits", "stats"],
    queryFn: () => adminApi.getDepositStats(),
  });
}

export function useDepositListenerStatus() {
  return useQuery({
    queryKey: ["admin", "deposits", "listener-status"],
    queryFn: () => adminApi.getDepositListenerStatus(),
    refetchInterval: 10000,
  });
}

export function useStartDepositListener() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => adminApi.startDepositListener(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "deposits", "listener-status"] });
    },
  });
}

export function useStopDepositListener() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => adminApi.stopDepositListener(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "deposits", "listener-status"] });
    },
  });
}

export function useTriggerDepositProcessing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => adminApi.triggerDepositProcessing(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "deposits"] });
    },
  });
}

export function useMapDeposit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ depositId, userId }: { depositId: string; userId: string }) =>
      adminApi.mapDeposit(depositId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "deposits"] });
    },
  });
}
