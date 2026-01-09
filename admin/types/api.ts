// API Types for HBCT Backend

// ============================================
// Common Types
// ============================================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// Auth Types
// ============================================

export type AuthProvider = 'credentials' | 'GOOGLE' | 'FACEBOOK' | 'wallet';

export interface User {
  id: string;
  email: string | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  walletAddress: string | null;
  role: 'USER' | 'ADMIN';
  roleId?: string | null;
  roleName?: string | null;
  roleColor?: string | null;
  isEmailVerified: boolean;
  isBanned?: boolean;
  authProvider: string;
  hasPassword: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

// ============================================
// Token Types
// ============================================

export interface TokenInfo {
  symbol: string;
  name: string;
  totalSupply: string;
  currentPrice: string;
  isPresale: boolean;
  presalePrice: string;
}

export interface TokenBalance {
  availableBalance: string;
  lockedBalance: string;
  totalBalance: string;
}

export interface TokenPrice {
  price: string;
  symbol: string;
  isPresale: boolean;
}

// ============================================
// Token Sales Types
// ============================================

export interface QuoteRequest {
  amountUsd: number;
  tokenPrice: number;
}

export interface QuoteResponse {
  amountUsd: string;
  tokensToReceive: string;
  pricePerToken: string;
  liquidityAllocation: string;
  treasuryAllocation: string;
}

export interface BuyTokensRequest {
  amountUsd: number;
  tokenPrice: number;
  paymentToken?: string;
  referralCode?: string;
}

export interface BuyTokensResponse {
  saleId: string;
  transactionId: string;
  tokensReceived: string;
  pricePerToken: string;
  totalPaidUsd: string;
  treasuryAmount: string;
  liquidityAmount: string;
  status: string;
}

export interface TokenSale {
  id: string;
  amountHbct: string;
  priceUsd: string;
  totalUsd: string;
  paymentToken: string;
  status: string;
  createdAt: string;
  completedAt?: string;
}

// ============================================
// Locking Types
// ============================================

export interface LockTier {
  id: string;
  name: string;
  lockMonths: number;
  bonusPercent: string;
  feeDiscountPercent?: string;
  minAmount: string;
  maxAmount?: string;
  isActive?: boolean;
}

// ============================================
// Affiliate Types
// ============================================

export interface AffiliateTier {
  id: string;
  name: string;
  commissionRate: string;
  minReferrals: number;
  // Admin management fields
  color?: string;
  isActive?: boolean;
  affiliateCount?: number;
  createdAt?: string;
  // Display/progression fields
  level?: number;
  minVolume?: string;
  benefits?: string[];
  badgeColor?: string;
  icon?: string;
}

export interface CreateLockRequest {
  amount: number;
  lockTierId: string;
}

export interface TokenLock {
  id: string;
  amount: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  startDate: string;
  endDate: string;
  rewardAmount: string;
  claimedReward: string;
  tier: LockTier;
}

export interface LockRewardsSummary {
  totalLocked: string;
  totalPendingRewards: string;
  totalClaimedRewards: string;
  activeLocks: number;
  locks: TokenLock[];
}

// ============================================
// Airdrop Types
// ============================================

export interface AirdropTask {
  id: string;
  type: string;
  description: string;
  url?: string;
  requiredAmount?: number;
}

export interface AirdropCampaign {
  id: string;
  title: string;
  description?: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  totalAllocation: string;
  reserved: string;
  distributed: string;
  perUserAmount?: string;
  maxParticipants?: number;
  startAt?: string;
  endAt?: string;
  tasks?: AirdropTask[];
  participantCount: number;
  createdAt: string;
}

export interface AirdropEntry {
  id: string;
  campaignId: string;
  campaignTitle?: string;
  walletAddress: string;
  allocatedAmount: string;
  isEligible: boolean;
  isDistributed: boolean;
  tasksCompleted?: Record<string, boolean>;
  createdAt: string;
}

// ============================================
// Marketplace Types
// ============================================

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  sortOrder: number;
  productCount: number;
}

export interface ProductImage {
  id: string;
  url: string;
  alt?: string;
  isPrimary: boolean;
}

export interface Product {
  id: string;
  categoryId: string;
  categoryName?: string;
  categorySlug?: string;
  name: string;
  slug: string;
  description?: string;
  priceHbct: string;
  priceFiat?: string;
  currency: string;
  isActive: boolean;
  isFeatured: boolean;
  images?: ProductImage[];
  inventory?: {
    stock: number;
    reserved: number;
    available: number;
    lowStock: number;
    isLowStock?: boolean;
  };
}

