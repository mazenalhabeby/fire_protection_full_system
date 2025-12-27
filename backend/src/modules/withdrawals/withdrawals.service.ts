import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BlockchainClientService } from '../blockchain/blockchain.client';
import { BlockchainConfigService } from '../blockchain/blockchain.config';
import { BalanceService } from '../wallet/services/balance.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  WithdrawalRequestStatus,
  Currency,
  WalletTransactionType,
  Prisma,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { randomBytes, createHash, timingSafeEqual } from 'crypto';

// Maximum failed confirmation attempts before lockout
const MAX_CONFIRMATION_ATTEMPTS = 5;

// Lockout duration in minutes after max failed attempts
const CONFIRMATION_LOCKOUT_MINUTES = 30;

export interface WithdrawRequestParams {
  userId: string;
  amount: string;
  walletId: string;
  ipAddress?: string;
}

export interface WithdrawalListParams {
  userId?: string;
  status?: WithdrawalRequestStatus;
  toAddress?: string;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  limit?: number;
}

export interface WithdrawalListResult {
  withdrawals: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class WithdrawalsService {
  private readonly logger = new Logger(WithdrawalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchainClient: BlockchainClientService,
    private readonly blockchainConfig: BlockchainConfigService,
    private readonly balanceService: BalanceService,
    private readonly emailService: EmailService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Request a withdrawal
   * SECURITY: Only allows withdrawals to verified linked wallets
   */
  async requestWithdrawal(params: WithdrawRequestParams): Promise<any> {
    const { userId, amount, walletId, ipAddress } = params;

    // Validate amount
    const amountDecimal = new Decimal(amount);
    const minAmount = new Decimal(this.blockchainConfig.minWithdrawAmount);
    const maxAmount = new Decimal(this.blockchainConfig.maxWithdrawAmount);

    if (amountDecimal.lessThan(minAmount)) {
      throw new BadRequestException(
        `Minimum withdrawal amount is ${minAmount.toString()} HBCT`,
      );
    }

    if (amountDecimal.greaterThan(maxAmount)) {
      throw new BadRequestException(
        `Maximum withdrawal amount is ${maxAmount.toString()} HBCT`,
      );
    }

    // Get user with their linked wallets
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        wallets: {
          select: {
            id: true,
            walletAddress: true,
            label: true,
            isPrimary: true,
            verifiedAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // SECURITY: Find and validate the linked wallet
    const linkedWallet = user.wallets.find((w) => w.id === walletId);

    if (!linkedWallet) {
      throw new ForbiddenException(
        'Invalid wallet. You can only withdraw to wallets linked to your account.',
      );
    }

    // SECURITY: Ensure wallet was verified (signature-based ownership proof)
    if (!linkedWallet.verifiedAt) {
      throw new ForbiddenException(
        'This wallet has not been verified. Please verify wallet ownership first.',
      );
    }

    const destinationAddress = linkedWallet.walletAddress;

    // Validate address format (extra safety check)
    if (!this.blockchainClient.isValidAddress(destinationAddress)) {
      throw new BadRequestException('Invalid wallet address format');
    }

    // Check balance
    const balance = await this.balanceService.getBalance(userId, Currency.HBCT);
    const availableBalance = new Decimal(balance.availableBalance);

    if (availableBalance.lessThan(amountDecimal)) {
      throw new BadRequestException('Insufficient balance');
    }

    // Calculate fee
    const feePercent = new Decimal(this.blockchainConfig.withdrawFeePercent).div(100);
    const flatFee = new Decimal(this.blockchainConfig.withdrawFlatFee);
    const feeAmount = amountDecimal.mul(feePercent).add(flatFee);
    const netAmount = amountDecimal.sub(feeAmount);

    if (netAmount.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Amount too small after fees');
    }

    // Generate confirmation code (raw code for email, hashed for storage)
    const rawConfirmationCode = this.generateConfirmationCode();
    const hashedConfirmationCode = this.hashCode(rawConfirmationCode);
    const confirmationExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Determine if approval is required
    const approvalThreshold = new Decimal(
      this.blockchainConfig.withdrawalApprovalThreshold,
    );
    const requiresApproval =
      this.blockchainConfig.withdrawalRequiresApproval ||
      amountDecimal.greaterThan(approvalThreshold);

    // Create withdrawal request
    const withdrawal = await this.prisma.$transaction(async (tx) => {
      // Lock the balance
      await this.balanceService.lockBalance(
        userId,
        Currency.HBCT,
        amountDecimal,
        ipAddress,
      );

      // Create withdrawal record (store hashed confirmation code)
      const created = await tx.withdrawal.create({
        data: {
          userId,
          currency: Currency.HBCT,
          amount: amountDecimal,
          feeAmount,
          netAmount,
          toAddress: destinationAddress.toLowerCase(),
          status: WithdrawalRequestStatus.PENDING_CONFIRMATION,
          confirmationCode: hashedConfirmationCode,
          confirmationExpiresAt,
          requiresApproval,
        },
      });

      // Log the action
      await tx.withdrawalProcessingLog.create({
        data: {
          withdrawalId: created.id,
          action: 'REQUESTED',
          details: {
            amount: amountDecimal.toString(),
            feeAmount: feeAmount.toString(),
            netAmount: netAmount.toString(),
            toAddress: destinationAddress,
            requiresApproval,
          },
        },
      });

      return created;
    });

    // Send confirmation email (with raw code, not hashed)
    if (user.email) {
      await this.sendConfirmationEmail(
        user.email,
        user.firstName || 'User',
        rawConfirmationCode,
        netAmount.toString(),
        destinationAddress,
      );
    }

    return this.formatWithdrawal(withdrawal);
  }

  /**
   * Confirm withdrawal with email code
   */
  async confirmWithdrawal(
    withdrawalId: string,
    userId: string,
    confirmationCode: string,
    ipAddress?: string,
  ): Promise<any> {
    const withdrawal = await this.prisma.withdrawal.findFirst({
      where: {
        id: withdrawalId,
        userId,
        status: WithdrawalRequestStatus.PENDING_CONFIRMATION,
      },
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found or already processed');
    }

    // Check expiration
    if (withdrawal.confirmationExpiresAt && withdrawal.confirmationExpiresAt < new Date()) {
      // Cancel the withdrawal and refund
      await this.cancelWithdrawal(withdrawalId, userId, 'Confirmation code expired');
      throw new BadRequestException('Confirmation code expired');
    }

    // Check for too many failed attempts (rate limiting)
    const failedAttempts = await this.prisma.withdrawalProcessingLog.count({
      where: {
        withdrawalId,
        action: 'CONFIRM_FAILED',
        createdAt: {
          gte: new Date(Date.now() - CONFIRMATION_LOCKOUT_MINUTES * 60 * 1000),
        },
      },
    });

    if (failedAttempts >= MAX_CONFIRMATION_ATTEMPTS) {
      throw new BadRequestException(
        `Too many failed attempts. Please wait ${CONFIRMATION_LOCKOUT_MINUTES} minutes before trying again.`,
      );
    }

    // Verify code using timing-safe comparison
    const providedHash = this.hashCode(confirmationCode);
    const storedHash = withdrawal.confirmationCode || '';
    const isValidCode = this.timingSafeCompare(providedHash, storedHash);

    if (!isValidCode) {
      // Log failed attempt
      await this.prisma.withdrawalProcessingLog.create({
        data: {
          withdrawalId,
          action: 'CONFIRM_FAILED',
          details: { reason: 'Invalid confirmation code', attempt: failedAttempts + 1 },
        },
      });

      const remainingAttempts = MAX_CONFIRMATION_ATTEMPTS - failedAttempts - 1;
      throw new BadRequestException(
        remainingAttempts > 0
          ? `Invalid confirmation code. ${remainingAttempts} attempts remaining.`
          : `Too many failed attempts. Please wait ${CONFIRMATION_LOCKOUT_MINUTES} minutes.`,
      );
    }

    // Update status
    const newStatus = withdrawal.requiresApproval
      ? WithdrawalRequestStatus.PENDING_APPROVAL
      : WithdrawalRequestStatus.APPROVED;

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: newStatus,
          confirmedAt: new Date(),
          confirmationCode: null, // Clear code after use
        },
      });

      await tx.withdrawalProcessingLog.create({
        data: {
          withdrawalId,
          action: 'CONFIRMED',
          details: { newStatus },
        },
      });

      return result;
    });

    return this.formatWithdrawal(updated);
  }

