import { Injectable, Logger, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BlockchainClientService, TransferEvent } from '../blockchain/blockchain.client';
import { BlockchainConfigService } from '../blockchain/blockchain.config';
import { BalanceService } from '../wallet/services/balance.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  OnchainDepositStatus,
  Currency,
  WalletTransactionType,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  normalizePagination,
  createCustomPaginatedResponse,
  type CustomPaginatedResponse,
} from '../../common/utils';

export interface DepositListParams {
  userId?: string;
  status?: OnchainDepositStatus;
  fromAddress?: string;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  limit?: number;
}

export type DepositListResult = CustomPaginatedResponse<any, 'deposits'>;

@Injectable()
export class DepositsService {
  private readonly logger = new Logger(DepositsService.name);
  private lastProcessedBlock: bigint = BigInt(0);
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchainClient: BlockchainClientService,
    private readonly blockchainConfig: BlockchainConfigService,
    private readonly balanceService: BalanceService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Get user's deposit history
   */
  async getUserDeposits(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<DepositListResult> {
    const pagination = normalizePagination({ page, limit });

    const [deposits, total] = await Promise.all([
      this.prisma.onchainDeposit.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.onchainDeposit.count({ where: { userId } }),
    ]);

    return createCustomPaginatedResponse(
      deposits.map((d) => this.formatDeposit(d)),
      total,
      pagination,
      'deposits',
    );
  }

  /**
   * Get deposit by ID
   */
  async getDepositById(depositId: string, userId?: string): Promise<any> {
    const where: Prisma.OnchainDepositWhereInput = { id: depositId };
    if (userId) {
      where.userId = userId;
    }

    const deposit = await this.prisma.onchainDeposit.findFirst({ where });

    if (!deposit) {
      throw new NotFoundException('Deposit not found');
    }

    return this.formatDeposit(deposit);
  }

  /**
   * Admin: Get all deposits with filters
   */
  async getDeposits(params: DepositListParams): Promise<DepositListResult> {
    const { userId, status, fromAddress, fromDate, toDate } = params;
    const pagination = normalizePagination(params);

    const where: Prisma.OnchainDepositWhereInput = {};

    if (userId) where.userId = userId;
    if (status) where.status = status;
    if (fromAddress) where.fromAddress = fromAddress.toLowerCase();
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = fromDate;
      if (toDate) where.createdAt.lte = toDate;
    }

    const [deposits, total] = await Promise.all([
      this.prisma.onchainDeposit.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              walletAddress: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.onchainDeposit.count({ where }),
    ]);

    return createCustomPaginatedResponse(
      deposits.map((d) => this.formatDeposit(d)),
      total,
      pagination,
      'deposits',
    );
  }

  /**
   * Get unmapped deposits (for admin review)
   */
  async getUnmappedDeposits(page = 1, limit = 20): Promise<DepositListResult> {
    return this.getDeposits({
      status: OnchainDepositStatus.UNMAPPED,
      page,
      limit,
    });
  }

  /**
   * Lock duration for manual mappings from unverified wallets (24 hours)
   */
  private readonly LOCK_DURATION_MS = 24 * 60 * 60 * 1000;

