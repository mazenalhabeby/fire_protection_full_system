import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Database Cleanup Service
 *
 * Automatically cleans up old records from various tables to prevent
 * unbounded database growth. Runs on a schedule using NestJS Scheduler.
 *
 * Retention periods (configurable via environment):
 * - Sessions: 7 days after expiry
 * - LoginHistory: 90 days
 * - TwoFactorAuditLog: 90 days
 * - Notifications (read): 30 days
 * - Notifications (unread): 90 days
 * - WalletAuditLog: 365 days
 * - WithdrawalProcessingLog: 90 days
 * - PasswordResetToken: 7 days (expired)
 * - EmailVerificationToken: 7 days (expired)
 *
 * Financial records (Transaction, WalletTransaction, etc.) are NEVER deleted
 * as they may be required for audits and legal compliance.
 */
@Injectable()
export class DatabaseCleanupService {
  private readonly logger = new Logger(DatabaseCleanupService.name);

  // Retention periods in days
  private readonly retentionDays: Record<string, number>;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    // Load retention periods from environment or use defaults
    this.retentionDays = {
      sessions: this.configService.get<number>('RETENTION_SESSIONS_DAYS', 7),
      loginHistory: this.configService.get<number>('RETENTION_LOGIN_HISTORY_DAYS', 90),
      twoFactorAudit: this.configService.get<number>('RETENTION_2FA_AUDIT_DAYS', 90),
      notificationsRead: this.configService.get<number>('RETENTION_NOTIFICATIONS_READ_DAYS', 30),
      notificationsUnread: this.configService.get<number>('RETENTION_NOTIFICATIONS_UNREAD_DAYS', 90),
      walletAudit: this.configService.get<number>('RETENTION_WALLET_AUDIT_DAYS', 365),
      withdrawalLogs: this.configService.get<number>('RETENTION_WITHDRAWAL_LOGS_DAYS', 90),
      expiredTokens: this.configService.get<number>('RETENTION_EXPIRED_TOKENS_DAYS', 7),
      processedEvents: this.configService.get<number>('RETENTION_PROCESSED_EVENTS_DAYS', 180),
    };
  }

  /**
   * Run cleanup every day at 3:00 AM
   * This runs during low-traffic hours to minimize impact
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async runDailyCleanup() {
    this.logger.log('Starting daily database cleanup...');

    const startTime = Date.now();
    const results: Record<string, number> = {};

    try {
      // Run all cleanup tasks
      results.sessions = await this.cleanupExpiredSessions();
      results.loginHistory = await this.cleanupLoginHistory();
      results.twoFactorAudit = await this.cleanupTwoFactorAuditLogs();
      results.notifications = await this.cleanupNotifications();
      results.walletAudit = await this.cleanupWalletAuditLogs();
      results.withdrawalLogs = await this.cleanupWithdrawalProcessingLogs();
      results.expiredTokens = await this.cleanupExpiredTokens();
      results.processedEvents = await this.cleanupProcessedBlockchainEvents();

      const duration = Date.now() - startTime;
      const totalDeleted = Object.values(results).reduce((a, b) => a + b, 0);

      this.logger.log(
        `Database cleanup completed in ${duration}ms. Total records deleted: ${totalDeleted}`,
      );
      this.logger.log(`Cleanup breakdown: ${JSON.stringify(results)}`);
    } catch (error) {
      this.logger.error(`Database cleanup failed: ${error.message}`, error.stack);
    }
  }

  /**
   * Clean up expired and revoked sessions
   * Keeps sessions for a grace period after expiry for audit purposes
   */
  private async cleanupExpiredSessions(): Promise<number> {
    const cutoffDate = this.getCutoffDate(this.retentionDays.sessions);

    const result = await this.prisma.session.deleteMany({
      where: {
        OR: [
          // Sessions expired more than X days ago
          {
            expiresAt: { lt: cutoffDate },
          },
          // Sessions revoked more than X days ago
          {
            isValid: false,
            revokedAt: { lt: cutoffDate },
          },
        ],
      },
    });

    if (result.count > 0) {
      this.logger.debug(`Cleaned up ${result.count} expired sessions`);
    }

    return result.count;
  }

  /**
   * Clean up old login history records
   */
  private async cleanupLoginHistory(): Promise<number> {
    const cutoffDate = this.getCutoffDate(this.retentionDays.loginHistory);

    const result = await this.prisma.loginHistory.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    if (result.count > 0) {
      this.logger.debug(`Cleaned up ${result.count} login history records`);
    }

    return result.count;
  }

  /**
   * Clean up old 2FA audit logs
   */
  private async cleanupTwoFactorAuditLogs(): Promise<number> {
    const cutoffDate = this.getCutoffDate(this.retentionDays.twoFactorAudit);

    const result = await this.prisma.twoFactorAuditLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    if (result.count > 0) {
      this.logger.debug(`Cleaned up ${result.count} 2FA audit logs`);
    }

    return result.count;
  }

  /**
   * Clean up old notifications
   * Read notifications are cleaned faster than unread ones
   */
  private async cleanupNotifications(): Promise<number> {
    const readCutoff = this.getCutoffDate(this.retentionDays.notificationsRead);
    const unreadCutoff = this.getCutoffDate(this.retentionDays.notificationsUnread);

    const result = await this.prisma.notification.deleteMany({
      where: {
        OR: [
          // Read notifications older than 30 days
          {
            isRead: true,
            createdAt: { lt: readCutoff },
          },
          // Unread notifications older than 90 days
          {
            isRead: false,
            createdAt: { lt: unreadCutoff },
          },
          // Expired notifications
          {
            expiresAt: { lt: new Date() },
          },
        ],
      },
    });

    if (result.count > 0) {
      this.logger.debug(`Cleaned up ${result.count} notifications`);
    }

    return result.count;
  }

  /**
   * Clean up old wallet audit logs
   * Kept longer for compliance purposes
   */
  private async cleanupWalletAuditLogs(): Promise<number> {
    const cutoffDate = this.getCutoffDate(this.retentionDays.walletAudit);

    const result = await this.prisma.walletAuditLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    if (result.count > 0) {
      this.logger.debug(`Cleaned up ${result.count} wallet audit logs`);
    }

    return result.count;
  }

  /**
   * Clean up old withdrawal processing logs
   */
  private async cleanupWithdrawalProcessingLogs(): Promise<number> {
    const cutoffDate = this.getCutoffDate(this.retentionDays.withdrawalLogs);

    const result = await this.prisma.withdrawalProcessingLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    if (result.count > 0) {
      this.logger.debug(`Cleaned up ${result.count} withdrawal processing logs`);
    }

    return result.count;
  }

  /**
   * Clean up expired password reset and email verification tokens
   */
  private async cleanupExpiredTokens(): Promise<number> {
    const cutoffDate = this.getCutoffDate(this.retentionDays.expiredTokens);

    const [passwordTokens, emailTokens] = await Promise.all([
      this.prisma.passwordResetToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: cutoffDate } },
            { usedAt: { lt: cutoffDate } },
          ],
        },
      }),
      this.prisma.emailVerificationToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: cutoffDate } },
            { usedAt: { lt: cutoffDate } },
          ],
        },
      }),
    ]);

    const total = passwordTokens.count + emailTokens.count;
    if (total > 0) {
      this.logger.debug(`Cleaned up ${total} expired tokens`);
    }

    return total;
  }

  /**
   * Clean up old processed blockchain events
   * These are used for deduplication, kept for 6 months
   */
  private async cleanupProcessedBlockchainEvents(): Promise<number> {
    const cutoffDate = this.getCutoffDate(this.retentionDays.processedEvents);

    const result = await this.prisma.processedBlockchainEvent.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    if (result.count > 0) {
      this.logger.debug(`Cleaned up ${result.count} processed blockchain events`);
    }

    return result.count;
  }

  /**
   * Calculate cutoff date based on retention days
   */
  private getCutoffDate(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }

  /**
   * Manual cleanup trigger (for admin use)
   * Can be called via admin API endpoint
   */
  async triggerManualCleanup(): Promise<Record<string, number>> {
    this.logger.log('Manual cleanup triggered');
    await this.runDailyCleanup();

    // Return current table counts for monitoring
    const counts = await this.getTableCounts();
    return counts;
  }

  /**
   * Get current record counts for monitoring
   */
  async getTableCounts(): Promise<Record<string, number>> {
    const [
      sessions,
      loginHistory,
      twoFactorAudit,
      notifications,
      walletAudit,
      withdrawalLogs,
    ] = await Promise.all([
      this.prisma.session.count(),
      this.prisma.loginHistory.count(),
      this.prisma.twoFactorAuditLog.count(),
      this.prisma.notification.count(),
      this.prisma.walletAuditLog.count(),
      this.prisma.withdrawalProcessingLog.count(),
    ]);

    return {
      sessions,
      loginHistory,
      twoFactorAudit,
      notifications,
      walletAudit,
      withdrawalLogs,
    };
  }
}
