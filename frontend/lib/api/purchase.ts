import { api } from "./client";

// Types
export interface PurchaseQuote {
  paymentCurrency: string;
  paymentAmount: string;
  hbctAmount: string;
  tokenPrice: string;
  platformFee: string;
  networkFee: string;
  totalCost: string;
  quoteExpiresAt: string;
}

export interface GetQuoteRequest {
  paymentCurrency: "BNB" | "USDT" | "USDC";
  paymentAmount?: string;
  hbctAmount?: string;
  deliveryMethod: "OFF_CHAIN" | "ON_CHAIN";
}

export interface PurchaseResult {
  success: boolean;
  purchaseId: string;
  hbctAmount: string;
  paymentAmount: string;
  paymentCurrency: string;
  deliveryMethod: "OFF_CHAIN" | "ON_CHAIN";
  txHash?: string;
  message?: string;
}

export interface PurchaseOffChainRequest {
  paymentCurrency: "BNB" | "USDT" | "USDC";
  paymentAmount: string;
  referralCode?: string;
  txHash?: string; // Blockchain transaction hash of the payment
}

export interface PurchaseOnChainRequest extends PurchaseOffChainRequest {
  destinationWalletId: string;
}

export interface PurchaseLimits {
  minPurchaseUsd: string;
  maxPurchaseUsd: string;
  dailyLimitUsd: string;
  dailyUsedUsd: string;
  dailyRemainingUsd: string;
  dailyResetAt: string;
  monthlyLimitUsd: string;
  monthlyUsedUsd: string;
  monthlyRemainingUsd: string;
  monthlyResetAt: string;
}

export interface TokenPurchaseRecord {
  id: string;
  paymentCurrency: string;
  paymentAmount: string;
  hbctAmount: string;
  tokenPrice: string;
  deliveryMethod: "OFF_CHAIN" | "ON_CHAIN";
  destinationAddress: string | null;
  platformFee: string;
  networkFee: string | null;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  txHash: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface PaginatedPurchases {
  purchases: TokenPurchaseRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PurchaseHistoryParams {
  page?: number;
  limit?: number;
  deliveryMethod?: "OFF_CHAIN" | "ON_CHAIN";
  status?: string;
}

export interface LinkedWallet {
  id: string;
  walletAddress: string;
  label: string | null;
  isPrimary: boolean;
  verifiedAt: string;
  lastUsedAt: string | null;
}

export interface PriceInfo {
  hbctPriceUsd: string;
  bnbPriceUsd: string;
  usdtPriceUsd: string;
  usdcPriceUsd: string;
}

// API functions
export const purchaseApi = {
  /**
   * Get current token prices
   */
  getPrice: async (): Promise<PriceInfo> => {
    const response = await api.get<PriceInfo>("/purchase/price");
    return response;
  },

  /**
   * Get purchase quote
   */
  getQuote: async (data: GetQuoteRequest): Promise<PurchaseQuote> => {
    const response = await api.post<PurchaseQuote>("/purchase/quote", data);
    return response;
  },

  /**
   * Purchase off-chain (store in wallet)
   */
  purchaseOffChain: async (data: PurchaseOffChainRequest): Promise<PurchaseResult> => {
    const response = await api.post<PurchaseResult>("/purchase/off-chain", data);
    return response;
  },

  /**
   * Purchase on-chain (send to external wallet)
   */
  purchaseOnChain: async (data: PurchaseOnChainRequest): Promise<PurchaseResult> => {
    const response = await api.post<PurchaseResult>("/purchase/on-chain", data);
    return response;
  },

  /**
   * Get purchase limits
   */
  getLimits: async (): Promise<PurchaseLimits> => {
    const response = await api.get<PurchaseLimits>("/purchase/limits");
    return response;
  },

  /**
   * Get purchase history
   */
  getHistory: async (params?: PurchaseHistoryParams): Promise<PaginatedPurchases> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.deliveryMethod) searchParams.set("deliveryMethod", params.deliveryMethod);
    if (params?.status) searchParams.set("status", params.status);

    const query = searchParams.toString();
    const response = await api.get<PaginatedPurchases>(`/purchase/history${query ? `?${query}` : ""}`);
    return response;
  },

  /**
   * Get purchase by ID
   */
  getPurchase: async (id: string): Promise<TokenPurchaseRecord> => {
    const response = await api.get<TokenPurchaseRecord>(`/purchase/${id}`);
    return response;
  },

  /**
   * Get linked wallets for on-chain delivery
   */
  getLinkedWallets: async (): Promise<{ wallets: LinkedWallet[] }> => {
    const response = await api.get<{ wallets: LinkedWallet[] }>("/purchase/wallets/linked");
    return response;
  },
};
