import { Currency, TokenDeliveryMethod, TokenPurchaseStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface GetPurchaseQuoteParams {
  paymentCurrency: 'BNB' | 'USDT' | 'USDC';
  paymentAmount?: string;
  hbctAmount?: string;
  deliveryMethod: TokenDeliveryMethod;
}

export interface PurchaseQuote {
  paymentCurrency: string;
  paymentAmount: string;
  hbctAmount: string;
  tokenPrice: string;
  platformFee: string;
  networkFee: string;
  totalCost: string;
  quoteExpiresAt: Date;
}

export interface PurchaseOffChainParams {
  userId: string;
  paymentCurrency: Currency;
  paymentAmount: Decimal;
  referralCode?: string;
  ipAddress?: string;
}

export interface PurchaseOnChainParams extends PurchaseOffChainParams {
  destinationWalletId: string;
}

export interface PurchaseResult {
  success: boolean;
  purchaseId: string;
  hbctAmount: string;
  paymentAmount: string;
  paymentCurrency: string;
  deliveryMethod: TokenDeliveryMethod;
  txHash?: string;
  message?: string;
}

export interface PurchaseLimitsInfo {
  minPurchaseUsd: string;
  maxPurchaseUsd: string;
  dailyLimitUsd: string;
  dailyUsedUsd: string;
  dailyRemainingUsd: string;
  dailyResetAt: Date;
  monthlyLimitUsd: string;
  monthlyUsedUsd: string;
  monthlyRemainingUsd: string;
  monthlyResetAt: Date;
}

export interface TokenPurchaseRecord {
  id: string;
  paymentCurrency: Currency;
  paymentAmount: string;
  hbctAmount: string;
  tokenPrice: string;
  deliveryMethod: TokenDeliveryMethod;
  destinationAddress: string | null;
  platformFee: string;
  networkFee: string | null;
  status: TokenPurchaseStatus;
  txHash: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

export interface PaginatedPurchases {
  purchases: TokenPurchaseRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
