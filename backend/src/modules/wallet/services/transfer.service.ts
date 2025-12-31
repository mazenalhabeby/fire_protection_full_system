import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { TwoFactorService } from '../../auth/two-factor.service';
import {
  Currency,
  TransferMethod,
  WalletTransactionStatus,
  WalletTransactionType,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { BalanceService } from './balance.service';
import { LimitsService } from './limits.service';
import {
  RecipientInfo,
  TransferResult,
  TransferInfo,
  PaginatedTransfers,
  InitiateTransferParams,
} from '../interfaces';
import * as crypto from 'crypto';

// Transfer confirmation expiry in minutes
const CONFIRMATION_EXPIRY_MINUTES = 15;

// Transfer fee percentage (0.1% = 0.001)
const TRANSFER_FEE_RATE = new Decimal(0.001);

// Minimum transfer fee
const MIN_TRANSFER_FEE = new Decimal(0);

// Maximum failed confirmation attempts before lockout
const MAX_CONFIRMATION_ATTEMPTS = 5;

// Lockout duration in minutes after max failed attempts
const CONFIRMATION_LOCKOUT_MINUTES = 30;

@Injectable()
export class TransferService {
  private readonly logger = new Logger(TransferService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly balanceService: BalanceService,
    private readonly limitsService: LimitsService,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  /**
   * Lookup a recipient by various methods
   */
  async lookupRecipient(
    method: TransferMethod,
    identifier: string,
    currentUserId: string,
  ): Promise<RecipientInfo | null> {
    let user: {
      id: string;
      email: string | null;
      username: string | null;
      firstName: string | null;
      lastName: string | null;
      walletAddress: string | null;
    } | null = null;

    switch (method) {
      case TransferMethod.EMAIL:
        user = await this.prisma.user.findUnique({
          where: { email: identifier.toLowerCase().trim() },
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            walletAddress: true,
          },
        });
        break;

      case TransferMethod.USERNAME:
        // Search by username field (exact match, case insensitive)
        const normalizedUsername = identifier.toLowerCase().trim().replace(/^@/, '');
        user = await this.prisma.user.findFirst({
          where: {
            username: normalizedUsername,
          },
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            walletAddress: true,
          },
        });
        break;

      case TransferMethod.WALLET_ADDRESS:
        const normalizedAddress = identifier.toLowerCase();
        // Check UserWallet table first
        const linkedWallet = await this.prisma.userWallet.findFirst({
          where: { walletAddress: normalizedAddress },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                walletAddress: true,
              },
            },
          },
        });
        if (linkedWallet) {
          user = linkedWallet.user;
        } else {
          // Fall back to User.walletAddress
          user = await this.prisma.user.findUnique({
            where: { walletAddress: normalizedAddress },
            select: {
              id: true,
              email: true,
              username: true,
              firstName: true,
              lastName: true,
              walletAddress: true,
            },
          });
        }
        break;

      case TransferMethod.USER_ID:
        user = await this.prisma.user.findUnique({
          where: { id: identifier },
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            walletAddress: true,
          },
        });
        break;

      case TransferMethod.QR_CODE:
        const qrCode = await this.prisma.transferQRCode.findUnique({
          where: { code: identifier, isActive: true },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                walletAddress: true,
              },
            },
          },
        });
        if (qrCode) {
          // Check if QR code is expired
          if (qrCode.expiresAt && new Date() > qrCode.expiresAt) {
            return null;
          }
          user = qrCode.user;
        }
        break;
    }

    if (!user) return null;

    // Don't allow self-transfers
    if (user.id === currentUserId) {
      throw new BadRequestException('Cannot transfer to yourself');
    }

    // Build display name
    const displayName = this.buildDisplayName(user);

    return {
      userId: user.id,
      displayName,
      email: user.email ? this.maskEmail(user.email) : undefined,
      walletAddress: user.walletAddress ? this.maskAddress(user.walletAddress) : undefined,
    };
  }

  /**
   * Initiate a transfer (requires email confirmation)
   */
  async initiateTransfer(params: InitiateTransferParams): Promise<TransferResult> {
    const { senderId, recipientIdentifier, transferMethod, currency, amount, note, ipAddress } =
      params;

    // Validate amount
    if (amount.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Amount must be positive');
    }

    // Lookup recipient
    const recipient = await this.lookupRecipient(transferMethod, recipientIdentifier, senderId);
    if (!recipient) {
      throw new NotFoundException('Recipient not found');
    }

    // Check sender's balance
    const hasSufficientBalance = await this.balanceService.hasSufficientBalance(
      senderId,
      currency,
      amount,
    );
    if (!hasSufficientBalance) {
      throw new BadRequestException('Insufficient balance');
    }

    // Check transfer limits
    await this.limitsService.checkTransferLimits(senderId, amount);

    // Calculate fee
    const fee = this.calculateTransferFee(amount);

    // Get sender info for email
    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
      select: { email: true, firstName: true, lastName: true },
    });

    if (!sender?.email) {
      throw new BadRequestException('Sender must have a verified email to initiate transfers');
    }

    // Check if user has 2FA enabled - if so, use TOTP instead of email confirmation
    const has2FAEnabled = await this.twoFactorService.isEnabled(senderId);

    // Generate confirmation code and expiry only if NOT using 2FA
    // For 2FA users, we use the TOTP code directly
    let confirmationCode: string | null = null;
    let confirmationExpiresAt: Date | null = null;

    if (!has2FAEnabled) {
      confirmationCode = this.generateConfirmationCode();
      confirmationExpiresAt = new Date();
      confirmationExpiresAt.setMinutes(confirmationExpiresAt.getMinutes() + CONFIRMATION_EXPIRY_MINUTES);
    }

    // Fee comes FROM the amount, so we only reserve the amount (not amount + fee)
    // Sender pays: amount, Recipient receives: amount - fee, Fee: kept by platform
    const totalDebit = amount;

    // Create transfer record, lock funds, and create PENDING wallet transaction in a transaction
    const transfer = await this.prisma.$transaction(async (tx) => {
      // Get sender's balance with row-level lock to prevent race conditions
      const [senderBalance] = await tx.$queryRaw<
        Array<{
          id: string;
          userId: string;
          currency: string;
          availableBalance: any;
          lockedBalance: any;
          pendingBalance: any;
        }>
      >`
        SELECT * FROM "wallet_balances"
        WHERE "userId" = ${senderId} AND "currency" = ${currency}::"Currency"
        FOR UPDATE
      `;

      if (!senderBalance) {
        throw new BadRequestException('Wallet balance not found');
      }

      const currentAvailable = new Decimal(senderBalance.availableBalance.toString());
      const currentPending = new Decimal(senderBalance.pendingBalance.toString());

      // Check sufficient available balance (not already reserved)
      if (currentAvailable.lessThan(totalDebit)) {
        throw new BadRequestException('Insufficient available balance');
      }

      // Lock funds: move from availableBalance to pendingBalance
      const newAvailable = currentAvailable.sub(totalDebit);
      const newPending = currentPending.add(totalDebit);

      await tx.walletBalance.update({
        where: { userId_currency: { userId: senderId, currency } },
        data: {
          availableBalance: newAvailable,
          pendingBalance: newPending,
          lastActivityAt: new Date(),
        },
      });

      // Create internal transfer
      const internalTransfer = await tx.internalTransfer.create({
        data: {
          senderId,
          receiverId: recipient.userId,
          currency,
          amount,
          fee,
          transferMethod,
          recipientIdentifier,
          status: WalletTransactionStatus.PENDING,
          // Only store hashed confirmation code if NOT using 2FA
          confirmationCode: confirmationCode ? this.hashCode(confirmationCode) : null,
          confirmationExpiresAt,
          note,
          ipAddress,
        },
      });

      // Create PENDING wallet transaction for sender (so it shows in transaction history)
      await tx.walletTransaction.create({
        data: {
          userId: senderId,
          currency,
          type: WalletTransactionType.INTERNAL_TRANSFER_SEND,
          amount,
          fee,
          netAmount: totalDebit,
          balanceBefore: currentAvailable,
          balanceAfter: newAvailable,
          status: WalletTransactionStatus.PENDING,
          relatedTransferId: internalTransfer.id,
          description: `Transfer to ${recipient.displayName} (pending confirmation)`,
          metadata: note ? { note } : undefined,
          ipAddress,
        },
      });

      return internalTransfer;
    });

    // Send confirmation email only if NOT using 2FA
    if (!has2FAEnabled && confirmationCode) {
      await this.sendTransferConfirmationEmail(
        sender.email,
        confirmationCode,
        amount.toString(),
        currency,
        recipient.displayName,
        fee.toString(),
      );
    }

    this.logger.log(
      `Transfer initiated: ${transfer.id} from ${senderId} to ${recipient.userId} (2FA: ${has2FAEnabled})`,
    );

    // Calculate net amount (amount after fee deduction from recipient perspective)
    const netAmount = amount.sub(fee);

    return {
      success: true,
      transferId: transfer.id,
      confirmationRequired: true,
      twoFactorRequired: has2FAEnabled,
      confirmationExpiresAt: confirmationExpiresAt || undefined,
      // Include additional fields for frontend TransferConfirmation
      recipient: {
        id: recipient.userId,
        displayName: recipient.displayName,
      },
      amount: amount.toString(),
      fee: fee.toString(),
      netAmount: netAmount.toString(),
      currency,
    };
  }

  /**
   * Confirm and execute a transfer
   */
  async confirmTransfer(
    transferId: string,
    confirmationCode: string,
    userId: string,
    ipAddress?: string,
  ): Promise<TransferInfo> {
    const transfer = await this.prisma.internalTransfer.findUnique({
      where: { id: transferId },
      include: {
        sender: { select: { id: true, username: true, firstName: true, lastName: true } },
        receiver: { select: { id: true, username: true, firstName: true, lastName: true } },
      },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    // Verify ownership
    if (transfer.senderId !== userId) {
      throw new ForbiddenException('Not authorized to confirm this transfer');
    }

    // Check status
    if (transfer.status !== WalletTransactionStatus.PENDING) {
      throw new BadRequestException(`Transfer cannot be confirmed. Status: ${transfer.status}`);
    }

    // Check expiration
    if (transfer.confirmationExpiresAt && new Date() > transfer.confirmationExpiresAt) {
      const recipientName = this.buildDisplayName(transfer.receiver);
      // Only the amount was reserved (fee comes from it)
      const totalDebit = transfer.amount;

      // Mark as expired and return locked funds
      await this.prisma.$transaction(async (tx) => {
        // Get sender's balance with row-level lock
        const [senderBalance] = await tx.$queryRaw<
          Array<{
            id: string;
            userId: string;
            currency: string;
            availableBalance: any;
            lockedBalance: any;
            pendingBalance: any;
          }>
        >`
          SELECT * FROM "wallet_balances"
          WHERE "userId" = ${transfer.senderId} AND "currency" = ${transfer.currency}::"Currency"
          FOR UPDATE
        `;

        if (senderBalance) {
          const currentAvailable = new Decimal(senderBalance.availableBalance.toString());
          const currentPending = new Decimal(senderBalance.pendingBalance.toString());

          // Return funds from pendingBalance to availableBalance
          const newAvailable = currentAvailable.add(totalDebit);
          const newPending = currentPending.sub(totalDebit);

          await tx.walletBalance.update({
            where: { userId_currency: { userId: transfer.senderId, currency: transfer.currency } },
            data: {
              availableBalance: newAvailable,
              pendingBalance: newPending.lessThan(0) ? new Decimal(0) : newPending,
              lastActivityAt: new Date(),
            },
          });
        }

        await tx.internalTransfer.update({
          where: { id: transferId },
          data: { status: WalletTransactionStatus.EXPIRED },
        });

        await tx.walletTransaction.updateMany({
          where: {
            relatedTransferId: transferId,
            status: WalletTransactionStatus.PENDING,
          },
          data: {
            status: WalletTransactionStatus.EXPIRED,
            description: `Transfer to ${recipientName} (expired)`,
          },
        });
      });

      this.logger.log(`Transfer expired: ${transferId}, funds returned to sender`);
      throw new BadRequestException('Confirmation code has expired. Funds have been returned to your wallet.');
    }

    // Check if user has 2FA enabled
    const has2FAEnabled = await this.twoFactorService.isEnabled(userId);

    if (has2FAEnabled) {
      // Verify using 2FA TOTP code
      // TwoFactorService handles rate limiting and lockouts internally
      try {
        await this.twoFactorService.verifyToken(userId, confirmationCode, ipAddress);
        this.logger.log(`Transfer ${transferId} confirmed via 2FA`);
      } catch (error) {
        // Log failed attempt
        await this.prisma.walletAuditLog.create({
          data: {
            userId,
            action: 'TRANSFER_CONFIRM_FAILED',
            entityType: 'InternalTransfer',
            entityId: transferId,
            newValue: { reason: 'Invalid 2FA code', method: '2fa' },
            ipAddress,
          },
        });
        throw error; // Re-throw the error from TwoFactorService
      }
    } else {
      // Verify using email confirmation code
      // Check for too many failed attempts (rate limiting)
      const failedAttempts = await this.prisma.walletAuditLog.count({
        where: {
          userId,
          entityType: 'InternalTransfer',
          entityId: transferId,
          action: 'TRANSFER_CONFIRM_FAILED',
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

      // Verify confirmation code using timing-safe comparison
      const providedHash = this.hashCode(confirmationCode);
      const storedHash = transfer.confirmationCode || '';

      // Use timing-safe comparison to prevent timing attacks
      const isValidCode = this.timingSafeCompare(providedHash, storedHash);

      if (!isValidCode) {
        // Log failed attempt
        await this.prisma.walletAuditLog.create({
          data: {
            userId,
            action: 'TRANSFER_CONFIRM_FAILED',
            entityType: 'InternalTransfer',
            entityId: transferId,
            newValue: { reason: 'Invalid confirmation code', attempt: failedAttempts + 1, method: 'email' },
            ipAddress,
          },
        });

        const remainingAttempts = MAX_CONFIRMATION_ATTEMPTS - failedAttempts - 1;
        throw new BadRequestException(
          remainingAttempts > 0
            ? `Invalid confirmation code. ${remainingAttempts} attempts remaining.`
            : `Too many failed attempts. Please wait ${CONFIRMATION_LOCKOUT_MINUTES} minutes.`,
        );
      }
    }

    // Execute the transfer in a transaction with pessimistic locking
    const result = await this.prisma.$transaction(async (tx) => {
      // Get current balances with row-level locks to prevent race conditions
      // Using raw query with FOR UPDATE to ensure exclusive lock
      // Note: Table name is "wallet_balances" due to @@map in Prisma schema
      const [senderBalance] = await tx.$queryRaw<
        Array<{
          id: string;
          userId: string;
          currency: string;
          availableBalance: any;
          lockedBalance: any;
          pendingBalance: any;
        }>
      >`
        SELECT * FROM "wallet_balances"
        WHERE "userId" = ${transfer.senderId} AND "currency" = ${transfer.currency}::"Currency"
        FOR UPDATE
      `;

      const [receiverBalance] = await tx.$queryRaw<
        Array<{
          id: string;
          userId: string;
          currency: string;
          availableBalance: any;
          lockedBalance: any;
          pendingBalance: any;
        }>
      >`
        SELECT * FROM "wallet_balances"
        WHERE "userId" = ${transfer.receiverId} AND "currency" = ${transfer.currency}::"Currency"
        FOR UPDATE
      `;

      if (!senderBalance || !receiverBalance) {
        throw new BadRequestException('Balance not found');
      }

      const senderAvailable = new Decimal(senderBalance.availableBalance.toString());
      const senderPending = new Decimal(senderBalance.pendingBalance.toString());
      const receiverAvailable = new Decimal(receiverBalance.availableBalance.toString());
      // Fee comes from the amount, so only the amount was reserved
      const totalDebit = transfer.amount;
      // Receiver gets amount minus fee
      const receiverCredit = transfer.amount.sub(transfer.fee);

      // Funds should already be locked in pendingBalance - verify this
      if (senderPending.lessThan(totalDebit)) {
        // This shouldn't happen if funds were properly locked, but handle gracefully
        throw new BadRequestException('Insufficient pending balance - funds may not have been properly reserved');
      }

      // Release from sender's pendingBalance (funds were already deducted from availableBalance at initiation)
      const newSenderPending = senderPending.sub(totalDebit);

      await tx.walletBalance.update({
        where: { userId_currency: { userId: transfer.senderId, currency: transfer.currency } },
        data: {
          pendingBalance: newSenderPending,
          lastActivityAt: new Date(),
        },
      });

      // Credit receiver's availableBalance (amount minus fee)
      const receiverBalanceBefore = receiverAvailable;
      const receiverBalanceAfter = receiverBalanceBefore.add(receiverCredit);

      await tx.walletBalance.update({
        where: { userId_currency: { userId: transfer.receiverId, currency: transfer.currency } },
        data: {
          availableBalance: receiverBalanceAfter,
          lastActivityAt: new Date(),
        },
      });

      // Update transfer status and clear confirmation code for security
      const updatedTransfer = await tx.internalTransfer.update({
        where: { id: transferId },
        data: {
          status: WalletTransactionStatus.COMPLETED,
          confirmedAt: new Date(),
          completedAt: new Date(),
          confirmationCode: null, // Clear code after use
        },
      });

      // Update existing PENDING sender transaction to COMPLETED
      // Note: balanceBefore/After already set at initiation, just update status
      await tx.walletTransaction.updateMany({
        where: {
          relatedTransferId: transfer.id,
          userId: transfer.senderId,
          status: WalletTransactionStatus.PENDING,
        },
        data: {
          status: WalletTransactionStatus.COMPLETED,
          description: `Transfer to ${this.buildDisplayName(transfer.receiver)}`,
          completedAt: new Date(),
        },
      });

      // Create receiver transaction record (receiver gets amount minus fee)
      await tx.walletTransaction.create({
        data: {
          userId: transfer.receiverId,
          currency: transfer.currency,
          type: WalletTransactionType.INTERNAL_TRANSFER_RECEIVE,
          amount: receiverCredit,
          netAmount: receiverCredit,
          balanceBefore: receiverBalanceBefore,
          balanceAfter: receiverBalanceAfter,
          status: WalletTransactionStatus.COMPLETED,
          relatedTransferId: transfer.id,
          description: `Transfer from ${this.buildDisplayName(transfer.sender)}`,
          metadata: transfer.note ? { note: transfer.note } : undefined,
          completedAt: new Date(),
        },
      });

      // Audit logs
      await tx.walletAuditLog.create({
        data: {
          userId: transfer.senderId,
          action: 'TRANSFER_SEND',
          entityType: 'InternalTransfer',
          entityId: transfer.id,
          oldValue: { availableBalance: senderAvailable.toString(), pendingBalance: senderPending.toString() },
          newValue: { availableBalance: senderAvailable.toString(), pendingBalance: newSenderPending.toString(), amountSent: totalDebit.toString() },
          ipAddress,
        },
      });

      await tx.walletAuditLog.create({
        data: {
          userId: transfer.receiverId,
          action: 'TRANSFER_RECEIVE',
          entityType: 'InternalTransfer',
          entityId: transfer.id,
          oldValue: { availableBalance: receiverBalanceBefore.toString() },
          newValue: { availableBalance: receiverBalanceAfter.toString(), amountReceived: receiverCredit.toString() },
        },
      });

      return updatedTransfer;
    });

    // Record limit usage
    await this.limitsService.recordTransferUsage(transfer.senderId, transfer.amount);

    this.logger.log(`Transfer completed: ${transferId}`);

    // Notify recipient of received transfer (they receive amount minus fee)
    const receivedAmount = transfer.amount.sub(transfer.fee);
    await this.notificationsService.notifyTransferReceived(
      transfer.receiverId,
      receivedAmount.toString(),
      transfer.currency,
      transfer.sender.username || transfer.sender.firstName || undefined,
    );

    return {
      id: result.id,
      currency: result.currency,
      amount: result.amount.toString(),
      fee: result.fee.toString(),
      transferMethod: result.transferMethod,
      recipientIdentifier: result.recipientIdentifier,
      status: result.status,
      note: result.note,
      createdAt: result.createdAt,
      completedAt: result.completedAt,
      recipient: {
        id: transfer.receiver.id,
        displayName: this.buildDisplayName(transfer.receiver),
      },
    };
  }

  /**
   * Cancel a pending transfer
   */
  async cancelTransfer(transferId: string, userId: string): Promise<{ success: boolean }> {
    const transfer = await this.prisma.internalTransfer.findUnique({
      where: { id: transferId },
      include: {
        receiver: { select: { id: true, username: true, firstName: true, lastName: true } },
      },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    if (transfer.senderId !== userId) {
      throw new ForbiddenException('Not authorized to cancel this transfer');
    }

    if (transfer.status !== WalletTransactionStatus.PENDING) {
      throw new BadRequestException(`Transfer cannot be cancelled. Status: ${transfer.status}`);
    }

    const recipientName = this.buildDisplayName(transfer.receiver);
    // Only the amount was reserved (fee comes from it)
    const totalDebit = transfer.amount;

    // Cancel transfer and return locked funds
    await this.prisma.$transaction(async (tx) => {
      // Get sender's balance with row-level lock
      const [senderBalance] = await tx.$queryRaw<
        Array<{
          id: string;
          userId: string;
          currency: string;
          availableBalance: any;
          lockedBalance: any;
          pendingBalance: any;
        }>
      >`
        SELECT * FROM "wallet_balances"
        WHERE "userId" = ${transfer.senderId} AND "currency" = ${transfer.currency}::"Currency"
        FOR UPDATE
      `;

      if (!senderBalance) {
        throw new BadRequestException('Balance not found');
      }

      const currentAvailable = new Decimal(senderBalance.availableBalance.toString());
      const currentPending = new Decimal(senderBalance.pendingBalance.toString());

      // Return funds from pendingBalance to availableBalance
      const newAvailable = currentAvailable.add(totalDebit);
      const newPending = currentPending.sub(totalDebit);

      await tx.walletBalance.update({
        where: { userId_currency: { userId: transfer.senderId, currency: transfer.currency } },
        data: {
          availableBalance: newAvailable,
          pendingBalance: newPending.lessThan(0) ? new Decimal(0) : newPending, // Safety check
          lastActivityAt: new Date(),
        },
      });

      // Update transfer status
      await tx.internalTransfer.update({
        where: { id: transferId },
        data: { status: WalletTransactionStatus.CANCELLED },
      });

      // Update the PENDING wallet transaction - update balances to reflect refund
      await tx.walletTransaction.updateMany({
        where: {
          relatedTransferId: transferId,
          status: WalletTransactionStatus.PENDING,
        },
        data: {
          status: WalletTransactionStatus.CANCELLED,
          balanceAfter: newAvailable, // Balance after refund
          description: `Transfer to ${recipientName} (cancelled)`,
        },
      });
    });

    this.logger.log(`Transfer cancelled: ${transferId}, funds returned to sender`);

    return { success: true };
  }

  /**
   * Get pending transfers for a user
   */
  async getPendingTransfers(userId: string): Promise<TransferInfo[]> {
    const transfers = await this.prisma.internalTransfer.findMany({
      where: {
        senderId: userId,
        status: WalletTransactionStatus.PENDING,
      },
      include: {
        receiver: { select: { id: true, username: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return transfers.map((t) => ({
      id: t.id,
      currency: t.currency,
      amount: t.amount.toString(),
      fee: t.fee.toString(),
      transferMethod: t.transferMethod,
      recipientIdentifier: t.recipientIdentifier,
      status: t.status,
      note: t.note,
      createdAt: t.createdAt,
      completedAt: t.completedAt,
      confirmationExpiresAt: t.confirmationExpiresAt,
      recipient: {
        id: t.receiver.id,
        displayName: this.buildDisplayName(t.receiver),
      },
    }));
  }

  /**
   * Get transfer history for a user
   */
  async getTransferHistory(
    userId: string,
    options: {
      currency?: Currency;
      status?: WalletTransactionStatus;
      direction?: 'sent' | 'received' | 'all';
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    },
  ): Promise<PaginatedTransfers> {
    const { currency, status, direction = 'all', startDate, endDate, page = 1, limit = 20 } = options;

    const where: any = {};

    // Direction filter
    if (direction === 'sent') {
      where.senderId = userId;
    } else if (direction === 'received') {
      where.receiverId = userId;
    } else {
      where.OR = [{ senderId: userId }, { receiverId: userId }];
    }

    // Currency filter
    if (currency) {
      where.currency = currency;
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    // Date filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [transfers, total] = await Promise.all([
      this.prisma.internalTransfer.findMany({
        where,
        include: {
          sender: { select: { id: true, firstName: true, lastName: true } },
          receiver: { select: { id: true, username: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.internalTransfer.count({ where }),
    ]);

    const transferInfos: TransferInfo[] = transfers.map((t) => ({
      id: t.id,
      currency: t.currency,
      amount: t.amount.toString(),
      fee: t.fee.toString(),
      transferMethod: t.transferMethod,
      recipientIdentifier: t.recipientIdentifier,
      status: t.status,
      note: t.note,
      createdAt: t.createdAt,
      completedAt: t.completedAt,
      recipient: {
        id: t.receiver.id,
        displayName: this.buildDisplayName(t.receiver),
      },
      sender: {
        id: t.sender.id,
        displayName: this.buildDisplayName(t.sender),
      },
    }));

    return {
      transfers: transferInfos,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private calculateTransferFee(amount: Decimal): Decimal {
    const calculatedFee = amount.mul(TRANSFER_FEE_RATE);
    return calculatedFee.greaterThan(MIN_TRANSFER_FEE) ? calculatedFee : MIN_TRANSFER_FEE;
  }

  /**
   * Generate a strong confirmation code (8 alphanumeric characters)
   * Provides ~2.8 trillion possibilities vs 1 million for 6-digit numeric
   */
  private generateConfirmationCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous chars: 0, O, I, 1
    const bytes = crypto.randomBytes(8);
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars[bytes[i] % chars.length];
    }
    return code;
  }

  private hashCode(code: string): string {
    // Normalize to uppercase before hashing
    return crypto.createHash('sha256').update(code.toUpperCase()).digest('hex');
  }

  /**
   * Timing-safe string comparison to prevent timing attacks
   */
  private timingSafeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      // Still do comparison to prevent length-based timing attacks
      const dummy = Buffer.alloc(a.length);
      crypto.timingSafeEqual(Buffer.from(a), dummy);
      return false;
    }
    try {
      return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    } catch {
      return false;
    }
  }

  private buildDisplayName(user: { username?: string | null; firstName?: string | null; lastName?: string | null }): string {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName.charAt(0)}.`;
    }
    if (user.firstName) {
      return user.firstName;
    }
    if (user.username) {
      return `@${user.username}`;
    }
    return 'User';
  }

  private maskEmail(email: string): string {
    const [name, domain] = email.split('@');
    if (name.length <= 2) {
      return `${name[0]}***@${domain}`;
    }
    return `${name.slice(0, 2)}***@${domain}`;
  }

  private maskAddress(address: string): string {
    if (address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  private async sendTransferConfirmationEmail(
    email: string,
    code: string,
    amount: string,
    currency: Currency,
    recipientName: string,
    fee: string,
  ): Promise<void> {
    const total = new Decimal(amount).add(new Decimal(fee)).toString();

    await this.emailService.sendTransferConfirmationEmail(
      email,
      code,
      recipientName,
      amount,
      fee,
      total,
      currency,
      CONFIRMATION_EXPIRY_MINUTES,
    );
  }
}
