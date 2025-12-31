import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Currency, WalletTransactionType, WalletTransactionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { TransactionInfo, PaginatedTransactions, TransactionSummary } from '../interfaces';

@Injectable()
export class HistoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get transaction history for a user
   */
  async getTransactionHistory(
    userId: string,
    options: {
      currency?: Currency;
      type?: WalletTransactionType;
      status?: WalletTransactionStatus;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    },
  ): Promise<PaginatedTransactions> {
    const { currency, type, status, startDate, endDate, page = 1, limit = 20 } = options;

    const where: any = { userId };

    if (currency) where.currency = currency;
    if (type) where.type = type;
    if (status) where.status = status;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [transactions, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.walletTransaction.count({ where }),
    ]);

    const transactionInfos: TransactionInfo[] = transactions.map((t) => ({
      id: t.id,
      currency: t.currency,
      type: t.type,
      amount: t.amount.toString(),
      fee: t.fee?.toString() || null,
      netAmount: t.netAmount.toString(),
      balanceBefore: t.balanceBefore.toString(),
      balanceAfter: t.balanceAfter.toString(),
      status: t.status,
      description: t.description,
      metadata: t.metadata as Record<string, unknown> | null,
      createdAt: t.createdAt,
      completedAt: t.completedAt,
    }));

    return {
      transactions: transactionInfos,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single transaction by ID
   */
  async getTransaction(userId: string, transactionId: string): Promise<TransactionInfo> {
    const transaction = await this.prisma.walletTransaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return {
      id: transaction.id,
      currency: transaction.currency,
      type: transaction.type,
      amount: transaction.amount.toString(),
      fee: transaction.fee?.toString() || null,
      netAmount: transaction.netAmount.toString(),
      balanceBefore: transaction.balanceBefore.toString(),
      balanceAfter: transaction.balanceAfter.toString(),
      status: transaction.status,
      description: transaction.description,
      metadata: transaction.metadata as Record<string, unknown> | null,
      createdAt: transaction.createdAt,
      completedAt: transaction.completedAt,
    };
  }

  /**
   * Get transaction summary for a period
   */
  async getTransactionSummary(
    userId: string,
    options: {
      currency?: Currency;
      period?: 'day' | 'week' | 'month' | 'all';
    },
  ): Promise<TransactionSummary> {
    const { currency, period = 'all' } = options;

    const where: any = {
      userId,
      status: WalletTransactionStatus.COMPLETED,
    };

    if (currency) where.currency = currency;

    // Calculate date range based on period
    const now = new Date();
    if (period !== 'all') {
      const startDate = new Date(now);
      switch (period) {
        case 'day':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - startDate.getDay()); // Start of week (Sunday)
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'month':
          startDate.setDate(1);
          startDate.setHours(0, 0, 0, 0);
          break;
      }
      where.createdAt = { gte: startDate };
    }

    // Get all completed transactions for the period
    const transactions = await this.prisma.walletTransaction.findMany({
      where,
      select: {
        type: true,
        netAmount: true,
      },
    });

    let totalIn = new Decimal(0);
    let totalOut = new Decimal(0);

    // Types that add to balance (user receives HBCT)
    const incomingTypes: WalletTransactionType[] = [
      WalletTransactionType.DEPOSIT,
      WalletTransactionType.INTERNAL_TRANSFER_RECEIVE,
      WalletTransactionType.TOKEN_PURCHASE, // User buys tokens → receives HBCT
      WalletTransactionType.REWARD,
      WalletTransactionType.AIRDROP,
      WalletTransactionType.AFFILIATE_COMMISSION,
      WalletTransactionType.REFUND,
      WalletTransactionType.UNLOCK,
    ];

    // Types that subtract from balance (user sends/loses HBCT)
    const outgoingTypes: WalletTransactionType[] = [
      WalletTransactionType.WITHDRAWAL,
      WalletTransactionType.INTERNAL_TRANSFER_SEND,
      WalletTransactionType.TOKEN_SALE, // User sells tokens → loses HBCT
      WalletTransactionType.LOCK,
      WalletTransactionType.FEE,
    ];

    for (const tx of transactions) {
      if (incomingTypes.includes(tx.type)) {
        totalIn = totalIn.add(tx.netAmount);
      } else if (outgoingTypes.includes(tx.type)) {
        totalOut = totalOut.add(tx.netAmount);
      }
    }

    const netChange = totalIn.sub(totalOut);

    return {
      totalIn: totalIn.toString(),
      totalOut: totalOut.toString(),
      netChange: netChange.toString(),
      transactionCount: transactions.length,
      period,
    };
  }

  /**
   * Get recent activity for dashboard
   */
  async getRecentActivity(
    userId: string,
    limit: number = 5,
  ): Promise<TransactionInfo[]> {
    const transactions = await this.prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return transactions.map((t) => ({
      id: t.id,
      currency: t.currency,
      type: t.type,
      amount: t.amount.toString(),
      fee: t.fee?.toString() || null,
      netAmount: t.netAmount.toString(),
      balanceBefore: t.balanceBefore.toString(),
      balanceAfter: t.balanceAfter.toString(),
      status: t.status,
      description: t.description,
      metadata: t.metadata as Record<string, unknown> | null,
      createdAt: t.createdAt,
      completedAt: t.completedAt,
    }));
  }

  /**
   * Get transaction count by type for analytics
   */
  async getTransactionStats(userId: string): Promise<Record<string, number>> {
    const stats = await this.prisma.walletTransaction.groupBy({
      by: ['type'],
      where: { userId },
      _count: true,
    });

    const result: Record<string, number> = {};
    for (const stat of stats) {
      result[stat.type] = stat._count;
    }

    return result;
  }
}
