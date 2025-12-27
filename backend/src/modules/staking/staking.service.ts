import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StakeStatus, TransactionType, TransactionStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStakeDto, StakeQueryDto } from './dto';

export interface StakingPlan {
  id: number;
  name: string;
  lockPeriodDays: number;
  apy: number;
  minAmount: number;
}

@Injectable()
export class StakingService {
  private readonly stakingPlans: StakingPlan[] = [
    { id: 1, name: 'Flexible', lockPeriodDays: 30, apy: 5, minAmount: 100 },
    { id: 2, name: 'Standard', lockPeriodDays: 90, apy: 10, minAmount: 500 },
    { id: 3, name: 'Premium', lockPeriodDays: 180, apy: 15, minAmount: 1000 },
    { id: 4, name: 'Diamond', lockPeriodDays: 365, apy: 25, minAmount: 5000 },
  ];

  private readonly tokenPrice: number;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.tokenPrice =
      parseFloat(configService.get<string>('TOKEN_PRESALE_PRICE') || '0.03');
  }

  getPlans() {
    return this.stakingPlans;
  }

  private getPlanByLockPeriod(days: number): StakingPlan | undefined {
    return this.stakingPlans.find((p) => p.lockPeriodDays === days);
  }

  async createStake(userId: string, createStakeDto: CreateStakeDto) {
    const { amount, lockPeriodDays } = createStakeDto;

    // Get staking plan
    const plan = this.getPlanByLockPeriod(lockPeriodDays);
    if (!plan) {
      throw new BadRequestException('Invalid lock period');
    }

    if (amount < plan.minAmount) {
      throw new BadRequestException(
        `Minimum stake amount for ${plan.name} plan is ${plan.minAmount} tokens`,
      );
    }

    // Check user's available balance
    const balance = await this.prisma.tokenBalance.findUnique({
      where: { userId },
    });

    if (
      !balance ||
      parseFloat(balance.availableBalance.toString()) < amount
    ) {
      throw new BadRequestException('Insufficient available balance');
    }

    // Calculate end date and expected rewards
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + lockPeriodDays);

    const expectedRewards = (amount * plan.apy * lockPeriodDays) / (365 * 100);

    // Create stake in transaction
    const stake = await this.prisma.$transaction(async (tx) => {
      // Create stake record
      const newStake = await tx.stake.create({
        data: {
          userId,
          amount: new Prisma.Decimal(amount),
          lockPeriod: lockPeriodDays,
          apy: new Prisma.Decimal(plan.apy),
          startDate,
          endDate,
          totalRewards: new Prisma.Decimal(expectedRewards),
        },
      });

      // Update token balance (move from available to locked)
      await tx.tokenBalance.update({
        where: { userId },
        data: {
          availableBalance: { decrement: new Prisma.Decimal(amount) },
          lockedBalance: { increment: new Prisma.Decimal(amount) },
        },
      });

      // Create stake transaction
      await tx.transaction.create({
        data: {
          userId,
          type: TransactionType.STAKE,
          amount: new Prisma.Decimal(amount),
          priceUsd: new Prisma.Decimal(this.tokenPrice),
          totalUsd: new Prisma.Decimal(amount * this.tokenPrice),
          status: TransactionStatus.COMPLETED,
          completedAt: new Date(),
          metadata: { stakeId: newStake.id, lockPeriod: lockPeriodDays, apy: plan.apy },
        },
      });

      return newStake;
    });

    return {
      id: stake.id,
      amount: stake.amount.toString(),
      lockPeriod: stake.lockPeriod,
      apy: stake.apy.toString(),
      status: stake.status,
      startDate: stake.startDate,
      endDate: stake.endDate,
      totalRewards: stake.totalRewards.toString(),
      claimedRewards: stake.claimedRewards.toString(),
      pendingRewards: (
        parseFloat(stake.totalRewards.toString()) -
        parseFloat(stake.claimedRewards.toString())
      ).toString(),
    };
  }

  async getStakes(userId: string, query: StakeQueryDto) {
    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.StakeWhereInput = { userId };
    if (status) {
      where.status = status as StakeStatus;
    }

    const [stakes, total] = await Promise.all([
      this.prisma.stake.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startDate: 'desc' },
      }),
      this.prisma.stake.count({ where }),
    ]);

    return {
      stakes: stakes.map((s) => ({
        id: s.id,
        amount: s.amount.toString(),
        lockPeriod: s.lockPeriod,
        apy: s.apy.toString(),
        status: s.status,
        startDate: s.startDate,
        endDate: s.endDate,
        totalRewards: s.totalRewards.toString(),
        claimedRewards: s.claimedRewards.toString(),
        pendingRewards: (
          parseFloat(s.totalRewards.toString()) -
          parseFloat(s.claimedRewards.toString())
        ).toString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async unstake(userId: string, stakeId: string) {
    const stake = await this.prisma.stake.findFirst({
      where: { id: stakeId, userId },
    });

    if (!stake) {
      throw new NotFoundException('Stake not found');
    }

    if (stake.status !== StakeStatus.ACTIVE) {
      throw new BadRequestException('Stake is not active');
    }

    const now = new Date();
    const isEarlyUnstake = now < stake.endDate;
    const stakeAmount = parseFloat(stake.amount.toString());

    // Calculate penalty for early unstake (10% penalty)
    let returnAmount = stakeAmount;
    let penalty = 0;

    if (isEarlyUnstake) {
      penalty = stakeAmount * 0.1;
      returnAmount = stakeAmount - penalty;
    }

    // Calculate earned rewards up to now
    const totalDays = Math.ceil(
      (stake.endDate.getTime() - stake.startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const daysPassed = Math.ceil(
      (now.getTime() - stake.startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const earnedRewards = isEarlyUnstake
      ? 0 // No rewards for early unstake
      : parseFloat(stake.totalRewards.toString()) -
        parseFloat(stake.claimedRewards.toString());

    await this.prisma.$transaction(async (tx) => {
      // Update stake status
      await tx.stake.update({
        where: { id: stakeId },
        data: {
          status: StakeStatus.COMPLETED,
          claimedRewards: isEarlyUnstake
            ? stake.claimedRewards
            : stake.totalRewards,
        },
      });

      // Update token balance
      await tx.tokenBalance.update({
        where: { userId },
        data: {
          availableBalance: {
            increment: new Prisma.Decimal(returnAmount + earnedRewards),
          },
          lockedBalance: { decrement: new Prisma.Decimal(stakeAmount) },
          totalBalance: {
            increment: new Prisma.Decimal(earnedRewards - penalty),
          },
        },
      });

      // Create unstake transaction
      await tx.transaction.create({
        data: {
          userId,
          type: TransactionType.UNSTAKE,
          amount: new Prisma.Decimal(returnAmount),
          priceUsd: new Prisma.Decimal(this.tokenPrice),
          totalUsd: new Prisma.Decimal(returnAmount * this.tokenPrice),
          status: TransactionStatus.COMPLETED,
          completedAt: new Date(),
          metadata: {
            stakeId,
            isEarlyUnstake,
            penalty: penalty.toString(),
            earnedRewards: earnedRewards.toString(),
          },
        },
      });

      // Create reward transaction if applicable
      if (earnedRewards > 0) {
        await tx.transaction.create({
          data: {
            userId,
            type: TransactionType.REWARD,
            amount: new Prisma.Decimal(earnedRewards),
            priceUsd: new Prisma.Decimal(this.tokenPrice),
            totalUsd: new Prisma.Decimal(earnedRewards * this.tokenPrice),
            status: TransactionStatus.COMPLETED,
            completedAt: new Date(),
            metadata: { stakeId, source: 'staking' },
          },
        });
      }
    });

    return {
      message: isEarlyUnstake
        ? 'Unstaked with 10% early withdrawal penalty'
        : 'Successfully unstaked with rewards',
      returnedAmount: returnAmount.toString(),
      penalty: penalty.toString(),
      earnedRewards: earnedRewards.toString(),
    };
  }

  async getRewards(userId: string) {
    const activeStakes = await this.prisma.stake.findMany({
      where: { userId, status: StakeStatus.ACTIVE },
    });

    let totalPending = 0;
    let totalClaimed = 0;
    const stakeRewards: { stakeId: string; pendingRewards: string }[] = [];

    for (const stake of activeStakes) {
      const pending =
        parseFloat(stake.totalRewards.toString()) -
        parseFloat(stake.claimedRewards.toString());
      const claimed = parseFloat(stake.claimedRewards.toString());

      totalPending += pending;
      totalClaimed += claimed;

      stakeRewards.push({
        stakeId: stake.id,
        pendingRewards: pending.toString(),
      });
    }

    return {
      totalPending: totalPending.toString(),
      totalClaimed: totalClaimed.toString(),
      stakes: stakeRewards,
    };
  }

  async claimRewards(userId: string) {
    // Get all completed stakes with unclaimed rewards
    const completedStakes = await this.prisma.stake.findMany({
      where: {
        userId,
        status: StakeStatus.ACTIVE,
        endDate: { lte: new Date() },
      },
    });

    if (completedStakes.length === 0) {
      throw new BadRequestException('No rewards available to claim');
    }

    let totalRewardsToClaim = 0;
    const stakeIds: string[] = [];

    for (const stake of completedStakes) {
      const unclaimed =
        parseFloat(stake.totalRewards.toString()) -
        parseFloat(stake.claimedRewards.toString());
      if (unclaimed > 0) {
        totalRewardsToClaim += unclaimed;
        stakeIds.push(stake.id);
      }
    }

    if (totalRewardsToClaim === 0) {
      throw new BadRequestException('No rewards available to claim');
    }

    await this.prisma.$transaction(async (tx) => {
      // Update stakes
      for (const stakeId of stakeIds) {
        const stake = completedStakes.find((s) => s.id === stakeId);
        if (stake) {
          await tx.stake.update({
            where: { id: stakeId },
            data: { claimedRewards: stake.totalRewards },
          });

          // Create reward record
          const rewardAmount =
            parseFloat(stake.totalRewards.toString()) -
            parseFloat(stake.claimedRewards.toString());

          await tx.reward.create({
            data: {
              userId,
              stakeId,
              amount: new Prisma.Decimal(rewardAmount),
              isClaimed: true,
              claimedAt: new Date(),
            },
          });
        }
      }

      // Add rewards to available balance
      await tx.tokenBalance.update({
        where: { userId },
        data: {
          availableBalance: {
            increment: new Prisma.Decimal(totalRewardsToClaim),
          },
          totalBalance: { increment: new Prisma.Decimal(totalRewardsToClaim) },
        },
      });

      // Create reward transaction
      await tx.transaction.create({
        data: {
          userId,
          type: TransactionType.REWARD,
          amount: new Prisma.Decimal(totalRewardsToClaim),
          priceUsd: new Prisma.Decimal(this.tokenPrice),
          totalUsd: new Prisma.Decimal(totalRewardsToClaim * this.tokenPrice),
          status: TransactionStatus.COMPLETED,
          completedAt: new Date(),
          metadata: { stakeIds, source: 'staking_claim' },
        },
      });
    });

    return {
      message: 'Rewards claimed successfully',
      claimedAmount: totalRewardsToClaim.toString(),
      stakesProcessed: stakeIds.length,
    };
  }
}
