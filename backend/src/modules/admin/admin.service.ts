import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  Prisma,
  UserRole,
  TransactionStatus,
  LockStatus,
  AirdropStatus,
  OrderStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  UserQueryDto,
  TransactionQueryDto,
  CreateLockTierDto,
  UpdateLockTierDto,
  UpdateTokenConfigDto,
} from './dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboard() {
    // Run all queries in parallel
    const [
      userCount,
      salesAgg,
      lockedTokensAgg,
      rewardsAgg,
      activeAirdrops,
      pendingOrders,
      affiliatePayouts,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.tokenSale.aggregate({
        where: { status: TransactionStatus.COMPLETED },
        _sum: { totalUsd: true, amountHbct: true, liquidityAmount: true },
      }),
      this.prisma.tokenLock.aggregate({
        where: { status: LockStatus.ACTIVE },
        _sum: { amount: true },
      }),
      this.prisma.rewardPool.aggregate({
        _sum: { distributed: true },
      }),
      this.prisma.airdropCampaign.count({
        where: { status: AirdropStatus.ACTIVE },
      }),
      this.prisma.marketplaceOrder.count({
        where: { status: OrderStatus.PENDING },
      }),
      this.prisma.commission.aggregate({
        where: { isPaid: true },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalUsers: userCount,
      totalSalesUsd: salesAgg._sum.totalUsd?.toString() ?? '0',
      totalTokensSold: salesAgg._sum.amountHbct?.toString() ?? '0',
      totalLiquidityAdded: salesAgg._sum.liquidityAmount?.toString() ?? '0',
      totalLockedTokens: lockedTokensAgg._sum.amount?.toString() ?? '0',
      totalRewardsDistributed: rewardsAgg._sum.distributed?.toString() ?? '0',
      activeAirdrops,
      pendingOrders,
      affiliatePayouts: affiliatePayouts._sum.amount?.toString() ?? '0',
    };
  }

  async getUsers(query: UserQueryDto) {
    const { page = 1, limit = 20, search, role } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role as UserRole;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isVerified: true,
          walletAddress: true,
          createdAt: true,
          tokenBalance: {
            select: {
              availableBalance: true,
              lockedBalance: true,
              totalBalance: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isVerified: user.isVerified,
        walletAddress: user.walletAddress,
        createdAt: user.createdAt,
        balance: user.tokenBalance
          ? {
              available: user.tokenBalance.availableBalance.toString(),
              locked: user.tokenBalance.lockedBalance.toString(),
              total: user.tokenBalance.totalBalance.toString(),
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

  async updateUserRole(userId: string, role: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!['USER', 'ADMIN'].includes(role)) {
      throw new BadRequestException('Invalid role');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role: role as UserRole },
    });

    return {
      id: updated.id,
      email: updated.email,
      role: updated.role,
      message: 'User role updated successfully',
    };
  }

  async getTransactions(query: TransactionQueryDto) {
    const { page = 1, limit = 20, type, status, userId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TransactionWhereInput = {};

    if (type) {
      where.type = type as Prisma.EnumTransactionTypeFilter;
    }

    if (status) {
      where.status = status as TransactionStatus;
    }

    if (userId) {
      where.userId = userId;
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { email: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      transactions: transactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount.toString(),
        priceUsd: tx.priceUsd?.toString(),
        totalUsd: tx.totalUsd?.toString(),
        status: tx.status,
        txHash: tx.txHash,
        createdAt: tx.createdAt,
        completedAt: tx.completedAt,
        user: tx.user
          ? {
              email: tx.user.email,
              name: `${tx.user.firstName || ''} ${tx.user.lastName || ''}`.trim(),
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

  async getLockTiers() {
    const tiers = await this.prisma.lockTier.findMany({
      orderBy: { lockMonths: 'asc' },
      include: {
        _count: { select: { locks: true } },
      },
    });

    return tiers.map((tier) => ({
      id: tier.id,
      name: tier.name,
      lockMonths: tier.lockMonths,
      bonusPercent: tier.bonusPercent.toString(),
      feeDiscountPercent: tier.feeDiscountPercent.toString(),
      minAmount: tier.minAmount.toString(),
      isActive: tier.isActive,
      lockCount: tier._count.locks,
      createdAt: tier.createdAt,
    }));
  }

  async createLockTier(dto: CreateLockTierDto) {
    const tier = await this.prisma.lockTier.create({
      data: {
        name: dto.name,
        lockMonths: dto.lockMonths,
        bonusPercent: new Prisma.Decimal(dto.bonusPercent),
        feeDiscountPercent: new Prisma.Decimal(dto.feeDiscountPercent),
        minAmount: new Prisma.Decimal(dto.minAmount),
      },
    });

    return {
      id: tier.id,
      name: tier.name,
      lockMonths: tier.lockMonths,
      message: 'Lock tier created successfully',
    };
  }

  async updateLockTier(id: string, dto: UpdateLockTierDto) {
    const tier = await this.prisma.lockTier.findUnique({
      where: { id },
    });

    if (!tier) {
      throw new NotFoundException('Lock tier not found');
    }

    const updateData: Prisma.LockTierUpdateInput = {};

    if (dto.name) updateData.name = dto.name;
    if (dto.bonusPercent !== undefined)
      updateData.bonusPercent = new Prisma.Decimal(dto.bonusPercent);
    if (dto.feeDiscountPercent !== undefined)
      updateData.feeDiscountPercent = new Prisma.Decimal(dto.feeDiscountPercent);
    if (dto.minAmount !== undefined)
      updateData.minAmount = new Prisma.Decimal(dto.minAmount);
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const updated = await this.prisma.lockTier.update({
      where: { id },
      data: updateData,
    });

    return {
      id: updated.id,
      name: updated.name,
      isActive: updated.isActive,
      message: 'Lock tier updated successfully',
    };
  }

  async getTokenConfig() {
    const config = await this.prisma.tokenConfig.findFirst();

    if (!config) {
      throw new NotFoundException('Token config not found');
    }

    return {
      id: config.id,
      symbol: config.symbol,
      name: config.name,
      totalSupply: config.totalSupply.toString(),
      currentPrice: config.currentPrice.toString(),
      isPresale: config.isPresale,
      presalePrice: config.presalePrice?.toString(),
      updatedAt: config.updatedAt,
    };
  }

  async updateTokenConfig(dto: UpdateTokenConfigDto) {
    const config = await this.prisma.tokenConfig.findFirst();

    if (!config) {
      throw new NotFoundException('Token config not found');
    }

    const updateData: Prisma.TokenConfigUpdateInput = {};

    if (dto.currentPrice !== undefined)
      updateData.currentPrice = new Prisma.Decimal(dto.currentPrice);
    if (dto.isPresale !== undefined) updateData.isPresale = dto.isPresale;
    if (dto.presalePrice !== undefined)
      updateData.presalePrice = new Prisma.Decimal(dto.presalePrice);

    const updated = await this.prisma.tokenConfig.update({
      where: { id: config.id },
      data: updateData,
    });

    return {
      id: updated.id,
      currentPrice: updated.currentPrice.toString(),
      isPresale: updated.isPresale,
      message: 'Token config updated successfully',
    };
  }

  async getSystemStats() {
    const [
      rewardPools,
      airdropStats,
      orderStats,
      lockStats,
    ] = await Promise.all([
      this.prisma.rewardPool.findMany(),
      this.prisma.airdropCampaign.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.marketplaceOrder.groupBy({
        by: ['status'],
        _count: true,
        _sum: { totalHbct: true },
      }),
      this.prisma.tokenLock.groupBy({
        by: ['status'],
        _count: true,
        _sum: { amount: true },
      }),
    ]);

    return {
      rewardPools: rewardPools.map((pool) => ({
        name: pool.name,
        allocation: pool.allocation.toString(),
        reserved: pool.reserved.toString(),
        distributed: pool.distributed.toString(),
        available: (
          parseFloat(pool.allocation.toString()) -
          parseFloat(pool.reserved.toString()) -
          parseFloat(pool.distributed.toString())
        ).toString(),
      })),
      airdrops: airdropStats.reduce(
        (acc, curr) => {
          acc[curr.status.toLowerCase()] = curr._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      orders: orderStats.reduce(
        (acc, curr) => {
          acc[curr.status.toLowerCase()] = {
            count: curr._count,
            totalHbct: curr._sum.totalHbct?.toString() ?? '0',
          };
          return acc;
        },
        {} as Record<string, { count: number; totalHbct: string }>,
      ),
      locks: lockStats.reduce(
        (acc, curr) => {
          acc[curr.status.toLowerCase()] = {
            count: curr._count,
            totalAmount: curr._sum.amount?.toString() ?? '0',
          };
          return acc;
        },
        {} as Record<string, { count: number; totalAmount: string }>,
      ),
    };
  }
}
