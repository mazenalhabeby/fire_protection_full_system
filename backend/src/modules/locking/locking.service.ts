import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { Prisma, LockStatus, TransactionType, TransactionStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateLockDto, LockQueryDto } from './dto';

@Injectable()
export class LockingService {
  private readonly logger = new Logger(LockingService.name);
  private readonly tokenPrice: number;
  private readonly lockRewardsPoolName = 'Lock Rewards';

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
      feeDiscountPercent: tier.feeDiscountPercent.toString(),
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

    // Check user's available balance
    const balance = await this.prisma.tokenBalance.findUnique({
      where: { userId },
    });

    if (!balance || parseFloat(balance.availableBalance.toString()) < amount) {
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

      // Move tokens from available to locked balance
      await tx.tokenBalance.update({
        where: { userId },
        data: {
          availableBalance: { decrement: new Prisma.Decimal(amount) },
          lockedBalance: { increment: new Prisma.Decimal(amount) },
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
          feeDiscountPercent: lock.lockTier.feeDiscountPercent.toString(),
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
        feeDiscountPercent: lock.lockTier.feeDiscountPercent.toString(),
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

      // Update token balance
      await tx.tokenBalance.update({
        where: { userId },
        data: {
          availableBalance: { increment: new Prisma.Decimal(totalReceived) },
          lockedBalance: { decrement: new Prisma.Decimal(lockAmount) },
          totalBalance: { increment: new Prisma.Decimal(rewardAmount) },
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
          feeDiscountPercent: lock.lockTier.feeDiscountPercent.toString(),
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
}
