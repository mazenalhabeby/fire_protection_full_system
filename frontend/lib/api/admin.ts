// Admin API Service

import { api } from './client';
import type { User, LockTier, RewardPool, DashboardStats } from '@/types/api';

export const adminApi = {
  // Dashboard
  getDashboard: (): Promise<DashboardStats> => {
    return api.get<DashboardStats>('/admin/dashboard');
  },

  // Users
  getUsers: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
  }): Promise<{
    users: User[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> => {
    return api.get('/admin/users', params);
  },

  updateUserRole: (userId: string, role: 'USER' | 'ADMIN'): Promise<{
    userId: string;
    role: string;
    message: string;
  }> => {
    return api.patch(`/admin/users/${userId}/role`, { role });
  },

  // Lock Tiers
  getLockTiers: (): Promise<LockTier[]> => {
    return api.get<LockTier[]>('/admin/lock-tiers');
  },

  createLockTier: (data: {
    name: string;
    lockMonths: number;
    bonusPercent: number;
    feeDiscount?: number;
    minAmount?: number;
    maxAmount?: number;
  }): Promise<LockTier> => {
    return api.post<LockTier>('/admin/lock-tiers', data);
  },

  updateLockTier: (id: string, data: {
    name?: string;
    bonusPercent?: number;
    feeDiscount?: number;
    minAmount?: number;
    maxAmount?: number;
    isActive?: boolean;
  }): Promise<LockTier> => {
    return api.patch<LockTier>(`/admin/lock-tiers/${id}`, data);
  },

  // Reward Pools
  getPools: (): Promise<RewardPool[]> => {
    return api.get<RewardPool[]>('/pools');
  },

  updatePool: (id: string, data: {
    totalAllocation?: number;
  }): Promise<RewardPool> => {
    return api.patch<RewardPool>(`/pools/${id}`, data);
  },

  getPoolStats: (): Promise<{
    pools: (RewardPool & { usagePercent: string })[];
    totalAllocated: string;
    totalDistributed: string;
  }> => {
    return api.get('/pools/stats');
  },

  // Transactions
  getTransactions: (params?: {
    page?: number;
    limit?: number;
    type?: string;
    userId?: string;
  }): Promise<{
    transactions: {
      id: string;
      userId: string;
      type: string;
      amount: string;
      status: string;
      createdAt: string;
    }[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> => {
    return api.get('/admin/transactions', params);
  },

  // Token Sales Stats
  getSalesStats: (): Promise<{
    totalSalesUsd: string;
    totalTokensSold: string;
    totalLiquidityAdded: string;
    salesCount: number;
    averageSaleUsd: string;
  }> => {
    return api.get('/token-sales/stats');
  },
};
