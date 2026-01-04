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

  // Affiliates
  getAffiliates: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    tier?: string;
  }): Promise<{
    affiliates: {
      id: string;
      userId: string;
      referralCode: string;
      commissionRate: string;
      tier: string;
      isActive: boolean;
      totalEarnings: string;
      pendingBalance: string;
      paidBalance: string;
      referralCount: number;
      commissionCount: number;
      totalCommissions: string;
      createdAt: string;
      user: { id: string; email: string; firstName?: string; lastName?: string };
    }[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> => {
    return api.get('/admin/affiliates', params);
  },

  getAffiliateStats: (): Promise<{
    totalAffiliates: number;
    activeAffiliates: number;
    totalCommissions: string;
    pendingCommissions: string;
    paidCommissions: string;
    tierBreakdown: Record<string, number>;
  }> => {
    return api.get('/admin/affiliates/stats');
  },

  updateAffiliate: (affiliateId: string, data: {
    commissionRate?: number;
    isActive?: boolean;
    tier?: string;
  }): Promise<{
    id: string;
    commissionRate: string;
    tier: string;
    isActive: boolean;
    message: string;
  }> => {
    return api.patch(`/admin/affiliates/${affiliateId}`, data);
  },

  // Token Locks
  getLocks: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    userId?: string;
  }): Promise<{
    locks: {
      id: string;
      amount: string;
      bonusAmount: string;
      status: string;
      startDate: string;
      unlockDate: string;
      createdAt: string;
      user: { id: string; email: string; firstName?: string; lastName?: string };
      tier: { name: string; lockMonths: number; bonusPercent: string };
    }[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> => {
    return api.get('/admin/locks', params);
  },

  getLockStats: (): Promise<{
    statusBreakdown: Record<string, { count: number; amount: string }>;
    totalActiveLocked: string;
    totalBonusAwarded: string;
  }> => {
    return api.get('/admin/locks/stats');
  },

  // Token Purchases
  getPurchases: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    deliveryMethod?: string;
    userId?: string;
  }): Promise<{
    purchases: {
      id: string;
      paymentCurrency: string;
      paymentAmount: string;
      hbctAmount: string;
      pricePerToken: string;
      totalUsd: string;
      status: string;
      deliveryMethod: string;
      txHash?: string;
      createdAt: string;
      completedAt?: string;
      user: { id: string; email: string; firstName?: string; lastName?: string };
    }[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> => {
    return api.get('/admin/purchases', params);
  },

  getPurchaseStats: (): Promise<{
    statusBreakdown: Record<string, { count: number; totalUsd: string; hbctAmount: string }>;
    totalCompletedVolume: string;
    totalTokensSold: string;
    completedPurchases: number;
    deliveryBreakdown: Record<string, { count: number; totalUsd: string }>;
    currencyBreakdown: Record<string, { count: number; totalUsd: string }>;
  }> => {
    return api.get('/admin/purchases/stats');
  },

  // System Stats
  getSystemStats: (): Promise<{
    rewardPools: {
      name: string;
      allocation: string;
      reserved: string;
      distributed: string;
      available: string;
    }[];
    airdrops: Record<string, number>;
    orders: Record<string, { count: number; totalHbct: string }>;
    locks: Record<string, { count: number; totalAmount: string }>;
  }> => {
    return api.get('/admin/system-stats');
  },

  // Token Config
  getTokenConfig: (): Promise<{
    id: string;
    symbol: string;
    name: string;
    totalSupply: string;
    currentPrice: string;
    isPresale: boolean;
    presalePrice?: string;
    updatedAt: string;
  }> => {
    return api.get('/admin/token-config');
  },

  updateTokenConfig: (data: {
    currentPrice?: number;
    isPresale?: boolean;
    presalePrice?: number;
  }): Promise<{
    id: string;
    currentPrice: string;
    isPresale: boolean;
    message: string;
  }> => {
    return api.patch('/admin/token-config', data);
  },
};
