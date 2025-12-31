import { Currency, WalletTransactionType, WalletTransactionStatus, TransferMethod } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface WalletBalanceInfo {
  currency: Currency;
  availableBalance: string;
  lockedBalance: string;
  pendingBalance: string;
  totalBalance: string;
  lastActivityAt: Date | null;
}

export interface AllBalancesResponse {
  balances: WalletBalanceInfo[];
  totalValueUsd?: string;
}

export interface TransactionInfo {
  id: string;
  currency: Currency;
  type: WalletTransactionType;
  amount: string;
  fee: string | null;
  netAmount: string;
  balanceBefore: string;
  balanceAfter: string;
  status: WalletTransactionStatus;
  description: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  completedAt: Date | null;
}

export interface TransferInfo {
  id: string;
  currency: Currency;
  amount: string;
  fee: string;
  transferMethod: TransferMethod;
  recipientIdentifier: string;
  status: WalletTransactionStatus;
  note: string | null;
  createdAt: Date;
  completedAt: Date | null;
  confirmationExpiresAt?: Date | null;
  recipient?: {
    id: string;
    displayName: string;
  };
  sender?: {
    id: string;
    displayName: string;
  };
}

export interface RecipientInfo {
  userId: string;
  displayName: string;
  email?: string;
  username?: string;
  walletAddress?: string;
  avatarUrl?: string;
}

export interface TransferLimitsInfo {
  singleTransferMax: string;
  dailyLimit: string;
  dailyUsed: string;
  dailyRemaining: string;
  dailyResetAt: Date;
  weeklyLimit: string;
  weeklyUsed: string;
  weeklyRemaining: string;
  weeklyResetAt: Date;
}

export interface BalanceOperationResult {
  success: boolean;
  newBalance: string;
  transactionId?: string;
  error?: string;
}

export interface TransferResult {
  success: boolean;
  transferId?: string;
  confirmationRequired: boolean;
  twoFactorRequired?: boolean; // True if user has 2FA enabled and should use TOTP
  confirmationExpiresAt?: Date;
  error?: string;
  // Additional fields for frontend
  recipient?: {
    id: string;
    displayName: string;
  };
  amount?: string;
  fee?: string;
  netAmount?: string;
  currency?: Currency;
}

export interface TransactionSummary {
  totalIn: string;
  totalOut: string;
  netChange: string;
  transactionCount: number;
  period: 'day' | 'week' | 'month' | 'all';
}

export interface PaginatedTransactions {
  transactions: TransactionInfo[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedTransfers {
  transfers: TransferInfo[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BalanceCreditDebitParams {
  userId: string;
  currency: Currency;
  amount: Decimal;
  type: WalletTransactionType;
  description?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  relatedTransferId?: string;
}

export interface InitiateTransferParams {
  senderId: string;
  recipientIdentifier: string;
  transferMethod: TransferMethod;
  currency: Currency;
  amount: Decimal;
  note?: string;
  ipAddress?: string;
}
