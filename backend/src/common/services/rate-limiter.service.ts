import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Rate limit configuration for different operation types
 */
export interface RateLimitConfig {
  // Per-user limits
  userLimit: number;
  userWindowMs: number;

  // Per-IP limits (additional layer)
  ipLimit: number;
  ipWindowMs: number;

  // Combined limit (user + IP must both pass)
  requireBoth: boolean;
}

/**
 * Risk factors that adjust rate limits
 */
export interface UserRiskProfile {
  accountAgeDays: number;
  isEmailVerified: boolean;
  is2FAEnabled: boolean;
  hasCompletedKYC: boolean;
  totalSuccessfulWithdrawals: number;
  recentFailedAttempts: number;
  isTrustedDevice: boolean;
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterMs: number;
  warning?: string;
  riskMultiplier: number;
}

/**
 * Operation types with different rate limit profiles
 */
export type OperationType =
  | 'withdrawal_create'      // Creating a new withdrawal - strictest
  | 'withdrawal_confirm'     // Confirming with code - medium
  | 'withdrawal_read'        // Reading withdrawal history - lenient
  | 'transfer_create'        // Creating internal transfer - strict
  | 'transfer_confirm'       // Confirming transfer - medium
  | 'transfer_read'          // Reading transfer history - lenient
  | 'login_attempt'          // Login attempts - strict
  | 'password_reset'         // Password reset requests - strict
  | '2fa_verify'             // 2FA verification attempts - strict
  | 'api_general';           // General API calls - lenient

/**
 * Default rate limit configurations per operation type
 * These are BASE limits - will be adjusted by risk profile
 */