  /**
   * Cancel withdrawal (by user or system)
   */
  async cancelWithdrawal(
    withdrawalId: string,
    userId: string,
    reason?: string,
  ): Promise<any> {
    const withdrawal = await this.prisma.withdrawal.findFirst({
      where: {
        id: withdrawalId,
        userId,
        status: {
          in: [
            WithdrawalRequestStatus.PENDING_CONFIRMATION,
            WithdrawalRequestStatus.PENDING_APPROVAL,
          ],
        },
      },
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found or cannot be cancelled');
    }

    // Refund the locked balance
    await this.balanceService.unlockBalance(
      userId,
      Currency.HBCT,
      withdrawal.amount,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: WithdrawalRequestStatus.CANCELLED,
          rejectionReason: reason || 'Cancelled by user',
        },
      });

      await tx.withdrawalProcessingLog.create({
        data: {
          withdrawalId,
          action: 'CANCELLED',
          details: { reason: reason || 'Cancelled by user' },
        },
      });

      return result;
    });

    return this.formatWithdrawal(updated);
  }

  /**
   * Admin: Approve withdrawal
   */
  async approveWithdrawal(withdrawalId: string, adminId: string): Promise<any> {
    const withdrawal = await this.prisma.withdrawal.findFirst({
      where: {
        id: withdrawalId,
        status: WithdrawalRequestStatus.PENDING_APPROVAL,
      },
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found or not pending approval');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: WithdrawalRequestStatus.APPROVED,
          approvedBy: adminId,
          approvedAt: new Date(),
        },
      });

      await tx.withdrawalProcessingLog.create({
        data: {
          withdrawalId,
          action: 'APPROVED',
          details: { approvedBy: adminId },
        },
      });

      return result;
    });

    return this.formatWithdrawal(updated);
  }

  /**
   * Admin: Reject withdrawal
   */
  async rejectWithdrawal(
    withdrawalId: string,
    adminId: string,
    reason: string,
  ): Promise<any> {
    const withdrawal = await this.prisma.withdrawal.findFirst({
      where: {
        id: withdrawalId,
        status: WithdrawalRequestStatus.PENDING_APPROVAL,
      },
      include: { user: true },
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found or not pending approval');
    }

    // Refund the locked balance
    await this.balanceService.unlockBalance(
      withdrawal.userId,
      Currency.HBCT,
      withdrawal.amount,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: WithdrawalRequestStatus.REJECTED,
          approvedBy: adminId,
          rejectionReason: reason,
        },
      });

      await tx.withdrawalProcessingLog.create({
        data: {
          withdrawalId,
          action: 'REJECTED',
          details: { rejectedBy: adminId, reason },
        },
      });

      return result;
    });

    return this.formatWithdrawal(updated);
  }

  /**
   * Get user's withdrawals
   */
  async getUserWithdrawals(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<WithdrawalListResult> {
    const skip = (page - 1) * limit;

    const [withdrawals, total] = await Promise.all([
      this.prisma.withdrawal.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.withdrawal.count({ where: { userId } }),
    ]);

    return {
      withdrawals: withdrawals.map((w) => this.formatWithdrawal(w)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Admin: Get all withdrawals with filters
   */
  async getWithdrawals(params: WithdrawalListParams): Promise<WithdrawalListResult> {
    const { userId, status, toAddress, fromDate, toDate, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.WithdrawalWhereInput = {};

    if (userId) where.userId = userId;
    if (status) where.status = status;
    if (toAddress) where.toAddress = toAddress.toLowerCase();
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = fromDate;
      if (toDate) where.createdAt.lte = toDate;
    }

    const [withdrawals, total] = await Promise.all([
      this.prisma.withdrawal.findMany({
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
        skip,
        take: limit,
      }),
      this.prisma.withdrawal.count({ where }),
    ]);

    return {
      withdrawals: withdrawals.map((w) => this.formatWithdrawal(w)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get pending withdrawals for processing
   */
  async getPendingWithdrawals(): Promise<any[]> {
    const withdrawals = await this.prisma.withdrawal.findMany({
      where: {
        status: WithdrawalRequestStatus.APPROVED,
      },
      orderBy: { createdAt: 'asc' },
    });

    return withdrawals;
  }

  /**
   * Process a withdrawal (send on-chain)
   */
  async processWithdrawal(withdrawalId: string): Promise<any> {
    const withdrawal = await this.prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: { user: true },
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found');
    }

    if (withdrawal.status !== WithdrawalRequestStatus.APPROVED) {
      throw new BadRequestException('Withdrawal is not in approved status');
    }

    // Check retry count
    if (withdrawal.retryCount >= this.blockchainConfig.maxRetries) {
      await this.failWithdrawal(withdrawalId, 'Maximum retry attempts exceeded');
      throw new BadRequestException('Maximum retry attempts exceeded');
    }

    // Update status to processing
    await this.prisma.$transaction(async (tx) => {
      await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: WithdrawalRequestStatus.PROCESSING,
          processingStartedAt: new Date(),
          retryCount: { increment: 1 },
        },
      });

      await tx.withdrawalProcessingLog.create({
        data: {
          withdrawalId,
          action: 'PROCESSING_STARTED',
          details: { attempt: withdrawal.retryCount + 1 },
        },
      });
    });

    try {
      // Send on-chain transaction
      const result = await this.blockchainClient.sendHbctTransfer(
        withdrawal.toAddress,
        withdrawal.netAmount.toString(),
      );

      if (result.success) {
        // Deduct from locked balance permanently
        await this.balanceService.debitBalance({
          userId: withdrawal.userId,
          currency: Currency.HBCT,
          amount: withdrawal.amount,
          type: WalletTransactionType.WITHDRAWAL,
          description: `On-chain withdrawal to ${withdrawal.toAddress}`,
          metadata: {
            withdrawalId,
            txHash: result.txHash,
            blockNumber: result.blockNumber?.toString(),
          },
        });

        // First unlock the balance (it was locked when requested)
        await this.balanceService.unlockBalance(
          withdrawal.userId,
          Currency.HBCT,
          withdrawal.amount,
        );

        // Mark as completed
        const updated = await this.prisma.$transaction(async (tx) => {
          const res = await tx.withdrawal.update({
            where: { id: withdrawalId },
            data: {
              status: WithdrawalRequestStatus.COMPLETED,
              txHash: result.txHash,
              blockNumber: result.blockNumber ? BigInt(result.blockNumber.toString()) : null,
              gasUsed: result.gasUsed ? BigInt(result.gasUsed.toString()) : null,
              completedAt: new Date(),
            },
          });

          await tx.withdrawalProcessingLog.create({
            data: {
              withdrawalId,
              action: 'COMPLETED',
              txHash: result.txHash,
              details: {
                blockNumber: result.blockNumber?.toString(),
                gasUsed: result.gasUsed?.toString(),
              },
            },
          });

          return res;
        });

        this.logger.log(`Withdrawal ${withdrawalId} completed: ${result.txHash}`);

        // Send notification
        try {
          await this.notificationsService.notifyWithdrawal(
            withdrawal.userId,
            withdrawal.netAmount.toString(),
            'HBCT',
            'completed',
            result.txHash,
          );
        } catch (notifyError) {
          this.logger.warn(`Failed to send withdrawal notification: ${notifyError.message}`);
        }

        return this.formatWithdrawal(updated);
      } else {
        // Transaction failed
        await this.prisma.$transaction(async (tx) => {
          await tx.withdrawal.update({
            where: { id: withdrawalId },
            data: {
              status: WithdrawalRequestStatus.APPROVED, // Revert to approved for retry
              lastError: result.error,
            },
          });

          await tx.withdrawalProcessingLog.create({
            data: {
              withdrawalId,
              action: 'TX_FAILED',
              errorMessage: result.error,
            },
          });
        });

        throw new Error(result.error);
      }
    } catch (error) {
      this.logger.error(`Withdrawal ${withdrawalId} failed: ${error.message}`);

      await this.prisma.$transaction(async (tx) => {
        await tx.withdrawal.update({
          where: { id: withdrawalId },
          data: {
            status: WithdrawalRequestStatus.APPROVED, // Revert for retry
            lastError: error.message,
          },
        });

        await tx.withdrawalProcessingLog.create({
          data: {
            withdrawalId,
            action: 'ERROR',
            errorMessage: error.message,
          },
        });
      });

      throw error;
    }
  }

  /**
   * Mark withdrawal as failed and refund
   */
  private async failWithdrawal(withdrawalId: string, reason: string): Promise<void> {
    const withdrawal = await this.prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) return;

    // Refund locked balance
    await this.balanceService.unlockBalance(
      withdrawal.userId,
      Currency.HBCT,
      withdrawal.amount,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: WithdrawalRequestStatus.FAILED,
          lastError: reason,
        },
      });

      await tx.withdrawalProcessingLog.create({
        data: {
          withdrawalId,
          action: 'FAILED',
          errorMessage: reason,
        },
      });
    });

    // Send notification
    try {
      await this.notificationsService.notifyWithdrawal(
        withdrawal.userId,
        withdrawal.amount.toString(),
        'HBCT',
        'failed',
      );
    } catch (notifyError) {
      this.logger.warn(`Failed to send withdrawal failed notification: ${notifyError.message}`);
    }
  }

  /**
   * Get withdrawal statistics
   */
  async getWithdrawalStats(): Promise<{
    totalWithdrawals: number;
    totalAmount: string;
    totalFees: string;
    pendingCount: number;
    processingCount: number;
    completedCount: number;
    failedCount: number;
  }> {
    const [stats, pendingCount, processingCount, completedCount, failedCount] =
      await Promise.all([
        this.prisma.withdrawal.aggregate({
          _count: true,
          _sum: { amount: true, feeAmount: true },
        }),
        this.prisma.withdrawal.count({
          where: {
            status: {
              in: [
                WithdrawalRequestStatus.PENDING_CONFIRMATION,
                WithdrawalRequestStatus.PENDING_APPROVAL,
                WithdrawalRequestStatus.APPROVED,
              ],
            },
          },
        }),
        this.prisma.withdrawal.count({
          where: { status: WithdrawalRequestStatus.PROCESSING },
        }),
        this.prisma.withdrawal.count({
          where: { status: WithdrawalRequestStatus.COMPLETED },
        }),
        this.prisma.withdrawal.count({
          where: { status: WithdrawalRequestStatus.FAILED },
        }),
      ]);

    return {
      totalWithdrawals: stats._count,
      totalAmount: stats._sum.amount?.toString() || '0',
      totalFees: stats._sum.feeAmount?.toString() || '0',
      pendingCount,
      processingCount,
      completedCount,
      failedCount,
    };
  }

  /**
   * Get hot wallet status
   */
  async getHotWalletStatus(): Promise<{
    address: string;
    hbctBalance: string;
    bnbBalance: string;
    isEnabled: boolean;
  }> {
    const isEnabled = this.blockchainConfig.isWithdrawalEnabled();

    if (!isEnabled) {
      return {
        address: '',
        hbctBalance: '0',
        bnbBalance: '0',
        isEnabled: false,
      };
    }

    const [hbctBalance, bnbBalance] = await Promise.all([
      this.blockchainClient.getWithdrawalWalletBalance(),
      this.blockchainClient.getWithdrawalWalletBnbBalance(),
    ]);

    return {
      address: this.blockchainConfig.withdrawalWalletAddress,
      hbctBalance,
      bnbBalance,
      isEnabled: true,
    };
  }

  /**
   * Generate a strong confirmation code (8 alphanumeric characters)
   * Provides ~2.8 trillion possibilities vs 16.7 million for 6-hex
   */
  private generateConfirmationCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous: 0, O, I, 1
    const bytes = randomBytes(8);
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars[bytes[i] % chars.length];
    }
    return code;
  }

  /**
   * Hash confirmation code for secure storage
   */
  private hashCode(code: string): string {
    return createHash('sha256').update(code.toUpperCase()).digest('hex');
  }

  /**
   * Timing-safe string comparison to prevent timing attacks
   */
  private timingSafeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      // Still do comparison to prevent length-based timing attacks
      const dummy = Buffer.alloc(a.length);
      timingSafeEqual(Buffer.from(a), dummy);
      return false;
    }
    try {
      return timingSafeEqual(Buffer.from(a), Buffer.from(b));
    } catch {
      return false;
    }
  }

  /**
   * Send confirmation email
   */
  private async sendConfirmationEmail(
    email: string,
    _name: string,
    code: string,
    amount: string,
    toAddress: string,
  ): Promise<void> {
    try {
      await this.emailService.sendWithdrawalConfirmationEmail(
        email,
        code,
        amount,
        'HBCT',
        toAddress,
        30, // expires in 30 minutes
      );
    } catch (error) {
      this.logger.error(`Failed to send confirmation email: ${error.message}`);
    }
  }

  /**
   * Format withdrawal for API response
   */
  private formatWithdrawal(withdrawal: any): any {
    return {
      id: withdrawal.id,
      userId: withdrawal.userId,
      currency: withdrawal.currency,
      amount: withdrawal.amount.toString(),
      feeAmount: withdrawal.feeAmount.toString(),
      netAmount: withdrawal.netAmount.toString(),
      toAddress: withdrawal.toAddress,
      status: withdrawal.status,
      requiresApproval: withdrawal.requiresApproval,
      txHash: withdrawal.txHash,
      blockNumber: withdrawal.blockNumber?.toString(),
      confirmedAt: withdrawal.confirmedAt,
      approvedAt: withdrawal.approvedAt,
      approvedBy: withdrawal.approvedBy,
      rejectionReason: withdrawal.rejectionReason,
      completedAt: withdrawal.completedAt,
      retryCount: withdrawal.retryCount,
      lastError: withdrawal.lastError,
      requestedAt: withdrawal.requestedAt,
      createdAt: withdrawal.createdAt,
      explorerUrl: withdrawal.txHash
        ? this.blockchainClient.getExplorerTxUrl(withdrawal.txHash)
        : null,
      user: withdrawal.user,
    };
  }
}
