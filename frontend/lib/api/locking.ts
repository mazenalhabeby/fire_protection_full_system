// Locking API Service

import { api } from './client';
import type { LockTier, TokenLock, CreateLockRequest, LockRewardsSummary } from '@/types/api';

// Extended lock details with early unlock info
export interface LockDetails extends TokenLock {
  transactions: { id: string; type: string; amount: string; status: string; createdAt: string; metadata?: Record<string, unknown> }[];
  daysRemaining: number;
  completedPercent: number;
  canUnlock: boolean;
  canCancel: boolean;
  earlyUnlockPenaltyPercent: number;
  estimatedEarlyUnlockReward: string;
}

// Early unlock response
export interface EarlyUnlockResponse {
  message: string;
  unlockedAmount: string;
  originalReward: string;
  penaltyAmount: string;
  penaltyPercent: number;
  actualReward: string;
  totalReceived: string;
  completedPercent: number;
}

// Cancel lock response
export interface CancelLockResponse {
  message: string;
  refundedAmount: string;
  wasGracePeriod: boolean;
}

// Lock history entry
export interface LockHistoryEntry {
  id: string;
  action: 'LOCK' | 'UNLOCK' | 'EARLY_UNLOCK' | 'CANCEL' | 'REWARD_DISTRIBUTION';
  amount: string;
  rewardAmount?: string;
  penaltyAmount?: string;
  tierName: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

// Lock history response
export interface LockHistoryResponse {
  history: LockHistoryEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const lockingApi = {
  getTiers: (): Promise<LockTier[]> => {
    return api.get<LockTier[]>('/locking/tiers');
  },

  createLock: (data: CreateLockRequest): Promise<{
    lockId: string;
    amount: string;
    tierName: string;
    lockMonths: number;
    bonusPercent: string;
    rewardAmount: string;
    startDate: string;
    endDate: string;
    status: string;
  }> => {
    return api.post('/locking/lock', data);
  },

  getUserLocks: (): Promise<{
    locks: TokenLock[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> => {
    return api.get('/locking/locks');
  },

  getLockById: (id: string): Promise<TokenLock & {
    transactions: { id: string; type: string; amount: string; status: string; createdAt: string }[];
  }> => {
    return api.get(`/locking/locks/${id}`);
  },

  /**
   * Get detailed lock information including early unlock estimates
   */
  getLockDetails: (id: string): Promise<LockDetails> => {
    return api.get(`/locking/locks/${id}/details`);
  },

  unlock: (id: string): Promise<{
    message: string;
    unlockedAmount: string;
    rewardAmount: string;
    totalReceived: string;
  }> => {
    return api.post(`/locking/unlock/${id}`);
  },

  /**
   * Early unlock tokens with penalty
   * Penalty percentage depends on how much of the lock period has been completed
   */
  earlyUnlock: (id: string): Promise<EarlyUnlockResponse> => {
    return api.post(`/locking/early-unlock/${id}`);
  },

  /**
   * Cancel a lock within the 24-hour grace period
   * Full principal is returned without penalty
   */
  cancelLock: (id: string): Promise<CancelLockResponse> => {
    return api.post(`/locking/cancel/${id}`);
  },

  /**
   * Get lock operation history (locks, unlocks, early unlocks, cancellations)
   */
  getLockHistory: (params?: { page?: number; limit?: number }): Promise<LockHistoryResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    const query = searchParams.toString();
    return api.get(`/locking/history${query ? `?${query}` : ''}`);
  },

  getRewardsSummary: (): Promise<LockRewardsSummary> => {
    return api.get<LockRewardsSummary>('/locking/rewards');
  },
};