export interface OrderItem {
  productId: string;
  productName?: string;
  quantity: number;
  unitPriceHbct: string;
  unitPriceFiat?: string;
}

export interface ShippingInfo {
  name: string;
  email: string;
  phone?: string;
  address: string;
  city: string;
  state?: string;
  zip: string;
  country: string;
}

export interface CreateOrderRequest {
  items: { productId: string; quantity: number }[];
  shipping: ShippingInfo;
  paymentMethod: string;
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: 'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
  totalHbct: string;
  totalFiat?: string;
  currency: string;
  paymentMethod: string;
  shipping: ShippingInfo;
  trackingNumber?: string;
  trackingUrl?: string;
  items: OrderItem[];
  createdAt: string;
  paidAt?: string;
  shippedAt?: string;
  completedAt?: string;
}

// ============================================
// Affiliate Detail Types
// ============================================

export interface Affiliate {
  id: string;
  referralCode: string;
  commissionRate: string;
  totalEarnings: string;
  totalReferrals: number;
  totalVolume: string;
  isActive: boolean;
  createdAt: string;
  tier?: AffiliateTier;
  nextTier?: AffiliateTier;
  progressToNextTier?: number;
}

export interface AffiliateStats {
  totalReferrals: number;
  totalEarnings: string;
  pendingEarnings: string;
  paidEarnings: string;
  thisMonthReferrals: number;
  thisMonthEarnings: string;
  lastMonthReferrals: number;
  lastMonthEarnings: string;
  totalVolume: string;
  thisMonthVolume: string;
  conversionRate: string;
  averageOrderValue: string;
}

export interface ReferralDetails {
  id: string;
  referredUserId: string;
  referredUserEmail?: string;
  referredUserName?: string;
  status: 'PENDING' | 'ACTIVE' | 'CONVERTED' | 'INACTIVE';
  totalPurchases: string;
  totalCommissionEarned: string;
  registeredAt: string;
  firstPurchaseAt?: string;
  lastActivityAt?: string;
}

export interface Commission {
  id: string;
  referralId?: string;
  referralName?: string;
  type: 'SIGNUP_BONUS' | 'PURCHASE' | 'RECURRING' | 'BONUS' | 'TIER_BONUS';
  amount: string;
  sourceAmount?: string;
  rate?: string;
  isPaid: boolean;
  createdAt: string;
  paidAt?: string;
  txHash?: string;
}

export interface LeaderboardEntry {
  rank: number;
  referralCode: string;
  name?: string;
  avatarUrl?: string;
  totalReferrals: number;
  totalVolume: string;
  totalEarnings: string;
  tier?: AffiliateTier;
  isCurrentUser?: boolean;
}

export interface AffiliatePerformance {
  period: string;
  referrals: number;
  earnings: string;
  volume: string;
  conversionRate: string;
}

// Affiliate withdrawal request (for affiliate payouts)
export interface AffiliateWithdrawalRequest {
  id: string;
  amount: string;
  walletAddress: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';
  txHash?: string;
  createdAt: string;
  processedAt?: string;
  rejectionReason?: string;
}

export interface MarketingMaterial {
  id: string;
  type: 'BANNER' | 'SOCIAL' | 'EMAIL' | 'VIDEO' | 'DOCUMENT';
  title: string;
  description?: string;
  imageUrl?: string;
  downloadUrl?: string;
  dimensions?: string;
  format?: string;
  language: string;
}

export interface AffiliateNotification {
  id: string;
  type: 'NEW_REFERRAL' | 'COMMISSION_EARNED' | 'TIER_UPGRADE' | 'PAYOUT_COMPLETED' | 'BONUS_EARNED' | 'ANNOUNCEMENT';
  title: string;
  message: string;
  amount?: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
}

export interface AffiliateSettings {
  payoutWalletAddress?: string;
  minimumPayout: string;
  autoPayoutEnabled: boolean;
  emailNotifications: boolean;
  weeklyReportEnabled: boolean;
}

// ============================================
// Transaction Types
// ============================================

export type TransactionType =
  | 'BUY_WEBSITE'
  | 'BUY_DEX'
  | 'SELL_DEX'
  | 'TRANSFER'
  | 'TRANSFER_RECEIVE'
  | 'LOCK'
  | 'UNLOCK'
  | 'REWARD_DISTRIBUTION'
  | 'AIRDROP'
  | 'AFFILIATE_BONUS'
  | 'MARKETPLACE_PURCHASE'
  | 'MARKETPLACE_REFUND'
  | 'LIQUIDITY_ADD'
  | 'FEE_CASHBACK';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: string;
  priceUsd?: string;
  totalUsd?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  txHash?: string;
  createdAt: string;
  completedAt?: string;
}