  /**
   * Manually map a deposit to a user
   * - If user's wallet matches deposit's fromAddress → Credit immediately
   * - If not → Lock for 24 hours before releasing
   */
  async mapDepositToUser(depositId: string, userId: string, adminId?: string): Promise<any> {
    const deposit = await this.prisma.onchainDeposit.findUnique({
      where: { id: depositId },
    });

    if (!deposit) {
      throw new NotFoundException('Deposit not found');
    }

    if (deposit.status !== OnchainDepositStatus.UNMAPPED) {
      throw new Error('Only unmapped deposits can be manually mapped');
    }

    // Verify user exists and get their wallet info
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallets: {
          select: { walletAddress: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if deposit's fromAddress matches any of user's wallets
    const userWallets: string[] = [];
    if (user.walletAddress) {
      userWallets.push(user.walletAddress.toLowerCase());
    }
    if (user.wallets) {
      for (const w of user.wallets) {
        const addr = w.walletAddress.toLowerCase();
        if (!userWallets.includes(addr)) {
          userWallets.push(addr);
        }
      }
    }

    const depositFromAddr = deposit.fromAddress.toLowerCase();
    const walletVerified = userWallets.includes(depositFromAddr);

    if (walletVerified) {
      // Wallet matches - credit immediately (no lock needed)
      this.logger.log(
        `Mapping deposit ${depositId} to user ${userId} - wallet verified, crediting immediately`,
      );

      const updatedDeposit = await this.prisma.onchainDeposit.update({
        where: { id: depositId },
        data: {
          userId,
          status: OnchainDepositStatus.CONFIRMED,
          walletVerified: true,
          lockedByAdminId: adminId,
        },
      });

      // Credit balance immediately
      await this.creditDepositToUser(updatedDeposit);

      return {
        ...this.formatDeposit(updatedDeposit),
        locked: false,
        walletVerified: true,
      };
    } else {
      // Wallet doesn't match - lock for 24 hours
      const lockedUntil = new Date(Date.now() + this.LOCK_DURATION_MS);

      this.logger.log(
        `Mapping deposit ${depositId} to user ${userId} - wallet NOT verified, locking until ${lockedUntil.toISOString()}`,
      );

      const updatedDeposit = await this.prisma.onchainDeposit.update({
        where: { id: depositId },
        data: {
          userId,
          status: OnchainDepositStatus.LOCKED,
          walletVerified: false,
          lockedAt: new Date(),
          lockedUntil,
          lockedByAdminId: adminId,
          lockReason: 'Deposit wallet address does not match user linked wallets',
        },
      });

      // Notify user about the locked deposit
      try {
        await this.notificationsService.create({
          userId,
          type: NotificationType.SYSTEM,
          title: 'Deposit Pending Release',
          message: `A deposit of ${deposit.amount} HBCT has been credited to your account but is locked for 24 hours for security verification. It will be automatically released on ${lockedUntil.toLocaleString()}.`,
          actionUrl: '/wallet',
        });
      } catch (notifyError) {
        this.logger.warn(`Failed to send locked deposit notification: ${notifyError.message}`);
      }

      return {
        ...this.formatDeposit(updatedDeposit),
        locked: true,
        lockedUntil: lockedUntil.toISOString(),
        walletVerified: false,
      };
    }
  }

  /**
   * Admin: Release a locked deposit early
   */
  async releasePendingDeposit(depositId: string, adminId: string, reason: string): Promise<any> {
    const deposit = await this.prisma.onchainDeposit.findUnique({
      where: { id: depositId },
      include: { user: true },
    });

    if (!deposit) {
      throw new NotFoundException('Deposit not found');
    }

    if (deposit.status !== OnchainDepositStatus.LOCKED) {
      throw new Error('Only locked deposits can be released');
    }

    if (!deposit.userId) {
      throw new Error('Deposit is not mapped to any user');
    }

    this.logger.log(
      `Admin ${adminId} releasing locked deposit ${depositId} early: ${reason}`,
    );

    // Update deposit status
    const updatedDeposit = await this.prisma.onchainDeposit.update({
      where: { id: depositId },
      data: {
        status: OnchainDepositStatus.CONFIRMED,
        releasedAt: new Date(),
        releasedByAdminId: adminId,
      },
    });

    // Credit the balance
    await this.creditDepositToUser(updatedDeposit);

    // Notify user
    try {
      await this.notificationsService.create({
        userId: deposit.userId,
        type: NotificationType.SYSTEM,
        title: 'Deposit Released',
        message: `Your pending deposit of ${deposit.amount} HBCT has been released and is now available in your balance.`,
        actionUrl: '/wallet',
      });
    } catch (notifyError) {
      this.logger.warn(`Failed to send release notification: ${notifyError.message}`);
    }

    return this.formatDeposit(updatedDeposit);
  }

  /**
   * Auto-release expired locked deposits (called by scheduled job)
   */
  async releaseExpiredDeposits(): Promise<number> {
    const now = new Date();

    // Find all locked deposits that have passed their lock time
    const expiredDeposits = await this.prisma.onchainDeposit.findMany({
      where: {
        status: OnchainDepositStatus.LOCKED,
        lockedUntil: {
          lte: now,
        },
      },
      include: { user: true },
    });

    if (expiredDeposits.length === 0) {
      return 0;
    }

    this.logger.log(`Auto-releasing ${expiredDeposits.length} expired locked deposits`);

    let releasedCount = 0;
    for (const deposit of expiredDeposits) {
      try {
        // Update status to CONFIRMED
        const updatedDeposit = await this.prisma.onchainDeposit.update({
          where: { id: deposit.id },
          data: {
            status: OnchainDepositStatus.CONFIRMED,
            releasedAt: now,
          },
        });

        // Credit the balance
        await this.creditDepositToUser(updatedDeposit);

        // Notify user
        if (deposit.userId) {
          try {
            await this.notificationsService.create({
              userId: deposit.userId,
              type: NotificationType.SYSTEM,
              title: 'Deposit Released',
              message: `Your pending deposit of ${deposit.amount} HBCT has been automatically released and is now available in your balance.`,
              actionUrl: '/wallet',
            });
          } catch (notifyError) {
            this.logger.warn(`Failed to send auto-release notification: ${notifyError.message}`);
          }
        }

        releasedCount++;
        this.logger.log(`Auto-released deposit ${deposit.id} for user ${deposit.userId}`);
      } catch (error) {
        this.logger.error(`Failed to auto-release deposit ${deposit.id}: ${error.message}`);
      }
    }

    return releasedCount;
  }

  /**
   * Get locked deposits for admin view
   */
  async getLockedDeposits(page = 1, limit = 20): Promise<DepositListResult> {
    return this.getDeposits({
      status: OnchainDepositStatus.LOCKED,
      page,
      limit,
    });
  }

  /**
   * Get deposit details with user balance for admin decision making
   */
  async getDepositWithUserBalance(depositId: string): Promise<{
    deposit: any;
    userBalance: string;
    canDebit: boolean;
  }> {
    const deposit = await this.prisma.onchainDeposit.findUnique({
      where: { id: depositId },
      include: { user: true },
    });

    if (!deposit) {
      throw new NotFoundException('Deposit not found');
    }

    if (!deposit.userId) {
      return {
        deposit: this.formatDeposit(deposit),
        userBalance: '0',
        canDebit: false,
      };
    }

    const userBalance = await this.balanceService.getAvailableBalance(
      deposit.userId,
      Currency.HBCT,
    );

    return {
      deposit: this.formatDeposit(deposit),
      userBalance: userBalance.toString(),
      canDebit: userBalance.greaterThanOrEqualTo(deposit.amount),
    };
  }

  /**
   * Unmap a deposit (reverse a wrong mapping)
   * This will debit the amount from the user's balance
   * @param force - If true, unmap without debiting (for cases where user has insufficient balance)
   */
  async unmapDeposit(
    depositId: string,
    adminId: string,
    reason: string,
    force: boolean = false,
  ): Promise<any> {
    const deposit = await this.prisma.onchainDeposit.findUnique({
      where: { id: depositId },
      include: { user: true },
    });

    if (!deposit) {
      throw new NotFoundException('Deposit not found');
    }

    if (!deposit.userId) {
      throw new Error('Deposit is not mapped to any user');
    }

    if (deposit.status !== OnchainDepositStatus.CREDITED) {
      throw new Error('Only credited deposits can be unmapped');
    }

    const oldUserId = deposit.userId;

    // Check user's available balance
    const userBalance = await this.balanceService.getAvailableBalance(
      deposit.userId,
      Currency.HBCT,
    );

    const hasInsufficientBalance = userBalance.lessThan(deposit.amount);

    if (hasInsufficientBalance && !force) {
      throw new Error(
        `User has insufficient balance (${userBalance} HBCT available, need ${deposit.amount} HBCT). Use force option to unmap without debiting.`,
      );
    }

    // Only debit if user has sufficient balance and not forcing
    if (!hasInsufficientBalance) {
      const debitResult = await this.balanceService.debitBalance({
        userId: deposit.userId,
        currency: Currency.HBCT,
        amount: deposit.amount,
        type: WalletTransactionType.ADMIN_ADJUSTMENT,
        description: `Deposit unmapped by admin: ${reason}`,
        metadata: {
          depositId: deposit.id,
          txHash: deposit.txHash,
          adminId,
          reason,
          action: 'ADMIN_UNMAP',
        },
      });

      if (!debitResult.success) {
        throw new Error(`Failed to debit balance: ${debitResult.error}`);
      }
    } else {
      // Force unmap - log that no debit was made
      this.logger.warn(
        `Force unmapping deposit ${depositId} without debit - user ${deposit.userId} has insufficient balance (${userBalance} < ${deposit.amount})`,
      );
    }

    // Update deposit to unmapped status
    const updatedDeposit = await this.prisma.onchainDeposit.update({
      where: { id: depositId },
      data: {
        userId: null,
        status: OnchainDepositStatus.UNMAPPED,
        creditedAt: null,
      },
    });

    this.logger.log(
      `Unmapped deposit ${depositId} from user ${oldUserId} by admin ${adminId}: ${reason}${force ? ' (forced without debit)' : ''}`,
    );

    // Notify user about the reversal
    try {
      const notifyMessage = hasInsufficientBalance
        ? `A deposit of ${deposit.amount} HBCT has been reversed (administrative action). Reason: ${reason}`
        : `A deposit of ${deposit.amount} HBCT has been reversed. Reason: ${reason}`;

      await this.notificationsService.create({
        userId: oldUserId,
        type: NotificationType.SYSTEM,
        title: 'Deposit Reversed',
        message: notifyMessage,
        actionUrl: '/wallet',
      });
    } catch (notifyError) {
      this.logger.warn(`Failed to send unmap notification: ${notifyError.message}`);
    }

    return {
      ...this.formatDeposit(updatedDeposit),
      forcedWithoutDebit: hasInsufficientBalance && force,
    };
  }

  /**
   * Reassign a deposit to a different user
   * This unmaps from current user and maps to new user in one transaction
   * @param force - If true, reassign without debiting from old user (for cases where user has insufficient balance)
   */
  async reassignDeposit(
    depositId: string,
    newUserId: string,
    adminId: string,
    reason: string,
    force: boolean = false,
  ): Promise<any> {
    const deposit = await this.prisma.onchainDeposit.findUnique({
      where: { id: depositId },
      include: { user: true },
    });

    if (!deposit) {
      throw new NotFoundException('Deposit not found');
    }

    if (!deposit.userId) {
      throw new Error('Deposit is not mapped. Use map instead of reassign.');
    }

    if (deposit.userId === newUserId) {
      throw new Error('New user is the same as current user');
    }

    // Verify new user exists
    const newUser = await this.prisma.user.findUnique({
      where: { id: newUserId },
    });

    if (!newUser) {
      throw new NotFoundException('New user not found');
    }

    const oldUserId = deposit.userId;
    let forcedWithoutDebit = false;

    // Only debit if the deposit was credited
    if (deposit.status === OnchainDepositStatus.CREDITED) {
      // Check old user's available balance
      const userBalance = await this.balanceService.getAvailableBalance(
        oldUserId,
        Currency.HBCT,
      );

      const hasInsufficientBalance = userBalance.lessThan(deposit.amount);

      if (hasInsufficientBalance && !force) {
        throw new Error(
          `Old user has insufficient balance (${userBalance} HBCT available, need ${deposit.amount} HBCT). Use force option to reassign without debiting.`,
        );
      }

      if (!hasInsufficientBalance) {
        // Debit from old user
        const debitResult = await this.balanceService.debitBalance({
          userId: oldUserId,
          currency: Currency.HBCT,
          amount: deposit.amount,
          type: WalletTransactionType.ADMIN_ADJUSTMENT,
          description: `Deposit reassigned to another user: ${reason}`,
          metadata: {
            depositId: deposit.id,
            txHash: deposit.txHash,
            adminId,
            reason,
            reassignedTo: newUserId,
            action: 'ADMIN_REASSIGN',
          },
        });

        if (!debitResult.success) {
          throw new Error(`Failed to debit from old user: ${debitResult.error}`);
        }
      } else {
        // Force reassign - log that no debit was made
        forcedWithoutDebit = true;
        this.logger.warn(
          `Force reassigning deposit ${depositId} without debit - old user ${oldUserId} has insufficient balance (${userBalance} < ${deposit.amount})`,
        );
      }
    }

    // Update deposit with new user
    const updatedDeposit = await this.prisma.onchainDeposit.update({
      where: { id: depositId },
      data: {
        userId: newUserId,
        status: OnchainDepositStatus.CONFIRMED,
        creditedAt: null,
      },
    });

    // Credit to new user
    await this.creditDepositToUser(updatedDeposit);

    this.logger.log(
      `Reassigned deposit ${depositId} from user ${oldUserId} to ${newUserId} by admin ${adminId}: ${reason}${forcedWithoutDebit ? ' (forced without debit from old user)' : ''}`,
    );

    // Notify old user
    try {
      const notifyMessage = forcedWithoutDebit
        ? `A deposit of ${deposit.amount} HBCT has been reassigned (administrative action). Reason: ${reason}`
        : `A deposit of ${deposit.amount} HBCT has been reassigned. Reason: ${reason}`;

      await this.notificationsService.create({
        userId: oldUserId,
        type: NotificationType.SYSTEM,
        title: 'Deposit Reassigned',
        message: notifyMessage,
        actionUrl: '/wallet',
      });
    } catch (notifyError) {
      this.logger.warn(`Failed to send reassign notification to old user: ${notifyError.message}`);
    }

    return {
      ...this.formatDeposit(updatedDeposit),
      forcedWithoutDebit,
    };
  }

  /**
   * Process new deposit events from blockchain
   */
  async processNewDeposits(): Promise<number> {
    if (this.isProcessing) {
      this.logger.debug('Deposit processing already in progress, skipping');
      return 0;
    }

    if (!this.blockchainConfig.isDepositEnabled()) {
      this.logger.debug('Deposits not enabled, skipping');
      return 0;
    }

    this.isProcessing = true;
    let processedCount = 0;

    try {
      const currentBlock = await this.blockchainClient.getCurrentBlockNumber();

      // Get last processed block from database
      if (this.lastProcessedBlock === BigInt(0)) {
        const lastDeposit = await this.prisma.onchainDeposit.findFirst({
          orderBy: { blockNumber: 'desc' },
        });
        this.lastProcessedBlock = lastDeposit
          ? BigInt(lastDeposit.blockNumber.toString())
          : currentBlock - BigInt(50); // Start from 50 blocks ago if no deposits
      }

      // Process in chunks of 100 blocks (BSC public RPC limit)
      const fromBlock = this.lastProcessedBlock + BigInt(1);
      const toBlock =
        currentBlock - BigInt(this.blockchainConfig.minConfirmations);

      if (fromBlock > toBlock) {
        this.logger.debug('No new blocks to process');
        return 0;
      }

      // BSC public RPC nodes limit eth_getLogs to ~100-500 blocks
      const maxBlocksPerBatch = BigInt(100);
      const actualToBlock =
        toBlock - fromBlock > maxBlocksPerBatch
          ? fromBlock + maxBlocksPerBatch
          : toBlock;

      this.logger.log(`Processing blocks ${fromBlock} to ${actualToBlock}`);

      // Get transfer events
      const events = await this.blockchainClient.getTransferEvents(
        fromBlock,
        actualToBlock,
      );

      this.logger.log(`Found ${events.length} deposit events`);

      // Process each event
      for (const event of events) {
        const processed = await this.processDepositEvent(event);
        if (processed) processedCount++;
      }

      // Update last processed block
      this.lastProcessedBlock = actualToBlock;

      return processedCount;
    } catch (error) {
      this.logger.error(`Error processing deposits: ${error.message}`);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single deposit event
   */
  private async processDepositEvent(event: TransferEvent): Promise<boolean> {
    const { txHash, logIndex, from, to, value, blockNumber, blockTimestamp } = event;

    // Check if already processed
    const exists = await this.prisma.processedBlockchainEvent.findUnique({
      where: {
        txHash_logIndex_eventType_chainId: {
          txHash,
          logIndex,
          eventType: 'DEPOSIT',
          chainId: this.blockchainConfig.chainId,
        },
      },
    });

    if (exists) {
      this.logger.debug(`Event ${txHash}:${logIndex} already processed`);
      return false;
    }

    // Find user by wallet address - check both primary wallet and linked wallets
    const fromAddressLower = from.toLowerCase();

    // First, check primary wallet address
    let user = await this.prisma.user.findFirst({
      where: { walletAddress: fromAddressLower },
    });

    // If not found, check linked wallets table (UserWallet)
    if (!user) {
      const userWallet = await this.prisma.userWallet.findFirst({
        where: { walletAddress: fromAddressLower },
        include: { user: true },
      });
      if (userWallet) {
        user = userWallet.user;
      }
    }

    const amount = this.blockchainClient.formatAmount(value);

    // Create deposit record
    await this.prisma.$transaction(async (tx) => {
      // Mark event as processed
      await tx.processedBlockchainEvent.create({
        data: {
          txHash,
          logIndex,
          eventType: 'DEPOSIT',
          chainId: this.blockchainConfig.chainId,
        },
      });

      // Create deposit
      await tx.onchainDeposit.create({
        data: {
          userId: user?.id || null,
          txHash,
          logIndex,
          fromAddress: from.toLowerCase(),
          toAddress: to.toLowerCase(),
          amount: new Decimal(amount),
          tokenAddress: this.blockchainConfig.hbctTokenAddress.toLowerCase(),
          blockNumber: BigInt(blockNumber),
          blockTimestamp,
          chainId: this.blockchainConfig.chainId,
          status: user
            ? OnchainDepositStatus.CONFIRMED
            : OnchainDepositStatus.UNMAPPED,
          confirmations: this.blockchainConfig.minConfirmations,
        },
      });

      this.logger.log(
        `Created deposit: ${txHash}:${logIndex} - ${amount} HBCT from ${from} (User: ${user?.id || 'UNMAPPED'})`,
      );
    });

    // If user found, credit balance
    if (user) {
      const deposit = await this.prisma.onchainDeposit.findUnique({
        where: { txHash_logIndex: { txHash, logIndex } },
      });
      if (deposit) {
        await this.creditDepositToUser(deposit);
      }
    }

    return true;
  }

  /**
   * Credit deposit amount to user's balance
   */
  private async creditDepositToUser(deposit: any): Promise<void> {
    if (!deposit.userId || deposit.status === OnchainDepositStatus.CREDITED) {
      return;
    }

    try {
      // Ensure user has wallet balances initialized
      await this.balanceService.initializeUserBalances(deposit.userId);

      // Credit balance
      const result = await this.balanceService.creditBalance({
        userId: deposit.userId,
        currency: Currency.HBCT,
        amount: deposit.amount,
        type: WalletTransactionType.DEPOSIT,
        description: `On-chain deposit from ${deposit.fromAddress}`,
        metadata: {
          txHash: deposit.txHash,
          blockNumber: deposit.blockNumber.toString(),
          fromAddress: deposit.fromAddress,
        },
      });

      if (result.success) {
        // Update deposit status
        await this.prisma.onchainDeposit.update({
          where: { id: deposit.id },
          data: {
            status: OnchainDepositStatus.CREDITED,
            creditedAt: new Date(),
          },
        });

        this.logger.log(
          `Credited ${deposit.amount} HBCT to user ${deposit.userId} from deposit ${deposit.id}`,
        );

        // Send notification
        try {
          await this.notificationsService.notifyDeposit(
            deposit.userId,
            deposit.amount.toString(),
            'HBCT',
            deposit.txHash,
          );
        } catch (notifyError) {
          this.logger.warn(`Failed to send deposit notification: ${notifyError.message}`);
        }
      } else {
        this.logger.error(
          `Failed to credit deposit ${deposit.id}: ${result.error}`,
        );
        await this.prisma.onchainDeposit.update({
          where: { id: deposit.id },
          data: {
            status: OnchainDepositStatus.FAILED,
            failureReason: result.error,
          },
        });
      }
    } catch (error) {
      this.logger.error(`Error crediting deposit ${deposit.id}: ${error.message}`);
      await this.prisma.onchainDeposit.update({
        where: { id: deposit.id },
        data: {
          status: OnchainDepositStatus.FAILED,
          failureReason: error.message,
        },
      });
    }
  }

  /**
   * Confirm pending deposits with sufficient confirmations
   */
  async confirmPendingDeposits(): Promise<number> {
    const pendingDeposits = await this.prisma.onchainDeposit.findMany({
      where: { status: OnchainDepositStatus.PENDING },
    });

    let confirmedCount = 0;

    for (const deposit of pendingDeposits) {
      try {
        const confirmations = await this.blockchainClient.getConfirmations(
          BigInt(deposit.blockNumber.toString()),
        );

        if (confirmations >= this.blockchainConfig.minConfirmations) {
          await this.prisma.onchainDeposit.update({
            where: { id: deposit.id },
            data: {
              status: deposit.userId
                ? OnchainDepositStatus.CONFIRMED
                : OnchainDepositStatus.UNMAPPED,
              confirmations,
            },
          });

          // Credit if user exists
          if (deposit.userId) {
            await this.creditDepositToUser(deposit);
          }

          confirmedCount++;
        } else {
          // Update confirmation count
          await this.prisma.onchainDeposit.update({
            where: { id: deposit.id },
            data: { confirmations },
          });
        }
      } catch (error) {
        this.logger.error(`Error confirming deposit ${deposit.id}: ${error.message}`);
      }
    }

    return confirmedCount;
  }

  /**
   * Check for new deposits for a specific user (on-demand)
   * Only checks for deposits FROM the user's linked wallet address
   * This is called when user clicks "Check for Deposits" button
   */
  async checkUserDeposits(userId: string): Promise<{
    checked: boolean;
    newDeposits: number;
    message: string;
  }> {
    // Get user's wallet address
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { walletAddress: true },
    });

    if (!user?.walletAddress) {
      return {
        checked: false,
        newDeposits: 0,
        message: 'No wallet linked. Please link your wallet first.',
      };
    }

    if (!this.blockchainConfig.isDepositEnabled()) {
      return {
        checked: false,
        newDeposits: 0,
        message: 'Deposit checking is not configured.',
      };
    }

    try {
      // Get current block and calculate range
      // BSC testnet public RPC has very strict limits - use only 5 blocks
      const currentBlock = await this.blockchainClient.getCurrentBlockNumber();
      const minConfirmations = BigInt(this.blockchainConfig.minConfirmations);
      const toBlock = currentBlock - minConfirmations;
      const fromBlock = toBlock - BigInt(5); // Only check last 5 blocks (~15 seconds)

      if (fromBlock > toBlock || fromBlock < BigInt(0)) {
        return {
          checked: true,
          newDeposits: 0,
          message: 'No new blocks to check.',
        };
      }

      const walletAddress = user.walletAddress!; // Already checked above
      this.logger.log(`Checking deposits for user ${userId} from block ${fromBlock} to ${toBlock}`);

      // Get transfer events with small range to avoid RPC limits
      let events: any[] = [];
      try {
        events = await this.blockchainClient.getTransferEvents(fromBlock, toBlock);
      } catch (rpcError: any) {
        // Check if it's a rate limit error
        const isRateLimit =
          rpcError.message?.includes('limit') ||
          rpcError.message?.includes('rate') ||
          rpcError.message?.includes('exceeded');

        if (isRateLimit) {
          this.logger.warn(`RPC rate limit hit for user ${userId}`);
          return {
            checked: false,
            newDeposits: 0,
            message: 'Blockchain is busy. Please wait 30 seconds and try again, or submit your transaction hash below.',
          };
        }

        throw rpcError;
      }

      // Filter events from user's wallet
      const userEvents = events.filter(
        (e) => e.from.toLowerCase() === walletAddress.toLowerCase(),
      );

      this.logger.log(`Found ${userEvents.length} potential deposits from ${walletAddress}`);

      let newDeposits = 0;
      for (const event of userEvents) {
        const processed = await this.processDepositEvent(event);
        if (processed) newDeposits++;
      }

      return {
        checked: true,
        newDeposits,
        message: newDeposits > 0
          ? `Found ${newDeposits} new deposit(s). Balance updated.`
          : 'No new deposits found in recent blocks. If you just sent a deposit, please wait 1-2 minutes for confirmation.',
      };
    } catch (error: any) {
      this.logger.error(`Error checking deposits for user ${userId}: ${error.message}`);
      return {
        checked: false,
        newDeposits: 0,
        message: 'Unable to check blockchain. Please try again later or submit your transaction hash.',
      };
    }
  }

  /**
   * Verify and process a deposit by transaction hash
   * More reliable than block scanning - directly checks the specific transaction
   */
  async verifyDepositByTxHash(
    userId: string,
    txHash: string,
  ): Promise<{
    success: boolean;
    message: string;
    deposit?: any;
  }> {
    // Validate tx hash format
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return {
        success: false,
        message: 'Invalid transaction hash format.',
      };
    }

    // Check if already processed
    const existingDeposit = await this.prisma.onchainDeposit.findFirst({
      where: { txHash: txHash.toLowerCase() },
    });

    if (existingDeposit) {
      return {
        success: true,
        message: 'This deposit has already been processed.',
        deposit: this.formatDeposit(existingDeposit),
      };
    }

    // Get ALL user's linked wallet addresses
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallets: {
          select: { walletAddress: true },
        },
      },
    });

    // Collect all wallet addresses (primary + linked)
    const userWallets: string[] = [];
    if (user?.walletAddress) {
      userWallets.push(user.walletAddress.toLowerCase());
    }
    if (user?.wallets) {
      for (const w of user.wallets) {
        const addr = w.walletAddress.toLowerCase();
        if (!userWallets.includes(addr)) {
          userWallets.push(addr);
        }
      }
    }

    if (userWallets.length === 0) {
      return {
        success: false,
        message: 'Please link your wallet first.',
      };
    }

    try {
      // Get the transfer event from the transaction
      const event = await this.blockchainClient.getTransferEventByTxHash(txHash);

      if (!event) {
        return {
          success: false,
          message: 'Transaction not found or not a valid HBCT deposit to our address. Please verify the transaction hash.',
        };
      }

      // Verify the deposit is from ANY of user's linked wallets
      const txFromAddress = event.from.toLowerCase();
      if (!userWallets.includes(txFromAddress)) {
        return {
          success: false,
          message: 'This transaction was not sent from any of your linked wallets.',
        };
      }

      // Check confirmations
      const confirmations = await this.blockchainClient.getConfirmations(event.blockNumber);
      if (confirmations < this.blockchainConfig.minConfirmations) {
        return {
          success: false,
          message: `Transaction needs more confirmations. Current: ${confirmations}, Required: ${this.blockchainConfig.minConfirmations}. Please wait a moment.`,
        };
      }

      // Process the deposit
      const processed = await this.processDepositEvent(event);

      if (processed) {
        const deposit = await this.prisma.onchainDeposit.findFirst({
          where: { txHash: txHash.toLowerCase() },
        });

        return {
          success: true,
          message: 'Deposit verified and credited to your account!',
          deposit: deposit ? this.formatDeposit(deposit) : undefined,
        };
      } else {
        return {
          success: false,
          message: 'Deposit could not be processed. It may have already been credited.',
        };
      }
    } catch (error: any) {
      this.logger.error(`Error verifying deposit by tx hash: ${error.message}`);

      // Check if it's a rate limit error
      const isRateLimit =
        error.message?.includes('limit') ||
        error.message?.includes('rate') ||
        error.message?.includes('exceeded');

      if (isRateLimit) {
        return {
          success: false,
          message: 'Blockchain is busy. Please wait 30 seconds and try again.',
        };
      }

      return {
        success: false,
        message: 'Unable to verify transaction. Please try again later.',
      };
    }
  }

  /**
   * Check for deposits from a specific wallet address
   * Returns detailed transaction info for the modal
   */
  async checkWalletDeposits(
    userId: string,
    walletAddress: string,
  ): Promise<{
    success: boolean;
    message: string;
    transactions: {
      txHash: string;
      amount: string;
      status: 'new' | 'existing' | 'pending';
      blockNumber?: string;
      confirmations?: number;
    }[];
    totalNewDeposits: number;
    totalAmount: string;
  }> {
    // Verify wallet belongs to user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallets: {
          where: { walletAddress: walletAddress.toLowerCase() },
        },
      },
    });

    if (!user || user.wallets.length === 0) {
      return {
        success: false,
        message: 'Wallet not linked to your account.',
        transactions: [],
        totalNewDeposits: 0,
        totalAmount: '0',
      };
    }

    if (!this.blockchainConfig.isDepositEnabled()) {
      return {
        success: false,
        message: 'Deposit system is not configured.',
        transactions: [],
        totalNewDeposits: 0,
        totalAmount: '0',
      };
    }

    try {
      // Scan last 100 blocks (~5 minutes on BSC)
      const currentBlock = await this.blockchainClient.getCurrentBlockNumber();
      const minConfirmations = BigInt(this.blockchainConfig.minConfirmations);
      const toBlock = currentBlock - minConfirmations;
      const fromBlock = toBlock - BigInt(100);

      this.logger.log(
        `Checking deposits for wallet ${walletAddress} from block ${fromBlock} to ${toBlock}`,
      );

      // Get transfer events
      let events: any[] = [];
      try {
        events = await this.blockchainClient.getTransferEvents(fromBlock, toBlock);
      } catch (rpcError: any) {
        const isRateLimit =
          rpcError.message?.includes('limit') ||
          rpcError.message?.includes('rate') ||
          rpcError.message?.includes('exceeded');

        if (isRateLimit) {
          return {
            success: false,
            message: 'Blockchain is busy. Please try again in 30 seconds or use transaction hash verification for older deposits.',
            transactions: [],
            totalNewDeposits: 0,
            totalAmount: '0',
          };
        }
        throw rpcError;
      }

      // Filter events from user's wallet
      const userEvents = events.filter(
        (e) => e.from.toLowerCase() === walletAddress.toLowerCase(),
      );

      this.logger.log(`Found ${userEvents.length} transactions from ${walletAddress}`);

      const transactions: {
        txHash: string;
        amount: string;
        status: 'new' | 'existing' | 'pending';
        blockNumber?: string;
        confirmations?: number;
      }[] = [];

      let totalNewDeposits = 0;
      let totalNewAmount = new Decimal(0);

      for (const event of userEvents) {
        const amount = this.blockchainClient.formatAmount(event.value);

        // Check if already in database
        const existing = await this.prisma.onchainDeposit.findFirst({
          where: { txHash: event.txHash.toLowerCase() },
        });

        if (existing) {
          // Already processed
          transactions.push({
            txHash: event.txHash,
            amount,
            status: 'existing',
            blockNumber: event.blockNumber.toString(),
          });
        } else {
          // New deposit - process it
          const processed = await this.processDepositEvent(event);

          if (processed) {
            totalNewDeposits++;
            totalNewAmount = totalNewAmount.add(new Decimal(amount));
            transactions.push({
              txHash: event.txHash,
              amount,
              status: 'new',
              blockNumber: event.blockNumber.toString(),
            });
          }
        }
      }

      // Also check for existing deposits from this wallet in database (for display)
      const existingDeposits = await this.prisma.onchainDeposit.findMany({
        where: {
          fromAddress: walletAddress.toLowerCase(),
          userId,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      // Add existing deposits not in current scan
      for (const dep of existingDeposits) {
        if (!transactions.find((t) => t.txHash.toLowerCase() === dep.txHash.toLowerCase())) {
          transactions.push({
            txHash: dep.txHash,
            amount: dep.amount.toString(),
            status: 'existing',
            blockNumber: dep.blockNumber.toString(),
          });
        }
      }

      const message =
        totalNewDeposits > 0
          ? `Found ${totalNewDeposits} new deposit(s)!`
          : transactions.length > 0
            ? 'No new deposits. All transactions have been credited.'
            : 'No deposits found from this wallet in recent blocks.';

      return {
        success: true,
        message,
        transactions,
        totalNewDeposits,
        totalAmount: totalNewAmount.toString(),
      };
    } catch (error: any) {
      this.logger.error(`Error checking wallet deposits: ${error.message}`);
      return {
        success: false,
        message: 'Unable to check blockchain. Please try again.',
        transactions: [],
        totalNewDeposits: 0,
        totalAmount: '0',
      };
    }
  }

  // ============================================
  // ADMIN: HISTORICAL SCAN METHODS
  // ============================================

  /**
   * Admin: Process a specific transaction by hash
   * This allows admin to credit deposits that users complain about
   * No user verification - admin can process any deposit to our address
   */
  async adminProcessTransactionByHash(txHash: string): Promise<{
    success: boolean;
    message: string;
    deposit?: any;
    alreadyExists?: boolean;
  }> {
    // Validate tx hash format
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return {
        success: false,
        message: 'Invalid transaction hash format.',
      };
    }

    // Check if already processed
    const existingDeposit = await this.prisma.onchainDeposit.findFirst({
      where: { txHash: txHash.toLowerCase() },
      include: { user: true },
    });

    if (existingDeposit) {
      return {
        success: true,
        message: 'This deposit already exists in the system.',
        deposit: this.formatDeposit(existingDeposit),
        alreadyExists: true,
      };
    }

    try {
      // Get the transfer event from the transaction
      const event = await this.blockchainClient.getTransferEventByTxHash(txHash);

      if (!event) {
        return {
          success: false,
          message: 'Transaction not found or not a valid HBCT deposit to our deposit address. Please verify the transaction hash and ensure it was sent to the correct deposit address.',
        };
      }

      // Check confirmations
      const confirmations = await this.blockchainClient.getConfirmations(event.blockNumber);
      if (confirmations < this.blockchainConfig.minConfirmations) {
        return {
          success: false,
          message: `Transaction needs more confirmations. Current: ${confirmations}, Required: ${this.blockchainConfig.minConfirmations}.`,
        };
      }

      // Process the deposit
      const processed = await this.processDepositEvent(event);

      if (processed) {
        const deposit = await this.prisma.onchainDeposit.findFirst({
          where: { txHash: txHash.toLowerCase() },
          include: { user: true },
        });

        return {
          success: true,
          message: deposit?.userId
            ? 'Deposit found and credited to user automatically (wallet matched).'
            : 'Deposit found and added as UNMAPPED. You can now map it to a user.',
          deposit: deposit ? this.formatDeposit(deposit) : undefined,
        };
      } else {
        return {
          success: false,
          message: 'Deposit could not be processed. It may have already been processed.',
        };
      }
    } catch (error: any) {
      this.logger.error(`Admin: Error processing tx hash ${txHash}: ${error.message}`);
      return {
        success: false,
        message: `Failed to process transaction: ${error.message}`,
      };
    }
  }

  /**
   * Admin: Scan historical blocks for deposits
   * Scans a range of days worth of blocks to find missed deposits
   * @param days - Number of days to scan back (default 7, max 30)
   */
  async adminScanHistoricalDeposits(days: number = 7): Promise<{
    success: boolean;
    message: string;
    scannedBlocks: number;
    newDeposits: number;
    errors: string[];
  }> {
    // Limit to max 30 days to prevent excessive RPC calls
    const scanDays = Math.min(Math.max(days, 1), 30);

    // BSC produces ~1 block per 3 seconds = 28800 blocks per day
    const BLOCKS_PER_DAY = 28800;
    const MAX_BLOCKS_PER_BATCH = BigInt(100); // BSC RPC limit
    const DELAY_BETWEEN_BATCHES_MS = 2000; // Rate limit protection

    const errors: string[] = [];
    let newDeposits = 0;
    let scannedBlocks = 0;

    try {
      const currentBlock = await this.blockchainClient.getCurrentBlockNumber();
      const totalBlocksToScan = BigInt(scanDays * BLOCKS_PER_DAY);
      const startBlock = currentBlock - totalBlocksToScan;

      this.logger.log(`Admin: Starting historical scan from block ${startBlock} to ${currentBlock} (${scanDays} days)`);

      let fromBlock = startBlock;

      while (fromBlock < currentBlock) {
        const toBlock = fromBlock + MAX_BLOCKS_PER_BATCH > currentBlock
          ? currentBlock
          : fromBlock + MAX_BLOCKS_PER_BATCH;

        try {
          this.logger.debug(`Scanning blocks ${fromBlock} to ${toBlock}...`);

          const events = await this.blockchainClient.getTransferEvents(fromBlock, toBlock);

          for (const event of events) {
            try {
              const processed = await this.processDepositEvent(event);
              if (processed) newDeposits++;
            } catch (eventError: any) {
              errors.push(`Event ${event.txHash}: ${eventError.message}`);
            }
          }

          scannedBlocks += Number(toBlock - fromBlock);

        } catch (batchError: any) {
          const errMsg = `Blocks ${fromBlock}-${toBlock}: ${batchError.message}`;
          errors.push(errMsg);
          this.logger.warn(`Admin scan error: ${errMsg}`);
        }

        fromBlock = toBlock + BigInt(1);

        // Rate limit protection
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
      }

      this.logger.log(`Admin: Historical scan complete. Scanned ${scannedBlocks} blocks, found ${newDeposits} new deposits`);

      return {
        success: true,
        message: `Scanned ${scannedBlocks.toLocaleString()} blocks (${scanDays} days). Found ${newDeposits} new deposit(s).`,
        scannedBlocks,
        newDeposits,
        errors: errors.slice(0, 10), // Limit errors returned
      };
    } catch (error: any) {
      this.logger.error(`Admin: Historical scan failed: ${error.message}`);
      return {
        success: false,
        message: `Scan failed: ${error.message}`,
        scannedBlocks,
        newDeposits,
        errors,
      };
    }
  }

  /**
   * Admin: Quick scan - scan last N hours for missed deposits
   * @param hours - Number of hours to scan back (default 24, max 72)
   */
  async adminQuickScan(hours: number = 24): Promise<{
    success: boolean;
    message: string;
    scannedBlocks: number;
    newDeposits: number;
  }> {
    // Limit to max 72 hours
    const scanHours = Math.min(Math.max(hours, 1), 72);

    // BSC produces ~1 block per 3 seconds = 1200 blocks per hour
    const BLOCKS_PER_HOUR = 1200;
    const MAX_BLOCKS_PER_BATCH = BigInt(500); // Use larger batches for quick scan
    const DELAY_BETWEEN_BATCHES_MS = 1000;

    let newDeposits = 0;
    let scannedBlocks = 0;

    try {
      const currentBlock = await this.blockchainClient.getCurrentBlockNumber();
      const totalBlocksToScan = BigInt(scanHours * BLOCKS_PER_HOUR);
      const startBlock = currentBlock - totalBlocksToScan;

      this.logger.log(`Admin: Quick scan from block ${startBlock} to ${currentBlock} (${scanHours} hours)`);

      let fromBlock = startBlock;

      while (fromBlock < currentBlock) {
        const toBlock = fromBlock + MAX_BLOCKS_PER_BATCH > currentBlock
          ? currentBlock
          : fromBlock + MAX_BLOCKS_PER_BATCH;

        try {
          const events = await this.blockchainClient.getTransferEvents(fromBlock, toBlock);

          for (const event of events) {
            try {
              const processed = await this.processDepositEvent(event);
              if (processed) newDeposits++;
            } catch {
              // Ignore individual event errors
            }
          }

          scannedBlocks += Number(toBlock - fromBlock);

        } catch (batchError: any) {
          this.logger.warn(`Quick scan batch error: ${batchError.message}`);
        }

        fromBlock = toBlock + BigInt(1);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
      }

      return {
        success: true,
        message: `Quick scan complete: ${scannedBlocks.toLocaleString()} blocks (${scanHours}h), found ${newDeposits} new deposit(s).`,
        scannedBlocks,
        newDeposits,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Quick scan failed: ${error.message}`,
        scannedBlocks,
        newDeposits,
      };
    }
  }

  /**
   * Get deposit statistics
   */
  async getDepositStats(): Promise<{
    totalDeposits: number;
    totalAmount: string;
    pendingCount: number;
    creditedCount: number;
    unmappedCount: number;
  }> {
    const [stats, pendingCount, creditedCount, unmappedCount] = await Promise.all([
      this.prisma.onchainDeposit.aggregate({
        _count: true,
        _sum: { amount: true },
      }),
      this.prisma.onchainDeposit.count({
        where: { status: OnchainDepositStatus.PENDING },
      }),
      this.prisma.onchainDeposit.count({
        where: { status: OnchainDepositStatus.CREDITED },
      }),
      this.prisma.onchainDeposit.count({
        where: { status: OnchainDepositStatus.UNMAPPED },
      }),
    ]);

    return {
      totalDeposits: stats._count,
      totalAmount: stats._sum.amount?.toString() || '0',
      pendingCount,
      creditedCount,
      unmappedCount,
    };
  }

  /**
   * Format deposit for API response
   */
  private formatDeposit(deposit: any): any {
    return {
      id: deposit.id,
      userId: deposit.userId,
      txHash: deposit.txHash,
      fromAddress: deposit.fromAddress,
      toAddress: deposit.toAddress,
      amount: deposit.amount.toString(),
      tokenAddress: deposit.tokenAddress,
      blockNumber: deposit.blockNumber.toString(),
      blockTimestamp: deposit.blockTimestamp,
      chainId: deposit.chainId,
      status: deposit.status,
      confirmations: deposit.confirmations,
      creditedAt: deposit.creditedAt,
      failureReason: deposit.failureReason,
      createdAt: deposit.createdAt,
      explorerUrl: this.blockchainClient.getExplorerTxUrl(deposit.txHash),
      user: deposit.user,
      // Lock system fields
      lockedUntil: deposit.lockedUntil,
      lockedAt: deposit.lockedAt,
      lockedByAdminId: deposit.lockedByAdminId,
      lockReason: deposit.lockReason,
      releasedAt: deposit.releasedAt,
      releasedByAdminId: deposit.releasedByAdminId,
      walletVerified: deposit.walletVerified,
    };
  }
}
