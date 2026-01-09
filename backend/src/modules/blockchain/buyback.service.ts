import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PancakeSwapService } from './pancakeswap.service';
import { Decimal } from '@prisma/client/runtime/library';

export interface BuybackConfig {
  enabled: boolean;
  percentageOfPayment: number; // e.g., 10 for 10%
  minAmountToExecute: number; // Minimum USD value before executing buyback
  autoExecute: boolean; // Execute immediately or batch
}

export interface BuybackResult {
  success: boolean;
  buybackId?: string;
  amountAllocated?: string;
  amountBoughtHbct?: string;
  liquidityAdded?: boolean;
  txHash?: string;
  error?: string;
}

@Injectable()
export class BuybackService {
  private readonly logger = new Logger(BuybackService.name);

  // Configuration (can be moved to env/database)
  private readonly config: BuybackConfig = {
    enabled: process.env.BUYBACK_ENABLED === 'true',
    percentageOfPayment: parseFloat(process.env.BUYBACK_PERCENTAGE || '10'),
    minAmountToExecute: parseFloat(process.env.BUYBACK_MIN_AMOUNT_USD || '50'),
    autoExecute: process.env.BUYBACK_AUTO_EXECUTE === 'true',
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly pancakeSwap: PancakeSwapService,
  ) {
    this.logger.log(`========================================`);
    this.logger.log(`BUYBACK SERVICE INITIALIZED`);
    this.logger.log(`Enabled: ${this.config.enabled}`);
    this.logger.log(`Percentage: ${this.config.percentageOfPayment}%`);
    this.logger.log(`Min Amount: $${this.config.minAmountToExecute}`);
    this.logger.log(`Auto Execute: ${this.config.autoExecute}`);
    this.logger.log(`Buyback Wallet: ${this.pancakeSwap.getWalletAddress() || 'Not configured'}`);
    this.logger.log(`Deposit Wallet: ${this.pancakeSwap.getDepositWalletAddress() || 'Not configured'}`);
    this.logger.log(`Auto-Split: ${this.pancakeSwap.isAutoSplitEnabled() ? 'ENABLED' : 'DISABLED'}`);
    this.logger.log(`========================================`);
  }

  /**
   * Calculate buyback amount from a payment
   */
  calculateBuybackAmount(paymentAmount: Decimal, currency: string): Decimal {
    if (!this.config.enabled) return new Decimal(0);

    const buybackAmount = paymentAmount.mul(this.config.percentageOfPayment).div(100);

    this.logger.log(
      `Buyback allocation: ${buybackAmount.toFixed(6)} ${currency} ` +
      `(${this.config.percentageOfPayment}% of ${paymentAmount.toFixed(6)})`
    );

    return buybackAmount;
  }

  /**
   * Record a pending buyback allocation
   */
  async allocateBuyback(
    purchaseId: string,
    userId: string,
    amount: Decimal,
    currency: 'BNB' | 'USDT' | 'USDC',
    usdValue: Decimal,
  ): Promise<string> {
    const buyback = await this.prisma.buybackAllocation.create({
      data: {
        purchaseId,
        userId,
        amount,
        currency,
        usdValue,
        status: 'PENDING',
      },
    });

    this.logger.log(
      `Buyback allocated: ${buyback.id} - ${amount.toFixed(6)} ${currency} ($${usdValue.toFixed(2)})`
    );

    // Auto-execute disabled - buybacks are tracked and executed manually
    // Admin panel shows pending amounts that need to be transferred to buyback wallet

    return buyback.id;
  }

