import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import {
  Prisma,
  NotificationType,
  NotificationChannel,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export interface CreateNotificationDto {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  actionUrl?: string;
  expiresAt?: Date;
}

export interface NotificationEvent {
  userId: string;
  notification: {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    data: unknown;
    actionUrl: string | null;
    isRead: boolean;
    createdAt: Date;
  };
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  // Subject for broadcasting real-time notifications via SSE
  private notificationSubject = new Subject<NotificationEvent>();

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /**
   * Create a notification and optionally broadcast it via SSE
   * @param skipEmail - Skip sending generic email (use when custom email is already sent)
   */
  async create(dto: CreateNotificationDto, broadcast = true, skipEmail = false) {
    // Check user's notification preferences
    const preferences = await this.getOrCreatePreferences(dto.userId);
    const channel = this.getChannelForType(preferences, dto.type);

    // If user has disabled this notification type, skip
    if (channel === NotificationChannel.NONE) {
      return null;
    }

    // Create the notification
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        data: dto.data ? (dto.data as Prisma.JsonObject) : undefined,
        actionUrl: dto.actionUrl,
        expiresAt: dto.expiresAt,
      },
    });

    // Broadcast for SSE if channel includes IN_APP
    if (
      broadcast &&
      (channel === NotificationChannel.IN_APP ||
        channel === NotificationChannel.BOTH)
    ) {
      this.notificationSubject.next({
        userId: dto.userId,
        notification: {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          actionUrl: notification.actionUrl,
          isRead: notification.isRead,
          createdAt: notification.createdAt,
        },
      });
    }

    // Send email if channel is EMAIL or BOTH and email is enabled
    // Skip if skipEmail flag is set (custom email already sent)
    if (
      !skipEmail &&
      preferences.emailEnabled &&
      (channel === NotificationChannel.EMAIL ||
        channel === NotificationChannel.BOTH)
    ) {
      // Check quiet hours
      if (!this.isInQuietHours(preferences)) {
        await this.sendNotificationEmail(dto.userId, notification);
      } else {
        this.logger.debug(`Skipping email for user ${dto.userId} - quiet hours active`);
      }
    }

    return notification;
  }

  /**
   * Check if current time is within user's quiet hours
   */
  private isInQuietHours(preferences: {
    quietHoursEnabled: boolean;
    quietHoursStart: number | null;
    quietHoursEnd: number | null;
  }): boolean {
    if (!preferences.quietHoursEnabled) return false;
    if (preferences.quietHoursStart === null || preferences.quietHoursEnd === null) return false;

    const now = new Date();
    const currentHour = now.getHours();
    const start = preferences.quietHoursStart;
    const end = preferences.quietHoursEnd;

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (start > end) {
      return currentHour >= start || currentHour < end;
    }

    // Normal range (e.g., 01:00 to 06:00)
    return currentHour >= start && currentHour < end;
  }

  /**
   * Send notification email to user
   */
  private async sendNotificationEmail(
    userId: string,
    notification: {
      type: NotificationType;
      title: string;
      message: string;
      actionUrl: string | null;
      data: Prisma.JsonValue;
    },
  ): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (!user?.email) {
        this.logger.debug(`No email for user ${userId}, skipping notification email`);
        return;
      }

      // Add locale prefix to actionUrl for email links (default to 'en')
      // In-app notifications use the raw actionUrl without locale (frontend handles i18n)
      const emailActionUrl = notification.actionUrl
        ? `/en${notification.actionUrl}`
        : undefined;

      await this.emailService.sendNotificationEmail(
        user.email,
        notification.type,
        notification.title,
        notification.message,
        emailActionUrl,
        notification.data as Record<string, unknown> | undefined,
      );

      // Update notification to mark email as sent
      await this.prisma.notification.updateMany({
        where: {
          userId,
          title: notification.title,
          message: notification.message,
          emailSent: false,
        },
        data: {
          emailSent: true,
          emailSentAt: new Date(),
        },
      });

      this.logger.debug(`Notification email sent to user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to send notification email to user ${userId}: ${error.message}`);
    }
  }

  /**
   * Get observable stream for user's notifications (for SSE)
   */
  getNotificationStream(userId: string): Observable<NotificationEvent> {
    return this.notificationSubject.pipe(
      filter((event) => event.userId === userId),
      map((event) => event),
    );
  }

  /**
   * Get user's notifications with pagination
   */
  async getUserNotifications(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      type?: NotificationType;
      unreadOnly?: boolean;
    } = {},
  ) {
    const { page = 1, limit = 20, type, unreadOnly = false } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(type && { type }),
      ...(unreadOnly && { isRead: false }),
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    };

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: {
          userId,
          isRead: false,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      }),
    ]);

    return {
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        data: n.data,
        actionUrl: n.actionUrl,
        isRead: n.isRead,
        readAt: n.readAt,
        createdAt: n.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      unreadCount,
    };
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { markedCount: result.count };
  }

  /**
   * Delete a notification
   */
  async delete(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });

    return { success: true };
  }

  /**
   * Delete all read notifications older than specified days
   */
  async cleanupOldNotifications(userId: string, olderThanDays = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.prisma.notification.deleteMany({
      where: {
        userId,
        isRead: true,
        createdAt: { lt: cutoffDate },
      },
    });

    return { deletedCount: result.count };
  }

  /**
   * Get or create user's notification preferences
   */
  async getOrCreatePreferences(userId: string) {
    let preferences = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!preferences) {
      preferences = await this.prisma.notificationPreference.create({
        data: { userId },
      });
    }

    return preferences;
  }

  /**
   * Update user's notification preferences
   */
  async updatePreferences(
    userId: string,
    data: {
      transactionChannel?: NotificationChannel;
      securityChannel?: NotificationChannel;
      lockingChannel?: NotificationChannel;
      systemChannel?: NotificationChannel;
      marketingChannel?: NotificationChannel;
      emailEnabled?: boolean;
      emailDigest?: boolean;
      quietHoursEnabled?: boolean;
      quietHoursStart?: number;
      quietHoursEnd?: number;
    },
  ) {
    const preferences = await this.getOrCreatePreferences(userId);

    return this.prisma.notificationPreference.update({
      where: { id: preferences.id },
      data,
    });
  }

  /**
   * Get the channel setting for a notification type
   */
  private getChannelForType(
    preferences: {
      transactionChannel: NotificationChannel;
      securityChannel: NotificationChannel;
      lockingChannel: NotificationChannel;
      systemChannel: NotificationChannel;
      marketingChannel: NotificationChannel;
    },
    type: NotificationType,
  ): NotificationChannel {
    switch (type) {
      case NotificationType.TRANSACTION:
        return preferences.transactionChannel;
      case NotificationType.SECURITY:
        return preferences.securityChannel;
      case NotificationType.LOCKING:
        return preferences.lockingChannel;
      case NotificationType.SYSTEM:
        return preferences.systemChannel;
      case NotificationType.MARKETING:
        return preferences.marketingChannel;
      default:
        return NotificationChannel.IN_APP;
    }
  }

  // ==========================================
  // CONVENIENCE METHODS FOR TRIGGERING NOTIFICATIONS
  // ==========================================

  /**
   * Notify user of a deposit
   */
  async notifyDeposit(
    userId: string,
    amount: string,
    currency: string,
    txHash?: string,
  ) {
    return this.create({
      userId,
      type: NotificationType.TRANSACTION,
      title: 'Deposit Received',
      message: `Your deposit of ${amount} ${currency} has been credited to your wallet.`,
      data: { amount, currency, txHash },
      actionUrl: '/wallet',
    });
  }

  /**
   * Notify user of a withdrawal
   */
  async notifyWithdrawal(
    userId: string,
    amount: string,
    currency: string,
    status: 'processing' | 'completed' | 'failed',
    txHash?: string,
  ) {
    const titles: Record<string, string> = {
      processing: 'Withdrawal Processing',
      completed: 'Withdrawal Completed',
      failed: 'Withdrawal Failed',
    };

    const messages: Record<string, string> = {
      processing: `Your withdrawal of ${amount} ${currency} is being processed.`,
      completed: `Your withdrawal of ${amount} ${currency} has been sent successfully.`,
      failed: `Your withdrawal of ${amount} ${currency} failed. Please contact support.`,
    };

    return this.create({
      userId,
      type: NotificationType.TRANSACTION,
      title: titles[status],
      message: messages[status],
      data: { amount, currency, status, txHash },
      actionUrl: '/wallet/transactions',
    });
  }

  /**
   * Notify user of a transfer received
   */
  async notifyTransferReceived(
    userId: string,
    amount: string,
    currency: string,
    fromUsername?: string,
  ) {
    const from = fromUsername ? `from @${fromUsername}` : '';
    return this.create({
      userId,
      type: NotificationType.TRANSACTION,
      title: 'Transfer Received',
      message: `You received ${amount} ${currency} ${from}.`,
      data: { amount, currency, fromUsername },
      actionUrl: '/wallet',
    });
  }

  /**
   * Notify user of a token purchase
   */
  async notifyTokenPurchase(
    userId: string,
    hbctAmount: string,
    paymentAmount: string,
    paymentCurrency: string,
  ) {
    return this.create({
      userId,
      type: NotificationType.TRANSACTION,
      title: 'Token Purchase Complete',
      message: `You purchased ${hbctAmount} HBCT for ${paymentAmount} ${paymentCurrency}.`,
      data: { hbctAmount, paymentAmount, paymentCurrency },
      actionUrl: '/wallet',
    });
  }

  /**
   * Notify affiliate of commission earned from a referral purchase
   */
  async notifyCommissionEarned(
    userId: string,
    commissionAmount: string,
    purchaseAmount: string,
    referralUsername?: string,
  ) {
    const fromText = referralUsername ? ` from @${referralUsername}'s purchase` : ' from a referral purchase';
    return this.create({
      userId,
      type: NotificationType.TRANSACTION,
      title: 'Commission Earned! 🎉',
      message: `You earned ${commissionAmount} HBCT commission${fromText} of ${purchaseAmount} HBCT.`,
      data: { commissionAmount, purchaseAmount, referralUsername },
      actionUrl: '/affiliates',
    });
  }

  /**
   * Notify user of a lock created
   */
  async notifyLockCreated(
    userId: string,
    amount: string,
    tierName: string,
    endDate: Date,
  ) {
    return this.create({
      userId,
      type: NotificationType.LOCKING,
      title: 'Tokens Locked',
      message: `You locked ${amount} HBCT in the ${tierName} tier. Unlock available on ${endDate.toLocaleDateString()}.`,
      data: { amount, tierName, endDate: endDate.toISOString() },
      actionUrl: '/locking',
    });
  }

  /**
   * Notify user of a lock matured (ready to unlock)
   */
  async notifyLockMatured(userId: string, amount: string, rewardAmount: string) {
    return this.create({
      userId,
      type: NotificationType.LOCKING,
      title: 'Lock Matured - Claim Your Rewards!',
      message: `Your lock of ${amount} HBCT has matured. You can now claim ${rewardAmount} HBCT in rewards.`,
      data: { amount, rewardAmount },
      actionUrl: '/locking',
    });
  }

  /**
   * Notify user of unlock and reward claim
   */
  async notifyUnlockCompleted(
    userId: string,
    amount: string,
    rewardAmount: string,
  ) {
    return this.create({
      userId,
      type: NotificationType.LOCKING,
      title: 'Unlock Complete',
      message: `${amount} HBCT unlocked plus ${rewardAmount} HBCT bonus rewards added to your wallet.`,
      data: { amount, rewardAmount },
      actionUrl: '/wallet',
    });
  }

  /**
   * Notify user of security event (login from new device/location)
   */
  async notifyNewLogin(
    userId: string,
    deviceName: string,
    location?: string,
    ipAddress?: string,
  ) {
    const locationText = location ? ` from ${location}` : '';

    // Get user email for security alert
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    // Send security alert email with proper formatting
    if (user?.email) {
      await this.emailService.sendSecurityAlert(user.email, 'new_login', {
        deviceName,
        location,
        timestamp: new Date(),
      });
    }

    // Create in-app notification (skip generic email since we sent security alert above)
    return this.create(
      {
        userId,
        type: NotificationType.SECURITY,
        title: 'New Login Detected',
        message: `New login on ${deviceName}${locationText}. If this wasn't you, please secure your account.`,
        data: { deviceName, location, ipAddress },
        actionUrl: '/settings?tab=security',
      },
      true, // broadcast
      true, // skipEmail - we already sent the security alert email
    );
  }

  /**
   * Notify user of password change
   */
  async notifyPasswordChanged(userId: string) {
    return this.create({
      userId,
      type: NotificationType.SECURITY,
      title: 'Password Changed',
      message:
        'Your password was successfully changed. If you did not make this change, please contact support immediately.',
      actionUrl: '/settings?tab=security',
    });
  }

  /**
   * Send system announcement to all users or specific user
   */
  async sendSystemAnnouncement(
    title: string,
    message: string,
    userId?: string,
    actionUrl?: string,
  ) {
    if (userId) {
      return this.create({
        userId,
        type: NotificationType.SYSTEM,
        title,
        message,
        actionUrl,
      });
    }

    // For broadcast to all users, use batch processing
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    const notifications = users.map((user) => ({
      userId: user.id,
      type: NotificationType.SYSTEM,
      title,
      message,
      actionUrl,
    }));

    await this.prisma.notification.createMany({
      data: notifications,
    });

    return { count: notifications.length };
  }

  // ==========================================
  // TWO-FACTOR AUTHENTICATION NOTIFICATIONS
  // ==========================================

  /**
   * Notify user that 2FA has been enabled
   */
  async notifyTwoFactorEnabled(userId: string) {
    // Get user email for direct email notification
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    // Send in-app notification
    await this.create({
      userId,
      type: NotificationType.SECURITY,
      title: 'Two-Factor Authentication Enabled',
      message: 'Your account is now protected with two-factor authentication. You will need to enter a code from your authenticator app when logging in.',
      actionUrl: '/settings?tab=security',
    });

    // Send email directly (bypassing preferences for security events)
    if (user?.email) {
      await this.emailService.sendTwoFactorEnabledEmail(user.email);
    }
  }

  /**
   * Notify user that 2FA has been disabled
   */
  async notifyTwoFactorDisabled(userId: string) {
    // Get user email for direct email notification
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    // Send in-app notification
    await this.create({
      userId,
      type: NotificationType.SECURITY,
      title: 'Two-Factor Authentication Disabled',
      message: 'Two-factor authentication has been disabled on your account. We recommend re-enabling it for maximum security.',
      actionUrl: '/settings?tab=security',
    });

    // Send email directly (bypassing preferences for security events)
    if (user?.email) {
      await this.emailService.sendTwoFactorDisabledEmail(user.email);
    }
  }

  /**
   * Notify user that a recovery code was used
   */
  async notifyRecoveryCodeUsed(userId: string, remainingCodes: number) {
    // Get user email for direct email notification
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    // Send in-app notification
    await this.create({
      userId,
      type: NotificationType.SECURITY,
      title: 'Recovery Code Used',
      message: `A recovery code was used to sign in to your account. You have ${remainingCodes} recovery codes remaining.`,
      actionUrl: '/settings?tab=security',
    });

    // Send email directly (bypassing preferences for security events)
    if (user?.email) {
      await this.emailService.sendRecoveryCodeUsedEmail(user.email, remainingCodes);
    }
  }

  /**
   * Notify user that their account was locked due to failed 2FA attempts
   */
  async notifyTwoFactorLocked(userId: string, lockDurationMinutes: number) {
    // Get user email for direct email notification
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    // Send in-app notification
    await this.create({
      userId,
      type: NotificationType.SECURITY,
      title: 'Account Temporarily Locked',
      message: `Your account has been temporarily locked for ${lockDurationMinutes} minutes due to too many failed two-factor authentication attempts.`,
      actionUrl: '/settings?tab=security',
    });

    // Send email directly (bypassing preferences for security events)
    if (user?.email) {
      await this.emailService.sendTwoFactorLockedEmail(user.email, lockDurationMinutes);
    }
  }

  /**
   * Notify user that recovery codes were regenerated
   */
  async notifyRecoveryCodesRegenerated(userId: string) {
    // Get user email for direct email notification
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    // Send in-app notification
    await this.create({
      userId,
      type: NotificationType.SECURITY,
      title: 'Recovery Codes Regenerated',
      message: 'Your two-factor authentication recovery codes have been regenerated. Make sure to save your new codes in a secure location.',
      actionUrl: '/settings?tab=security',
    });

    // For regeneration, we can use the enabled email template as a confirmation
    if (user?.email) {
      await this.emailService.sendNotificationEmail(
        user.email,
        NotificationType.SECURITY,
        'Recovery Codes Regenerated',
        'Your two-factor authentication recovery codes have been regenerated. Make sure to save your new codes in a secure location. Old recovery codes are no longer valid.',
        '/settings?tab=security',
      );
    }
  }
}
