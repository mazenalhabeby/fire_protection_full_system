import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  Prisma,
  UserRole,
  TransactionStatus,
  LockStatus,
  AirdropStatus,
  OrderStatus,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import {
  UserQueryDto,
  TransactionQueryDto,
  CreateLockTierDto,
  UpdateLockTierDto,
  UpdateTokenConfigDto,
  AffiliateQueryDto,
  UpdateAffiliateDto,
  AdminLockQueryDto,
  AdminPurchaseQueryDto,
  CreateAffiliateTierDto,
  UpdateAffiliateTierDto,
} from './dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async getDashboard(permissions: string[] = []) {
    // Helper to check if user has permission
    const hasPermission = (permission: string) => permissions.includes(permission);

    // Build queries based on permissions
    const queries: Promise<any>[] = [];
    const queryMap: { [key: string]: number } = {};
    let queryIndex = 0;

    // Users stats - requires users.view
    if (hasPermission('users.view')) {
      queryMap['userCount'] = queryIndex++;
      queries.push(this.prisma.user.count());
    }

    // Sales stats - requires purchases.view
    if (hasPermission('purchases.view')) {
      queryMap['salesAgg'] = queryIndex++;
      queries.push(
        this.prisma.tokenSale.aggregate({
          where: { status: TransactionStatus.COMPLETED },
          _sum: { totalUsd: true, amountHbct: true, liquidityAmount: true },
        }),
      );
    }

    // Locked tokens - requires locks.view
    if (hasPermission('locks.view')) {
      queryMap['lockedTokensAgg'] = queryIndex++;
      queries.push(
        this.prisma.tokenLock.aggregate({
          where: { status: LockStatus.ACTIVE },
          _sum: { amount: true },
        }),
      );
    }

    // Rewards - requires settings.view (admin-level)
    if (hasPermission('settings.view')) {
      queryMap['rewardsAgg'] = queryIndex++;
      queries.push(
        this.prisma.rewardPool.aggregate({
          _sum: { distributed: true },
        }),
      );
    }

    // Active airdrops - requires settings.view
    if (hasPermission('settings.view')) {
      queryMap['activeAirdrops'] = queryIndex++;
      queries.push(
        this.prisma.airdropCampaign.count({
          where: { status: AirdropStatus.ACTIVE },
        }),
      );
    }

    // Pending orders - requires purchases.view
    if (hasPermission('purchases.view')) {
      queryMap['pendingOrders'] = queryIndex++;
      queries.push(
        this.prisma.marketplaceOrder.count({
          where: { status: OrderStatus.PENDING },
        }),
      );
    }

    // Affiliate payouts - requires affiliates.view
    // In new system, commissions are credited directly to wallet
    if (hasPermission('affiliates.view')) {
      queryMap['affiliatePayouts'] = queryIndex++;
      queries.push(
        this.prisma.walletTransaction.aggregate({
          where: { type: 'AFFILIATE_COMMISSION' },
          _sum: { amount: true },
        }),
      );
    }

    // Pending withdrawals - requires withdrawals.view
    if (hasPermission('withdrawals.view')) {
      queryMap['pendingWithdrawals'] = queryIndex++;
      queries.push(
        this.prisma.withdrawal.count({
          where: { status: { in: ['PENDING_CONFIRMATION', 'PENDING_APPROVAL'] } },
        }),
      );
    }

    // Pending deposits - requires deposits.view
    if (hasPermission('deposits.view')) {
      queryMap['pendingDeposits'] = queryIndex++;
      queries.push(
        this.prisma.onchainDeposit.count({
          where: { status: 'PENDING' },
        }),
      );
    }

    // Support tickets - requires support.view
    if (hasPermission('support.view')) {
      queryMap['openTickets'] = queryIndex++;
      queries.push(
        this.prisma.supportTicket.count({
          where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
        }),
      );
    }

    // Run all permitted queries in parallel
    const results = await Promise.all(queries);

    // Build response based on what was queried
    const response: any = {};

    if ('userCount' in queryMap) {
      response.totalUsers = results[queryMap['userCount']];
    }

    if ('salesAgg' in queryMap) {
      const salesAgg = results[queryMap['salesAgg']];
      response.totalSalesUsd = salesAgg._sum.totalUsd?.toString() ?? '0';
      response.totalTokensSold = salesAgg._sum.amountHbct?.toString() ?? '0';
      response.totalLiquidityAdded = salesAgg._sum.liquidityAmount?.toString() ?? '0';
    }

    if ('lockedTokensAgg' in queryMap) {
      const lockedTokensAgg = results[queryMap['lockedTokensAgg']];
      response.totalLockedTokens = lockedTokensAgg._sum.amount?.toString() ?? '0';
    }

    if ('rewardsAgg' in queryMap) {
      const rewardsAgg = results[queryMap['rewardsAgg']];
      response.totalRewardsDistributed = rewardsAgg._sum.distributed?.toString() ?? '0';
    }

    if ('activeAirdrops' in queryMap) {
      response.activeAirdrops = results[queryMap['activeAirdrops']];
    }

    if ('pendingOrders' in queryMap) {
      response.pendingOrders = results[queryMap['pendingOrders']];
    }

    if ('affiliatePayouts' in queryMap) {
      const affiliatePayouts = results[queryMap['affiliatePayouts']];
      response.affiliatePayouts = affiliatePayouts._sum.amount?.toString() ?? '0';
    }

    if ('pendingWithdrawals' in queryMap) {
      response.pendingWithdrawals = results[queryMap['pendingWithdrawals']];
    }

    if ('pendingDeposits' in queryMap) {
      response.pendingDeposits = results[queryMap['pendingDeposits']];
    }

    if ('openTickets' in queryMap) {
      response.openTickets = results[queryMap['openTickets']];
    }

    return response;
  }

  async getUsers(query: UserQueryDto) {
    const { page = 1, limit = 20, search, role } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      isDeleted: false, // Don't show deleted users
    };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.legacyRole = role as UserRole;
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
          username: true,
          firstName: true,
          lastName: true,
          legacyRole: true,
          roleId: true,
          isEmailVerified: true,
          isBanned: true,
          walletAddress: true,
          createdAt: true,
          adminRole: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
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
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.legacyRole,
        roleId: user.roleId,
        roleName: user.adminRole?.name || null,
        roleColor: user.adminRole?.color || null,
        isEmailVerified: user.isEmailVerified,
        isBanned: user.isBanned,
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
      data: { legacyRole: role as UserRole },
    });

    return {
      id: updated.id,
      email: updated.email,
      role: updated.legacyRole,
      message: 'User role updated successfully',
    };
  }

  // ============ USER MANAGEMENT ============

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tokenBalance: true,
        adminRole: {
          include: {
            permissions: true,
          },
        },
        twoFactorAuth: {
          select: { isEnabled: true },
        },
        sessions: {
          where: { isValid: true },
          orderBy: { lastActivityAt: 'desc' },
          take: 10,
        },
        affiliate: {
          include: {
            _count: {
              select: { referredUsers: true },
            },
          },
        },
        locks: {
          where: { status: 'ACTIVE' },
          select: { amount: true },
        },
        tokenSales: {
          where: { status: 'COMPLETED' },
          select: { amountHbct: true, priceUsd: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Calculate stats
    const totalPurchaseValue = user.tokenSales.reduce((acc, sale) => {
      return acc + parseFloat(sale.amountHbct.toString()) * parseFloat(sale.priceUsd.toString());
    }, 0);

    const totalLockedAmount = user.locks.reduce((acc, lock) => {
      return acc + parseFloat(lock.amount.toString());
    }, 0);

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      walletAddress: user.walletAddress,
      authProvider: user.authProvider,
      legacyRole: user.legacyRole,
      roleId: user.roleId,
      role: user.adminRole ? {
        id: user.adminRole.id,
        name: user.adminRole.name,
        slug: user.adminRole.slug,
        color: user.adminRole.color,
      } : null,
      isEmailVerified: user.isEmailVerified,
      isBanned: user.isBanned,
      banReason: user.banReason,
      bannedAt: user.bannedAt,
      isDeleted: user.isDeleted,
      deletedAt: user.deletedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      balance: {
        available: user.tokenBalance?.availableBalance?.toString() ?? '0',
        locked: user.tokenBalance?.lockedBalance?.toString() ?? '0',
        pending: '0', // TokenBalance doesn't track pending separately
      },
      stats: {
        totalPurchases: user.tokenSales.length,
        totalPurchaseValue: totalPurchaseValue.toFixed(2),
        activeLocks: user.locks.length,
        totalLockedAmount: totalLockedAmount.toString(),
        referralCount: user.affiliate?._count?.referredUsers ?? 0,
      },
      sessions: user.sessions.map(s => ({
        id: s.id,
        deviceInfo: s.deviceName,
        ipAddress: s.ipAddress,
        lastActiveAt: s.lastActivityAt,
        createdAt: s.createdAt,
      })),
    };
  }

  async updateUser(userId: string, data: {
    firstName?: string;
    lastName?: string;
    username?: string;
    email?: string;
    isEmailVerified?: boolean;
  }) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check for email/username conflicts
    if (data.email && data.email !== user.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
      });
      if (existing) {
        throw new BadRequestException('Email already in use');
      }
    }

    if (data.username && data.username !== user.username) {
      const existing = await this.prisma.user.findFirst({
        where: { username: data.username.toLowerCase() },
      });
      if (existing) {
        throw new BadRequestException('Username already in use');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.username?.toLowerCase(),
        email: data.email?.toLowerCase(),
        isEmailVerified: data.isEmailVerified,
        emailVerifiedAt: data.isEmailVerified ? new Date() : undefined,
      },
    });

    return {
      id: updated.id,
      email: updated.email,
      username: updated.username,
      firstName: updated.firstName,
      lastName: updated.lastName,
      isEmailVerified: updated.isEmailVerified,
      message: 'User updated successfully',
    };
  }

  async banUser(userId: string, isBanned: boolean, banReason?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        isBanned,
        banReason: isBanned ? banReason : null,
        bannedAt: isBanned ? new Date() : null,
      },
    });

    // If banning, revoke all active sessions
    if (isBanned) {
      await this.prisma.session.updateMany({
        where: { userId, isValid: true },
        data: { isValid: false, revokedAt: new Date(), revokedReason: 'user_banned' },
      });
    }

    // Send email notification
    if (updated.email) {
      if (isBanned) {
        await this.emailService.sendAccountSuspendedEmail(updated.email, banReason);
      } else {
        await this.emailService.sendAccountReinstatedEmail(updated.email);
      }
    }

    return {
      id: updated.id,
      email: updated.email,
      isBanned: updated.isBanned,
      banReason: updated.banReason,
      message: isBanned ? 'User banned successfully' : 'User unbanned successfully',
    };
  }

  async deleteUser(
    userId: string,
    options: {
      reason?: string;
      requestedBy: string; // "user" or admin userId
      adminNotes?: string;
      forceDelete?: boolean; // Skip balance checks (for fraud/compliance)
      ipAddress?: string;
      userAgent?: string;
    } = { requestedBy: 'admin' }
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tokenBalance: true,
        walletBalances: true,
        locks: {
          where: { status: 'ACTIVE' },
        },
        withdrawalRequests: {
          where: { status: { in: ['PENDING_CONFIRMATION', 'PENDING_APPROVAL', 'APPROVED', 'PROCESSING'] } },
        },
        withdrawals: {
          where: { status: { in: ['PENDING_CONFIRMATION', 'PENDING_APPROVAL', 'APPROVED', 'PROCESSING'] } },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isDeleted) {
      throw new BadRequestException('User is already deleted');
    }

    // Pre-deletion checks (unless force delete)
    if (!options.forceDelete) {
      // Check for non-zero balance
      const hasTokenBalance = user.tokenBalance && (
        parseFloat(user.tokenBalance.availableBalance.toString()) > 0 ||
        parseFloat(user.tokenBalance.lockedBalance.toString()) > 0
      );

      const hasWalletBalance = user.walletBalances.some(wb =>
        parseFloat(wb.availableBalance.toString()) > 0 ||
        parseFloat(wb.lockedBalance.toString()) > 0 ||
        parseFloat(wb.pendingBalance.toString()) > 0
      );

      if (hasTokenBalance || hasWalletBalance) {
        throw new BadRequestException(
          'Cannot delete account with non-zero balance. User must withdraw all funds first.'
        );
      }

      // Check for active locks
      if (user.locks.length > 0) {
        throw new BadRequestException(
          `Cannot delete account with ${user.locks.length} active lock(s). Locks must be completed or cancelled first.`
        );
      }

      // Check for pending withdrawals
      const pendingWithdrawalsCount = user.withdrawalRequests.length + user.withdrawals.length;
      if (pendingWithdrawalsCount > 0) {
        throw new BadRequestException(
          `Cannot delete account with ${pendingWithdrawalsCount} pending withdrawal(s). Withdrawals must be completed or cancelled first.`
        );
      }
    }

    const now = new Date();
    const gracePeriodEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const retentionExpiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year

    // Calculate total balances for audit log
    const availableBalance = user.tokenBalance?.availableBalance ?? new Decimal(0);
    const lockedBalance = user.tokenBalance?.lockedBalance ?? new Decimal(0);

    // Use transaction to ensure atomicity
    await this.prisma.$transaction(async (tx) => {
      // Create deletion audit log
      await tx.accountDeletionLog.create({
        data: {
          userId: user.id,
          originalEmail: user.email || 'no-email',
          originalUsername: user.username,
          originalWalletAddress: user.walletAddress,
          reason: options.reason || 'admin_action',
          requestedBy: options.requestedBy,
          adminNotes: options.adminNotes,
          availableBalance,
          lockedBalance,
          pendingWithdrawals: user.withdrawalRequests.length + user.withdrawals.length,
          activeLocks: user.locks.length,
          gracePeriodEndsAt,
          retentionExpiresAt,
          ipAddress: options.ipAddress,
          userAgent: options.userAgent,
        },
      });

      // Soft delete - mark as deleted but preserve original email
      await tx.user.update({
        where: { id: userId },
        data: {
          // Preserve original email for recovery/compliance
          originalEmail: user.email,
          // Anonymize current email to free up the email address
          email: `deleted_${userId}@deleted.local`,
          username: null,
          isDeleted: true,
          deletedAt: now,
          deletionReason: options.reason || 'admin_action',
          deletionRequestedBy: options.requestedBy,
          retentionExpiresAt,
          canRecover: true, // Allow recovery during grace period
          isBanned: true,
          banReason: 'Account deleted',
        },
      });

      // Revoke all sessions
      await tx.session.updateMany({
        where: { userId },
        data: { isValid: false, revokedAt: now, revokedReason: 'account_deleted' },
      });
    });

    // Send deletion confirmation email if email exists
    if (user.email) {
      try {
        await this.emailService.sendAccountDeletedEmail(user.email, gracePeriodEndsAt);
      } catch (error) {
        this.logger.error(`Failed to send deletion email to ${user.email}`, error);
      }
    }

    return {
      message: 'User deleted successfully',
      gracePeriodEndsAt,
      retentionExpiresAt,
      canRecover: true,
    };
  }

  async recoverDeletedUser(
    userId: string,
    options: {
      recoveredBy: string; // "user" or admin userId
      ipAddress?: string;
      userAgent?: string;
    }
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isDeleted) {
      throw new BadRequestException('User is not deleted');
    }

    if (!user.canRecover) {
      throw new BadRequestException('Recovery period has expired. Account cannot be recovered.');
    }

    // Check if we're still within the grace period
    const deletionLog = await this.prisma.accountDeletionLog.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (deletionLog && new Date() > deletionLog.gracePeriodEndsAt) {
      throw new BadRequestException('Recovery grace period has expired (30 days).');
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      // Restore user
      await tx.user.update({
        where: { id: userId },
        data: {
          // Restore original email
          email: user.originalEmail,
          originalEmail: null,
          isDeleted: false,
          deletedAt: null,
          deletionReason: null,
          deletionRequestedBy: null,
          retentionExpiresAt: null,
          canRecover: true,
          isBanned: false,
          banReason: null,
        },
      });

      // Update deletion log
      if (deletionLog) {
        await tx.accountDeletionLog.update({
          where: { id: deletionLog.id },
          data: {
            recoveredAt: now,
            recoveredBy: options.recoveredBy,
          },
        });
      }
    });

    // Send recovery confirmation email
    if (user.originalEmail) {
      try {
        await this.emailService.sendAccountRecoveredEmail(user.originalEmail);
      } catch (error) {
        this.logger.error(`Failed to send recovery email to ${user.originalEmail}`, error);
      }
    }

    return {
      message: 'User account recovered successfully',
      email: user.originalEmail,
    };
  }

  async getDeletedUsers(query: { page?: number; limit?: number; search?: string }) {
    const { page = 1, limit = 20, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      isDeleted: true,
    };

    if (search) {
      where.OR = [
        { originalEmail: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { deletedAt: 'desc' },
        select: {
          id: true,
          originalEmail: true,
          deletedAt: true,
          deletionReason: true,
          deletionRequestedBy: true,
          canRecover: true,
          retentionExpiresAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Get deletion logs for grace period info
    const userIds = users.map(u => u.id);
    const deletionLogs = await this.prisma.accountDeletionLog.findMany({
      where: { userId: { in: userIds } },
      orderBy: { createdAt: 'desc' },
      distinct: ['userId'],
    });

    const logMap = deletionLogs.reduce((acc, log) => {
      acc[log.userId] = log;
      return acc;
    }, {} as Record<string, typeof deletionLogs[0]>);

    return {
      users: users.map(user => {
        const log = logMap[user.id];
        return {
          id: user.id,
          originalEmail: user.originalEmail,
          deletedAt: user.deletedAt,
          deletionReason: user.deletionReason,
          deletionRequestedBy: user.deletionRequestedBy,
          canRecover: user.canRecover && log && new Date() < log.gracePeriodEndsAt,
          gracePeriodEndsAt: log?.gracePeriodEndsAt,
          retentionExpiresAt: user.retentionExpiresAt,
          // Extended data from deletion log (for expandable details)
          deletionLog: log ? {
            originalUsername: log.originalUsername,
            originalWalletAddress: log.originalWalletAddress,
            adminNotes: log.adminNotes,
            availableBalance: log.availableBalance.toString(),
            lockedBalance: log.lockedBalance.toString(),
            pendingWithdrawals: log.pendingWithdrawals,
            activeLocks: log.activeLocks,
            ipAddress: log.ipAddress,
            userAgent: log.userAgent,
            recoveredAt: log.recoveredAt,
            recoveredBy: log.recoveredBy,
            createdAt: log.createdAt,
          } : null,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async assignRbacRole(userId: string, roleId: string | null) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (roleId) {
      const role = await this.prisma.role.findUnique({
        where: { id: roleId },
      });
      if (!role) {
        throw new NotFoundException('Role not found');
      }
    }

    // When assigning a role, also set legacyRole to ADMIN for admin panel access
    // When removing a role, set legacyRole back to USER
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        roleId,
        legacyRole: roleId ? 'ADMIN' : 'USER',
      },
      include: {
        adminRole: true,
      },
    });

    return {
      id: updated.id,
      email: updated.email,
      roleId: updated.roleId,
      roleName: updated.adminRole?.name || null,
      legacyRole: updated.legacyRole,
      message: roleId ? 'Role assigned successfully' : 'Role removed successfully',
    };
  }

  async revokeAllSessions(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const result = await this.prisma.session.updateMany({
      where: { userId, isValid: true },
      data: { isValid: false, revokedAt: new Date(), revokedReason: 'admin_revoked' },
    });

    return {
      revokedCount: result.count,
      message: `${result.count} session(s) revoked successfully`,
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
        feeDiscountPercent: new Prisma.Decimal(dto.feeDiscountPercent ?? dto.bonusPercent),
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

  // ============ AFFILIATE TIER MANAGEMENT ============

  async getAffiliateTiers() {
    const tiers = await this.prisma.affiliateTier.findMany({
      orderBy: { minReferrals: 'asc' },
      include: {
        _count: { select: { affiliates: true } },
      },
    });

    return tiers.map((tier) => ({
      id: tier.id,
      name: tier.name,
      commissionRate: tier.commissionRate.toString(),
      minReferrals: tier.minReferrals,
      color: tier.color,
      isActive: tier.isActive,
      affiliateCount: tier._count.affiliates,
      createdAt: tier.createdAt,
    }));
  }

  async createAffiliateTier(dto: CreateAffiliateTierDto) {
    const tier = await this.prisma.affiliateTier.create({
      data: {
        name: dto.name,
        commissionRate: new Prisma.Decimal(dto.commissionRate),
        minReferrals: dto.minReferrals,
        color: dto.color,
      },
    });

    return {
      id: tier.id,
      name: tier.name,
      commissionRate: tier.commissionRate.toString(),
      message: 'Affiliate tier created successfully',
    };
  }

  async updateAffiliateTier(id: string, dto: UpdateAffiliateTierDto) {
    const tier = await this.prisma.affiliateTier.findUnique({
      where: { id },
    });

    if (!tier) {
      throw new NotFoundException('Affiliate tier not found');
    }

    const updateData: Prisma.AffiliateTierUpdateInput = {};

    if (dto.name) updateData.name = dto.name;
    if (dto.commissionRate !== undefined)
      updateData.commissionRate = new Prisma.Decimal(dto.commissionRate);
    if (dto.minReferrals !== undefined) updateData.minReferrals = dto.minReferrals;
    if (dto.color !== undefined) updateData.color = dto.color;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const updated = await this.prisma.affiliateTier.update({
      where: { id },
      data: updateData,
    });

    return {
      id: updated.id,
      name: updated.name,
      isActive: updated.isActive,
      message: 'Affiliate tier updated successfully',
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

  // ============ AFFILIATE MANAGEMENT ============

  async getAffiliates(query: AffiliateQueryDto) {
    const { page = 1, limit = 20, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.AffiliateWhereInput = {};

    if (search) {
      where.user = {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [affiliates, total] = await Promise.all([
      this.prisma.affiliate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: { referredUsers: true, commissions: true },
          },
        },
      }),
      this.prisma.affiliate.count({ where }),
    ]);

    // Get commission totals and pending/paid for each affiliate
    const affiliateIds = affiliates.map((a) => a.id);
    const [totalCommissions, pendingCommissions, paidCommissions] = await Promise.all([
      this.prisma.commission.groupBy({
        by: ['affiliateId'],
        where: { affiliateId: { in: affiliateIds } },
        _sum: { amount: true },
      }),
      this.prisma.commission.groupBy({
        by: ['affiliateId'],
        where: { affiliateId: { in: affiliateIds }, isPaid: false },
        _sum: { amount: true },
      }),
      this.prisma.commission.groupBy({
        by: ['affiliateId'],
        where: { affiliateId: { in: affiliateIds }, isPaid: true },
        _sum: { amount: true },
      }),
    ]);

    const totalMap = totalCommissions.reduce(
      (acc, curr) => {
        acc[curr.affiliateId] = curr._sum.amount?.toString() ?? '0';
        return acc;
      },
      {} as Record<string, string>,
    );

    const pendingMap = pendingCommissions.reduce(
      (acc, curr) => {
        acc[curr.affiliateId] = curr._sum.amount?.toString() ?? '0';
        return acc;
      },
      {} as Record<string, string>,
    );

    const paidMap = paidCommissions.reduce(
      (acc, curr) => {
        acc[curr.affiliateId] = curr._sum.amount?.toString() ?? '0';
        return acc;
      },
      {} as Record<string, string>,
    );

    return {
      affiliates: affiliates.map((aff) => ({
        id: aff.id,
        userId: aff.userId,
        referralCode: aff.referralCode,
        commissionRate: aff.commissionRate.toString(),
        tier: 'Standard', // No tier in schema, use default
        isActive: aff.isActive,
        totalEarnings: aff.totalEarnings.toString(),
        pendingBalance: pendingMap[aff.id] ?? '0',
        paidBalance: paidMap[aff.id] ?? '0',
        referralCount: aff._count.referredUsers,
        commissionCount: aff._count.commissions,
        totalCommissions: totalMap[aff.id] ?? '0',
        createdAt: aff.createdAt,
        user: aff.user,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateAffiliate(affiliateId: string, dto: UpdateAffiliateDto) {
    const affiliate = await this.prisma.affiliate.findUnique({
      where: { id: affiliateId },
      include: {
        user: {
          select: { email: true },
        },
      },
    });

    if (!affiliate) {
      throw new NotFoundException('Affiliate not found');
    }

    const updateData: Prisma.AffiliateUpdateInput = {};
    const wasActive = affiliate.isActive;

    if (dto.commissionRate !== undefined) {
      updateData.commissionRate = new Prisma.Decimal(dto.commissionRate / 100);
    }
    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    const updated = await this.prisma.affiliate.update({
      where: { id: affiliateId },
      data: updateData,
    });

    // Send email notification if isActive status changed
    if (dto.isActive !== undefined && wasActive !== dto.isActive && affiliate.user.email) {
      this.logger.log(
        `Affiliate status changed for ${affiliate.user.email}: ${wasActive} -> ${dto.isActive}`,
      );
      try {
        if (dto.isActive) {
          // Reactivated
          await this.emailService.sendAffiliateReactivatedEmail(affiliate.user.email);
          this.logger.log(`Reactivation email sent to ${affiliate.user.email}`);
        } else {
          // Deactivated
          await this.emailService.sendAffiliateDeactivatedEmail(affiliate.user.email);
          this.logger.log(`Deactivation email sent to ${affiliate.user.email}`);
        }
      } catch (error) {
        this.logger.error(
          `Failed to send affiliate status email to ${affiliate.user.email}`,
          error,
        );
      }
    }

    return {
      id: updated.id,
      commissionRate: updated.commissionRate.toString(),
      tier: 'Standard',
      isActive: updated.isActive,
      message: 'Affiliate updated successfully',
    };
  }

  async getAffiliateStats() {
    const [
      totalAffiliates,
      activeAffiliates,
      totalReferrals,
      paidCommissions,
    ] = await Promise.all([
      this.prisma.affiliate.count(),
      this.prisma.affiliate.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { referredById: { not: null } } }),
      // In new system, all commissions are credited directly to wallet
      this.prisma.walletTransaction.aggregate({
        where: { type: 'AFFILIATE_COMMISSION' },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalAffiliates,
      activeAffiliates,
      totalReferrals,
      paidCommissions: paidCommissions._sum.amount?.toString() ?? '0',
      tierBreakdown: { Standard: totalAffiliates },
    };
  }

  // ============ TOKEN LOCKS MANAGEMENT ============

  async getLocks(query: AdminLockQueryDto) {
    const { page = 1, limit = 20, status, userId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TokenLockWhereInput = {};

    if (status) {
      where.status = status as LockStatus;
    }
    if (userId) {
      where.userId = userId;
    }

    const [locks, total] = await Promise.all([
      this.prisma.tokenLock.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          lockTier: {
            select: { name: true, lockMonths: true, bonusPercent: true },
          },
        },
      }),
      this.prisma.tokenLock.count({ where }),
    ]);

    return {
      locks: locks.map((lock) => ({
        id: lock.id,
        amount: lock.amount.toString(),
        bonusAmount: lock.rewardAmount.toString(), // rewardAmount is the bonus
        status: lock.status,
        startDate: lock.startDate,
        unlockDate: lock.endDate, // endDate is the unlock date
        createdAt: lock.createdAt,
        user: lock.user,
        tier: lock.lockTier,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getLockStats() {
    const [
      statusStats,
      totalLocked,
      totalReward,
    ] = await Promise.all([
      this.prisma.tokenLock.groupBy({
        by: ['status'],
        _count: true,
        _sum: { amount: true },
      }),
      this.prisma.tokenLock.aggregate({
        where: { status: LockStatus.ACTIVE },
        _sum: { amount: true },
      }),
      this.prisma.tokenLock.aggregate({
        _sum: { rewardAmount: true },
      }),
    ]);

    return {
      statusBreakdown: statusStats.reduce(
        (acc, curr) => {
          acc[curr.status.toLowerCase()] = {
            count: curr._count,
            amount: curr._sum.amount?.toString() ?? '0',
          };
          return acc;
        },
        {} as Record<string, { count: number; amount: string }>,
      ),
      totalActiveLocked: totalLocked._sum.amount?.toString() ?? '0',
      totalBonusAwarded: totalReward._sum?.rewardAmount?.toString() ?? '0',
    };
  }

  // ============ TOKEN PURCHASES MANAGEMENT ============

  async getPurchases(query: AdminPurchaseQueryDto) {
    const { page = 1, limit = 20, status, deliveryMethod, userId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TokenPurchaseWhereInput = {};

    if (status) {
      where.status = status as Prisma.EnumTokenPurchaseStatusFilter;
    }
    if (deliveryMethod) {
      where.deliveryMethod = deliveryMethod as Prisma.EnumTokenDeliveryMethodFilter;
    }
    if (userId) {
      where.userId = userId;
    }

    const [purchases, total] = await Promise.all([
      this.prisma.tokenPurchase.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.tokenPurchase.count({ where }),
    ]);

    return {
      purchases: purchases.map((p) => {
        // Calculate total USD value from hbctAmount * tokenPrice
        const totalUsd = parseFloat(p.hbctAmount.toString()) * parseFloat(p.tokenPrice.toString());
        return {
          id: p.id,
          paymentCurrency: p.paymentCurrency,
          paymentAmount: p.paymentAmount.toString(),
          hbctAmount: p.hbctAmount.toString(),
          pricePerToken: p.tokenPrice.toString(),
          totalUsd: totalUsd.toFixed(2),
          status: p.status,
          deliveryMethod: p.deliveryMethod,
          txHash: p.txHash,
          createdAt: p.createdAt,
          completedAt: null, // No completedAt in schema
          user: p.user,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPurchaseStats() {
    // Get all completed purchases to calculate USD totals
    const completedPurchases = await this.prisma.tokenPurchase.findMany({
      where: { status: 'COMPLETED' },
      select: {
        hbctAmount: true,
        tokenPrice: true,
        paymentCurrency: true,
        deliveryMethod: true,
      },
    });

    // Calculate total USD volume (hbctAmount * tokenPrice for each purchase)
    let totalCompletedVolumeUsd = new Decimal(0);
    let totalTokensSold = new Decimal(0);

    const currencyBreakdown: Record<string, { count: number; totalUsd: Decimal }> = {};
    const deliveryBreakdown: Record<string, { count: number; totalUsd: Decimal }> = {};

    for (const purchase of completedPurchases) {
      const usdValue = purchase.hbctAmount.mul(purchase.tokenPrice);
      totalCompletedVolumeUsd = totalCompletedVolumeUsd.add(usdValue);
      totalTokensSold = totalTokensSold.add(purchase.hbctAmount);

      // Currency breakdown
      const currency = purchase.paymentCurrency.toLowerCase();
      if (!currencyBreakdown[currency]) {
        currencyBreakdown[currency] = { count: 0, totalUsd: new Decimal(0) };
      }
      currencyBreakdown[currency].count++;
      currencyBreakdown[currency].totalUsd = currencyBreakdown[currency].totalUsd.add(usdValue);

      // Delivery breakdown
      const delivery = purchase.deliveryMethod.toLowerCase();
      if (!deliveryBreakdown[delivery]) {
        deliveryBreakdown[delivery] = { count: 0, totalUsd: new Decimal(0) };
      }
      deliveryBreakdown[delivery].count++;
      deliveryBreakdown[delivery].totalUsd = deliveryBreakdown[delivery].totalUsd.add(usdValue);
    }

    // Get status breakdown
    const statusStats = await this.prisma.tokenPurchase.groupBy({
      by: ['status'],
      _count: true,
      _sum: { hbctAmount: true },
    });

    // Calculate USD for each status
    const allPurchases = await this.prisma.tokenPurchase.findMany({
      select: {
        status: true,
        hbctAmount: true,
        tokenPrice: true,
      },
    });

    const statusUsd: Record<string, Decimal> = {};
    for (const purchase of allPurchases) {
      const status = purchase.status.toLowerCase();
      const usdValue = purchase.hbctAmount.mul(purchase.tokenPrice);
      if (!statusUsd[status]) {
        statusUsd[status] = new Decimal(0);
      }
      statusUsd[status] = statusUsd[status].add(usdValue);
    }

    return {
      statusBreakdown: statusStats.reduce(
        (acc, curr) => {
          const status = curr.status.toLowerCase();
          acc[status] = {
            count: curr._count,
            totalUsd: statusUsd[status]?.toFixed(2) ?? '0',
            hbctAmount: curr._sum.hbctAmount?.toString() ?? '0',
          };
          return acc;
        },
        {} as Record<string, { count: number; totalUsd: string; hbctAmount: string }>,
      ),
      totalCompletedVolume: totalCompletedVolumeUsd.toFixed(2),
      totalTokensSold: totalTokensSold.toString(),
      completedPurchases: completedPurchases.length,
      deliveryBreakdown: Object.entries(deliveryBreakdown).reduce(
        (acc, [key, value]) => {
          acc[key] = {
            count: value.count,
            totalUsd: value.totalUsd.toFixed(2),
          };
          return acc;
        },
        {} as Record<string, { count: number; totalUsd: string }>,
      ),
      currencyBreakdown: Object.entries(currencyBreakdown).reduce(
        (acc, [key, value]) => {
          acc[key] = {
            count: value.count,
            totalUsd: value.totalUsd.toFixed(2),
          };
          return acc;
        },
        {} as Record<string, { count: number; totalUsd: string }>,
      ),
    };
  }
}
