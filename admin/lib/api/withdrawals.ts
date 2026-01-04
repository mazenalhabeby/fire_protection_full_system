// Withdrawals API Service - On-chain withdrawal management

import { api } from './client';
import type {
  WithdrawalRequest,
  WithdrawalResponse,
  WithdrawalListResponse,
  WithdrawalStats,
  HotWalletStatus,
  WithdrawalProcessorStatus,
} from '@/types';

export const withdrawalsApi = {
  // ============================================
  // USER ENDPOINTS
  // ============================================

  /**
   * Request a withdrawal to a linked wallet
   * SECURITY: Only withdrawals to verified linked wallets are allowed
   */
  requestWithdrawal: (data: {
    amount: string;
    walletId: string;
  }): Promise<WithdrawalResponse> => {
    return api.post<WithdrawalResponse>('/withdrawals/request', data);
  },

  /**
   * Confirm withdrawal with email code
   */
  confirmWithdrawal: (
    withdrawalId: string,
    confirmationCode: string
  ): Promise<WithdrawalResponse> => {
    return api.post<WithdrawalResponse>(`/withdrawals/${withdrawalId}/confirm`, {
      confirmationCode,
    });
  },

  /**
   * Cancel a pending withdrawal
   */
  cancelWithdrawal: (withdrawalId: string): Promise<{ success: boolean; message: string }> => {
    return api.post(`/withdrawals/${withdrawalId}/cancel`);
  },

  /**
   * Get current user's withdrawals
   */
  getMyWithdrawals: (params?: {
    page?: number;
    limit?: number;
  }): Promise<WithdrawalListResponse> => {
    return api.get<WithdrawalListResponse>('/withdrawals/me', params);
  },

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  /**
   * Admin: Get all withdrawals with filters
   */
  getWithdrawals: (params?: {
    userId?: string;
    status?: string;
    toAddress?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  }): Promise<WithdrawalListResponse> => {
    return api.get<WithdrawalListResponse>('/withdrawals/admin', params);
  },

  /**
   * Admin: Approve a withdrawal
   */
  approveWithdrawal: (withdrawalId: string): Promise<WithdrawalResponse> => {
    return api.patch<WithdrawalResponse>(`/withdrawals/admin/${withdrawalId}/approve`);
  },

  /**
   * Admin: Reject a withdrawal
   */
  rejectWithdrawal: (withdrawalId: string, reason: string): Promise<WithdrawalResponse> => {
    return api.patch<WithdrawalResponse>(`/withdrawals/admin/${withdrawalId}/reject`, { reason });
  },

  /**
   * Admin: Get withdrawal statistics
   */
  getStats: (): Promise<WithdrawalStats> => {
    return api.get<WithdrawalStats>('/withdrawals/admin/stats');
  },

  /**
   * Admin: Get hot wallet status
   */
  getHotWalletStatus: (): Promise<HotWalletStatus> => {
    return api.get<HotWalletStatus>('/withdrawals/admin/hot-wallet');
  },

  /**
   * Admin: Get processor status
   */
  getProcessorStatus: (): Promise<WithdrawalProcessorStatus> => {
    return api.get<WithdrawalProcessorStatus>('/withdrawals/admin/processor/status');
  },

  /**
   * Admin: Start withdrawal processor
   */
  startProcessor: (): Promise<{ message: string }> => {
    return api.post('/withdrawals/admin/processor/start');
  },

  /**
   * Admin: Stop withdrawal processor
   */
  stopProcessor: (): Promise<{ message: string }> => {
    return api.post('/withdrawals/admin/processor/stop');
  },

  /**
   * Admin: Manually trigger processing
   */
  triggerProcessing: (): Promise<{ message: string }> => {
    return api.post('/withdrawals/admin/processor/trigger');
  },

  /**
   * Admin: Process a specific withdrawal
   */
  processWithdrawal: (withdrawalId: string): Promise<WithdrawalResponse> => {
    return api.post<WithdrawalResponse>(`/withdrawals/admin/${withdrawalId}/process`);
  },
};
