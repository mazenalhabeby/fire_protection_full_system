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
   * Manually map a deposit to a user
   */
  async mapDepositToUser(depositId: string, userId: string): Promise<any> {
    const deposit = await this.prisma.onchainDeposit.findUnique({
      where: { id: depositId },
    });

    if (!deposit) {
      throw new NotFoundException('Deposit not found');
    }

    if (deposit.status !== OnchainDepositStatus.UNMAPPED) {
      throw new Error('Only unmapped deposits can be manually mapped');
    }

    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update deposit
    const updatedDeposit = await this.prisma.onchainDeposit.update({
      where: { id: depositId },
      data: {
        userId,
        status: OnchainDepositStatus.CONFIRMED,
      },
    });

    // Credit balance immediately if confirmed
    await this.creditDepositToUser(updatedDeposit);

    return this.formatDeposit(updatedDeposit);
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

    // Find user by wallet address
    const user = await this.prisma.user.findFirst({
      where: { walletAddress: from.toLowerCase() },
    });

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
      // Get current block and calculate range (last 500 blocks ~ 25 minutes on BSC)
      const currentBlock = await this.blockchainClient.getCurrentBlockNumber();
      const fromBlock = currentBlock - BigInt(500);
      const toBlock = currentBlock - BigInt(this.blockchainConfig.minConfirmations);

      if (fromBlock > toBlock) {
        return {
          checked: true,
          newDeposits: 0,
          message: 'No new blocks to check.',
        };
      }

      const walletAddress = user.walletAddress!; // Already checked above
      this.logger.log(`Checking deposits for user ${userId} from block ${fromBlock} to ${toBlock}`);

      // Get transfer events (limited range to avoid rate limits)
      const events = await this.blockchainClient.getTransferEvents(fromBlock, toBlock);

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
          : 'No new deposits found.',
      };
    } catch (error) {
      this.logger.error(`Error checking deposits for user ${userId}: ${error.message}`);
      return {
        checked: false,
        newDeposits: 0,
        message: `Error checking deposits: ${error.message}`,
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
    };
  }
}
