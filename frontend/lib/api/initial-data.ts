// Initial Data API - Fetches all user data in one request after login
// This minimizes API calls by bundling related data together

import { api } from './client';
import type { TokenBalance, Transaction, LockTier, TokenLock } from '@/types/api';
import type {
  Affiliate,
  AffiliateStats,
  Commission,
  ReferralDetails,
  LeaderboardEntry
} from '@/types/api';

// ============================================
// TYPES
// ============================================

export interface InitialUserData {
  // Dashboard data
  dashboard: {
    balance: TokenBalance;
    recentTransactions: Transaction[];
    referralCount: number;
  };

  // Locking data
  locking: {
    tiers: LockTier[];
    userLocks: TokenLock[];
  };

  // Affiliate data
  affiliate: {
    profile: Affiliate | null;
    stats: AffiliateStats | null;
    recentCommissions: Commission[];
    recentReferrals: ReferralDetails[];
  };

  // Leaderboard (shared across app)
  leaderboard: LeaderboardEntry[];

  // Token price
  tokenPrice: number;
}

// ============================================
// API ENDPOINT
// ============================================

/**
 * Fetch all initial user data in a single API call
 * Called after login to populate the cache
 */
export async function fetchInitialUserData(): Promise<InitialUserData> {
  return api.get<InitialUserData>('/user/initial-data');
}

/**
 * Fetch dashboard data only (for partial refresh)
 */
export async function fetchDashboardData(): Promise<InitialUserData['dashboard']> {
  return api.get<InitialUserData['dashboard']>('/user/dashboard');
}

/**
 * Fetch locking data only
 */
export async function fetchLockingData(): Promise<InitialUserData['locking']> {
  return api.get<InitialUserData['locking']>('/user/locking');
}

/**
 * Fetch affiliate data only
 */
export async function fetchAffiliateData(): Promise<InitialUserData['affiliate']> {
  return api.get<InitialUserData['affiliate']>('/user/affiliate');
}

/**
 * Fetch leaderboard only
 */
export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  return api.get<{ leaderboard: LeaderboardEntry[] }>('/affiliates/leaderboard?limit=10')
    .then(res => res.leaderboard);
}

/**
 * Fetch token price only
 */
export async function fetchTokenPrice(): Promise<number> {
  return api.get<{ price: string }>('/tokens/price')
    .then(res => parseFloat(res.price));
}
