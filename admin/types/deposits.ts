// On-chain Deposit Types

export type OnchainDepositStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CREDITED'
  | 'LOCKED'    // Mapped by admin but locked for 24h (unverified wallet)
  | 'FAILED'
  | 'UNMAPPED';

export interface OnchainDeposit {
  id: string;
  userId: string | null;
  txHash: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  tokenAddress: string;
  blockNumber: string;
  blockTimestamp: string | null;
  chainId: number;
  status: OnchainDepositStatus;
  confirmations: number;
  creditedAt: string | null;
  failureReason: string | null;
  createdAt: string;
  explorerUrl: string;
  user?: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  };
  // Lock system fields
  lockedUntil?: string | null;
  lockedAt?: string | null;
  lockedByAdminId?: string | null;
  lockReason?: string | null;
  releasedAt?: string | null;
  releasedByAdminId?: string | null;
  walletVerified?: boolean;
}

export interface DepositListResponse {
  deposits: OnchainDeposit[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DepositStats {
  totalDeposits: number;
  totalAmount: string;
  pendingCount: number;
  creditedCount: number;
  unmappedCount: number;
}

export interface DepositListenerStatus {
  isRunning: boolean;
  pollingInterval: number;
}

export interface DepositFilterParams {
  userId?: string;
  status?: OnchainDepositStatus;
  fromAddress?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}
