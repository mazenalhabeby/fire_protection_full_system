// Tokens API Service

import { api } from './client';
import type {
  TokenInfo,
  TokenBalance,
  TokenPrice,
  QuoteRequest,
  QuoteResponse,
  BuyTokensRequest,
  BuyTokensResponse,
  TokenSale,
  Transaction,
} from '@/types/api';

export const tokensApi = {
  // Token Info
  getTokenInfo: (): Promise<TokenInfo> => {
    return api.get<TokenInfo>('/tokens/info');
  },

  getPrice: (): Promise<TokenPrice> => {
    return api.get<TokenPrice>('/token-sales/price');
  },

  getBalance: (): Promise<TokenBalance> => {
    return api.get<TokenBalance>('/tokens/balance');
  },

  // Token Sales
  getQuote: (data: QuoteRequest): Promise<QuoteResponse> => {
    return api.post<QuoteResponse>('/token-sales/quote', data);
  },

  buyTokens: (data: BuyTokensRequest): Promise<BuyTokensResponse> => {
    return api.post<BuyTokensResponse>('/token-sales/buy', data);
  },

  getSaleHistory: (page = 1, limit = 10): Promise<{
    sales: TokenSale[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> => {
    return api.get('/token-sales/history', { page, limit });
  },

  // Transactions
  getTransactions: (page = 1, limit = 10, type?: string): Promise<{
    transactions: Transaction[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> => {
    return api.get('/tokens/transactions', { page, limit, type });
  },
};
