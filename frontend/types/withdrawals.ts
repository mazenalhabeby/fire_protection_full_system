// On-chain Withdrawal Types

export type WithdrawalRequestStatus =
  | 'PENDING_CONFIRMATION'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'FAILED';

export interface WithdrawalRequest {
  id: string;
  userId: string;
  amount: string;
  feeAmount: string;
  netAmount: string;
  toAddress: string;
  status: WithdrawalRequestStatus;
  confirmationCode?: string;
  confirmationExpiresAt?: string;
  confirmedAt?: string;
  requiresApproval: boolean;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  txHash?: string;
  blockNumber?: string;
  gasUsed?: string;
  retryCount: number;
  lastError?: string;
  ipAddress?: string;
  createdAt: string;
  completedAt?: string;
  explorerUrl?: string;
  user?: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  };
}

// Confirmation method type
export type ConfirmationMethod = '2fa' | 'email';

// Response from withdrawal request - includes confirmation method
export interface WithdrawalResponse extends WithdrawalRequest {
  confirmationMethod: ConfirmationMethod;
}

export interface WithdrawalListResponse {
  withdrawals: WithdrawalRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WithdrawalStats {
  totalWithdrawals: number;
  totalAmount: string;        // Only completed withdrawals
  totalFees: string;          // Only completed withdrawals
  pendingAmount: string;      // Pending + Processing withdrawals
  pendingCount: number;
  pendingConfirmationCount: number;
  pendingApprovalCount: number;
  processingCount: number;
  completedCount: number;
  failedCount: number;
}

export interface HotWalletStatus {
  address: string;
  balance: string;
  pendingWithdrawalsAmount: string;
  availableBalance: string;
  isLow: boolean;
  warningThreshold: string;
}

export interface WithdrawalProcessorStatus {
  isRunning: boolean;
  pollingInterval: number;
  lastProcessedAt?: string;
  queueSize: number;
}

export interface WithdrawalFilterParams {
  userId?: string;
  status?: WithdrawalRequestStatus;
  toAddress?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface RequestWithdrawalParams {
  amount: string;
  walletId: string;
}

export interface WithdrawalLimits {
  minAmount: string;
  maxAmount: string;
  feePercent: string;
  flatFee: string;
  approvalThreshold: string;
}
