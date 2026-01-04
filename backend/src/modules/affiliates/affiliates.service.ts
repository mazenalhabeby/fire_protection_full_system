import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request } from 'express';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CommissionQueryDto } from './dto';
import { getClientIp, getUserAgent } from '../../common/utils';

// Audit log action types
type AuditAction =
  | 'REGISTRATION'
  | 'COMMISSION_CREATED'
  | 'COMMISSION_CLAIMED'
  | 'WITHDRAWAL_REQUEST'
  | 'CODE_VALIDATED';

@Injectable()
export class AffiliatesService {
  private readonly logger = new Logger(AffiliatesService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Log affiliate action for audit trail
   */
  private async logAuditAction(
    affiliateId: string,
    action: AuditAction,
    req?: Request,
    amount?: number,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.prisma.affiliateAuditLog.create({
        data: {
          affiliateId,
          action,
          amount: amount ? new Prisma.Decimal(amount) : null,
          metadata: metadata ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
          ipAddress: getClientIp(req),
          userAgent: getUserAgent(req),
        },
      });
    } catch (error) {
      // Don't fail the main operation if audit logging fails
      this.logger.error(`Failed to log audit action: ${error.message}`, error.stack);
    }
  }

  private generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const bytes = crypto.randomBytes(8);
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(bytes[i] % chars.length);
    }
    return code;
  }

  async register(userId: string, req?: Request) {
    // Check if user already has an affiliate account
    const existingAffiliate = await this.prisma.affiliate.findUnique({
      where: { userId },
    });

    if (existingAffiliate) {
      throw new ConflictException('User already has an affiliate account');
    }

    // Generate unique referral code with retry limit
    let referralCode = this.generateReferralCode();
    let existing = await this.prisma.affiliate.findUnique({
      where: { referralCode },
    });

    let retries = 0;
    const maxRetries = 10;
    while (existing && retries < maxRetries) {
      referralCode = this.generateReferralCode();
      existing = await this.prisma.affiliate.findUnique({
        where: { referralCode },
      });
      retries++;
    }

    if (existing) {
      this.logger.error(`Failed to generate unique referral code after ${maxRetries} attempts`);
      throw new BadRequestException('Failed to generate unique referral code. Please try again.');
    }

    const affiliate = await this.prisma.affiliate.create({
      data: {
        userId,
        referralCode,
        commissionRate: new Prisma.Decimal(0.03), // 3% default (Starter tier)
      },
    });

    // Log the registration
    await this.logAuditAction(affiliate.id, 'REGISTRATION', req, undefined, {
      referralCode: affiliate.referralCode,
    });

    this.logger.log(`Affiliate registered: ${affiliate.id} (code: ${affiliate.referralCode})`);

    return {
      id: affiliate.id,
      referralCode: affiliate.referralCode,
      commissionRate: affiliate.commissionRate.toString(),
      totalEarnings: affiliate.totalEarnings.toString(),
      totalReferrals: affiliate.totalReferrals,
      isActive: affiliate.isActive,
      createdAt: affiliate.createdAt,
    };
  }

  async getProfile(userId: string) {
    const affiliate = await this.prisma.affiliate.findUnique({
      where: { userId },
    });

    if (!affiliate) {
      throw new NotFoundException('Affiliate account not found');
    }

    return {
      id: affiliate.id,
      referralCode: affiliate.referralCode,
      commissionRate: affiliate.commissionRate.toString(),
      totalEarnings: affiliate.totalEarnings.toString(),
      totalReferrals: affiliate.totalReferrals,
      isActive: affiliate.isActive,
      createdAt: affiliate.createdAt,
    };
  }

  /**
   * Get affiliate profile or null if not registered
   * This endpoint is used by frontend to check if user is an affiliate
   */
  async getMyAffiliate(userId: string) {
    const affiliate = await this.prisma.affiliate.findUnique({
      where: { userId },
    });

    if (!affiliate) {
      return null;
    }

    return {
      id: affiliate.id,
      referralCode: affiliate.referralCode,
      commissionRate: affiliate.commissionRate.toString(),
      totalEarnings: affiliate.totalEarnings.toString(),
      totalReferrals: affiliate.totalReferrals,
      isActive: affiliate.isActive,
      createdAt: affiliate.createdAt,
    };
  }

  async getStats(userId: string) {
    const affiliate = await this.prisma.affiliate.findUnique({
      where: { userId },
      include: {
        referredUsers: true,
      },
    });

    if (!affiliate) {
      throw new NotFoundException('Affiliate account not found');
    }

    // This month stats
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const thisMonthReferrals = affiliate.referredUsers.filter(
      (u) => u.createdAt >= startOfMonth,
    ).length;

    // Get commission earnings from WalletTransaction (new system)
    // Commissions are now credited directly to wallet with type AFFILIATE_COMMISSION
    const [totalEarnedResult, thisMonthEarnedResult] = await Promise.all([
      // Total earned from all wallet transactions
      this.prisma.walletTransaction.aggregate({
        where: {
          userId: affiliate.userId,
          type: 'AFFILIATE_COMMISSION',
        },
        _sum: { amount: true },
      }),
      // This month earnings
      this.prisma.walletTransaction.aggregate({
        where: {
          userId: affiliate.userId,
          type: 'AFFILIATE_COMMISSION',
          createdAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
    ]);

    const totalEarnings = totalEarnedResult._sum.amount || 0;
    const thisMonthEarnings = thisMonthEarnedResult._sum.amount || 0;

    // In new system, all commissions are credited directly (no pending state)
    // pendingEarnings is 0, paidEarnings equals totalEarnings
    return {
      totalReferrals: affiliate.totalReferrals,
      totalEarnings: totalEarnings.toString(),
      pendingEarnings: '0',
      paidEarnings: totalEarnings.toString(),
      thisMonthReferrals,
      thisMonthEarnings: thisMonthEarnings.toString(),
    };
  }

  async getReferrals(userId: string, query: { page?: number; limit?: number; status?: string; search?: string }) {
    const { page = 1, limit = 10, status, search } = query;
    const skip = (page - 1) * limit;

    const affiliate = await this.prisma.affiliate.findUnique({
      where: { userId },
    });

    if (!affiliate) {
      throw new NotFoundException('Affiliate account not found');
    }

    // Build where clause for search
    const searchWhere = search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    // Get all referrals with their purchase data
    const allReferrals = await this.prisma.user.findMany({
      where: {
        referredById: affiliate.id,
        ...searchWhere,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        tokenPurchases: {
          where: { status: 'COMPLETED' },
          select: {
            id: true,
            hbctAmount: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    // Get commissions from TokenPurchase records (new system stores commission there)
    const purchasesWithCommission = await this.prisma.tokenPurchase.findMany({
      where: {
        affiliateId: affiliate.id,
        commissionAmount: { not: null },
        status: 'COMPLETED',
      },
      select: {
        userId: true,
        commissionAmount: true,
      },
    });

    // Map commissions by user ID (the referral who made the purchase)
    const commissionsMap = new Map<string, { total: number }>();
    for (const p of purchasesWithCommission) {
      if (p.userId && p.commissionAmount) {
        const existing = commissionsMap.get(p.userId) || { total: 0 };
        existing.total += Number(p.commissionAmount);
        commissionsMap.set(p.userId, existing);
      }
    }

    // Also check legacy Commission table for older records
    const legacyCommissions = await this.prisma.commission.findMany({
      where: { affiliateId: affiliate.id },
      include: {
        sale: {
          select: { userId: true },
        },
      },
    });

    for (const c of legacyCommissions) {
      if (c.sale?.userId) {
        const existing = commissionsMap.get(c.sale.userId) || { total: 0 };
        existing.total += Number(c.amount);
        commissionsMap.set(c.sale.userId, existing);
      }
    }

    // Calculate status for each referral and transform data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const transformedReferrals = allReferrals.map((r) => {
      const totalPurchases = r.tokenPurchases.reduce((sum, p) => sum + Number(p.hbctAmount), 0);
      const hasPurchases = r.tokenPurchases.length > 0;
      const lastActivity = r.lastLoginAt || r.createdAt;
      const isRecentlyActive = lastActivity ? new Date(lastActivity) > thirtyDaysAgo : false;
      const isNewUser = new Date(r.createdAt) > thirtyDaysAgo;
      const commissionEarned = commissionsMap.get(r.id)?.total || 0;

      // Determine status (ACTIVE, CONVERTED, or INACTIVE)
      let referralStatus: 'ACTIVE' | 'CONVERTED' | 'INACTIVE';
      if (hasPurchases) {
        referralStatus = 'CONVERTED';
      } else if (isRecentlyActive || isNewUser) {
        // Users who are recently active OR newly registered are considered ACTIVE
        referralStatus = 'ACTIVE';
      } else {
        referralStatus = 'INACTIVE';
      }

      return {
        id: r.id,
        referredUserId: r.id,
        referredUserEmail: r.email ? this.maskEmail(r.email) : undefined,
        referredUserName: this.formatName(r.firstName, r.lastName),
        status: referralStatus,
        totalPurchases: totalPurchases.toString(),
        totalCommissionEarned: commissionEarned.toString(),
        registeredAt: r.createdAt.toISOString(),
        firstPurchaseAt: r.tokenPurchases[0]?.createdAt?.toISOString(),
        lastActivityAt: lastActivity?.toISOString(),
      };
    });

    // Calculate summary counts from all referrals (before filtering by status)
    const summary = {
      total: transformedReferrals.length,
      active: transformedReferrals.filter((r) => r.status === 'ACTIVE').length,
      converted: transformedReferrals.filter((r) => r.status === 'CONVERTED').length,
      inactive: transformedReferrals.filter((r) => r.status === 'INACTIVE').length,
    };

    // Filter by status if provided
    const filteredReferrals = status
      ? transformedReferrals.filter((r) => r.status.toLowerCase() === status.toLowerCase())
      : transformedReferrals;

    // Apply pagination
    const paginatedReferrals = filteredReferrals.slice(skip, skip + limit);

    return {
      referrals: paginatedReferrals,
      summary,
      pagination: {
        page,
        limit,
        total: filteredReferrals.length,
        totalPages: Math.ceil(filteredReferrals.length / limit),
      },
    };
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    const maskedLocal =
      local.length > 2
        ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
        : local[0] + '*';
    return `${maskedLocal}@${domain}`;
  }

  async getCommissions(userId: string, query: CommissionQueryDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const affiliate = await this.prisma.affiliate.findUnique({
      where: { userId },
    });

    if (!affiliate) {
      throw new NotFoundException('Affiliate account not found');
    }

    // Get commission history from WalletTransaction (actual credited commissions)
    const [transactions, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where: {
          userId: affiliate.userId,
          type: 'AFFILIATE_COMMISSION',
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          amount: true,
          description: true,
          metadata: true,
          createdAt: true,
        },
      }),
      this.prisma.walletTransaction.count({
        where: {
          userId: affiliate.userId,
          type: 'AFFILIATE_COMMISSION',
        },
      }),
    ]);

    // Calculate totals
    const totalEarnedResult = await this.prisma.walletTransaction.aggregate({
      where: {
        userId: affiliate.userId,
        type: 'AFFILIATE_COMMISSION',
      },
      _sum: { amount: true },
    });

    const totalEarned = totalEarnedResult._sum.amount || 0;

    return {
      commissions: transactions.map((t) => ({
        id: t.id,
        amount: t.amount.toString(),
        description: t.description,
        referralCode: (t.metadata as any)?.referralCode,
        purchaseId: (t.metadata as any)?.purchaseId,
        createdAt: t.createdAt,
        isPaid: true, // All wallet transactions are already paid/credited
      })),
      summary: {
        totalEarned: totalEarned.toString(),
        totalPending: '0', // No pending in new system
        totalPaid: totalEarned.toString(),
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async validateReferralCode(code: string, req?: Request) {
    // Normalize code to uppercase
    const normalizedCode = code?.trim().toUpperCase();

    // Basic format validation (8 alphanumeric characters)
    if (!normalizedCode || !/^[A-Z0-9]{8}$/.test(normalizedCode)) {
      return {
        valid: false,
        referralCode: null,
      };
    }

    const affiliate = await this.prisma.affiliate.findFirst({
      where: {
        referralCode: normalizedCode,
        isActive: true,
      },
    });

    // Log validation attempt (only for valid codes to avoid filling logs with invalid attempts)
    if (affiliate) {
      await this.logAuditAction(affiliate.id, 'CODE_VALIDATED', req, undefined, {
        code: normalizedCode,
        valid: true,
      });
    }

    return {
      valid: !!affiliate,
      referralCode: affiliate ? normalizedCode : null,
    };
  }

  async getSales(userId: string, query: CommissionQueryDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const affiliate = await this.prisma.affiliate.findUnique({
      where: { userId },
    });

    if (!affiliate) {
      throw new NotFoundException('Affiliate account not found');
    }

    const [sales, total] = await Promise.all([
      this.prisma.tokenSale.findMany({
        where: { affiliateId: affiliate.id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          amountHbct: true,
          totalUsd: true,
          status: true,
          createdAt: true,
          commissions: {
            where: { affiliateId: affiliate.id },
            select: { amount: true, isPaid: true },
          },
        },
      }),
      this.prisma.tokenSale.count({ where: { affiliateId: affiliate.id } }),
    ]);

    return {
      sales: sales.map((sale) => ({
        id: sale.id,
        amountHbct: sale.amountHbct.toString(),
        totalUsd: sale.totalUsd.toString(),
        status: sale.status,
        createdAt: sale.createdAt,
        commission: sale.commissions[0]
          ? {
              amount: sale.commissions[0].amount.toString(),
              isPaid: sale.commissions[0].isPaid,
            }
          : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getLeaderboard(limit = 10) {
    const topAffiliates = await this.prisma.affiliate.findMany({
      where: { isActive: true },
      take: limit,
      orderBy: { totalEarnings: 'desc' },
      include: {
        user: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    const leaderboard = topAffiliates.map((affiliate, index) => ({
      rank: index + 1,
      referralCode: affiliate.referralCode,
      name: this.formatName(
        affiliate.user.firstName,
        affiliate.user.lastName,
      ),
      totalReferrals: affiliate.totalReferrals,
      totalEarnings: affiliate.totalEarnings.toString(),
    }));

    return { leaderboard };
  }

  private formatName(firstName?: string | null, lastName?: string | null): string {
    if (!firstName && !lastName) return 'Anonymous';
    const first = firstName || '';
    const last = lastName ? lastName[0] + '.' : '';
    return `${first} ${last}`.trim();
  }

  async withdraw(userId: string, amount: number, req?: Request) {
    const affiliate = await this.prisma.affiliate.findUnique({
      where: { userId },
    });

    if (!affiliate) {
      throw new NotFoundException('Affiliate account not found');
    }

    // Get user's token balance
    const balance = await this.prisma.tokenBalance.findUnique({
      where: { userId },
    });

    if (
      !balance ||
      parseFloat(balance.availableBalance.toString()) < amount
    ) {
      throw new BadRequestException('Insufficient balance');
    }

    // For now, just mark pending commissions as paid up to the amount
    // In a real system, this would integrate with a payment processor

    await this.prisma.$transaction(async (tx) => {
      // Get unpaid commissions
      const unpaidCommissions = await tx.commission.findMany({
        where: { affiliateId: affiliate.id, isPaid: false },
        orderBy: { createdAt: 'asc' },
      });

      let remainingAmount = amount;
      const commissionsToUpdate: string[] = [];

      for (const commission of unpaidCommissions) {
        if (remainingAmount <= 0) break;

        const commissionAmount = parseFloat(commission.amount.toString());
        if (commissionAmount <= remainingAmount) {
          commissionsToUpdate.push(commission.id);
          remainingAmount -= commissionAmount;
        }
      }

      // Mark commissions as paid
      await tx.commission.updateMany({
        where: { id: { in: commissionsToUpdate } },
        data: { isPaid: true, paidAt: new Date() },
      });

      // Deduct from available balance (tokens are already there from referral bonus)
      await tx.tokenBalance.update({
        where: { userId },
        data: {
          availableBalance: { decrement: new Prisma.Decimal(amount) },
          totalBalance: { decrement: new Prisma.Decimal(amount) },
        },
      });
    });

    // Log the withdrawal
    await this.logAuditAction(affiliate.id, 'WITHDRAWAL_REQUEST', req, amount, {
      userId,
      requestedAmount: amount,
    });

    this.logger.log(`Affiliate withdrawal: ${affiliate.id} amount: ${amount}`);

    return {
      message: 'Withdrawal processed successfully',
      amount: amount.toString(),
    };
  }

  /**
   * Claim all pending commissions - transfers pending earnings to user's wallet balance
   */
  async claimCommissions(userId: string, req?: Request) {
    const affiliate = await this.prisma.affiliate.findUnique({
      where: { userId },
      include: {
        commissions: {
          where: { isPaid: false },
        },
      },
    });

    if (!affiliate) {
      throw new NotFoundException('Affiliate account not found');
    }

    // Calculate total pending earnings
    const pendingCommissions = affiliate.commissions;
    const totalPending = pendingCommissions.reduce(
      (sum, c) => sum + parseFloat(c.amount.toString()),
      0,
    );

    if (totalPending <= 0) {
      throw new BadRequestException('No pending commissions to claim');
    }

    // Transfer pending to wallet and mark as paid
    await this.prisma.$transaction(async (tx) => {
      // Mark all pending commissions as paid
      await tx.commission.updateMany({
        where: {
          affiliateId: affiliate.id,
          isPaid: false,
        },
        data: {
          isPaid: true,
          paidAt: new Date(),
        },
      });

      // Add to user's token balance
      await tx.tokenBalance.upsert({
        where: { userId },
        create: {
          userId,
          availableBalance: new Prisma.Decimal(totalPending),
          lockedBalance: new Prisma.Decimal(0),
          totalBalance: new Prisma.Decimal(totalPending),
        },
        update: {
          availableBalance: { increment: new Prisma.Decimal(totalPending) },
          totalBalance: { increment: new Prisma.Decimal(totalPending) },
        },
      });

      // Record transaction
      await tx.transaction.create({
        data: {
          userId,
          type: 'AFFILIATE_BONUS',
          amount: new Prisma.Decimal(totalPending),
          status: 'COMPLETED',
          completedAt: new Date(),
          metadata: {
            description: `Claimed ${pendingCommissions.length} affiliate commission(s)`,
            commissionsCount: pendingCommissions.length,
          },
        },
      });
    });

    // Log the claim
    await this.logAuditAction(affiliate.id, 'COMMISSION_CLAIMED', req, totalPending, {
      userId,
      commissionsCount: pendingCommissions.length,
      commissionIds: pendingCommissions.map(c => c.id),
    });

    this.logger.log(`Affiliate commission claimed: ${affiliate.id} amount: ${totalPending} (${pendingCommissions.length} commissions)`);

    return {
      claimedAmount: totalPending.toString(),
      message: `Successfully claimed ${totalPending} HBCT from ${pendingCommissions.length} commission(s)`,
    };
  }
}
