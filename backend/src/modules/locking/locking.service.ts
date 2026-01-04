import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma, LockStatus, TransactionType, TransactionStatus, Currency } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateLockDto, LockQueryDto, EarlyUnlockResponseDto, CancelLockResponseDto, LockHistoryResponseDto } from './dto';

// HBCT currency for wallet balance operations
const HBCT_CURRENCY: Currency = 'HBCT';

@Injectable()
export class LockingService {
  private readonly logger = new Logger(LockingService.name);
  private readonly tokenPrice: number;
  private readonly lockRewardsPoolName = 'Lock Rewards';

  // Early unlock penalty tiers based on percentage of lock period completed
  // Uses ACCRUED rewards method: penalty applies only to earned portion
  // Early unlock only available after 50% completion
  private readonly EARLY_UNLOCK_PENALTIES = [
    { minPercent: 50, maxPercent: 70, penaltyPercent: 25 },  // 50-70% complete: lose 25% of accrued rewards
    { minPercent: 70, maxPercent: 90, penaltyPercent: 15 },  // 70-90% complete: lose 15% of accrued rewards
    { minPercent: 90, maxPercent: 100, penaltyPercent: 5 },  // 90-99% complete: lose 5% of accrued rewards
  ];

  // Minimum completion percentage required for early unlock
  private readonly MIN_EARLY_UNLOCK_PERCENT = 50;

