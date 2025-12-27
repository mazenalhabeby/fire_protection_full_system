import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { PurchaseLimitsInfo } from '../interfaces/purchase.interfaces';

@Injectable()
export class PurchaseLimitsService {
  private readonly logger = new Logger(PurchaseLimitsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get or create purchase limits for a user
   */
  async getUserLimits(userId: string): Promise<PurchaseLimitsInfo> {
    let limits = await this.prisma.purchaseLimits.findUnique({
      where: { userId },
    });

    // Create default limits if not exists
    if (!limits) {
      limits = await this.prisma.purchaseLimits.create({
        data: { userId },
      });
    }

    // Reset daily limits if needed
    const now = new Date();
    if (now >= limits.dailyResetAt) {
      const nextDayReset = new Date(now);
      nextDayReset.setUTCHours(0, 0, 0, 0);
      nextDayReset.setUTCDate(nextDayReset.getUTCDate() + 1);

      limits = await this.prisma.purchaseLimits.update({
        where: { userId },
        data: {
          dailyUsedUsd: 0,
          dailyResetAt: nextDayReset,
        },
      });
    }

    // Reset monthly limits if needed
    if (now >= limits.monthlyResetAt) {
      const nextMonthReset = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);

      limits = await this.prisma.purchaseLimits.update({
        where: { userId },
        data: {
          monthlyUsedUsd: 0,
          monthlyResetAt: nextMonthReset,
        },
      });
    }

    const dailyRemaining = limits.dailyLimitUsd.sub(limits.dailyUsedUsd);
    const monthlyRemaining = limits.monthlyLimitUsd.sub(limits.monthlyUsedUsd);

    return {
      minPurchaseUsd: limits.minPurchaseUsd.toString(),
      maxPurchaseUsd: limits.maxPurchaseUsd.toString(),
      dailyLimitUsd: limits.dailyLimitUsd.toString(),
      dailyUsedUsd: limits.dailyUsedUsd.toString(),
      dailyRemainingUsd: dailyRemaining.gt(0) ? dailyRemaining.toString() : '0',
      dailyResetAt: limits.dailyResetAt,
      monthlyLimitUsd: limits.monthlyLimitUsd.toString(),
      monthlyUsedUsd: limits.monthlyUsedUsd.toString(),
      monthlyRemainingUsd: monthlyRemaining.gt(0) ? monthlyRemaining.toString() : '0',
      monthlyResetAt: limits.monthlyResetAt,
    };
  }

  /**
   * Validate a purchase against user limits
   */
  async validatePurchase(userId: string, amountUsd: Decimal): Promise<void> {
    const limitsInfo = await this.getUserLimits(userId);

    const minPurchase = new Decimal(limitsInfo.minPurchaseUsd);
    const maxPurchase = new Decimal(limitsInfo.maxPurchaseUsd);
    const dailyRemaining = new Decimal(limitsInfo.dailyRemainingUsd);
    const monthlyRemaining = new Decimal(limitsInfo.monthlyRemainingUsd);

    // Check minimum purchase
    if (amountUsd.lt(minPurchase)) {
      throw new BadRequestException(
        `Minimum purchase amount is $${minPurchase.toString()}`,
      );
    }

    // Check maximum purchase per transaction
    if (amountUsd.gt(maxPurchase)) {
      throw new BadRequestException(
        `Maximum purchase per transaction is $${maxPurchase.toString()}`,
      );
    }

    // Check daily limit
    if (amountUsd.gt(dailyRemaining)) {
      throw new BadRequestException(
        `Daily purchase limit exceeded. Remaining: $${dailyRemaining.toString()}`,
      );
    }

    // Check monthly limit
    if (amountUsd.gt(monthlyRemaining)) {
      throw new BadRequestException(
        `Monthly purchase limit exceeded. Remaining: $${monthlyRemaining.toString()}`,
      );
    }
  }

  /**
   * Record purchase usage against limits
   */
  async recordPurchaseUsage(userId: string, amountUsd: Decimal): Promise<void> {
    // First ensure limits exist and are reset if needed
    await this.getUserLimits(userId);

    await this.prisma.purchaseLimits.update({
      where: { userId },
      data: {
        dailyUsedUsd: { increment: amountUsd },
        monthlyUsedUsd: { increment: amountUsd },
      },
    });

    this.logger.log(
      `Recorded purchase usage for user ${userId}: $${amountUsd.toString()}`,
    );
  }

  /**
   * Reverse purchase usage (for failed/cancelled purchases)
   */
  async reversePurchaseUsage(userId: string, amountUsd: Decimal): Promise<void> {
    const limits = await this.prisma.purchaseLimits.findUnique({
      where: { userId },
    });

    if (!limits) {
      return;
    }

    // Ensure we don't go negative
    const newDailyUsed = limits.dailyUsedUsd.sub(amountUsd);
    const newMonthlyUsed = limits.monthlyUsedUsd.sub(amountUsd);

    await this.prisma.purchaseLimits.update({
      where: { userId },
      data: {
        dailyUsedUsd: newDailyUsed.lt(0) ? 0 : newDailyUsed,
        monthlyUsedUsd: newMonthlyUsed.lt(0) ? 0 : newMonthlyUsed,
      },
    });

    this.logger.log(
      `Reversed purchase usage for user ${userId}: $${amountUsd.toString()}`,
    );
  }
}
