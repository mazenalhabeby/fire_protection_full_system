// Deposits API Service - On-chain deposit tracking

import { api } from './client';
import type {
  OnchainDeposit,
  DepositListResponse,
  DepositStats,
  DepositListenerStatus,
} from '@/types';

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
    status?: 'PENDING' | 'CONFIRMED' | 'CREDITED' | 'LOCKED' | 'FAILED' | 'UNMAPPED';
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
   * Admin: Get locked deposits (pending release)
   */
  getLockedDeposits: (params?: {
    page?: number;
    limit?: number;
  }): Promise<DepositListResponse> => {
    return api.get<DepositListResponse>('/deposits/admin/locked', params);
  },

  /**
   * Admin: Map a deposit to a user
   * If wallet doesn't match, deposit will be locked for 24 hours
   */
  mapDepositToUser: (depositId: string, userId: string): Promise<OnchainDeposit & { locked?: boolean }> => {
    return api.post<OnchainDeposit & { locked?: boolean }>(`/deposits/admin/${depositId}/map`, { userId });
  },

  /**
   * Admin: Release a locked deposit early
   */
  releaseLockedDeposit: (depositId: string, reason: string): Promise<OnchainDeposit> => {
    return api.post<OnchainDeposit>(`/deposits/admin/${depositId}/release`, { reason });
  },

  /**
   * Admin: Get deposit details with user balance info
   */
  getDepositWithBalance: (depositId: string): Promise<{
    deposit: OnchainDeposit;
    userBalance: string;
    canDebit: boolean;
  }> => {
    return api.get(`/deposits/admin/${depositId}/balance-check`);
  },

  /**
   * Admin: Unmap a deposit (reverse wrong mapping)
   */
  unmapDeposit: (depositId: string, reason: string, force?: boolean): Promise<OnchainDeposit & { forcedWithoutDebit?: boolean }> => {
    return api.post<OnchainDeposit>(`/deposits/admin/${depositId}/unmap`, { reason, force });
  },

  /**
   * Admin: Reassign a deposit to different user
   */
  reassignDeposit: (depositId: string, userId: string, reason: string, force?: boolean): Promise<OnchainDeposit & { forcedWithoutDebit?: boolean }> => {
    return api.post<OnchainDeposit>(`/deposits/admin/${depositId}/reassign`, { userId, reason, force });
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

  // ============================================
  // ADMIN: HISTORICAL SCAN ENDPOINTS
  // ============================================

  /**
   * Admin: Lookup and process a specific transaction by hash
   */
  lookupTransaction: (txHash: string): Promise<{
    success: boolean;
    message: string;
    deposit?: any;
    alreadyExists?: boolean;
  }> => {
    return api.post('/deposits/admin/lookup-tx', { txHash });
  },

  /**
   * Admin: Quick scan last N hours for missed deposits
   */
  quickScan: (hours?: number): Promise<{
    success: boolean;
    message: string;
    scannedBlocks: number;
    newDeposits: number;
  }> => {
    return api.post('/deposits/admin/scan/quick', hours !== undefined ? { hours } : undefined);
  },

  /**
   * Admin: Full historical scan for missed deposits
   */
  historicalScan: (days?: number): Promise<{
    success: boolean;
    message: string;
    scannedBlocks: number;
    newDeposits: number;
    errors?: string[];
  }> => {
    return api.post('/deposits/admin/scan/historical', days !== undefined ? { days } : undefined);
  },
};
