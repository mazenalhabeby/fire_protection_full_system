// Deposits API Service - On-chain deposit tracking

import { api } from './client';
import type {
  OnchainDeposit,
  DepositListResponse,
  DepositStats,
  DepositListenerStatus,
} from '@/types/deposits';

export const depositsApi = {
  // ============================================
  // USER ENDPOINTS
  // ============================================

  /**
   * Get current user's deposits
   */
  getMyDeposits: (params?: {
    page?: number;
    limit?: number;
  }): Promise<DepositListResponse> => {
    return api.get<DepositListResponse>('/deposits/me', params);
  },

  /**
   * Get a specific deposit by ID
   */
  getMyDepositById: (id: string): Promise<OnchainDeposit> => {
    return api.get<OnchainDeposit>(`/deposits/me/${id}`);
  },

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  /**
   * Admin: Get all deposits with filters
   */
  getDeposits: (params?: {
    userId?: string;
    status?: 'PENDING' | 'CONFIRMED' | 'CREDITED' | 'FAILED' | 'UNMAPPED';
    fromAddress?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  }): Promise<DepositListResponse> => {
    return api.get<DepositListResponse>('/deposits/admin', params);
  },

  /**
   * Admin: Get unmapped deposits
   */
  getUnmappedDeposits: (params?: {
    page?: number;
    limit?: number;
  }): Promise<DepositListResponse> => {
    return api.get<DepositListResponse>('/deposits/admin/unmapped', params);
  },

  /**
   * Admin: Map a deposit to a user
   */
  mapDepositToUser: (depositId: string, userId: string): Promise<OnchainDeposit> => {
    return api.post<OnchainDeposit>(`/deposits/admin/${depositId}/map`, { userId });
  },

  /**
   * Admin: Get deposit statistics
   */
  getStats: (): Promise<DepositStats> => {
    return api.get<DepositStats>('/deposits/admin/stats');
  },

  /**
   * Admin: Get listener status
   */
  getListenerStatus: (): Promise<DepositListenerStatus> => {
    return api.get<DepositListenerStatus>('/deposits/admin/listener/status');
  },

  /**
   * Admin: Start deposit listener
   */
  startListener: (): Promise<{ message: string }> => {
    return api.post('/deposits/admin/listener/start');
  },

  /**
   * Admin: Stop deposit listener
   */
  stopListener: (): Promise<{ message: string }> => {
    return api.post('/deposits/admin/listener/stop');
  },

  /**
   * Admin: Manually trigger deposit processing
   */
  triggerProcessing: (): Promise<{ message: string }> => {
    return api.post('/deposits/admin/process');
  },
};