  /**
   * Execute a single buyback
   */
  async executeBuyback(buybackId: string): Promise<BuybackResult> {
    const buyback = await this.prisma.buybackAllocation.findUnique({
      where: { id: buybackId },
    });

    if (!buyback) {
      return { success: false, error: 'Buyback not found' };
    }

    if (buyback.status !== 'PENDING') {
      return { success: false, error: `Buyback already ${buyback.status}` };
    }

    // Mark as processing
    await this.prisma.buybackAllocation.update({
      where: { id: buybackId },
      data: { status: 'PROCESSING', executedAt: new Date() },
    });

    try {
      const currency = buyback.currency as 'BNB' | 'USDT' | 'USDC';

      // Execute swap using buyback wallet's existing funds
      // Admin must manually fund the buyback wallet before executing
      const result = await this.pancakeSwap.swapForHBCT(
        buyback.amount.toString(),
        currency,
      );

      if (result.success) {
        // Update status to completed
        await this.prisma.buybackAllocation.update({
          where: { id: buybackId },
          data: {
            status: 'COMPLETED',
            swapTxHash: result.txHash,
            hbctBought: result.amountOut ? new Decimal(result.amountOut) : null,
            completedAt: new Date(),
          },
        });

        this.logger.log(
          `Buyback completed: ${buybackId} - Bought ${result.amountOut} HBCT`
        );

        return {
          success: true,
          buybackId,
          amountBoughtHbct: result.amountOut,
          liquidityAdded: false,
          txHash: result.txHash,
        };
      } else {
        // Mark as failed
        await this.prisma.buybackAllocation.update({
          where: { id: buybackId },
          data: {
            status: 'FAILED',
            errorMessage: result.error,
          },
        });

        return { success: false, buybackId, error: result.error };
      }
    } catch (error: any) {
      await this.prisma.buybackAllocation.update({
        where: { id: buybackId },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
        },
      });

      this.logger.error(`Buyback failed: ${buybackId} - ${error.message}`);
      return { success: false, buybackId, error: error.message };
    }
  }

  /**
   * Execute all pending buybacks as ONE BNB swap
   * Creates an Execution record, converts all to BNB, executes single swap
   * Returns the execution ID
   */
  async processPendingBuybacks(): Promise<{
    success: boolean;
    executionId?: string;
    totalProcessed: number;
    totalBnbSwapped: number;
    totalHbctBought: number;
    txHash?: string;
    error?: string;
  }> {
    if (!this.config.enabled) {
      return {
        success: false,
        totalProcessed: 0,
        totalBnbSwapped: 0,
        totalHbctBought: 0,
        error: 'Buyback is disabled',
      };
    }

    if (!this.pancakeSwap.isEnabled()) {
      return {
        success: false,
        totalProcessed: 0,
        totalBnbSwapped: 0,
        totalHbctBought: 0,
        error: 'PancakeSwap service is not configured',
      };
    }

    // Get all pending buybacks
    const pendingBuybacks = await this.prisma.buybackAllocation.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });

    if (pendingBuybacks.length === 0) {
      return {
        success: false,
        totalProcessed: 0,
        totalBnbSwapped: 0,
        totalHbctBought: 0,
        error: 'No pending buybacks to process',
      };
    }

    // Calculate total BNB equivalent
    const pendingTotal = await this.getTotalPendingInBnb();
    const totalBnbToSwap = pendingTotal.totalBnbRequired;
    const totalUsdValue = pendingBuybacks.reduce((sum, b) => sum + b.usdValue.toNumber(), 0);
    const bnbPrice = pendingTotal.bnbPriceUsd;

    if (totalBnbToSwap <= 0) {
      return {
        success: false,
        totalProcessed: 0,
        totalBnbSwapped: 0,
        totalHbctBought: 0,
        error: 'No BNB amount to swap',
      };
    }

    this.logger.log(`========================================`);
    this.logger.log(`CREATING BUYBACK EXECUTION`);
    this.logger.log(`Allocations: ${pendingBuybacks.length}`);
    this.logger.log(`Total BNB: ${totalBnbToSwap.toFixed(6)} BNB`);
    this.logger.log(`Total USD: $${totalUsdValue.toFixed(2)}`);
    this.logger.log(`========================================`);

    // Create Execution record
    const execution = await this.prisma.buybackExecution.create({
      data: {
        totalBnbSwapped: new Decimal(totalBnbToSwap),
        totalUsdValue: new Decimal(totalUsdValue),
        bnbPriceUsd: new Decimal(bnbPrice),
        allocationCount: pendingBuybacks.length,
        status: 'PROCESSING',
        executedAt: new Date(),
      },
    });

    // Link all allocations to this execution and mark as processing
    await this.prisma.buybackAllocation.updateMany({
      where: { id: { in: pendingBuybacks.map(b => b.id) } },
      data: {
        status: 'PROCESSING',
        executionId: execution.id,
        executedAt: new Date(),
      },
    });

    try {
      // Execute ONE swap for total BNB amount
      const swapResult = await this.pancakeSwap.swapForHBCT(
        totalBnbToSwap.toString(),
        'BNB',
      );

      if (swapResult.success) {
        const totalHbctBought = parseFloat(swapResult.amountOut || '0');

        // Update execution with success
        await this.prisma.buybackExecution.update({
          where: { id: execution.id },
          data: {
            status: 'COMPLETED',
            swapTxHash: swapResult.txHash,
            totalHbctBought: new Decimal(totalHbctBought),
            completedAt: new Date(),
          },
        });

        // Update each allocation with proportional HBCT
        for (const buyback of pendingBuybacks) {
          const proportion = buyback.usdValue.toNumber() / totalUsdValue;
          const hbctForThis = totalHbctBought * proportion;

          await this.prisma.buybackAllocation.update({
            where: { id: buyback.id },
            data: {
              status: 'COMPLETED',
              swapTxHash: swapResult.txHash,
              hbctBought: new Decimal(hbctForThis),
              completedAt: new Date(),
            },
          });
        }

        this.logger.log(`========================================`);
        this.logger.log(`EXECUTION SUCCESS`);
        this.logger.log(`Execution ID: ${execution.id}`);
        this.logger.log(`HBCT Bought: ${totalHbctBought}`);
        this.logger.log(`Tx Hash: ${swapResult.txHash}`);
        this.logger.log(`========================================`);

        return {
          success: true,
          executionId: execution.id,
          totalProcessed: pendingBuybacks.length,
          totalBnbSwapped: totalBnbToSwap,
          totalHbctBought,
          txHash: swapResult.txHash,
        };
      } else {
        // Swap failed - update execution and allocations
        await this.prisma.buybackExecution.update({
          where: { id: execution.id },
          data: {
            status: 'FAILED',
            errorMessage: swapResult.error,
          },
        });

        await this.prisma.buybackAllocation.updateMany({
          where: { executionId: execution.id },
          data: { status: 'FAILED', errorMessage: swapResult.error },
        });

        this.logger.error(`EXECUTION FAILED: ${swapResult.error}`);

        return {
          success: false,
          executionId: execution.id,
          totalProcessed: pendingBuybacks.length,
          totalBnbSwapped: totalBnbToSwap,
          totalHbctBought: 0,
          error: swapResult.error,
        };
      }
    } catch (error: any) {
      // Exception - update execution and allocations
      await this.prisma.buybackExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
        },
      });

      await this.prisma.buybackAllocation.updateMany({
        where: { executionId: execution.id },
        data: { status: 'FAILED', errorMessage: error.message },
      });

      this.logger.error(`EXECUTION EXCEPTION: ${error.message}`);

      return {
        success: false,
        executionId: execution.id,
        totalProcessed: pendingBuybacks.length,
        totalBnbSwapped: totalBnbToSwap,
        totalHbctBought: 0,
        error: error.message,
      };
    }
  }

  /**
   * Get all executions with their allocations
   */
  async getExecutions(params: { page: number; limit: number }) {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const [executions, total] = await Promise.all([
      this.prisma.buybackExecution.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          allocations: {
            select: {
              id: true,
              amount: true,
              currency: true,
              usdValue: true,
              hbctBought: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.buybackExecution.count(),
    ]);

    return {
      executions: executions.map(e => ({
        id: e.id,
        totalBnbSwapped: e.totalBnbSwapped.toString(),
        totalUsdValue: e.totalUsdValue.toString(),
        totalHbctBought: e.totalHbctBought?.toString() || null,
        bnbPriceUsd: e.bnbPriceUsd.toString(),
        status: e.status,
        swapTxHash: e.swapTxHash,
        errorMessage: e.errorMessage,
        allocationCount: e.allocationCount,
        createdAt: e.createdAt.toISOString(),
        executedAt: e.executedAt?.toISOString() || null,
        completedAt: e.completedAt?.toISOString() || null,
        allocations: e.allocations.map(a => ({
          id: a.id,
          amount: a.amount.toString(),
          currency: a.currency,
          usdValue: a.usdValue.toString(),
          hbctBought: a.hbctBought?.toString() || null,
          status: a.status,
        })),
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get buyback statistics
   */
  async getStats(): Promise<{
    totalAllocatedUsd: number;
    totalExecutedUsd: number;
    totalHbctBought: number;
    pendingCount: number;
    completedCount: number;
    failedCount: number;
    pendingByCurrency: { currency: string; amount: number; usdValue: number }[];
  }> {
    const [allocated, executed, pending, completed, failed, pendingByCurrency] = await Promise.all([
      this.prisma.buybackAllocation.aggregate({
        _sum: { usdValue: true },
      }),
      this.prisma.buybackAllocation.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { usdValue: true, hbctBought: true },
      }),
      this.prisma.buybackAllocation.count({ where: { status: 'PENDING' } }),
      this.prisma.buybackAllocation.count({ where: { status: 'COMPLETED' } }),
      this.prisma.buybackAllocation.count({ where: { status: 'FAILED' } }),
      this.prisma.buybackAllocation.groupBy({
        by: ['currency'],
        where: { status: 'PENDING' },
        _sum: { amount: true, usdValue: true },
      }),
    ]);

    return {
      totalAllocatedUsd: allocated._sum.usdValue?.toNumber() || 0,
      totalExecutedUsd: executed._sum.usdValue?.toNumber() || 0,
      totalHbctBought: executed._sum.hbctBought?.toNumber() || 0,
      pendingCount: pending,
      completedCount: completed,
      failedCount: failed,
      pendingByCurrency: pendingByCurrency.map((g) => ({
        currency: g.currency,
        amount: g._sum.amount?.toNumber() || 0,
        usdValue: g._sum.usdValue?.toNumber() || 0,
      })),
    };
  }

  /**
   * Check if buyback is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled && this.pancakeSwap.isEnabled();
  }

  /**
   * Get current configuration
   */
  getConfig(): BuybackConfig {
    return { ...this.config };
  }

  /**
   * Get buyback wallet balance and status
   */
  async getWalletStatus(): Promise<{
    success: boolean;
    walletAddress: string | null;
    balances: {
      bnb: string;
      usdt: string;
      usdc: string;
      hbct: string;
    };
    bnbPriceUsd: number;
    bnbPriceSource: string;
  }> {
    const walletAddress = this.pancakeSwap.getWalletAddress();

    const [bnb, usdt, usdc, hbct, bnbPriceResult] = await Promise.all([
      this.pancakeSwap.getWalletBalance('BNB'),
      this.pancakeSwap.getWalletBalance('USDT'),
      this.pancakeSwap.getWalletBalance('USDC'),
      this.pancakeSwap.getWalletBalance('HBCT'),
      this.pancakeSwap.getBnbPrice(),
    ]);

    return {
      success: bnbPriceResult.success,
      walletAddress,
      balances: { bnb, usdt, usdc, hbct },
      bnbPriceUsd: bnbPriceResult.price,
      bnbPriceSource: bnbPriceResult.source,
    };
  }

  /**
   * Calculate total pending amount in BNB equivalent
   * Converts USDT/USDC to BNB using current price
   */
  async getTotalPendingInBnb(): Promise<{
    success: boolean;
    totalBnbRequired: number;
    breakdown: {
      currency: string;
      amount: number;
      bnbEquivalent: number;
      usdValue: number;
      txCount: number;
    }[];
    estimatedGasFee: number;
    gasPriceGwei: number;
    totalWithGas: number;
    totalTxCount: number;
    bnbPriceUsd: number;
    dataSource: {
      bnbPrice: string;
      gasPrice: string;
    };
  }> {
    const [bnbPriceResult, gasEstimate] = await Promise.all([
      this.pancakeSwap.getBnbPrice(),
      this.pancakeSwap.estimateSwapGasFee(),
    ]);

    const bnbPrice = bnbPriceResult.price;

    const pendingByCurrency = await this.prisma.buybackAllocation.groupBy({
      by: ['currency'],
      where: { status: 'PENDING' },
      _sum: { amount: true, usdValue: true },
      _count: true,
    });

    let totalBnbRequired = 0;
    let totalTxCount = 0;
    const breakdown: {
      currency: string;
      amount: number;
      bnbEquivalent: number;
      usdValue: number;
      txCount: number;
    }[] = [];

    for (const group of pendingByCurrency) {
      const amount = group._sum.amount?.toNumber() || 0;
      const usdValue = group._sum.usdValue?.toNumber() || 0;
      const txCount = group._count || 0;

      let bnbEquivalent: number;

      if (group.currency === 'BNB') {
        bnbEquivalent = amount;
      } else {
        // Convert USD to BNB (USDT/USDC are 1:1 with USD)
        bnbEquivalent = usdValue / bnbPrice;
      }

      totalBnbRequired += bnbEquivalent;
      totalTxCount += txCount;
      breakdown.push({
        currency: group.currency,
        amount,
        bnbEquivalent,
        usdValue,
        txCount,
      });
    }

    return {
      success: bnbPriceResult.success && gasEstimate.success,
      totalBnbRequired,
      breakdown,
      estimatedGasFee: gasEstimate.gasFeeBnb,
      gasPriceGwei: gasEstimate.gasPriceGwei,
      totalWithGas: totalBnbRequired + gasEstimate.gasFeeBnb,
      totalTxCount,
      bnbPriceUsd: bnbPrice,
      dataSource: {
        bnbPrice: bnbPriceResult.source,
        gasPrice: gasEstimate.source,
      },
    };
  }

  /**
   * Check if buyback wallet is ready to execute
   * Verifies it has enough balance for pending buybacks + gas
   */
  async checkWalletReady(): Promise<{
    ready: boolean;
    walletAddress: string | null;
    currentBnbBalance: number;
    requiredBnb: number;
    requiredGas: number;
    totalRequired: number;
    shortfall: number;
    message: string;
  }> {
    const walletAddress = this.pancakeSwap.getWalletAddress();

    if (!walletAddress) {
      return {
        ready: false,
        walletAddress: null,
        currentBnbBalance: 0,
        requiredBnb: 0,
        requiredGas: 0,
        totalRequired: 0,
        shortfall: 0,
        message: 'Buyback wallet not configured',
      };
    }

    const [bnbBalance, pendingTotal] = await Promise.all([
      this.pancakeSwap.getWalletBalance('BNB'),
      this.getTotalPendingInBnb(),
    ]);

    const currentBnbBalance = parseFloat(bnbBalance);
    const totalRequired = pendingTotal.totalWithGas;
    const shortfall = Math.max(0, totalRequired - currentBnbBalance);

    const ready = currentBnbBalance >= totalRequired && pendingTotal.totalBnbRequired > 0;

    let message: string;
    if (pendingTotal.totalBnbRequired === 0) {
      message = 'No pending buybacks to execute';
    } else if (ready) {
      message = 'Wallet ready to execute buybacks';
    } else {
      message = `Need ${shortfall.toFixed(6)} more BNB`;
    }

    return {
      ready,
      walletAddress,
      currentBnbBalance,
      requiredBnb: pendingTotal.totalBnbRequired,
      requiredGas: pendingTotal.estimatedGasFee,
      totalRequired,
      shortfall,
      message,
    };
  }
}
