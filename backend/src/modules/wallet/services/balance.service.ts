import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Currency, WalletTransactionType, WalletTransactionStatus, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  WalletBalanceInfo,
  AllBalancesResponse,
  BalanceOperationResult,
  BalanceCreditDebitParams,
} from '../interfaces';

// All supported currencies
const ALL_CURRENCIES: Currency[] = ['HBCT', 'BNB', 'USDT', 'USDC'];

@Injectable()
export class BalanceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Initialize all currency balances for a new user
   */
  async initializeUserBalances(userId: string): Promise<void> {
    // Check if user already has balances
    const existingBalances = await this.prisma.walletBalance.findMany({
      where: { userId },
    });

    if (existingBalances.length > 0) {
      return; // Already initialized
    }

    // Create balances for all currencies
    await this.prisma.walletBalance.createMany({
      data: ALL_CURRENCIES.map((currency) => ({
        userId,
        currency,
        availableBalance: new Decimal(0),
        lockedBalance: new Decimal(0),
        pendingBalance: new Decimal(0),
      })),
    });
  }

  /**
   * Get all balances for a user
   */
  async getUserBalances(userId: string): Promise<AllBalancesResponse> {
    // Ensure balances exist
    await this.initializeUserBalances(userId);

    const balances = await this.prisma.walletBalance.findMany({
      where: { userId },
      orderBy: { currency: 'asc' },
    });

    const balanceInfos: WalletBalanceInfo[] = balances.map((b) => ({
      currency: b.currency,
      availableBalance: b.availableBalance.toString(),
      lockedBalance: b.lockedBalance.toString(),
      pendingBalance: b.pendingBalance.toString(),
      totalBalance: b.availableBalance.add(b.lockedBalance).add(b.pendingBalance).toString(),
      lastActivityAt: b.lastActivityAt,
    }));

    return {
      balances: balanceInfos,
    };
  }

  /**
   * Get balance for a specific currency
   */
  async getBalance(userId: string, currency: Currency): Promise<WalletBalanceInfo> {
    // Ensure balances exist
    await this.initializeUserBalances(userId);

    const balance = await this.prisma.walletBalance.findUnique({
      where: {
        userId_currency: { userId, currency },
      },
    });

    if (!balance) {
      throw new NotFoundException(`Balance not found for currency ${currency}`);
    }

    return {
      currency: balance.currency,
      availableBalance: balance.availableBalance.toString(),
      lockedBalance: balance.lockedBalance.toString(),
      pendingBalance: balance.pendingBalance.toString(),
      totalBalance: balance.availableBalance
        .add(balance.lockedBalance)
        .add(balance.pendingBalance)
        .toString(),
      lastActivityAt: balance.lastActivityAt,
    };
  }

  /**
   * Credit balance (add funds) - used for deposits, transfers received, rewards, etc.
   */
  async creditBalance(params: BalanceCreditDebitParams): Promise<BalanceOperationResult> {
    const { userId, currency, amount, type, description, metadata, ipAddress, relatedTransferId } =
      params;

    if (amount.lessThanOrEqualTo(0)) {
      return { success: false, newBalance: '0', error: 'Amount must be positive' };
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Get current balance with lock
        const balance = await tx.walletBalance.findUnique({
          where: { userId_currency: { userId, currency } },
        });

        if (!balance) {
          throw new NotFoundException(`Balance not found for currency ${currency}`);
        }

        const balanceBefore = balance.availableBalance;
        const balanceAfter = balanceBefore.add(amount);

        // Update balance
        const updatedBalance = await tx.walletBalance.update({
          where: { userId_currency: { userId, currency } },
          data: {
            availableBalance: balanceAfter,
            lastActivityAt: new Date(),
          },
        });

        // Create transaction record
        const transaction = await tx.walletTransaction.create({
          data: {
            userId,
            currency,
            type,
            amount,
            netAmount: amount,
            balanceBefore,
            balanceAfter,
            status: WalletTransactionStatus.COMPLETED,
            description,
            metadata: metadata as Prisma.InputJsonValue,
            ipAddress,
            relatedTransferId,
            completedAt: new Date(),
          },
        });

        // Audit log
        await tx.walletAuditLog.create({
          data: {
            userId,
            action: 'CREDIT_BALANCE',
            entityType: 'WalletBalance',
            entityId: balance.id,
            oldValue: { availableBalance: balanceBefore.toString() },
            newValue: { availableBalance: balanceAfter.toString() },
            ipAddress,
          },
        });

        return {
          newBalance: updatedBalance.availableBalance.toString(),
          transactionId: transaction.id,
        };
      });

      return {
        success: true,
        newBalance: result.newBalance,
        transactionId: result.transactionId,
      };
    } catch (error) {
      return {
        success: false,
        newBalance: '0',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Debit balance (remove funds) - used for transfers sent, purchases, etc.
   */
  async debitBalance(params: BalanceCreditDebitParams): Promise<BalanceOperationResult> {
    const { userId, currency, amount, type, description, metadata, ipAddress, relatedTransferId } =
      params;

    if (amount.lessThanOrEqualTo(0)) {
      return { success: false, newBalance: '0', error: 'Amount must be positive' };
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Get current balance with lock
        const balance = await tx.walletBalance.findUnique({
          where: { userId_currency: { userId, currency } },
        });

        if (!balance) {
          throw new NotFoundException(`Balance not found for currency ${currency}`);
        }

        const balanceBefore = balance.availableBalance;

        // Check sufficient balance
        if (balanceBefore.lessThan(amount)) {
          throw new BadRequestException('Insufficient balance');
        }

        const balanceAfter = balanceBefore.sub(amount);

        // Update balance
        const updatedBalance = await tx.walletBalance.update({
          where: { userId_currency: { userId, currency } },
          data: {
            availableBalance: balanceAfter,
            lastActivityAt: new Date(),
          },
        });

        // Create transaction record
        const transaction = await tx.walletTransaction.create({
          data: {
            userId,
            currency,
            type,
            amount,
            netAmount: amount,
            balanceBefore,
            balanceAfter,
            status: WalletTransactionStatus.COMPLETED,
            description,
            metadata: metadata as Prisma.InputJsonValue,
            ipAddress,
            relatedTransferId,
            completedAt: new Date(),
          },
        });

        // Audit log
        await tx.walletAuditLog.create({
          data: {
            userId,
            action: 'DEBIT_BALANCE',
            entityType: 'WalletBalance',
            entityId: balance.id,
            oldValue: { availableBalance: balanceBefore.toString() },
            newValue: { availableBalance: balanceAfter.toString() },
            ipAddress,
          },
        });

        return {
          newBalance: updatedBalance.availableBalance.toString(),
          transactionId: transaction.id,
        };
      });

      return {
        success: true,
        newBalance: result.newBalance,
        transactionId: result.transactionId,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        return { success: false, newBalance: '0', error: error.message };
      }
      return {
        success: false,
        newBalance: '0',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Lock balance (move from available to locked)
   */
  async lockBalance(
    userId: string,
    currency: Currency,
    amount: Decimal,
    ipAddress?: string,
  ): Promise<BalanceOperationResult> {
    if (amount.lessThanOrEqualTo(0)) {
      return { success: false, newBalance: '0', error: 'Amount must be positive' };
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const balance = await tx.walletBalance.findUnique({
          where: { userId_currency: { userId, currency } },
        });

        if (!balance) {
          throw new NotFoundException(`Balance not found for currency ${currency}`);
        }

        if (balance.availableBalance.lessThan(amount)) {
          throw new BadRequestException('Insufficient available balance to lock');
        }

        const updatedBalance = await tx.walletBalance.update({
          where: { userId_currency: { userId, currency } },
          data: {
            availableBalance: balance.availableBalance.sub(amount),
            lockedBalance: balance.lockedBalance.add(amount),
            lastActivityAt: new Date(),
          },
        });

        // Audit log
        await tx.walletAuditLog.create({
          data: {
            userId,
            action: 'LOCK_BALANCE',
            entityType: 'WalletBalance',
            entityId: balance.id,
            oldValue: {
              availableBalance: balance.availableBalance.toString(),
              lockedBalance: balance.lockedBalance.toString(),
            },
            newValue: {
              availableBalance: updatedBalance.availableBalance.toString(),
              lockedBalance: updatedBalance.lockedBalance.toString(),
            },
            ipAddress,
          },
        });

        return updatedBalance;
      });

      return {
        success: true,
        newBalance: result.availableBalance.toString(),
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        return { success: false, newBalance: '0', error: error.message };
      }
      return {
        success: false,
        newBalance: '0',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Unlock balance (move from locked to available)
   */
  async unlockBalance(
    userId: string,
    currency: Currency,
    amount: Decimal,
    ipAddress?: string,
  ): Promise<BalanceOperationResult> {
    if (amount.lessThanOrEqualTo(0)) {
      return { success: false, newBalance: '0', error: 'Amount must be positive' };
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const balance = await tx.walletBalance.findUnique({
          where: { userId_currency: { userId, currency } },
        });

        if (!balance) {
          throw new NotFoundException(`Balance not found for currency ${currency}`);
        }

        if (balance.lockedBalance.lessThan(amount)) {
          throw new BadRequestException('Insufficient locked balance to unlock');
        }

        const updatedBalance = await tx.walletBalance.update({
          where: { userId_currency: { userId, currency } },
          data: {
            availableBalance: balance.availableBalance.add(amount),
            lockedBalance: balance.lockedBalance.sub(amount),
            lastActivityAt: new Date(),
          },
        });

        // Audit log
        await tx.walletAuditLog.create({
          data: {
            userId,
            action: 'UNLOCK_BALANCE',
            entityType: 'WalletBalance',
            entityId: balance.id,
            oldValue: {
              availableBalance: balance.availableBalance.toString(),
              lockedBalance: balance.lockedBalance.toString(),
            },
            newValue: {
              availableBalance: updatedBalance.availableBalance.toString(),
              lockedBalance: updatedBalance.lockedBalance.toString(),
            },
            ipAddress,
          },
        });

        return updatedBalance;
      });

      return {
        success: true,
        newBalance: result.availableBalance.toString(),
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        return { success: false, newBalance: '0', error: error.message };
      }
      return {
        success: false,
        newBalance: '0',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Add to pending balance (for incoming transactions not yet confirmed)
   */
  async addPendingBalance(
    userId: string,
    currency: Currency,
    amount: Decimal,
  ): Promise<BalanceOperationResult> {
    if (amount.lessThanOrEqualTo(0)) {
      return { success: false, newBalance: '0', error: 'Amount must be positive' };
    }

    try {
      const result = await this.prisma.walletBalance.update({
        where: { userId_currency: { userId, currency } },
        data: {
          pendingBalance: { increment: amount },
          lastActivityAt: new Date(),
        },
      });

      return {
        success: true,
        newBalance: result.pendingBalance.toString(),
      };
    } catch (error) {
      return {
        success: false,
        newBalance: '0',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Confirm pending balance (move from pending to available)
   */
  async confirmPendingBalance(
    userId: string,
    currency: Currency,
    amount: Decimal,
    ipAddress?: string,
  ): Promise<BalanceOperationResult> {
    if (amount.lessThanOrEqualTo(0)) {
      return { success: false, newBalance: '0', error: 'Amount must be positive' };
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const balance = await tx.walletBalance.findUnique({
          where: { userId_currency: { userId, currency } },
        });

        if (!balance) {
          throw new NotFoundException(`Balance not found for currency ${currency}`);
        }

        if (balance.pendingBalance.lessThan(amount)) {
          throw new BadRequestException('Insufficient pending balance');
        }

        const updatedBalance = await tx.walletBalance.update({
          where: { userId_currency: { userId, currency } },
          data: {
            pendingBalance: balance.pendingBalance.sub(amount),
            availableBalance: balance.availableBalance.add(amount),
            lastActivityAt: new Date(),
          },
        });

        // Audit log
        await tx.walletAuditLog.create({
          data: {
            userId,
            action: 'CONFIRM_PENDING_BALANCE',
            entityType: 'WalletBalance',
            entityId: balance.id,
            oldValue: {
              availableBalance: balance.availableBalance.toString(),
              pendingBalance: balance.pendingBalance.toString(),
            },
            newValue: {
              availableBalance: updatedBalance.availableBalance.toString(),
              pendingBalance: updatedBalance.pendingBalance.toString(),
            },
            ipAddress,
          },
        });

        return updatedBalance;
      });

      return {
        success: true,
        newBalance: result.availableBalance.toString(),
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        return { success: false, newBalance: '0', error: error.message };
      }
      return {
        success: false,
        newBalance: '0',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check if user has sufficient balance
   */
  async hasSufficientBalance(
    userId: string,
    currency: Currency,
    amount: Decimal,
  ): Promise<boolean> {
    const balance = await this.prisma.walletBalance.findUnique({
      where: { userId_currency: { userId, currency } },
    });

    if (!balance) return false;

    return balance.availableBalance.greaterThanOrEqualTo(amount);
  }

  /**
   * Get available balance amount
   */
  async getAvailableBalance(userId: string, currency: Currency): Promise<Decimal> {
    const balance = await this.prisma.walletBalance.findUnique({
      where: { userId_currency: { userId, currency } },
    });

    return balance?.availableBalance ?? new Decimal(0);
  }

  /**
   * Debit from locked balance (for completing locked operations like on-chain transfers)
   */
  async debitFromLocked(
    userId: string,
    currency: Currency,
    amount: Decimal,
    ipAddress?: string,
  ): Promise<BalanceOperationResult> {
    if (amount.lessThanOrEqualTo(0)) {
      return { success: false, newBalance: '0', error: 'Amount must be positive' };
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const balance = await tx.walletBalance.findUnique({
          where: { userId_currency: { userId, currency } },
        });

        if (!balance) {
          throw new NotFoundException(`Balance not found for currency ${currency}`);
        }

        if (balance.lockedBalance.lessThan(amount)) {
          throw new BadRequestException('Insufficient locked balance');
        }

        const updatedBalance = await tx.walletBalance.update({
          where: { userId_currency: { userId, currency } },
          data: {
            lockedBalance: balance.lockedBalance.sub(amount),
            lastActivityAt: new Date(),
          },
        });

        // Audit log
        await tx.walletAuditLog.create({
          data: {
            userId,
            action: 'DEBIT_FROM_LOCKED',
            entityType: 'WalletBalance',
            entityId: balance.id,
            oldValue: { lockedBalance: balance.lockedBalance.toString() },
            newValue: { lockedBalance: updatedBalance.lockedBalance.toString() },
            ipAddress,
          },
        });

        return updatedBalance;
      });

      return {
        success: true,
        newBalance: result.lockedBalance.toString(),
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        return { success: false, newBalance: '0', error: error.message };
      }
      return {
        success: false,
        newBalance: '0',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