// ============================================
// Admin Types
// ============================================

export interface DashboardStats {
  totalUsers: number;
  totalSalesUsd: string;
  totalTokensSold: string;
  totalLiquidityAdded: string;
  totalLockedTokens: string;
  totalRewardsDistributed: string;
  activeAirdrops: number;
  pendingOrders: number;
  affiliatePayouts: string;
}

export interface RewardPool {
  id: string;
  name: string;
  description?: string;
  allocation: string;
  reserved: string;
  distributed: string;
  available: string;
  isActive: boolean;
}

// ============================================
// Wallet Types
// ============================================

export type WalletCurrency = 'HBCT' | 'BNB' | 'USDT' | 'USDC';

export type WalletTransactionType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'INTERNAL_TRANSFER_SEND'
  | 'INTERNAL_TRANSFER_RECEIVE'
  | 'TOKEN_PURCHASE'
  | 'TOKEN_SALE'
  | 'LOCK'
  | 'UNLOCK'
  | 'REWARD'
  | 'AIRDROP'
  | 'AFFILIATE_COMMISSION'
  | 'FEE'
  | 'REFUND'
  | 'ADMIN_ADJUSTMENT';

export type WalletTransactionStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED';

export type TransferMethod =
  | 'USERNAME'
  | 'EMAIL'
  | 'WALLET_ADDRESS'
  | 'USER_ID'
  | 'QR_CODE';

export interface WalletBalance {
  currency: WalletCurrency;
  availableBalance: string;
  lockedBalance: string;
  pendingBalance: string;
  totalBalance: string;
  lastActivityAt?: string;
}

export interface WalletBalances {
  balances: WalletBalance[];
  totalValueUsd?: string;
}

export interface TransferLimits {
  singleTransferMax: string;
  dailyLimit: string;
  dailyUsed: string;
  dailyRemaining: string;
  weeklyLimit: string;
  weeklyUsed: string;
  weeklyRemaining: string;
  dailyResetAt: string;
  weeklyResetAt: string;
}

export interface InitiateTransferRequest {
  recipientIdentifier: string;
  transferMethod: TransferMethod;
  currency: WalletCurrency;
  amount: number;
  note?: string;
}

export interface InitiateTransferResponse {
  transferId: string;
  status: 'PENDING';
  message: string;
  twoFactorRequired?: boolean; // True if user should enter 2FA TOTP code instead of email code
  confirmationExpiresAt?: string; // Only present if NOT using 2FA
  recipient: {
    id: string;
    displayName: string;
  };
  amount: string;
  fee: string;
  netAmount: string;
  currency: WalletCurrency;
}

export interface ConfirmTransferResponse {
  transferId: string;
  status: 'COMPLETED';
  message: string;
  senderTransaction: {
    id: string;
    balanceAfter: string;
  };
  receiverTransaction: {
    id: string;
  };
}

export interface TransferInfo {
  id: string;
  senderId?: string;
  senderName?: string;
  receiverId?: string;
  receiverName?: string;
  currency: WalletCurrency;
  amount: string;
  fee: string;
  transferMethod: TransferMethod;
  recipientIdentifier: string;
  status: WalletTransactionStatus;
  note?: string;
  createdAt: string;
  completedAt?: string;
  confirmationExpiresAt?: string;
  recipient?: {
    id: string;
    displayName: string;
  };
  sender?: {
    id: string;
    displayName: string;
  };
}

export interface RecipientLookupResponse {
  found: boolean;
  recipient: {
    id: string;
    displayName: string;
  } | null;
}

export interface WalletTransaction {
  id: string;
  currency: WalletCurrency;
  type: WalletTransactionType;
  amount: string;
  fee: string | null;
  netAmount: string;
  balanceBefore: string;
  balanceAfter: string;
  status: WalletTransactionStatus;
  description?: string;
  txHash?: string;
  metadata?: {
    txHash?: string;
    paymentCurrency?: string;
    paymentAmount?: string;
    deliveryMethod?: string;
    purchaseId?: string;
    note?: string;
    [key: string]: unknown;
  };
  createdAt: string;
  completedAt?: string;
}

export interface WalletTransactionSummary {
  totalIn: string;
  totalOut: string;
  netChange: string;
  transactionCount: number;
  period: 'day' | 'week' | 'month' | 'all';
}

export interface TransferHistoryParams {
  currency?: WalletCurrency;
  status?: WalletTransactionStatus;
  direction?: 'sent' | 'received';
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface TransactionHistoryParams {
  currency?: WalletCurrency;
  type?: WalletTransactionType;
  status?: WalletTransactionStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
