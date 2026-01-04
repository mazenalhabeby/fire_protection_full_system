// Affiliates API Service

import { api } from './client';
import type {
  Affiliate,
  AffiliateTier,
  AffiliateStats,
  Commission,
  ReferralDetails,
  LeaderboardEntry,
  AffiliatePerformance,
  WithdrawalRequest,
  MarketingMaterial,
  AffiliateNotification,
  AffiliateSettings,
} from '@/types';

export const affiliatesApi = {
  // ============================================
  // Core Affiliate Endpoints
  // ============================================

  getMyAffiliate: (): Promise<Affiliate> => {
    return api.get<Affiliate>('/affiliates/me');
  },

  register: (): Promise<{
    id: string;
    referralCode: string;
    message: string;
  }> => {
    return api.post('/affiliates/register');
  },

  getStats: (): Promise<AffiliateStats> => {
    return api.get<AffiliateStats>('/affiliates/stats');
  },

  // ============================================
  // Tier System
  // ============================================

  getTiers: (): Promise<{
    tiers: AffiliateTier[];
    currentTier: AffiliateTier;
    nextTier?: AffiliateTier;
    progressToNext: number;
  }> => {
    return api.get('/affiliates/tiers');
  },

  // ============================================
  // Commissions
  // ============================================

  getCommissions: (params?: {
    page?: number;
    limit?: number;
    status?: 'all' | 'paid' | 'pending';
    type?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    commissions: Commission[];
    summary: {
      totalEarned: string;
      totalPending: string;
      totalPaid: string;
    };
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> => {
    return api.get('/affiliates/commissions', params);
  },

  claimCommissions: (): Promise<{
    claimedAmount: string;
    txHash?: string;
    message: string;
  }> => {
    return api.post('/affiliates/claim');
  },

  // ============================================
  // Referrals
  // ============================================

  getReferrals: (params?: {
    page?: number;
    limit?: number;
    status?: 'all' | 'pending' | 'active' | 'converted' | 'inactive';
    search?: string;
    sortBy?: 'date' | 'earnings' | 'purchases';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    referrals: ReferralDetails[];
    summary: {
      total: number;
      active: number;
      converted: number;
      inactive: number;
    };
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> => {
    return api.get('/affiliates/referrals', params);
  },

  getReferralDetails: (referralId: string): Promise<ReferralDetails> => {
    return api.get<ReferralDetails>(`/affiliates/referrals/${referralId}`);
  },

  getSales: (params?: {
    page?: number;
    limit?: number;
  }): Promise<{
    sales: {
      id: string;
      userId: string;
      userName?: string;
      amountUsd: string;
      tokensAmount: string;
      commissionEarned: string;
      commissionRate: string;
      createdAt: string;
    }[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> => {
    return api.get('/affiliates/sales', params);
  },

  // ============================================
  // Leaderboard
  // ============================================

  getLeaderboard: (params?: {
    limit?: number;
    period?: 'all' | 'month' | 'week';
  }): Promise<{
    leaderboard: LeaderboardEntry[];
    myRank?: LeaderboardEntry;
  }> => {
    return api.get('/affiliates/leaderboard', params);
  },

  // ============================================
  // Performance Analytics
  // ============================================

  getPerformance: (params?: {
    period?: 'week' | 'month' | 'quarter' | 'year';
    granularity?: 'day' | 'week' | 'month';
  }): Promise<{
    data: AffiliatePerformance[];
    summary: {
      totalReferrals: number;
      totalEarnings: string;
      totalVolume: string;
      avgConversionRate: string;
      growthRate: string;
    };
  }> => {
    return api.get('/affiliates/performance', params);
  },

  // ============================================
  // Withdrawals / Payouts
  // ============================================

  getWithdrawals: (params?: {
    page?: number;
    limit?: number;
    status?: 'all' | 'pending' | 'completed' | 'rejected';
  }): Promise<{
    withdrawals: WithdrawalRequest[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> => {
    return api.get('/affiliates/withdrawals', params);
  },

  requestWithdrawal: (data: {
    amount: string;
    walletAddress: string;
  }): Promise<{
    withdrawal: WithdrawalRequest;
    message: string;
  }> => {
    return api.post('/affiliates/withdrawals', data);
  },

  // ============================================
  // Marketing Materials
  // ============================================

  getMarketingMaterials: (params?: {
    type?: 'BANNER' | 'SOCIAL' | 'EMAIL' | 'VIDEO' | 'DOCUMENT';
    language?: string;
  }): Promise<{
    materials: MarketingMaterial[];
  }> => {
    return api.get('/affiliates/marketing', params);
  },

  // ============================================
  // Notifications
  // ============================================

  getNotifications: (params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  }): Promise<{
    notifications: AffiliateNotification[];
    unreadCount: number;
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> => {
    return api.get('/affiliates/notifications', params);
  },

  markNotificationRead: (notificationId: string): Promise<{ success: boolean }> => {
    return api.post(`/affiliates/notifications/${notificationId}/read`);
  },

  markAllNotificationsRead: (): Promise<{ success: boolean }> => {
    return api.post('/affiliates/notifications/read-all');
  },

  // ============================================
  // Settings
  // ============================================

  getSettings: (): Promise<AffiliateSettings> => {
    return api.get<AffiliateSettings>('/affiliates/settings');
  },

  updateSettings: (settings: Partial<AffiliateSettings>): Promise<{
    settings: AffiliateSettings;
    message: string;
  }> => {
    return api.patch('/affiliates/settings', settings);
  },

  // ============================================
  // Link Builder
  // ============================================

  generateLink: (params: {
    campaign?: string;
    source?: string;
    medium?: string;
    content?: string;
  }): Promise<{
    link: string;
    shortLink?: string;
    qrCodeUrl?: string;
  }> => {
    return api.post('/affiliates/generate-link', params);
  },

  getLinkStats: (params?: {
    period?: 'week' | 'month' | 'all';
  }): Promise<{
    totalClicks: number;
    uniqueClicks: number;
    conversions: number;
    conversionRate: string;
    topSources: { source: string; clicks: number; conversions: number }[];
    topCampaigns: { campaign: string; clicks: number; conversions: number }[];
  }> => {
    return api.get('/affiliates/link-stats', params);
  },
};
