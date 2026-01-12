// Admin API Service

import { api } from './client';
import type { User, LockTier, RewardPool, DashboardStats, AffiliateTier } from '@/types';

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

  getUserById: (userId: string): Promise<AdminUserDetails> => {
    return api.get<AdminUserDetails>(`/admin/users/${userId}`);
  },

  updateUser: (userId: string, data: {
    firstName?: string;
    lastName?: string;
    username?: string;
    email?: string;
    isEmailVerified?: boolean;
  }): Promise<{ message: string }> => {
    return api.patch(`/admin/users/${userId}`, data);
  },

  banUser: (userId: string, isBanned: boolean, banReason?: string): Promise<{
    id: string;
    isBanned: boolean;
    message: string;
  }> => {
    return api.patch(`/admin/users/${userId}/ban`, { isBanned, banReason });
  },

  deleteUser: (userId: string, options?: {
    reason?: string;
    adminNotes?: string;
    forceDelete?: boolean;
  }): Promise<{
    message: string;
    gracePeriodEndsAt: string;
    retentionExpiresAt: string;
    canRecover: boolean;
  }> => {
    return api.delete(`/admin/users/${userId}`, options);
  },

  getDeletedUsers: (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{
    users: DeletedUser[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> => {
    return api.get('/admin/users/deleted', params);
  },

  recoverUser: (userId: string): Promise<{
    message: string;
    email: string;
  }> => {
    return api.post(`/admin/users/${userId}/recover`);
  },

  assignRbacRole: (userId: string, roleId: string | null): Promise<{
    id: string;
    roleId: string | null;
    roleName: string | null;
    message: string;
  }> => {
    return api.patch(`/admin/users/${userId}/rbac-role`, { roleId });
  },

  revokeUserSessions: (userId: string): Promise<{
    revokedCount: number;
    message: string;
  }> => {
    return api.post(`/admin/users/${userId}/revoke-sessions`);
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

  // Affiliate Tiers
  getAffiliateTiers: (): Promise<AffiliateTier[]> => {
    return api.get<AffiliateTier[]>('/admin/affiliate-tiers');
  },

  createAffiliateTier: (data: {
    name: string;
    commissionRate: number;
    minReferrals: number;
    color?: string;
  }): Promise<AffiliateTier> => {
    return api.post<AffiliateTier>('/admin/affiliate-tiers', data);
  },

  updateAffiliateTier: (id: string, data: {
    name?: string;
    commissionRate?: number;
    minReferrals?: number;
    color?: string;
    isActive?: boolean;
  }): Promise<AffiliateTier> => {
    return api.patch<AffiliateTier>(`/admin/affiliate-tiers/${id}`, data);
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
    totalReferrals: number;
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

  // ============ ROLES & PERMISSIONS ============

  getRoles: (): Promise<Role[]> => {
    return api.get<Role[]>('/admin/roles');
  },

  getRole: (roleId: string): Promise<Role> => {
    return api.get<Role>(`/admin/roles/${roleId}`);
  },

  createRole: (data: {
    name: string;
    slug: string;
    description?: string;
    color?: string;
    permissionIds: string[];
  }): Promise<Role> => {
    return api.post<Role>('/admin/roles', data);
  },

  updateRole: (roleId: string, data: {
    name?: string;
    description?: string;
    color?: string;
    isActive?: boolean;
    permissionIds?: string[];
  }): Promise<Role> => {
    return api.patch<Role>(`/admin/roles/${roleId}`, data);
  },

  deleteRole: (roleId: string): Promise<void> => {
    return api.delete(`/admin/roles/${roleId}`);
  },

  getPermissions: (): Promise<PermissionGroup[]> => {
    return api.get<PermissionGroup[]>('/admin/roles/permissions');
  },

  assignRole: (userId: string, roleId: string): Promise<{ message: string }> => {
    return api.patch(`/admin/roles/users/${userId}/assign`, { roleId });
  },

  removeRole: (userId: string): Promise<void> => {
    return api.delete(`/admin/roles/users/${userId}/role`);
  },

  getUserPermissions: (userId: string): Promise<string[]> => {
    return api.get<string[]>(`/admin/roles/users/${userId}/permissions`);
  },

  // ============ BUYBACK POOL ============

  getBuybackStats: (): Promise<BuybackStats> => {
    return api.get<BuybackStats>('/admin/buyback/stats');
  },

  getBuybackConfig: (): Promise<BuybackConfig> => {
    return api.get<BuybackConfig>('/admin/buyback/config');
  },

  getBuybackWallet: (): Promise<BuybackWallet> => {
    return api.get<BuybackWallet>('/admin/buyback/wallet');
  },

  getPendingTotal: (): Promise<BuybackPendingTotal> => {
    return api.get<BuybackPendingTotal>('/admin/buyback/pending-total');
  },

  checkBuybackReady: (): Promise<BuybackReadyCheck> => {
    return api.get<BuybackReadyCheck>('/admin/buyback/check-ready');
  },

  executeBuybacks: (): Promise<BuybackExecuteResult> => {
    return api.post('/admin/buyback/execute');
  },

  executeBuyback: (id: string): Promise<{
    success: boolean;
    buybackId: string;
    amountBoughtHbct?: string;
    txHash?: string;
    error?: string;
  }> => {
    return api.post(`/admin/buyback/execute/${id}`);
  },

  verifySwapConfig: (): Promise<BuybackSwapConfig> => {
    return api.get<BuybackSwapConfig>('/admin/buyback/verify-swap');
  },

  createTestBuybackAllocations: (): Promise<{
    success: boolean;
    message: string;
    allocations: { id: string; currency: string; amount: string; usdValue: string }[];
  }> => {
    return api.post('/admin/buyback/test-allocations');
  },

  getBuybackAllocations: (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<BuybackAllocationsResponse> => {
    return api.get<BuybackAllocationsResponse>('/admin/buyback/allocations', params);
  },

  getBuybackExecutions: (params?: {
    page?: number;
    limit?: number;
  }): Promise<BuybackExecutionsResponse> => {
    return api.get<BuybackExecutionsResponse>('/admin/buyback/executions', params);
  },

  // ============ USER WALLETS ============

  getWallets: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    userId?: string;
  }): Promise<WalletsResponse> => {
    return api.get<WalletsResponse>('/admin/wallets', params);
  },

  getWalletStats: (): Promise<WalletStats> => {
    return api.get<WalletStats>('/admin/wallets/stats');
  },

  getWalletById: (walletId: string): Promise<WalletDetails> => {
    return api.get<WalletDetails>(`/admin/wallets/${walletId}`);
  },

  updateWallet: (walletId: string, data: {
    label?: string;
    isPrimary?: boolean;
  }): Promise<{
    id: string;
    walletAddress: string;
    label: string | null;
    isPrimary: boolean;
    message: string;
  }> => {
    return api.patch(`/admin/wallets/${walletId}`, data);
  },

  deleteWallet: (walletId: string): Promise<{
    message: string;
    walletAddress: string;
    userId: string;
    userEmail: string | null;
  }> => {
    return api.delete(`/admin/wallets/${walletId}`);
  },

  transferWallet: (walletId: string, newUserId: string): Promise<{
    message: string;
    walletId: string;
    walletAddress: string;
    newUser: {
      id: string;
      email: string | null;
      name: string | null;
    };
  }> => {
    return api.post(`/admin/wallets/${walletId}/transfer`, { newUserId });
  },

  getUserWallets: (userId: string): Promise<{
    user: {
      id: string;
      email: string | null;
      firstName: string | null;
      lastName: string | null;
    };
    wallets: {
      id: string;
      walletAddress: string;
      label: string | null;
      isPrimary: boolean;
      verifiedAt: string;
      lastUsedAt: string | null;
      createdAt: string;
    }[];
  }> => {
    return api.get(`/admin/users/${userId}/wallets`);
  },
};

// Buyback types
export interface BuybackStats {
  totalAllocatedUsd: number;
  totalExecutedUsd: number;
  totalHbctBought: number;
  pendingCount: number;
  completedCount: number;
  failedCount: number;
  pendingByCurrency: {
    currency: string;
    amount: number;
    usdValue: number;
  }[];
}

export interface BuybackConfig {
  enabled: boolean;
  percentageOfPayment: number;
  minAmountToExecute: number;
  autoExecute: boolean;
}

export interface BuybackWallet {
  success: boolean;
  walletAddress: string | null;
  balances: {
    bnb: string;
    usdt: string;
    usdc: string;
    hbct: string;
  };
  bnbPriceUsd: number;
  bnbPriceSource: string;
}

export interface BuybackPendingTotal {
  success: boolean;
  totalBnbRequired: number;
  breakdown: {
    currency: string;
    amount: number;
    bnbEquivalent: number;
    usdValue: number;
    txCount: number;
  }[];
  estimatedGasFee: number;
  gasPriceGwei: number;
  totalWithGas: number;
  totalTxCount: number;
  bnbPriceUsd: number;
  dataSource: {
    bnbPrice: string;
    gasPrice: string;
  };
}

export interface BuybackReadyCheck {
  ready: boolean;
  walletAddress: string | null;
  currentBnbBalance: number;
  requiredBnb: number;
  requiredGas: number;
  totalRequired: number;
  shortfall: number;
  message: string;
}

export interface BuybackExecuteResult {
  success: boolean;
  message: string;
  executionId?: string;
  totalProcessed: number;
  totalBnbSwapped: number;
  totalHbctBought: number;
  txHash?: string;
  shortfall?: number;
  error?: string;
}

export interface BuybackSwapConfig {
  success: boolean;
  hbctAddress: string;
  wbnbAddress: string;
  routerAddress: string;
  walletAddress: string | null;
  canGetQuote: boolean;
  testQuoteError?: string;
  testQuoteAmount?: string;
}

export interface BuybackAllocation {
  id: string;
  purchaseId: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  amount: string;
  currency: string;
  usdValue: string;
  status: string;
  hbctBought: string | null;
  swapTxHash: string | null;
  errorMessage: string | null;
  createdAt: string;
  executedAt: string | null;
  completedAt: string | null;
}

export interface BuybackAllocationsResponse {
  allocations: BuybackAllocation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BuybackExecution {
  id: string;
  totalBnbSwapped: string;
  totalUsdValue: string;
  totalHbctBought: string | null;
  bnbPriceUsd: string;
  status: string;
  swapTxHash: string | null;
  errorMessage: string | null;
  allocationCount: number;
  createdAt: string;
  executedAt: string | null;
  completedAt: string | null;
  allocations: {
    id: string;
    amount: string;
    currency: string;
    usdValue: string;
    hbctBought: string | null;
    status: string;
  }[];
}

export interface BuybackExecutionsResponse {
  executions: BuybackExecution[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Admin User Details type
export interface AdminUserDetails {
  id: string;
  email: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  walletAddress: string | null;
  authProvider: string;
  legacyRole: string;
  roleId: string | null;
  role: {
    id: string;
    name: string;
    slug: string;
    color: string | null;
  } | null;
  isEmailVerified: boolean;
  isBanned: boolean;
  banReason: string | null;
  bannedAt: string | null;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  balance: {
    available: string;
    locked: string;
    pending: string;
  };
  stats: {
    totalPurchases: number;
    totalPurchaseValue: string;
    activeLocks: number;
    totalLockedAmount: string;
    referralCount: number;
  };
  sessions: {
    id: string;
    deviceInfo: string | null;
    ipAddress: string | null;
    lastActiveAt: string;
    createdAt: string;
  }[];
}

// Role types
export interface Role {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  color: string | null;
  createdAt: string;
  updatedAt: string;
  permissions: Permission[];
  _count?: {
    users: number;
  };
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  description: string | null;
  module: string;
  action: string;
}

export interface PermissionGroup {
  module: string;
  permissions: Permission[];
}

export interface DeletionLog {
  originalUsername: string | null;
  originalWalletAddress: string | null;
  adminNotes: string | null;
  availableBalance: string;
  lockedBalance: string;
  pendingWithdrawals: number;
  activeLocks: number;
  ipAddress: string | null;
  userAgent: string | null;
  recoveredAt: string | null;
  recoveredBy: string | null;
  createdAt: string;
}

export interface DeletedUser {
  id: string;
  originalEmail: string | null;
  deletedAt: string | null;
  deletionReason: string | null;
  deletionRequestedBy: string | null;
  canRecover: boolean;
  gracePeriodEndsAt: string | null;
  retentionExpiresAt: string | null;
  deletionLog: DeletionLog | null;
}

// Wallet types
export interface UserWallet {
  id: string;
  walletAddress: string;
  label: string | null;
  isPrimary: boolean;
  verifiedAt: string;
  lastUsedAt: string | null;
  linkedIp: string | null;
  linkedDevice: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
    isDeleted: boolean;
  } | null;
}

export interface WalletsResponse {
  wallets: UserWallet[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface WalletStats {
  totalWallets: number;
  primaryWallets: number;
  recentlyUsedWallets: number;
  uniqueUsers: number;
  usersWithMultipleWallets: number;
  averageWalletsPerUser: string;
}

export interface WalletDetails extends UserWallet {
  recentWithdrawals: {
    id: string;
    amount: string;
    status: string;
    txHash: string | null;
    createdAt: string;
  }[];
}
