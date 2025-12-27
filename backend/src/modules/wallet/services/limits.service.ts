import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { TransferLimitsInfo } from '../interfaces';

// Default limits (in USD equivalent for simplicity)
const DEFAULT_SINGLE_TRANSFER_MAX = new Decimal(10000);
const DEFAULT_DAILY_LIMIT = new Decimal(50000);
const DEFAULT_WEEKLY_LIMIT = new Decimal(250000);

@Injectable()
export class LimitsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get or create transfer limits for a user
   */
  async getUserLimits(userId: string): Promise<TransferLimitsInfo> {
    let limits = await this.prisma.transferLimit.findUnique({
      where: { userId },
    });

    if (!limits) {
      limits = await this.prisma.transferLimit.create({
        data: {
          userId,
          singleTransferMax: DEFAULT_SINGLE_TRANSFER_MAX,
          dailyLimit: DEFAULT_DAILY_LIMIT,
          dailyUsed: new Decimal(0),
          dailyResetAt: this.getNextDailyReset(),
          weeklyLimit: DEFAULT_WEEKLY_LIMIT,
          weeklyUsed: new Decimal(0),
          weeklyResetAt: this.getNextWeeklyReset(),
        },
      });
    }

    // Check if limits need to be reset
    const now = new Date();
    let needsUpdate = false;
    const updateData: {
      dailyUsed?: Decimal;
      dailyResetAt?: Date;
      weeklyUsed?: Decimal;
      weeklyResetAt?: Date;
    } = {};

    if (now >= limits.dailyResetAt) {
      updateData.dailyUsed = new Decimal(0);
      updateData.dailyResetAt = this.getNextDailyReset();
      needsUpdate = true;
    }

    if (now >= limits.weeklyResetAt) {
      updateData.weeklyUsed = new Decimal(0);
      updateData.weeklyResetAt = this.getNextWeeklyReset();
      needsUpdate = true;
    }

    if (needsUpdate) {
      limits = await this.prisma.transferLimit.update({
        where: { userId },
        data: updateData,
      });
    }

    const dailyRemaining = limits.dailyLimit.sub(limits.dailyUsed);
    const weeklyRemaining = limits.weeklyLimit.sub(limits.weeklyUsed);

    return {
      singleTransferMax: limits.singleTransferMax.toString(),
      dailyLimit: limits.dailyLimit.toString(),
      dailyUsed: limits.dailyUsed.toString(),
      dailyRemaining: dailyRemaining.greaterThan(0) ? dailyRemaining.toString() : '0',
      dailyResetAt: limits.dailyResetAt,
      weeklyLimit: limits.weeklyLimit.toString(),
      weeklyUsed: limits.weeklyUsed.toString(),
      weeklyRemaining: weeklyRemaining.greaterThan(0) ? weeklyRemaining.toString() : '0',
      weeklyResetAt: limits.weeklyResetAt,
    };
  }

  /**
   * Check if a transfer amount is within limits
   */
  async checkTransferLimits(userId: string, amount: Decimal): Promise<void> {
    const limits = await this.getUserLimits(userId);

    // Check single transfer limit
    if (amount.greaterThan(new Decimal(limits.singleTransferMax))) {
      throw new BadRequestException(
        `Transfer amount exceeds single transfer limit of ${limits.singleTransferMax}`,
      );
    }

    // Check daily limit
    const dailyRemaining = new Decimal(limits.dailyRemaining);
    if (amount.greaterThan(dailyRemaining)) {
      throw new BadRequestException(
        `Transfer amount exceeds daily remaining limit of ${limits.dailyRemaining}. Resets at ${limits.dailyResetAt.toISOString()}`,
      );
    }

    // Check weekly limit
    const weeklyRemaining = new Decimal(limits.weeklyRemaining);
    if (amount.greaterThan(weeklyRemaining)) {
      throw new BadRequestException(
        `Transfer amount exceeds weekly remaining limit of ${limits.weeklyRemaining}. Resets at ${limits.weeklyResetAt.toISOString()}`,
      );
    }
  }

  /**
   * Record a transfer against limits
   */
  async recordTransferUsage(userId: string, amount: Decimal): Promise<void> {
    // First ensure limits are reset if needed
    await this.getUserLimits(userId);

    await this.prisma.transferLimit.update({
      where: { userId },
      data: {
        dailyUsed: { increment: amount },
        weeklyUsed: { increment: amount },
      },
    });
  }

  /**
   * Reverse a transfer from limits (e.g., if transfer is cancelled)
   */
  async reverseTransferUsage(userId: string, amount: Decimal): Promise<void> {
    const limits = await this.prisma.transferLimit.findUnique({
      where: { userId },
    });

    if (!limits) return;

    const newDailyUsed = limits.dailyUsed.sub(amount);
    const newWeeklyUsed = limits.weeklyUsed.sub(amount);

    await this.prisma.transferLimit.update({
      where: { userId },
      data: {
        dailyUsed: newDailyUsed.greaterThan(0) ? newDailyUsed : new Decimal(0),
        weeklyUsed: newWeeklyUsed.greaterThan(0) ? newWeeklyUsed : new Decimal(0),
      },
    });
  }

  /**
   * Update user limits (admin function)
   */
  async updateUserLimits(
    userId: string,
    updates: {
      singleTransferMax?: Decimal;
      dailyLimit?: Decimal;
      weeklyLimit?: Decimal;
    },
  ): Promise<TransferLimitsInfo> {
    await this.prisma.transferLimit.upsert({
      where: { userId },
      create: {
        userId,
        singleTransferMax: updates.singleTransferMax || DEFAULT_SINGLE_TRANSFER_MAX,
        dailyLimit: updates.dailyLimit || DEFAULT_DAILY_LIMIT,
        weeklyLimit: updates.weeklyLimit || DEFAULT_WEEKLY_LIMIT,
        dailyUsed: new Decimal(0),
        weeklyUsed: new Decimal(0),
        dailyResetAt: this.getNextDailyReset(),
        weeklyResetAt: this.getNextWeeklyReset(),
      },
      update: updates,
    });

    return this.getUserLimits(userId);
  }

  private getNextDailyReset(): Date {
    const now = new Date();
    const reset = new Date(now);
    reset.setUTCHours(0, 0, 0, 0);
    reset.setUTCDate(reset.getUTCDate() + 1);
    return reset;
  }

  private getNextWeeklyReset(): Date {
    const now = new Date();
    const reset = new Date(now);
    reset.setUTCHours(0, 0, 0, 0);
    // Get to next Monday
    const daysUntilMonday = (8 - reset.getUTCDay()) % 7 || 7;
    reset.setUTCDate(reset.getUTCDate() + daysUntilMonday);
    return reset;
  }
}
