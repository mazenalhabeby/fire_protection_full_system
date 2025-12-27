// Locking API Service

import { api } from './client';
import type { LockTier, TokenLock, CreateLockRequest, LockRewardsSummary } from '@/types/api';

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
  }> => {
    return api.get('/locking/locks');
  },

  getLockById: (id: string): Promise<TokenLock & {
    transactions: { id: string; type: string; amount: string; status: string; createdAt: string }[];
  }> => {
    return api.get(`/locking/locks/${id}`);
  },

  unlock: (id: string): Promise<{
    message: string;
    unlockedAmount: string;
    rewardAmount: string;
    totalReceived: string;
  }> => {
    return api.post(`/locking/unlock/${id}`);
  },

  getRewardsSummary: (): Promise<LockRewardsSummary> => {
    return api.get<LockRewardsSummary>('/locking/rewards');
  },
};