  // Grace period in hours for cancellation without penalty
  private readonly CANCEL_GRACE_PERIOD_HOURS = 24;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
  ) {
    this.tokenPrice = parseFloat(
      configService.get<string>('TOKEN_CURRENT_PRICE') ||
        configService.get<string>('TOKEN_PRESALE_PRICE') ||
        '0.03',
    );
  }

  async getLockTiers() {
    const tiers = await this.prisma.lockTier.findMany({
      where: { isActive: true },
      orderBy: { lockMonths: 'asc' },
    });

    return tiers.map((tier) => ({
      id: tier.id,
      name: tier.name,
      lockMonths: tier.lockMonths,
      bonusPercent: tier.bonusPercent.toString(),
      minAmount: tier.minAmount.toString(),
      isActive: tier.isActive,
    }));
  }

  async createLock(userId: string, createLockDto: CreateLockDto) {
    const { amount, lockTierId } = createLockDto;

    // Get lock tier
    const tier = await this.prisma.lockTier.findUnique({
      where: { id: lockTierId, isActive: true },
    });

    if (!tier) {
      throw new BadRequestException('Invalid or inactive lock tier');
    }

    // Check minimum amount
    const minAmount = parseFloat(tier.minAmount.toString());
    if (amount < minAmount) {
      throw new BadRequestException(
        `Minimum lock amount for ${tier.name} tier is ${minAmount} tokens`,
      );
    }

    // Check user's available balance from WalletBalance (HBCT)
    const walletBalance = await this.prisma.walletBalance.findUnique({
      where: { userId_currency: { userId, currency: HBCT_CURRENCY } },
    });

    if (!walletBalance || parseFloat(walletBalance.availableBalance.toString()) < amount) {
      throw new BadRequestException('Insufficient available balance');
    }

    // Calculate reward amount based on tier bonus
    const bonusPercent = parseFloat(tier.bonusPercent.toString());
    const rewardAmount = (amount * bonusPercent) / 100;

    // Check reward pool has sufficient allocation
    const rewardPool = await this.prisma.rewardPool.findUnique({
      where: { name: this.lockRewardsPoolName },
    });

    if (!rewardPool) {
      throw new BadRequestException('Lock rewards pool not configured');
    }

    const availableInPool =
      parseFloat(rewardPool.allocation.toString()) -
      parseFloat(rewardPool.reserved.toString()) -
      parseFloat(rewardPool.distributed.toString());

    if (availableInPool < rewardAmount) {
      throw new BadRequestException('Insufficient rewards in pool');
    }

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + tier.lockMonths);

    // Execute transaction
    const lock = await this.prisma.$transaction(async (tx) => {
      // Reserve reward amount from pool
      await tx.rewardPool.update({
        where: { name: this.lockRewardsPoolName },
        data: {
          reserved: { increment: new Prisma.Decimal(rewardAmount) },
        },
      });

      // Create lock record
      const newLock = await tx.tokenLock.create({
        data: {
          userId,
          lockTierId,
          amount: new Prisma.Decimal(amount),
          status: LockStatus.ACTIVE,
          startDate,
          endDate,
          rewardAmount: new Prisma.Decimal(rewardAmount),
        },
        include: { lockTier: true },
      });

      // Move tokens from available to locked balance in WalletBalance
      await tx.walletBalance.update({
        where: { userId_currency: { userId, currency: HBCT_CURRENCY } },
        data: {
          availableBalance: { decrement: new Prisma.Decimal(amount) },
          lockedBalance: { increment: new Prisma.Decimal(amount) },
          lastActivityAt: new Date(),
        },
      });

      // Create lock transaction
      await tx.transaction.create({
        data: {
          userId,
          type: TransactionType.LOCK,
          amount: new Prisma.Decimal(amount),
          priceUsd: new Prisma.Decimal(this.tokenPrice),
          totalUsd: new Prisma.Decimal(amount * this.tokenPrice),
          status: TransactionStatus.COMPLETED,
          completedAt: new Date(),
          relatedLockId: newLock.id,
          metadata: {
            tierId: lockTierId,
            tierName: tier.name,
            lockMonths: tier.lockMonths,
            bonusPercent: bonusPercent,
            rewardAmount: rewardAmount,
          },
        },
      });

      return newLock;
    });

    // Send notification for lock created
    try {
      await this.notificationsService.notifyLockCreated(
        userId,
        lock.amount.toString(),
        tier.name,
        lock.endDate,
      );
    } catch (notifyError) {
      this.logger.warn(`Failed to send lock notification: ${notifyError.message}`);
    }

    return {
      lockId: lock.id,
      amount: lock.amount.toString(),
      tierName: tier.name,
      lockMonths: tier.lockMonths,
      bonusPercent: tier.bonusPercent.toString(),
      rewardAmount: lock.rewardAmount.toString(),
      startDate: lock.startDate,
      endDate: lock.endDate,
      status: lock.status,
    };
  }

  async getUserLocks(userId: string, query: LockQueryDto) {
    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TokenLockWhereInput = { userId };
    if (status) {
      where.status = status as LockStatus;
    }

    const [locks, total] = await Promise.all([
      this.prisma.tokenLock.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startDate: 'desc' },
        include: { lockTier: true },
      }),
      this.prisma.tokenLock.count({ where }),
    ]);

    return {
      locks: locks.map((lock) => ({
        id: lock.id,
        amount: lock.amount.toString(),
        status: lock.status,
        startDate: lock.startDate,
        endDate: lock.endDate,
        rewardAmount: lock.rewardAmount.toString(),
        claimedReward: lock.claimedReward.toString(),
        tier: {
          id: lock.lockTier.id,
          name: lock.lockTier.name,
          lockMonths: lock.lockTier.lockMonths,
          bonusPercent: lock.lockTier.bonusPercent.toString(),
          minAmount: lock.lockTier.minAmount.toString(),
          isActive: lock.lockTier.isActive,
        },
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getLockById(userId: string, lockId: string) {
    const lock = await this.prisma.tokenLock.findFirst({
      where: { id: lockId, userId },
      include: {
        lockTier: true,
        transactions: true,
        rewards: true,
      },
    });

    if (!lock) {
      throw new NotFoundException('Lock not found');
    }

    return {
      id: lock.id,
      amount: lock.amount.toString(),
      status: lock.status,
      startDate: lock.startDate,
      endDate: lock.endDate,
      rewardAmount: lock.rewardAmount.toString(),
      claimedReward: lock.claimedReward.toString(),
      tier: {
        id: lock.lockTier.id,
        name: lock.lockTier.name,
        lockMonths: lock.lockTier.lockMonths,
        bonusPercent: lock.lockTier.bonusPercent.toString(),
      },
      transactions: lock.transactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount.toString(),
        status: tx.status,
        createdAt: tx.createdAt,
      })),
    };
  }

  async unlock(userId: string, lockId: string) {
    const lock = await this.prisma.tokenLock.findFirst({
      where: { id: lockId, userId },
      include: { lockTier: true },
    });

    if (!lock) {
      throw new NotFoundException('Lock not found');
    }

    if (lock.status !== LockStatus.ACTIVE) {
      throw new BadRequestException('Lock is not active');
    }

    const now = new Date();
    if (now < lock.endDate) {
      throw new BadRequestException(
        `Lock period not complete. Unlock available after ${lock.endDate.toISOString()}`,
      );
    }

    const lockAmount = parseFloat(lock.amount.toString());
    const rewardAmount =
      parseFloat(lock.rewardAmount.toString()) -
      parseFloat(lock.claimedReward.toString());
    const totalReceived = lockAmount + rewardAmount;

    await this.prisma.$transaction(async (tx) => {
      // Update lock status
      await tx.tokenLock.update({
        where: { id: lockId },
        data: {
          status: LockStatus.COMPLETED,
          claimedReward: lock.rewardAmount,
        },
      });

      // Move from reserved to distributed in reward pool
      await tx.rewardPool.update({
        where: { name: this.lockRewardsPoolName },
        data: {
          reserved: { decrement: new Prisma.Decimal(rewardAmount) },
          distributed: { increment: new Prisma.Decimal(rewardAmount) },
        },
      });

      // Update wallet balance - move locked back to available + add reward
      await tx.walletBalance.update({
        where: { userId_currency: { userId, currency: HBCT_CURRENCY } },
        data: {
          availableBalance: { increment: new Prisma.Decimal(totalReceived) },
          lockedBalance: { decrement: new Prisma.Decimal(lockAmount) },
          lastActivityAt: new Date(),
        },
      });

      // Create unlock transaction
      await tx.transaction.create({
        data: {
          userId,
          type: TransactionType.UNLOCK,
          amount: new Prisma.Decimal(lockAmount),
          priceUsd: new Prisma.Decimal(this.tokenPrice),
          totalUsd: new Prisma.Decimal(lockAmount * this.tokenPrice),
          status: TransactionStatus.COMPLETED,
          completedAt: new Date(),
          relatedLockId: lockId,
          metadata: {
            rewardAmount: rewardAmount,
            totalReceived: totalReceived,
          },
        },
      });

      // Create reward distribution transaction
      if (rewardAmount > 0) {
        await tx.transaction.create({
          data: {
            userId,
            type: TransactionType.REWARD_DISTRIBUTION,
            amount: new Prisma.Decimal(rewardAmount),
            priceUsd: new Prisma.Decimal(this.tokenPrice),
            totalUsd: new Prisma.Decimal(rewardAmount * this.tokenPrice),
            status: TransactionStatus.COMPLETED,
            completedAt: new Date(),
            relatedLockId: lockId,
            metadata: { source: 'lock_bonus', tierId: lock.lockTierId },
          },
        });

        // Create reward record
        await tx.reward.create({
          data: {
            userId,
            lockId,
            poolName: this.lockRewardsPoolName,
            amount: new Prisma.Decimal(rewardAmount),
            isClaimed: true,
            claimedAt: new Date(),
          },
        });
      }
    });

    // Send notification for unlock completed
    try {
      await this.notificationsService.notifyUnlockCompleted(
        userId,
        lockAmount.toString(),
        rewardAmount.toString(),
      );
    } catch (notifyError) {
      this.logger.warn(`Failed to send unlock notification: ${notifyError.message}`);
    }

    return {
      message: 'Tokens unlocked successfully with bonus rewards',
      unlockedAmount: lockAmount.toString(),
      rewardAmount: rewardAmount.toString(),
      totalReceived: totalReceived.toString(),
    };
  }

  async getRewardsSummary(userId: string) {
    const activeLocks = await this.prisma.tokenLock.findMany({
      where: { userId, status: LockStatus.ACTIVE },
      include: { lockTier: true },
    });

    let totalLocked = 0;
    let totalPendingRewards = 0;
    let totalClaimedRewards = 0;

    const lockDetails = activeLocks.map((lock) => {
      const amount = parseFloat(lock.amount.toString());
      const reward = parseFloat(lock.rewardAmount.toString());
      const claimed = parseFloat(lock.claimedReward.toString());
      const pending = reward - claimed;

      totalLocked += amount;
      totalPendingRewards += pending;
      totalClaimedRewards += claimed;

      return {
        id: lock.id,
        amount: lock.amount.toString(),
        status: lock.status,
        startDate: lock.startDate,
        endDate: lock.endDate,
        rewardAmount: lock.rewardAmount.toString(),
        claimedReward: lock.claimedReward.toString(),
        pendingReward: pending.toString(),
        tier: {
          id: lock.lockTier.id,
          name: lock.lockTier.name,
          lockMonths: lock.lockTier.lockMonths,
          bonusPercent: lock.lockTier.bonusPercent.toString(),
          minAmount: lock.lockTier.minAmount.toString(),
          isActive: lock.lockTier.isActive,
        },
      };
    });

    return {
      totalLocked: totalLocked.toString(),
      totalPendingRewards: totalPendingRewards.toString(),
      totalClaimedRewards: totalClaimedRewards.toString(),
      activeLocks: activeLocks.length,
      locks: lockDetails,
    };
  }

  /**
   * Calculate the penalty percentage for early unlock based on completion percentage
   * Returns null if early unlock is not allowed (< 50% completion)
   */
  private calculateEarlyUnlockPenalty(completedPercent: number): number | null {
    // Early unlock not allowed before minimum completion
    if (completedPercent < this.MIN_EARLY_UNLOCK_PERCENT) {
      return null;
    }

    for (const tier of this.EARLY_UNLOCK_PENALTIES) {
      if (completedPercent >= tier.minPercent && completedPercent < tier.maxPercent) {
        return tier.penaltyPercent;
      }
    }
    return 0; // No penalty if 100% complete
  }

  /**
   * Check if early unlock is allowed based on completion percentage
   */
  private canEarlyUnlock(completedPercent: number): boolean {
    return completedPercent >= this.MIN_EARLY_UNLOCK_PERCENT && completedPercent < 100;
  }

  /**
   * Calculate accrued reward based on completion percentage
   * User earns rewards proportionally to time served
   */
  private calculateAccruedReward(totalReward: number, completedPercent: number): number {
    return (totalReward * completedPercent) / 100;
  }

  /**
   * Calculate the percentage of lock period completed
   */
  private calculateCompletedPercent(startDate: Date, endDate: Date): number {
    const now = new Date();
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsed = now.getTime() - startDate.getTime();
    return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  }

  /**
   * Get detailed lock information including early unlock estimates
   */
  async getLockDetails(userId: string, lockId: string) {
    const lock = await this.prisma.tokenLock.findFirst({
      where: { id: lockId, userId },
      include: {
        lockTier: true,
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!lock) {
      throw new NotFoundException('Lock not found');
    }

    const now = new Date();
    const completedPercent = this.calculateCompletedPercent(lock.startDate, lock.endDate);
    const daysRemaining = Math.max(0, Math.ceil((lock.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const canUnlock = lock.status === LockStatus.ACTIVE && now >= lock.endDate;

    // Grace period check for cancellation
    const hoursSinceStart = (now.getTime() - lock.startDate.getTime()) / (1000 * 60 * 60);
    const canCancel = lock.status === LockStatus.ACTIVE && hoursSinceStart <= this.CANCEL_GRACE_PERIOD_HOURS;

    // Check if early unlock is allowed (must be >= 50% complete)
    const isEarlyUnlockAllowed = lock.status === LockStatus.ACTIVE && this.canEarlyUnlock(completedPercent);

    // Calculate early unlock penalty and estimated reward using ACCRUED method
    const totalRewardAmount = parseFloat(lock.rewardAmount.toString());
    const earlyUnlockPenaltyPercent = canUnlock ? 0 : (this.calculateEarlyUnlockPenalty(completedPercent) ?? 0);

    // Accrued reward = total reward × completion %
    const accruedReward = this.calculateAccruedReward(totalRewardAmount, completedPercent);
    // Penalty applies only to accrued portion
    const penaltyAmount = (accruedReward * earlyUnlockPenaltyPercent) / 100;
    const estimatedEarlyUnlockReward = accruedReward - penaltyAmount;

    return {
      id: lock.id,
      amount: lock.amount.toString(),
      status: lock.status,
      startDate: lock.startDate,
      endDate: lock.endDate,
      rewardAmount: lock.rewardAmount.toString(),
      claimedReward: lock.claimedReward.toString(),
      tier: {
        id: lock.lockTier.id,
        name: lock.lockTier.name,
        lockMonths: lock.lockTier.lockMonths,
        bonusPercent: lock.lockTier.bonusPercent.toString(),
        minAmount: lock.lockTier.minAmount.toString(),
        isActive: lock.lockTier.isActive,
      },
      transactions: lock.transactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount.toString(),
        status: tx.status,
        createdAt: tx.createdAt,
        metadata: tx.metadata,
      })),
      // Enhanced details
      daysRemaining,
      completedPercent: Math.round(completedPercent * 100) / 100,
      canUnlock,
      canCancel,
      canEarlyUnlock: isEarlyUnlockAllowed,
      minEarlyUnlockPercent: this.MIN_EARLY_UNLOCK_PERCENT,
      earlyUnlockPenaltyPercent,
      accruedReward: accruedReward.toFixed(2),
      penaltyAmount: penaltyAmount.toFixed(2),
      estimatedEarlyUnlockReward: estimatedEarlyUnlockReward.toFixed(2),
    };
  }

  /**
   * Early unlock tokens with penalty
   * Uses ACCRUED rewards method: users earn proportionally to time served
   * Penalty applies only to the accrued (earned) portion of rewards
   * Early unlock only available after 50% of lock period is completed
   */
  async earlyUnlock(userId: string, lockId: string): Promise<EarlyUnlockResponseDto> {
    const lock = await this.prisma.tokenLock.findFirst({
      where: { id: lockId, userId },
      include: { lockTier: true },
    });

    if (!lock) {
      throw new NotFoundException('Lock not found');
    }

    if (lock.status !== LockStatus.ACTIVE) {
      throw new BadRequestException('Lock is not active');
    }

    const now = new Date();

    // If lock period is complete, redirect to normal unlock
    if (now >= lock.endDate) {
      throw new BadRequestException(
        'Lock period is complete. Use the regular unlock endpoint instead.',
      );
    }

    const completedPercent = this.calculateCompletedPercent(lock.startDate, lock.endDate);

    // Check if early unlock is allowed (must be >= 50% complete)
    if (!this.canEarlyUnlock(completedPercent)) {
      const remainingPercent = this.MIN_EARLY_UNLOCK_PERCENT - completedPercent;
      throw new BadRequestException(
        `Early unlock is not available yet. You must complete at least ${this.MIN_EARLY_UNLOCK_PERCENT}% of the lock period. Current progress: ${completedPercent.toFixed(1)}%. Please wait until you reach ${this.MIN_EARLY_UNLOCK_PERCENT}% (${remainingPercent.toFixed(1)}% remaining).`,
      );
    }

    const penaltyPercent = this.calculateEarlyUnlockPenalty(completedPercent) ?? 0;

    const lockAmount = parseFloat(lock.amount.toString());
    const totalReward = parseFloat(lock.rewardAmount.toString()) - parseFloat(lock.claimedReward.toString());

    // Calculate accrued reward (proportional to time served)
    const accruedReward = this.calculateAccruedReward(totalReward, completedPercent);
    // Penalty applies only to accrued portion
    const penaltyAmount = (accruedReward * penaltyPercent) / 100;
    const actualReward = accruedReward - penaltyAmount;
    const totalReceived = lockAmount + actualReward;

    // Track forfeited reward (unearned portion + penalty)
    const forfeitedReward = totalReward - actualReward;

    await this.prisma.$transaction(async (tx) => {
      // Update lock status
      await tx.tokenLock.update({
        where: { id: lockId },
        data: {
          status: LockStatus.COMPLETED,
          claimedReward: new Prisma.Decimal(parseFloat(lock.claimedReward.toString()) + actualReward),
        },
      });

      // Update reward pool - move used portion to distributed, return forfeited portion
      // Only move actualReward to distributed, the forfeited amount goes back to available pool
      await tx.rewardPool.update({
        where: { name: this.lockRewardsPoolName },
        data: {
          reserved: { decrement: new Prisma.Decimal(totalReward) },
          distributed: { increment: new Prisma.Decimal(actualReward) },
          // Forfeited reward (unearned + penalty) returns to available pool (not distributed)
        },
      });

      // Update wallet balance - move locked back to available + add reward
      await tx.walletBalance.update({
        where: { userId_currency: { userId, currency: HBCT_CURRENCY } },
        data: {
          availableBalance: { increment: new Prisma.Decimal(totalReceived) },
          lockedBalance: { decrement: new Prisma.Decimal(lockAmount) },
          lastActivityAt: new Date(),
        },
      });

      // Create early unlock transaction
      await tx.transaction.create({
        data: {
          userId,
          type: TransactionType.UNLOCK,
          amount: new Prisma.Decimal(lockAmount),
          priceUsd: new Prisma.Decimal(this.tokenPrice),
          totalUsd: new Prisma.Decimal(lockAmount * this.tokenPrice),
          status: TransactionStatus.COMPLETED,
          completedAt: new Date(),
          relatedLockId: lockId,
          metadata: {
            earlyUnlock: true,
            completedPercent: Math.round(completedPercent * 100) / 100,
            penaltyPercent,
            totalReward,
            accruedReward,
            penaltyAmount,
            actualReward,
            forfeitedReward,
            totalReceived,
          },
        },
      });

      // Create reward distribution transaction (for the actual reward received)
      if (actualReward > 0) {
        await tx.transaction.create({
          data: {
            userId,
            type: TransactionType.REWARD_DISTRIBUTION,
            amount: new Prisma.Decimal(actualReward),
            priceUsd: new Prisma.Decimal(this.tokenPrice),
            totalUsd: new Prisma.Decimal(actualReward * this.tokenPrice),
            status: TransactionStatus.COMPLETED,
            completedAt: new Date(),
            relatedLockId: lockId,
            metadata: {
              source: 'early_unlock_bonus',
              tierId: lock.lockTierId,
              penaltyApplied: penaltyAmount,
            },
          },
        });

        // Create reward record
        await tx.reward.create({
          data: {
            userId,
            lockId,
            poolName: this.lockRewardsPoolName,
            amount: new Prisma.Decimal(actualReward),
            isClaimed: true,
            claimedAt: new Date(),
          },
        });
      }
    });

    // Send notification for early unlock
    try {
      await this.notificationsService.create({
        userId,
        type: 'LOCKING',
        title: 'Early Unlock Completed',
        message: `You unlocked ${lockAmount.toFixed(2)} HBCT early at ${completedPercent.toFixed(0)}% completion. You earned ${actualReward.toFixed(2)} HBCT (${penaltyPercent}% penalty on accrued rewards).`,
        actionUrl: '/locking',
        data: { lockId, penaltyPercent, completedPercent },
      });
    } catch (notifyError) {
      this.logger.warn(`Failed to send early unlock notification: ${notifyError.message}`);
    }

    return {
      message: `Tokens unlocked early with ${penaltyPercent}% penalty on accrued rewards`,
      unlockedAmount: lockAmount.toString(),
      totalReward: totalReward.toString(),
      accruedReward: accruedReward.toString(),
      penaltyAmount: penaltyAmount.toString(),
      penaltyPercent,
      actualReward: actualReward.toString(),
      forfeitedReward: forfeitedReward.toString(),
      totalReceived: totalReceived.toString(),
      completedPercent: Math.round(completedPercent * 100) / 100,
    };
  }

  /**
   * Cancel a lock within the grace period (24 hours)
   * No penalty if cancelled within grace period
   */
  async cancelLock(userId: string, lockId: string): Promise<CancelLockResponseDto> {
    const lock = await this.prisma.tokenLock.findFirst({
      where: { id: lockId, userId },
      include: { lockTier: true },
    });

    if (!lock) {
      throw new NotFoundException('Lock not found');
    }

    if (lock.status !== LockStatus.ACTIVE) {
      throw new BadRequestException('Lock is not active');
    }

    const now = new Date();
    const hoursSinceStart = (now.getTime() - lock.startDate.getTime()) / (1000 * 60 * 60);
    const isGracePeriod = hoursSinceStart <= this.CANCEL_GRACE_PERIOD_HOURS;

    if (!isGracePeriod) {
      throw new BadRequestException(
        `Cancellation grace period (${this.CANCEL_GRACE_PERIOD_HOURS} hours) has expired. Use early unlock instead.`,
      );
    }

    const lockAmount = parseFloat(lock.amount.toString());
    const reservedReward = parseFloat(lock.rewardAmount.toString());

    await this.prisma.$transaction(async (tx) => {
      // Update lock status to CANCELLED
      await tx.tokenLock.update({
        where: { id: lockId },
        data: {
          status: LockStatus.CANCELLED,
        },
      });

      // Return reserved rewards to pool
      await tx.rewardPool.update({
        where: { name: this.lockRewardsPoolName },
        data: {
          reserved: { decrement: new Prisma.Decimal(reservedReward) },
        },
      });

      // Return locked tokens to available balance in WalletBalance
      await tx.walletBalance.update({
        where: { userId_currency: { userId, currency: HBCT_CURRENCY } },
        data: {
          availableBalance: { increment: new Prisma.Decimal(lockAmount) },
          lockedBalance: { decrement: new Prisma.Decimal(lockAmount) },
          lastActivityAt: new Date(),
        },
      });

      // Create cancellation transaction
      await tx.transaction.create({
        data: {
          userId,
          type: TransactionType.UNLOCK,
          amount: new Prisma.Decimal(lockAmount),
          priceUsd: new Prisma.Decimal(this.tokenPrice),
          totalUsd: new Prisma.Decimal(lockAmount * this.tokenPrice),
          status: TransactionStatus.COMPLETED,
          completedAt: new Date(),
          relatedLockId: lockId,
          metadata: {
            cancelled: true,
            gracePeriod: true,
            hoursSinceStart: Math.round(hoursSinceStart * 100) / 100,
            forfeitedReward: reservedReward,
          },
        },
      });
    });

    // Send notification for cancellation
    try {
      await this.notificationsService.create({
        userId,
        type: 'LOCKING',
        title: 'Lock Cancelled',
        message: `Your ${lock.lockTier.name} lock of ${lockAmount.toFixed(2)} HBCT has been cancelled. Tokens returned to your available balance.`,
        actionUrl: '/locking',
        data: { lockId },
      });
    } catch (notifyError) {
      this.logger.warn(`Failed to send cancellation notification: ${notifyError.message}`);
    }

    return {
      message: 'Lock cancelled successfully within grace period',
      refundedAmount: lockAmount.toString(),
      wasGracePeriod: true,
    };
  }

  /**
   * Get lock history for a user (all lock operations)
   */
  async getLockHistory(userId: string, query: LockQueryDto): Promise<LockHistoryResponseDto> {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    // Get all lock-related transactions
    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          userId,
          type: {
            in: [TransactionType.LOCK, TransactionType.UNLOCK, TransactionType.REWARD_DISTRIBUTION],
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          relatedLock: {
            include: { lockTier: true },
          },
        },
      }),
      this.prisma.transaction.count({
        where: {
          userId,
          type: {
            in: [TransactionType.LOCK, TransactionType.UNLOCK, TransactionType.REWARD_DISTRIBUTION],
          },
        },
      }),
    ]);

    const history = transactions.map((tx) => {
      const metadata = tx.metadata as Record<string, unknown> | null;
      let action = tx.type as string;

      // Determine more specific action type
      if (tx.type === TransactionType.UNLOCK) {
        if (metadata?.cancelled) {
          action = 'CANCEL';
        } else if (metadata?.earlyUnlock) {
          action = 'EARLY_UNLOCK';
        } else {
          action = 'UNLOCK';
        }
      }

      return {
        id: tx.id,
        action,
        amount: tx.amount.toString(),
        rewardAmount: metadata?.rewardAmount?.toString() || metadata?.actualReward?.toString(),
        penaltyAmount: metadata?.penaltyAmount?.toString(),
        tierName: tx.relatedLock?.lockTier?.name || 'Unknown',
        createdAt: tx.createdAt,
        metadata: metadata || undefined,
      };
    });

    return {
      history,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get locks that are about to mature (for notification purposes)
   * Returns locks that will mature within the specified hours
   */
  async getLocksAboutToMature(hoursUntilMature: number = 24) {
    const now = new Date();
    const futureDate = new Date(now.getTime() + hoursUntilMature * 60 * 60 * 1000);

    const locks = await this.prisma.tokenLock.findMany({
      where: {
        status: LockStatus.ACTIVE,
        endDate: {
          gt: now,
          lte: futureDate,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
          },
        },
        lockTier: true,
      },
    });

    return locks.map((lock) => ({
      lockId: lock.id,
      userId: lock.userId,
      userEmail: lock.user.email,
      userName: lock.user.firstName,
      amount: lock.amount.toString(),
      rewardAmount: lock.rewardAmount.toString(),
      tierName: lock.lockTier.name,
      endDate: lock.endDate,
      hoursRemaining: Math.ceil((lock.endDate.getTime() - now.getTime()) / (1000 * 60 * 60)),
    }));
  }

  /**
   * Send maturity notifications for locks about to unlock
   * Runs every hour to check for locks maturing in the next 24 hours
   */
  @Cron(CronExpression.EVERY_HOUR)
  async sendMaturityNotifications() {
    const locksToNotify = await this.getLocksAboutToMature(24); // Notify 24 hours before

    let notificationsSent = 0;

    for (const lock of locksToNotify) {
      try {
        // Check if we already sent a notification for this lock
        const existingNotification = await this.prisma.notification.findFirst({
          where: {
            userId: lock.userId,
            type: 'LOCKING',
            data: {
              path: ['lockId'],
              equals: lock.lockId,
            },
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Within last 24 hours
            },
          },
        });

        if (!existingNotification) {
          await this.notificationsService.create({
            userId: lock.userId,
            type: 'LOCKING',
            title: 'Lock Ready to Unlock Soon!',
            message: `Your ${lock.tierName} lock of ${parseFloat(lock.amount).toLocaleString()} HBCT will be ready to unlock in ${lock.hoursRemaining} hours. You'll receive ${parseFloat(lock.rewardAmount).toLocaleString()} HBCT in rewards!`,
            actionUrl: '/locking',
            data: {
              lockId: lock.lockId,
              amount: lock.amount,
              rewardAmount: lock.rewardAmount,
              hoursRemaining: lock.hoursRemaining,
            },
          });
          notificationsSent++;
        }
      } catch (error) {
        this.logger.warn(`Failed to send maturity notification for lock ${lock.lockId}: ${error.message}`);
      }
    }

    this.logger.log(`Sent ${notificationsSent} lock maturity notifications`);
    return { notificationsSent };
  }
}