const DEFAULT_LIMITS: Record<OperationType, RateLimitConfig> = {
  // Withdrawal creation: 10/hour per user, 20/hour per IP
  withdrawal_create: {
    userLimit: 10,
    userWindowMs: 60 * 60 * 1000, // 1 hour
    ipLimit: 20,
    ipWindowMs: 60 * 60 * 1000,
    requireBoth: true,
  },

  // Withdrawal confirmation: 15/15min per user (for typos), 30/15min per IP
  withdrawal_confirm: {
    userLimit: 15,
    userWindowMs: 15 * 60 * 1000, // 15 minutes
    ipLimit: 30,
    ipWindowMs: 15 * 60 * 1000,
    requireBoth: true,
  },

  // Reading withdrawals: 100/hour - mostly unrestricted
  withdrawal_read: {
    userLimit: 100,
    userWindowMs: 60 * 60 * 1000,
    ipLimit: 200,
    ipWindowMs: 60 * 60 * 1000,
    requireBoth: false, // Either limit triggers
  },

  // Transfer creation: 20/hour per user (more common than withdrawals)
  transfer_create: {
    userLimit: 20,
    userWindowMs: 60 * 60 * 1000,
    ipLimit: 50,
    ipWindowMs: 60 * 60 * 1000,
    requireBoth: true,
  },

  // Transfer confirmation: 20/15min per user
  transfer_confirm: {
    userLimit: 20,
    userWindowMs: 15 * 60 * 1000,
    ipLimit: 40,
    ipWindowMs: 15 * 60 * 1000,
    requireBoth: true,
  },

  // Reading transfers: lenient
  transfer_read: {
    userLimit: 100,
    userWindowMs: 60 * 60 * 1000,
    ipLimit: 200,
    ipWindowMs: 60 * 60 * 1000,
    requireBoth: false,
  },

  // Login attempts: 10/15min per IP (no user yet)
  login_attempt: {
    userLimit: 10,
    userWindowMs: 15 * 60 * 1000,
    ipLimit: 10,
    ipWindowMs: 15 * 60 * 1000,
    requireBoth: false,
  },

  // Password reset: 3/hour per email/IP
  password_reset: {
    userLimit: 3,
    userWindowMs: 60 * 60 * 1000,
    ipLimit: 5,
    ipWindowMs: 60 * 60 * 1000,
    requireBoth: false,
  },

  // 2FA verification: 10/5min (for typos)
  '2fa_verify': {
    userLimit: 10,
    userWindowMs: 5 * 60 * 1000,
    ipLimit: 20,
    ipWindowMs: 5 * 60 * 1000,
    requireBoth: true,
  },

  // General API: very lenient
  api_general: {
    userLimit: 1000,
    userWindowMs: 60 * 60 * 1000,
    ipLimit: 2000,
    ipWindowMs: 60 * 60 * 1000,
    requireBoth: false,
  },
};

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);

  // In-memory cache for rate limiting (consider Redis for production clustering)
  private readonly userCounters: Map<string, { count: number; resetAt: number }> = new Map();
  private readonly ipCounters: Map<string, { count: number; resetAt: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private readonly prisma: PrismaService) {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    this.cleanupInterval.unref(); // Don't prevent process exit
  }

  /**
   * Clean up resources on module destroy
   */
  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Check if an operation is allowed based on rate limits
   */
  async checkRateLimit(
    operation: OperationType,
    userId: string | null,
    ipAddress: string,
    riskProfile?: UserRiskProfile,
  ): Promise<RateLimitResult> {
    const config = DEFAULT_LIMITS[operation];
    const riskMultiplier = riskProfile ? this.calculateRiskMultiplier(riskProfile) : 1.0;

    // Adjust limits based on risk profile
    const adjustedUserLimit = Math.ceil(config.userLimit * riskMultiplier);
    const adjustedIpLimit = Math.ceil(config.ipLimit * riskMultiplier);

    const now = Date.now();

    // Check user-based limit
    let userResult = { allowed: true, remaining: adjustedUserLimit, resetAt: new Date(now + config.userWindowMs) };
    if (userId) {
      const userKey = `${operation}:user:${userId}`;
      userResult = this.checkCounter(userKey, adjustedUserLimit, config.userWindowMs, now);
    }

    // Check IP-based limit
    const ipKey = `${operation}:ip:${ipAddress}`;
    const ipResult = this.checkCounter(ipKey, adjustedIpLimit, config.ipWindowMs, now);

    // Determine if allowed based on config
    let allowed: boolean;
    let remaining: number;
    let resetAt: Date;

    if (config.requireBoth) {
      // Both user AND IP must be allowed
      allowed = userResult.allowed && ipResult.allowed;
      remaining = Math.min(userResult.remaining, ipResult.remaining);
      resetAt = userResult.resetAt > ipResult.resetAt ? userResult.resetAt : ipResult.resetAt;
    } else {
      // Either being blocked is enough
      allowed = userResult.allowed && ipResult.allowed;
      remaining = Math.min(userResult.remaining, ipResult.remaining);
      resetAt = !userResult.allowed ? userResult.resetAt : ipResult.resetAt;
    }

    // Calculate retry after
    const retryAfterMs = allowed ? 0 : Math.max(0, resetAt.getTime() - now);

    // Generate warning if approaching limit
    let warning: string | undefined;
    if (allowed && remaining <= Math.ceil(adjustedUserLimit * 0.2)) {
      warning = `Approaching rate limit. ${remaining} requests remaining.`;
    }

    // Log if blocked
    if (!allowed) {
      this.logger.warn(
        `Rate limit exceeded: ${operation} by user=${userId || 'anonymous'} IP=${ipAddress}`,
      );
    }

    return {
      allowed,
      remaining,
      resetAt,
      retryAfterMs,
      warning,
      riskMultiplier,
    };
  }

  /**
   * Record a successful operation (increment counter)
   */
  recordOperation(
    operation: OperationType,
    userId: string | null,
    ipAddress: string,
  ): void {
    const now = Date.now();
    const config = DEFAULT_LIMITS[operation];

    if (userId) {
      const userKey = `${operation}:user:${userId}`;
      this.incrementCounter(userKey, config.userWindowMs, now);
    }

    const ipKey = `${operation}:ip:${ipAddress}`;
    this.incrementCounter(ipKey, config.ipWindowMs, now);
  }

  /**
   * Calculate risk multiplier based on user profile
   * Higher multiplier = more lenient limits (trusted users)
   * Lower multiplier = stricter limits (risky users)
   */
  private calculateRiskMultiplier(profile: UserRiskProfile): number {
    let multiplier = 1.0;

    // Account age bonus (up to +50% for accounts > 90 days)
    if (profile.accountAgeDays > 90) {
      multiplier += 0.5;
    } else if (profile.accountAgeDays > 30) {
      multiplier += 0.25;
    } else if (profile.accountAgeDays < 7) {
      multiplier -= 0.3; // New accounts get stricter limits
    }

    // Email verification bonus
    if (profile.isEmailVerified) {
      multiplier += 0.2;
    } else {
      multiplier -= 0.2;
    }

    // 2FA bonus (significant trust indicator)
    if (profile.is2FAEnabled) {
      multiplier += 0.4;
    }

    // KYC bonus
    if (profile.hasCompletedKYC) {
      multiplier += 0.3;
    }

    // Successful withdrawal history bonus
    if (profile.totalSuccessfulWithdrawals > 10) {
      multiplier += 0.3;
    } else if (profile.totalSuccessfulWithdrawals > 3) {
      multiplier += 0.15;
    }

    // Recent failed attempts penalty
    if (profile.recentFailedAttempts > 5) {
      multiplier -= 0.5;
    } else if (profile.recentFailedAttempts > 2) {
      multiplier -= 0.2;
    }

    // Trusted device bonus
    if (profile.isTrustedDevice) {
      multiplier += 0.2;
    }

    // Clamp between 0.3 and 2.5
    return Math.max(0.3, Math.min(2.5, multiplier));
  }

  /**
   * Get user risk profile from database
   */
  async getUserRiskProfile(userId: string, ipAddress: string): Promise<UserRiskProfile> {
    const [user, withdrawalCount, recentFailures] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          createdAt: true,
          isEmailVerified: true,
          twoFactorAuth: { select: { isEnabled: true } },
        },
      }),
      this.prisma.withdrawal.count({
        where: {
          userId,
          status: 'COMPLETED',
        },
      }),
      this.prisma.withdrawalProcessingLog.count({
        where: {
          action: 'CONFIRM_FAILED',
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    // Check if device is trusted via session
    const trustedDevice = await this.prisma.session.findFirst({
      where: {
        userId,
        ipAddress,
        isValid: true,
      },
    });

    const accountAgeDays = user
      ? Math.floor((Date.now() - user.createdAt.getTime()) / (24 * 60 * 60 * 1000))
      : 0;

    return {
      accountAgeDays,
      isEmailVerified: user?.isEmailVerified ?? false,
      is2FAEnabled: user?.twoFactorAuth?.isEnabled ?? false,
      hasCompletedKYC: false, // Add KYC check when implemented
      totalSuccessfulWithdrawals: withdrawalCount,
      recentFailedAttempts: recentFailures,
      isTrustedDevice: !!trustedDevice,
    };
  }

  /**
   * Check counter and return result
   */
  private checkCounter(
    key: string,
    limit: number,
    windowMs: number,
    now: number,
  ): { allowed: boolean; remaining: number; resetAt: Date } {
    const counter = this.userCounters.get(key) || this.ipCounters.get(key);

    if (!counter || counter.resetAt <= now) {
      // No counter or expired - allowed
      return {
        allowed: true,
        remaining: limit,
        resetAt: new Date(now + windowMs),
      };
    }

    const remaining = Math.max(0, limit - counter.count);
    return {
      allowed: counter.count < limit,
      remaining,
      resetAt: new Date(counter.resetAt),
    };
  }

  /**
   * Increment counter
   */
  private incrementCounter(key: string, windowMs: number, now: number): void {
    const isUserKey = key.includes(':user:');
    const counters = isUserKey ? this.userCounters : this.ipCounters;

    const existing = counters.get(key);

    if (!existing || existing.resetAt <= now) {
      // Create new counter
      counters.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
    } else {
      // Increment existing
      existing.count++;
    }
  }

  /**
   * Clean up expired counters
   */
  private cleanup(): void {
    const now = Date.now();

    for (const [key, counter] of this.userCounters.entries()) {
      if (counter.resetAt <= now) {
        this.userCounters.delete(key);
      }
    }

    for (const [key, counter] of this.ipCounters.entries()) {
      if (counter.resetAt <= now) {
        this.ipCounters.delete(key);
      }
    }
  }

  /**
   * Get current rate limit status for a user (for UI display)
   */
  async getRateLimitStatus(
    userId: string,
    ipAddress: string,
  ): Promise<Record<OperationType, { remaining: number; resetAt: Date }>> {
    const operations: OperationType[] = [
      'withdrawal_create',
      'transfer_create',
      'withdrawal_confirm',
      'transfer_confirm',
    ];

    const status: Record<string, { remaining: number; resetAt: Date }> = {};

    for (const op of operations) {
      const result = await this.checkRateLimit(op, userId, ipAddress);
      status[op] = {
        remaining: result.remaining,
        resetAt: result.resetAt,
      };
    }

    return status as Record<OperationType, { remaining: number; resetAt: Date }>;
  }
}
