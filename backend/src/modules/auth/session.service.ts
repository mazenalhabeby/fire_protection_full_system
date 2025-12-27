import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { Request } from 'express';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from './token.service';
import { GeolocationService } from './geolocation.service';
import { SESSION_EXPIRY_DAYS } from '../../config/cookie.config';
import * as UAParser from 'ua-parser-js';

// Session limits
const MAX_SESSIONS_PER_USER = 5;
const MAX_SESSIONS_PER_DEVICE = 1;

export interface SessionInfo {
  deviceType: string;
  deviceName: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  ipAddress: string;
}

export interface SessionData {
  id: string;
  deviceType: string | null;
  deviceName: string | null;
  browser: string | null;
  os: string | null;
  ipAddress: string | null;
  country: string | null;
  city: string | null;
  createdAt: Date;
  lastActivityAt: Date;
  isCurrent?: boolean;
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly geolocationService: GeolocationService,
  ) {}

  /**
   * Parse user agent to extract device information
   */
  parseUserAgent(req: Request): SessionInfo {
    const parser = new UAParser.UAParser(req.headers['user-agent']);
    const result = parser.getResult();

    const deviceType = result.device.type || 'desktop';
    const browser = result.browser.name || 'Unknown';
    const os = result.os.name || 'Unknown';

    return {
      deviceType,
      deviceName: `${browser} on ${os}`,
      browser,
      browserVersion: result.browser.version || '',
      os,
      osVersion: result.os.version || '',
      ipAddress: this.getClientIp(req),
    };
  }

  /**
   * Get client IP address from request
   */
  private getClientIp(req: Request): string {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor.split(',')[0];
      return ips.trim();
    }
    return req.socket?.remoteAddress || req.ip || 'unknown';
  }

  /**
   * Generate a device fingerprint for session matching
   * Uses browser + OS combination to identify the same device
   */
  private generateDeviceFingerprint(sessionInfo: SessionInfo): string {
    return `${sessionInfo.browser}|${sessionInfo.os}|${sessionInfo.deviceType}`;
  }

  /**
   * Find existing active session for the same device
   */
  async findExistingDeviceSession(userId: string, sessionInfo: SessionInfo) {
    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        isValid: true,
        browser: sessionInfo.browser,
        os: sessionInfo.os,
        deviceType: sessionInfo.deviceType,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActivityAt: 'desc' },
      take: 1,
    });

    return sessions[0] || null;
  }

  /**
   * Enforce max sessions per user - revoke oldest sessions if limit exceeded
   */
  async enforceSessionLimit(userId: string, currentSessionId?: string) {
    const activeSessions = await this.prisma.session.findMany({
      where: {
        userId,
        isValid: true,
        expiresAt: { gt: new Date() },
        ...(currentSessionId && { NOT: { id: currentSessionId } }),
      },
      orderBy: { lastActivityAt: 'asc' }, // Oldest first
    });

    // If we're at or over limit, revoke oldest sessions
    const sessionsToRevoke = activeSessions.slice(0, Math.max(0, activeSessions.length - MAX_SESSIONS_PER_USER + 1));

    if (sessionsToRevoke.length > 0) {
      const idsToRevoke = sessionsToRevoke.map(s => s.id);
      await this.prisma.session.updateMany({
        where: { id: { in: idsToRevoke } },
        data: {
          isValid: false,
          revokedAt: new Date(),
          revokedReason: 'session_limit_exceeded',
        },
      });
      this.logger.log(`Revoked ${sessionsToRevoke.length} old sessions for user ${userId} (limit: ${MAX_SESSIONS_PER_USER})`);
    }
  }

  /**
   * Create a new session or reuse existing session for the same device
   * @param browserLocation - Optional location from browser geolocation API (more accurate than IP)
   */
  async createSession(
    userId: string,
    refreshToken: string,
    req: Request,
    browserLocation?: { city?: string; country?: string; latitude?: number; longitude?: number },
  ) {
    const sessionInfo = this.parseUserAgent(req);
    const hashedToken = this.tokenService.hashToken(refreshToken);

    // Check for existing session on same device
    const existingSession = await this.findExistingDeviceSession(userId, sessionInfo);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

    // Use browser location if provided (more accurate), otherwise fall back to IP-based geolocation
    let city: string | null = browserLocation?.city || null;
    let country: string | null = browserLocation?.country || null;

    this.logger.log(`Browser location received: ${JSON.stringify(browserLocation)}`);

    if (!city && !country) {
      // Fall back to IP-based geolocation
      this.logger.log(`No browser location, falling back to IP-based for IP: ${sessionInfo.ipAddress}`);
      const geoLocation = await this.geolocationService.getLocation(sessionInfo.ipAddress);
      city = geoLocation.city;
      country = geoLocation.country;
      this.logger.log(`IP-based location: ${city}, ${country}`);
    }

    const locationSource = browserLocation?.city ? 'browser' : 'ip';
    this.logger.log(`Final location for session: ${city}, ${country} (source: ${locationSource})`);

    if (existingSession) {
      // Reuse existing session - update with new token and activity
      const updatedSession = await this.prisma.session.update({
        where: { id: existingSession.id },
        data: {
          refreshToken: hashedToken,
          tokenFamily: this.tokenService.generateTokenFamily(), // New token family for security
          ipAddress: sessionInfo.ipAddress,
          country,
          city,
          browserVersion: sessionInfo.browserVersion,
          osVersion: sessionInfo.osVersion,
          lastActivityAt: new Date(),
          expiresAt,
        },
      });

      this.logger.log(`Session reused for user ${userId}: ${updatedSession.id} (same device: ${sessionInfo.deviceName})`);
      return updatedSession;
    }

    // Create new session
    const tokenFamily = this.tokenService.generateTokenFamily();

    const session = await this.prisma.session.create({
      data: {
        userId,
        refreshToken: hashedToken,
        tokenFamily,
        deviceType: sessionInfo.deviceType,
        deviceName: sessionInfo.deviceName,
        browser: sessionInfo.browser,
        browserVersion: sessionInfo.browserVersion,
        os: sessionInfo.os,
        osVersion: sessionInfo.osVersion,
        ipAddress: sessionInfo.ipAddress,
        country,
        city,
        expiresAt,
      },
    });

    // Enforce session limit after creating new session
    await this.enforceSessionLimit(userId, session.id);

    this.logger.log(`Session created for user ${userId}: ${session.id} (${city || 'Unknown'}, ${country || 'Unknown'})`);
    return session;
  }

  /**
   * Validate a session by ID
   */
  async validateSession(sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return null;
    }

    if (!session.isValid) {
      this.logger.warn(`Invalid session access attempt: ${sessionId}`);
      return null;
    }

    if (new Date() > session.expiresAt) {
      await this.revokeSession(sessionId, 'expired');
      return null;
    }

    return session;
  }

  /**
   * Validate session by refresh token hash
   */
  async validateSessionByToken(refreshToken: string) {
    const hashedToken = this.tokenService.hashToken(refreshToken);

    const session = await this.prisma.session.findFirst({
      where: {
        refreshToken: hashedToken,
        isValid: true,
      },
    });

    if (!session) {
      return null;
    }

    if (new Date() > session.expiresAt) {
      await this.revokeSession(session.id, 'expired');
      return null;
    }

    return session;
  }

  /**
   * Rotate refresh token (for token refresh flow)
   * Implements refresh token rotation with reuse detection
   */
  async rotateRefreshToken(
    oldRefreshToken: string,
    sessionId: string,
    newRefreshToken: string,
  ) {
    const hashedOldToken = this.tokenService.hashToken(oldRefreshToken);
    const hashedNewToken = this.tokenService.hashToken(newRefreshToken);

    const session = await this.prisma.session.findFirst({
      where: {
        id: sessionId,
        refreshToken: hashedOldToken,
        isValid: true,
      },
    });

    if (!session) {
      // Potential token reuse attack - revoke entire token family
      this.logger.error(`Token reuse detected for session ${sessionId}`);

      // Find the session by ID to get the token family
      const existingSession = await this.prisma.session.findUnique({
        where: { id: sessionId },
      });

      if (existingSession) {
        await this.revokeTokenFamily(existingSession.tokenFamily);
      }

      throw new UnauthorizedException('Invalid refresh token - security violation detected');
    }

    // Update session with new refresh token
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + SESSION_EXPIRY_DAYS);

    return this.prisma.session.update({
      where: { id: sessionId },
      data: {
        refreshToken: hashedNewToken,
        expiresAt: newExpiresAt,
        lastActivityAt: new Date(),
      },
    });
  }

  /**
   * Update last activity timestamp
   */
  async updateLastActivity(sessionId: string) {
    try {
      await this.prisma.session.update({
        where: { id: sessionId },
        data: { lastActivityAt: new Date() },
      });
    } catch (error) {
      // Silently fail - don't break the request
      this.logger.warn(`Failed to update last activity for session ${sessionId}`);
    }
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string, reason: string) {
    return this.prisma.session.update({
      where: { id: sessionId },
      data: {
        isValid: false,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });
  }

  /**
   * Revoke entire token family (security measure)
   */
  async revokeTokenFamily(tokenFamily: string) {
    this.logger.warn(`Revoking entire token family: ${tokenFamily}`);

    return this.prisma.session.updateMany({
      where: { tokenFamily },
      data: {
        isValid: false,
        revokedAt: new Date(),
        revokedReason: 'security',
      },
    });
  }

  /**
   * Revoke all sessions for a user (except optionally one)
   */
  async revokeAllUserSessions(userId: string, exceptSessionId?: string) {
    const where: any = {
      userId,
      isValid: true,
    };

    if (exceptSessionId) {
      where.NOT = { id: exceptSessionId };
    }

    return this.prisma.session.updateMany({
      where,
      data: {
        isValid: false,
        revokedAt: new Date(),
        revokedReason: 'password_change',
      },
    });
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<SessionData[]> {
    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        isValid: true,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        deviceType: true,
        deviceName: true,
        browser: true,
        os: true,
        ipAddress: true,
        country: true,
        city: true,
        createdAt: true,
        lastActivityAt: true,
      },
      orderBy: { lastActivityAt: 'desc' },
    });

    return sessions;
  }

  /**
   * Check if a session belongs to a user
   */
  async sessionBelongsToUser(sessionId: string, userId: string): Promise<boolean> {
    const session = await this.prisma.session.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });

    return !!session;
  }

  /**
   * Count active sessions for a user
   */
  async countUserSessions(userId: string): Promise<number> {
    return this.prisma.session.count({
      where: {
        userId,
        isValid: true,
        expiresAt: { gt: new Date() },
      },
    });
  }

  /**
   * Clean up expired sessions - runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredSessions() {
    const result = await this.prisma.session.updateMany({
      where: {
        isValid: true,
        expiresAt: { lt: new Date() },
      },
      data: {
        isValid: false,
        revokedAt: new Date(),
        revokedReason: 'expired',
      },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} expired sessions`);
    }
    return result.count;
  }

  /**
   * Delete old revoked sessions - runs daily at 3 AM
   * Permanently removes sessions that were revoked more than 30 days ago
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async deleteOldSessions(daysOld: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.prisma.session.deleteMany({
      where: {
        isValid: false,
        revokedAt: { lt: cutoffDate },
      },
    });

    if (result.count > 0) {
      this.logger.log(`Deleted ${result.count} old sessions (older than ${daysOld} days)`);
    }
    return result.count;
  }

  /**
   * Get session statistics for a user
   */
  async getSessionStats(userId: string) {
    const [activeCount, totalCount] = await Promise.all([
      this.prisma.session.count({
        where: { userId, isValid: true, expiresAt: { gt: new Date() } },
      }),
      this.prisma.session.count({
        where: { userId },
      }),
    ]);

    return {
      activeCount,
      totalCount,
      maxAllowed: MAX_SESSIONS_PER_USER,
    };
  }
}
