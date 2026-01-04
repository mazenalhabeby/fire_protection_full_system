// On-chain Deposit Types

export type OnchainDepositStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CREDITED'
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
