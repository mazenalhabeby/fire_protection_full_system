import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CommissionQueryDto } from './dto';

@Injectable()
export class AffiliatesService {
  constructor(private prisma: PrismaService) {}

  private generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async register(userId: string) {
    // Check if user already has an affiliate account
    const existingAffiliate = await this.prisma.affiliate.findUnique({
      where: { userId },
    });

    if (existingAffiliate) {
      throw new ConflictException('User already has an affiliate account');
    }

    // Generate unique referral code
    let referralCode = this.generateReferralCode();
    let existing = await this.prisma.affiliate.findUnique({
      where: { referralCode },
    });

    while (existing) {
      referralCode = this.generateReferralCode();
      existing = await this.prisma.affiliate.findUnique({
        where: { referralCode },
      });
    }

    const affiliate = await this.prisma.affiliate.create({
      data: {
        userId,
        referralCode,
        commissionRate: new Prisma.Decimal(0.05), // 5% default
      },
    });

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
        commissions: true,
        referredUsers: true,
      },
    });

    if (!affiliate) {
      throw new NotFoundException('Affiliate account not found');
    }

    // Calculate stats
    const paidCommissions = affiliate.commissions.filter((c) => c.isPaid);
    const pendingCommissions = affiliate.commissions.filter((c) => !c.isPaid);

    const paidEarnings = paidCommissions.reduce(
      (sum, c) => sum + parseFloat(c.amount.toString()),
      0,
    );
    const pendingEarnings = pendingCommissions.reduce(
      (sum, c) => sum + parseFloat(c.amount.toString()),
      0,
    );

    // This month stats
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const thisMonthReferrals = affiliate.referredUsers.filter(
      (u) => u.createdAt >= startOfMonth,
    ).length;

    const thisMonthCommissions = affiliate.commissions.filter(
      (c) => c.createdAt >= startOfMonth,
    );
    const thisMonthEarnings = thisMonthCommissions.reduce(
      (sum, c) => sum + parseFloat(c.amount.toString()),
      0,
    );

    return {
      totalReferrals: affiliate.totalReferrals,
      totalEarnings: affiliate.totalEarnings.toString(),
      pendingEarnings: pendingEarnings.toString(),
      paidEarnings: paidEarnings.toString(),
      thisMonthReferrals,
      thisMonthEarnings: thisMonthEarnings.toString(),
    };
  }

  async getReferrals(userId: string, query: CommissionQueryDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const affiliate = await this.prisma.affiliate.findUnique({
      where: { userId },
    });

    if (!affiliate) {
      throw new NotFoundException('Affiliate account not found');
    }

    const [referrals, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { referredById: affiliate.id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where: { referredById: affiliate.id } }),
    ]);

    // Mask emails for privacy
    const maskedReferrals = referrals.map((r) => ({
      ...r,
      email: r.email ? this.maskEmail(r.email) : null,
    }));

    return {
      referrals: maskedReferrals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
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

    const [commissions, total] = await Promise.all([
      this.prisma.commission.findMany({
        where: { affiliateId: affiliate.id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.commission.count({ where: { affiliateId: affiliate.id } }),
    ]);

    return {
      commissions: commissions.map((c) => ({
        id: c.id,
        amount: c.amount.toString(),
        isPaid: c.isPaid,
        createdAt: c.createdAt,
        paidAt: c.paidAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async validateReferralCode(code: string) {
    const affiliate = await this.prisma.affiliate.findUnique({
      where: { referralCode: code, isActive: true },
    });

    return {
      valid: !!affiliate,
      referralCode: affiliate ? code : null,
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

  async withdraw(userId: string, amount: number) {
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

    return {
      message: 'Withdrawal processed successfully',
      amount: amount.toString(),
    };
  }

  /**
   * Claim all pending commissions - transfers pending earnings to user's wallet balance
   */
  async claimCommissions(userId: string) {
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

    return {
      claimedAmount: totalPending.toString(),
      message: `Successfully claimed ${totalPending} HBCT from ${pendingCommissions.length} commission(s)`,
    };
  }
}
