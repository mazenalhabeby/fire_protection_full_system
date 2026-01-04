import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { Currency } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { createPublicClient, http, formatUnits, parseUnits } from 'viem';
import { bsc } from 'viem/chains';

// PancakeSwap V2 Router ABI (only what we need)
const PANCAKESWAP_ROUTER_ABI = [
  {
    inputs: [
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
    ],
    name: 'getAmountsOut',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Token addresses on BSC
const BSC_TOKENS = {
  WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' as `0x${string}`,
  USDT: '0x55d398326f99059fF775485246999027B3197955' as `0x${string}`,
  BUSD: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56' as `0x${string}`,
  USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d' as `0x${string}`,
};

// PancakeSwap V2 Router address
const PANCAKESWAP_ROUTER = '0x10ED43C718714eb63d5aA57B78B54704E256024E' as `0x${string}`;

interface PriceCache {
  price: Decimal;
  timestamp: number;
}

@Injectable()
export class PriceService {
  private readonly logger = new Logger(PriceService.name);
  private readonly client;

  // Price cache (30 second TTL for more real-time pricing)
  private readonly CACHE_TTL_MS = 30 * 1000;
  private hbctPriceCache: PriceCache | null = null;
  private bnbPriceCache: PriceCache | null = null;

  // Stablecoin prices (1:1 with USD)
  private readonly stablecoinPrices: Record<string, Decimal> = {
    USDT: new Decimal(1),
    USDC: new Decimal(1),
  };

  // Fallback prices
  private readonly fallbackHbctPrice: Decimal;
  private readonly fallbackBnbPrice: Decimal;

  // Token config
  private readonly hbctTokenAddress: `0x${string}`;
  private readonly hbctDecimals: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    // Initialize viem client
    const rpcUrl = this.configService.get<string>('BSC_RPC_URL') || 'https://bsc-dataseed1.binance.org';
    this.client = createPublicClient({
      chain: bsc,
      transport: http(rpcUrl),
    });

    // Get HBCT token config
    this.hbctTokenAddress = (this.configService.get<string>('HBCT_TOKEN_ADDRESS') || '0x0000000000000000000000000000000000000000') as `0x${string}`;
    this.hbctDecimals = parseInt(this.configService.get<string>('HBCT_DECIMALS') || '18', 10);

    // Set fallback prices
    this.fallbackHbctPrice = new Decimal(
      this.configService.get<string>('TOKEN_CURRENT_PRICE') ||
      this.configService.get<string>('TOKEN_PRESALE_PRICE') ||
      '0.03'
    );
    this.fallbackBnbPrice = new Decimal(
      this.configService.get<string>('BNB_PRICE_USD') || '300'
    );

    this.logger.log(`PriceService initialized with HBCT: ${this.hbctTokenAddress}`);
  }

  /**
   * Get current HBCT price in USD from PancakeSwap
   */
  async getHbctPriceUsd(): Promise<Decimal> {
    // Check cache first
    if (this.hbctPriceCache && Date.now() - this.hbctPriceCache.timestamp < this.CACHE_TTL_MS) {
      return this.hbctPriceCache.price;
    }

    try {
      // Get price from PancakeSwap: HBCT -> USDT
      const price = await this.getPriceFromPancakeSwap(
        this.hbctTokenAddress,
        this.hbctDecimals,
        BSC_TOKENS.USDT,
        18, // USDT decimals
      );

      if (price) {
        this.hbctPriceCache = { price, timestamp: Date.now() };
        this.logger.debug(`HBCT live price: $${price.toFixed(6)}`);
        return price;
      }
    } catch (error) {
      this.logger.warn(`Failed to fetch HBCT price from PancakeSwap: ${error.message}`);
    }

    // Try alternative path: HBCT -> WBNB -> USDT
    try {
      const price = await this.getPriceViaWbnb();
      if (price) {
        this.hbctPriceCache = { price, timestamp: Date.now() };
        this.logger.debug(`HBCT live price (via WBNB): $${price.toFixed(6)}`);
        return price;
      }
    } catch (error) {
      this.logger.warn(`Failed to fetch HBCT price via WBNB: ${error.message}`);
    }

    // Fallback to database config
    try {
      const tokenConfig = await this.prisma.tokenConfig.findFirst({
        orderBy: { updatedAt: 'desc' },
      });

      if (tokenConfig) {
        const price = tokenConfig.isPresale && tokenConfig.presalePrice
          ? tokenConfig.presalePrice
          : tokenConfig.currentPrice;
        this.logger.debug(`Using database price: $${price.toFixed(6)}`);
        return price;
      }
    } catch (error) {
      this.logger.warn(`Failed to fetch price from database: ${error.message}`);
    }

    // Final fallback to env config
    this.logger.debug(`Using fallback price: $${this.fallbackHbctPrice.toFixed(6)}`);
    return this.fallbackHbctPrice;
  }

  /**
   * Get price from PancakeSwap using Router
   */
  private async getPriceFromPancakeSwap(
    tokenIn: `0x${string}`,
    tokenInDecimals: number,
    tokenOut: `0x${string}`,
    tokenOutDecimals: number,
  ): Promise<Decimal | null> {
    try {
      // Get price for 1 token
      const amountIn = parseUnits('1', tokenInDecimals);
      const path = [tokenIn, tokenOut];

      const amounts = await this.client.readContract({
        address: PANCAKESWAP_ROUTER,
        abi: PANCAKESWAP_ROUTER_ABI,
        functionName: 'getAmountsOut',
        args: [amountIn, path],
      });

      const amountOut = amounts[1];
      const price = formatUnits(amountOut, tokenOutDecimals);

      return new Decimal(price);
    } catch (error) {
      // Pool might not exist for direct pair
      return null;
    }
  }

  /**
   * Get HBCT price via WBNB intermediate (HBCT -> WBNB -> USDT)
   */
  private async getPriceViaWbnb(): Promise<Decimal | null> {
    try {
      const amountIn = parseUnits('1', this.hbctDecimals);
      const path = [this.hbctTokenAddress, BSC_TOKENS.WBNB, BSC_TOKENS.USDT];

      const amounts = await this.client.readContract({
        address: PANCAKESWAP_ROUTER,
        abi: PANCAKESWAP_ROUTER_ABI,
        functionName: 'getAmountsOut',
        args: [amountIn, path],
      });

      const amountOut = amounts[2]; // Final output (USDT)
      const price = formatUnits(amountOut, 18); // USDT has 18 decimals on BSC

      return new Decimal(price);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get BNB price in USD from Binance API (primary) or PancakeSwap (fallback)
   */
  async getBnbPriceUsd(): Promise<Decimal> {
    // Check cache first
    if (this.bnbPriceCache && Date.now() - this.bnbPriceCache.timestamp < this.CACHE_TTL_MS) {
      return this.bnbPriceCache.price;
    }

    // Try Binance API first (most accurate for BNB)
    try {
      const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT');
      if (response.ok) {
        const data = await response.json();
        const price = new Decimal(data.price);
        this.bnbPriceCache = { price, timestamp: Date.now() };
        this.logger.log(`BNB price from Binance: $${price.toFixed(2)}`);
        return price;
      }
    } catch (error) {
      this.logger.warn(`Failed to fetch BNB price from Binance: ${error.message}`);
    }

    // Fallback to PancakeSwap
    try {
      const price = await this.getPriceFromPancakeSwap(
        BSC_TOKENS.WBNB,
        18,
        BSC_TOKENS.USDT,
        18,
      );

      if (price) {
        this.bnbPriceCache = { price, timestamp: Date.now() };
        this.logger.log(`BNB price from PancakeSwap: $${price.toFixed(2)}`);
        return price;
      }
    } catch (error) {
      this.logger.warn(`Failed to fetch BNB price from PancakeSwap: ${error.message}`);
    }

    this.logger.log(`BNB price (fallback): $${this.fallbackBnbPrice.toFixed(2)}`);
    return this.fallbackBnbPrice;
  }

  /**
   * Get payment currency price in USD
   */
  async getCurrencyPriceUsd(currency: Currency | string): Promise<Decimal> {
    if (currency === 'USDT' || currency === 'USDC') {
      return this.stablecoinPrices[currency];
    }

    if (currency === 'BNB') {
      return this.getBnbPriceUsd();
    }

    throw new Error(`Unsupported currency: ${currency}`);
  }

  /**
   * Convert payment amount to USD value
   */
  async convertToUsd(
    amount: Decimal,
    currency: Currency | string,
  ): Promise<Decimal> {
    const currencyPrice = await this.getCurrencyPriceUsd(currency);
    return amount.mul(currencyPrice);
  }

  /**
   * Calculate HBCT amount from payment currency
   */
  async calculateHbctAmount(
    paymentCurrency: Currency | string,
    paymentAmount: Decimal,
  ): Promise<{ hbctAmount: Decimal; priceUsed: Decimal; usdValue: Decimal }> {
    const hbctPrice = await this.getHbctPriceUsd();
    const usdValue = await this.convertToUsd(paymentAmount, paymentCurrency);

    // HBCT amount = USD value / HBCT price
    const hbctAmount = usdValue.div(hbctPrice);

    return {
      hbctAmount,
      priceUsed: hbctPrice,
      usdValue,
    };
  }

  /**
   * Calculate payment amount for desired HBCT quantity
   */
  async calculatePaymentAmount(
    hbctAmount: Decimal,
    paymentCurrency: Currency | string,
  ): Promise<{ paymentAmount: Decimal; priceUsed: Decimal; usdValue: Decimal }> {
    const hbctPrice = await this.getHbctPriceUsd();
    const usdValue = hbctAmount.mul(hbctPrice);

    const currencyPrice = await this.getCurrencyPriceUsd(paymentCurrency);
    const paymentAmount = usdValue.div(currencyPrice);

    return {
      paymentAmount,
      priceUsed: hbctPrice,
      usdValue,
    };
  }

  /**
   * Get platform fee for purchases (percentage)
   */
  getPlatformFeePercent(): Decimal {
    const feePercent = this.configService.get<string>('PURCHASE_PLATFORM_FEE_PERCENT') || '0';
    return new Decimal(feePercent);
  }

  /**
   * Get network fee for on-chain transfers (in USD)
   */
  async getNetworkFeeUsd(): Promise<Decimal> {
    const networkFee = this.configService.get<string>('ONCHAIN_NETWORK_FEE_USD') || '0.50';
    return new Decimal(networkFee);
  }

  /**
   * Force refresh prices (clear cache)
   */
  clearPriceCache(): void {
    this.hbctPriceCache = null;
    this.bnbPriceCache = null;
    this.logger.log('Price cache cleared');
  }
}
