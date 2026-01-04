// Wallet API Service

import { api } from './client';
import type {
  WalletBalance,
  WalletBalances,
  TransferLimits,
  InitiateTransferRequest,
  InitiateTransferResponse,
  ConfirmTransferResponse,
  TransferInfo,
  RecipientLookupResponse,
  WalletTransaction,
  WalletTransactionSummary,
  TransferHistoryParams,
  TransactionHistoryParams,
} from '@/types';

export const walletApi = {
  // ============================================
  // BALANCE ENDPOINTS
  // ============================================

  /**
   * Get all currency balances
   */
  getBalances: (): Promise<WalletBalances> => {
    return api.get<WalletBalances>('/wallet/balances');
  },

  /**
   * Get balance for a specific currency
   */
  getBalance: (currency: 'HBCT' | 'BNB' | 'USDT' | 'USDC'): Promise<WalletBalance> => {
    return api.get<WalletBalance>(`/wallet/balances/${currency}`);
  },

  // ============================================
  // TRANSFER ENDPOINTS
  // ============================================

  /**
   * Initiate an internal transfer
   */
  initiateTransfer: (data: InitiateTransferRequest): Promise<InitiateTransferResponse> => {
    return api.post<InitiateTransferResponse>('/wallet/transfers', data);
  },

  /**
   * Confirm a pending transfer with confirmation code
   */
  confirmTransfer: (transferId: string, confirmationCode: string): Promise<ConfirmTransferResponse> => {
    return api.post<ConfirmTransferResponse>(`/wallet/transfers/${transferId}/confirm`, {
      confirmationCode,
    });
  },

  /**
   * Cancel a pending transfer
   */
  cancelTransfer: (transferId: string): Promise<{ success: boolean; message: string }> => {
    return api.delete(`/wallet/transfers/${transferId}`);
  },

  /**
   * Get transfer history
   */
  getTransfers: (params?: TransferHistoryParams): Promise<{
    transfers: TransferInfo[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> => {
    return api.get('/wallet/transfers', params as Record<string, string | number | boolean | undefined>);
  },

  /**
   * Get pending transfers
   */
  getPendingTransfers: (): Promise<{ transfers: TransferInfo[]; total: number }> => {
    return api.get('/wallet/transfers/pending');
  },

  // ============================================
  // RECIPIENT LOOKUP
  // ============================================

  /**
   * Lookup recipient by method and identifier
   */
  lookupRecipient: (
    method: 'USERNAME' | 'EMAIL' | 'WALLET_ADDRESS' | 'USER_ID' | 'QR_CODE',
    identifier: string
  ): Promise<RecipientLookupResponse> => {
    return api.get(`/wallet/lookup/${method}/${encodeURIComponent(identifier)}`);
  },

  // ============================================
  // TRANSACTION HISTORY ENDPOINTS
  // ============================================

  /**
   * Get transaction history
   */
  getTransactions: (params?: TransactionHistoryParams): Promise<{
    transactions: WalletTransaction[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> => {
    return api.get('/wallet/transactions', params as Record<string, string | number | boolean | undefined>);
  },

  /**
   * Get transaction details
   */
  getTransaction: (transactionId: string): Promise<WalletTransaction> => {
    return api.get(`/wallet/transactions/${transactionId}`);
  },

  /**
   * Get transaction summary (totals by period)
   */
  getTransactionSummary: (params?: {
    currency?: 'HBCT' | 'BNB' | 'USDT' | 'USDC';
    period?: 'day' | 'week' | 'month' | 'all';
  }): Promise<WalletTransactionSummary> => {
    return api.get('/wallet/transactions/summary', params);
  },

  /**
   * Get recent transactions for dashboard
   */
  getRecentTransactions: (): Promise<{ transactions: WalletTransaction[] }> => {
    return api.get('/wallet/transactions/recent');
  },

  // ============================================
  // EXPORT ENDPOINTS
  // ============================================

  /**
   * Export transaction history as CSV
   * Note: Returns placeholder response until Phase 3 implementation
   */
  exportCSV: (params?: {
    currency?: 'HBCT' | 'BNB' | 'USDT' | 'USDC';
    startDate?: string;
    endDate?: string;
  }): Promise<{ message: string }> => {
    return api.get('/wallet/export/csv', params as Record<string, string | number | boolean | undefined>);
  },

  /**
   * Export transaction history as PDF
   * Note: Returns placeholder response until Phase 3 implementation
   */
  exportPDF: (params?: {
    currency?: 'HBCT' | 'BNB' | 'USDT' | 'USDC';
    startDate?: string;
    endDate?: string;
  }): Promise<{ message: string }> => {
    return api.get('/wallet/export/pdf', params as Record<string, string | number | boolean | undefined>);
  },

  // ============================================
  // TRANSFER LIMITS
  // ============================================

  /**
   * Get user transfer limits
   */
  getLimits: (): Promise<TransferLimits> => {
    return api.get<TransferLimits>('/wallet/limits');
  },

  // ============================================
  // QR CODE ENDPOINTS
  // ============================================

  /**
   * Generate a QR code for receiving transfers
   */
  generateQRCode: (data: {
    currency?: 'HBCT' | 'BNB' | 'USDT' | 'USDC';
    amount?: number;
    expiresInHours?: number;
  }): Promise<{ code: string; qrDataUrl: string; expiresAt?: string }> => {
    return api.post('/wallet/qr', data);
  },

  /**
   * Get QR code details
   */
  getQRCodeDetails: (code: string): Promise<{
    userId: string;
    currency?: 'HBCT' | 'BNB' | 'USDT' | 'USDC';
    amount?: string;
    isActive: boolean;
    expiresAt?: string;
  }> => {
    return api.get(`/wallet/qr/${code}`);
  },
};
