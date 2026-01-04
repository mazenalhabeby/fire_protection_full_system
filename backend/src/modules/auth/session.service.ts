import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { Request } from 'express';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from './token.service';
import { GeolocationService } from './geolocation.service';
import { SESSION_EXPIRY_DAYS, ACCESS_TOKEN_MAX_AGE } from '../../config/cookie.config';
import * as UAParser from 'ua-parser-js';

// Session limits
const MAX_SESSIONS_PER_USER = 5;
const MAX_SESSIONS_PER_DEVICE = 1;

// Inactivity timeout (days)
const INACTIVITY_TIMEOUT_DAYS = 7;

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
  authMethod: string;  // password, google, facebook, wallet
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
  isTrusted?: boolean;
  trustDeviceName?: string | null;
}

export interface SecurityAlert {
  type: 'impossible_travel' | 'ip_change' | 'new_device' | 'new_location';
  message: string;
  details: Record<string, any>;
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
   * Check if IP is private/localhost (for development detection)
   */
  private isPrivateIP(ip: string): boolean {
    if (!ip || ip === 'unknown') return true;

    // Localhost
    if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true;

    // Private IPv4 ranges
    const privateRanges = [
      /^10\./,                    // 10.0.0.0/8
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12 (includes Docker)
      /^192\.168\./,              // 192.168.0.0/16
      /^169\.254\./,              // Link-local
    ];

    return privateRanges.some(range => range.test(ip));
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
   * Get the most recent session for a user (for impossible travel detection)
   */
  async getLastUserSession(userId: string) {
    return this.prisma.session.findFirst({
      where: {
        userId,
        latitude: { not: null },
        longitude: { not: null },
      },
      orderBy: { lastActivityAt: 'desc' },
    });
  }

  /**
   * Check for suspicious login patterns
   */
  async checkForSuspiciousLogin(
    userId: string,
    newLatitude: number | null,
    newLongitude: number | null,
    newIpAddress: string,
    newCountry: string | null,
  ): Promise<SecurityAlert | null> {
    const lastSession = await this.getLastUserSession(userId);

    if (!lastSession) {
      return null; // First login, nothing to compare
    }

    // Check for impossible travel
    if (
      lastSession.latitude &&
      lastSession.longitude &&
      newLatitude &&
      newLongitude
    ) {
      const timeDifferenceMs =
        Date.now() - lastSession.lastActivityAt.getTime();

      const isImpossible = this.geolocationService.isImpossibleTravel(
        lastSession.latitude,
        lastSession.longitude,
        newLatitude,
        newLongitude,
        timeDifferenceMs,
      );

      if (isImpossible) {
        const distanceKm = this.geolocationService.calculateDistance(
          lastSession.latitude,
          lastSession.longitude,
          newLatitude,
          newLongitude,
        );
        const timeMinutes = Math.round(timeDifferenceMs / (1000 * 60));

        this.logger.warn(
          `Impossible travel detected for user ${userId}: ${distanceKm.toFixed(0)}km in ${timeMinutes} minutes`,
        );

        return {
          type: 'impossible_travel',
          message: `Suspicious login detected: Login from ${newCountry || 'unknown location'} only ${timeMinutes} minutes after previous activity ${distanceKm.toFixed(0)}km away`,
          details: {
            previousCity: lastSession.city,
            previousCountry: lastSession.country,
            distanceKm: Math.round(distanceKm),
            timeMinutes,
          },
        };
      }
    }

    // Check for different country (less severe than impossible travel)
    if (
      lastSession.country &&
      newCountry &&
      lastSession.country !== newCountry
    ) {
      return {
        type: 'new_location',
        message: `New login from ${newCountry}. Your previous session was from ${lastSession.country}.`,
        details: {
          previousCountry: lastSession.country,
          newCountry,
        },
      };
    }

    return null;
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
    const sessionsToRevoke = activeSessions.slice(
      0,
      Math.max(0, activeSessions.length - MAX_SESSIONS_PER_USER + 1),
    );

    if (sessionsToRevoke.length > 0) {
      const idsToRevoke = sessionsToRevoke.map((s) => s.id);

      // Delete sessions instead of just marking invalid
      await this.prisma.session.deleteMany({
        where: { id: { in: idsToRevoke } },
      });

      this.logger.log(
        `Deleted ${sessionsToRevoke.length} old sessions for user ${userId} (limit: ${MAX_SESSIONS_PER_USER})`,
      );
    }
  }

  /**
   * Create a new session or reuse existing session for the same device
   * @param browserLocation - Optional location from browser geolocation API (more accurate than IP)
   * @param authMethod - Authentication method used (password, google, facebook, wallet)
   * @returns Object containing session and optional security alert
   */
  async createSession(
    userId: string,
    refreshToken: string,
    req: Request,
    browserLocation?: {
      city?: string;
      country?: string;
      latitude?: number;
      longitude?: number;
      accuracy?: number;
    },
    deviceFingerprint?: string,
    authMethod: string = 'password',
  ): Promise<{ session: any; securityAlert: SecurityAlert | null; vpnDetected?: boolean }> {
    const sessionInfo = this.parseUserAgent(req);
    const hashedToken = this.tokenService.hashToken(refreshToken);

    // Check for existing session on same device
    const existingSession = await this.findExistingDeviceSession(
      userId,
      sessionInfo,
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

    // Always get IP-based geolocation
    const ipGeoLocation = await this.geolocationService.getLocation(
      sessionInfo.ipAddress,
    );
    this.logger.log(`IP-based location: ${ipGeoLocation.city}, ${ipGeoLocation.country}`);

    // VPN Detection: Compare IP location with browser GPS location
    let isVpnDetected = false;
    let locationMismatch = false;
    let browserCity: string | null = null;
    let browserCountry: string | null = null;

    if (browserLocation?.latitude && browserLocation?.longitude) {
      const vpnResult = await this.geolocationService.detectVpn(
        sessionInfo.ipAddress,
        {
          latitude: browserLocation.latitude,
          longitude: browserLocation.longitude,
          accuracy: browserLocation.accuracy || 100,
        },
      );

      isVpnDetected = vpnResult.isVpnDetected;
      locationMismatch = vpnResult.locationMismatch;
      browserCity = vpnResult.browserLocation?.city || null;
      browserCountry = vpnResult.browserLocation?.country || null;

      if (isVpnDetected) {
        this.logger.warn(
          `VPN DETECTED for user ${userId}: ${vpnResult.reason}`,
        );
      }
    }

    // Primary location: Use browser GPS if available (more accurate), else IP-based
    const hasBrowserLocation = browserLocation?.latitude && browserLocation?.longitude;
    const city = hasBrowserLocation ? browserCity : ipGeoLocation.city;
    const country = hasBrowserLocation ? browserCountry : ipGeoLocation.country;
    const latitude = hasBrowserLocation ? browserLocation.latitude! : ipGeoLocation.latitude;
    const longitude = hasBrowserLocation ? browserLocation.longitude! : ipGeoLocation.longitude;

    const locationSource = hasBrowserLocation ? 'browser' : 'ip';
    this.logger.log(
      `Final location for session: ${city}, ${country} (source: ${locationSource})`,
    );

    // Check for suspicious login patterns
    const securityAlert = await this.checkForSuspiciousLogin(
      userId,
      latitude,
      longitude,
      sessionInfo.ipAddress,
      country,
    );

    // For localhost/development, prefer browser GPS location as the primary location
    const isLocalhost = this.isPrivateIP(sessionInfo.ipAddress);
    const primaryCity = isLocalhost && browserCity ? browserCity : (ipGeoLocation.city || browserCity);
    const primaryCountry = isLocalhost && browserCountry ? browserCountry : (ipGeoLocation.country || browserCountry);
    const primaryLat = isLocalhost && browserLocation?.latitude ? browserLocation.latitude : (ipGeoLocation.latitude || browserLocation?.latitude || null);
    const primaryLon = isLocalhost && browserLocation?.longitude ? browserLocation.longitude : (ipGeoLocation.longitude || browserLocation?.longitude || null);

    // Build session data with both IP and browser locations
    const sessionData = {
      refreshToken: hashedToken,
      tokenFamily: this.tokenService.generateTokenFamily(),
      authMethod,
      ipAddress: sessionInfo.ipAddress,
      // Primary location (prefer browser GPS on localhost, else IP-based with GPS fallback)
      country: primaryCountry,
      city: primaryCity,
      latitude: primaryLat,
      longitude: primaryLon,
      // Browser GPS location (if provided)
      browserLatitude: browserLocation?.latitude || null,
      browserLongitude: browserLocation?.longitude || null,
      browserCity,
      browserCountry,
      browserAccuracy: browserLocation?.accuracy || null,
      // VPN detection
      isVpnDetected,
      vpnDetectedAt: isVpnDetected ? new Date() : null,
      locationMismatch,
      // Timestamps
      lastActivityAt: new Date(),
      expiresAt,
    };

    if (existingSession) {
      // Reuse existing session - update with new token and activity
      const updatedSession = await this.prisma.session.update({
        where: { id: existingSession.id },
        data: {
          ...sessionData,
          previousIpAddress: existingSession.ipAddress,
          browserVersion: sessionInfo.browserVersion,
          osVersion: sessionInfo.osVersion,
        },
      });

      this.logger.log(
        `Session reused for user ${userId}: ${updatedSession.id} (same device: ${sessionInfo.deviceName})`,
      );

      // Log activity
      await this.logSessionActivity(updatedSession.id, userId, 'session_reused', {
        ipAddress: sessionInfo.ipAddress,
        device: sessionInfo.deviceName,
        city: city || ipGeoLocation.city,
        country: country || ipGeoLocation.country,
        vpnDetected: isVpnDetected,
      });

      if (isVpnDetected) {
        await this.logSessionActivity(updatedSession.id, userId, 'vpn_detected', {
          ipCity: ipGeoLocation.city,
          ipCountry: ipGeoLocation.country,
          browserCity,
          browserCountry,
        });
      }

      return { session: updatedSession, securityAlert, vpnDetected: isVpnDetected };
    }

    // Create new session
    const session = await this.prisma.session.create({
      data: {
        userId,
        ...sessionData,
        deviceType: sessionInfo.deviceType,
        deviceName: sessionInfo.deviceName,
        browser: sessionInfo.browser,
        browserVersion: sessionInfo.browserVersion,
        os: sessionInfo.os,
        osVersion: sessionInfo.osVersion,
        deviceFingerprint: deviceFingerprint || null,
      },
    });

    // Enforce session limit after creating new session
    await this.enforceSessionLimit(userId, session.id);

    this.logger.log(
      `Session created for user ${userId}: ${session.id} (${city || 'Unknown'}, ${country || 'Unknown'})` +
      (isVpnDetected ? ' [VPN DETECTED]' : ''),
    );

    // Log activity
    await this.logSessionActivity(session.id, userId, 'login', {
      ipAddress: sessionInfo.ipAddress,
      device: sessionInfo.deviceName,
      city: city || ipGeoLocation.city,
      country: country || ipGeoLocation.country,
      vpnDetected: isVpnDetected,
    });

    if (isVpnDetected) {
      await this.logSessionActivity(session.id, userId, 'vpn_detected', {
        ipCity: ipGeoLocation.city,
        ipCountry: ipGeoLocation.country,
        browserCity,
        browserCountry,
      });
    }

    return { session, securityAlert, vpnDetected: isVpnDetected };
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
      await this.deleteSession(sessionId, 'expired');
      return null;
    }

    // Check for inactivity timeout
    const inactivityCutoff = new Date();
    inactivityCutoff.setDate(inactivityCutoff.getDate() - INACTIVITY_TIMEOUT_DAYS);

    if (session.lastActivityAt < inactivityCutoff) {
      this.logger.log(`Session ${sessionId} expired due to inactivity`);
      await this.deleteSession(sessionId, 'inactivity');
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
      await this.deleteSession(session.id, 'expired');
      return null;
    }

    // Check for inactivity timeout
    const inactivityCutoff = new Date();
    inactivityCutoff.setDate(inactivityCutoff.getDate() - INACTIVITY_TIMEOUT_DAYS);

    if (session.lastActivityAt < inactivityCutoff) {
      this.logger.log(`Session ${session.id} expired due to inactivity`);
      await this.deleteSession(session.id, 'inactivity');
      return null;
    }

    return session;
  }

  /**
   * Check for IP change within a session and handle appropriately
   * Returns security alert if IP changed significantly
   */
  async checkIpChange(
    sessionId: string,
    currentIp: string,
  ): Promise<SecurityAlert | null> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session || !session.ipAddress) {
      return null;
    }

    // IP hasn't changed
    if (session.ipAddress === currentIp) {
      return null;
    }

    // Get location for new IP
    const newLocation = await this.geolocationService.getLocation(currentIp);

    // Check if country changed (more serious)
    if (session.country && newLocation.country && session.country !== newLocation.country) {
      this.logger.warn(
        `IP country change detected for session ${sessionId}: ${session.country} -> ${newLocation.country}`,
      );

      // Update session with new IP info
      await this.prisma.session.update({
        where: { id: sessionId },
        data: {
          previousIpAddress: session.ipAddress,
          ipAddress: currentIp,
          country: newLocation.country,
          city: newLocation.city,
          latitude: newLocation.latitude,
          longitude: newLocation.longitude,
        },
      });

      // Log activity
      await this.logSessionActivity(sessionId, session.userId, 'ip_country_change', {
        previousIp: session.ipAddress,
        newIp: currentIp,
        previousCountry: session.country,
        newCountry: newLocation.country,
      });

      return {
        type: 'ip_change',
        message: `Your IP address location changed from ${session.country} to ${newLocation.country}`,
        details: {
          previousCountry: session.country,
          newCountry: newLocation.country,
          previousIp: session.ipAddress,
          newIp: currentIp,
        },
      };
    }

    // Just update IP without alert for same-country changes
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        previousIpAddress: session.ipAddress,
        ipAddress: currentIp,
        city: newLocation.city,
        latitude: newLocation.latitude,
        longitude: newLocation.longitude,
      },
    });

    return null;
  }

  /**
   * Rotate refresh token (for token refresh flow)
   * Implements refresh token rotation with reuse detection and optimistic locking
   *
   * @param oldRefreshToken - The current refresh token being rotated
   * @param sessionId - The session ID
   * @param newRefreshToken - The new refresh token to replace the old one
   * @param ipAddress - Current client IP address for security tracking
   * @param userAgent - Current user agent for activity logging
   * @returns Updated session with new token expiry time
   */
  async rotateRefreshToken(
    oldRefreshToken: string,
    sessionId: string,
    newRefreshToken: string,
    ipAddress?: string,
    userAgent?: string,
    deviceFingerprint?: string,
  ): Promise<{ session: any; tokenExpiresAt: Date; securityAlert?: SecurityAlert }> {
    const hashedOldToken = this.tokenService.hashToken(oldRefreshToken);
    const hashedNewToken = this.tokenService.hashToken(newRefreshToken);

    // First, get the session to check its current state
    const existingSession = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: { select: { id: true, email: true } } },
    });

    if (!existingSession) {
      throw new UnauthorizedException('Session not found');
    }

    if (!existingSession.isValid) {
      throw new UnauthorizedException('Session has been revoked');
    }

    // ============================================
    // DEVICE FINGERPRINT VALIDATION
    // ============================================
    if (existingSession.deviceFingerprint && deviceFingerprint) {
      if (existingSession.deviceFingerprint !== deviceFingerprint) {
        // Device fingerprint mismatch - potential token theft
        this.logger.error(
          `Device fingerprint mismatch for session ${sessionId}. ` +
          `Expected: ${existingSession.deviceFingerprint.substring(0, 20)}..., ` +
          `Got: ${deviceFingerprint.substring(0, 20)}...`
        );

        // Track the failure
        await this.trackRefreshFailure(sessionId, ipAddress, 'device_fingerprint_mismatch');

        // Check if we should revoke due to too many failures
        const failureCount = (existingSession.refreshFailureCount || 0) + 1;
        if (failureCount >= 3) {
          // Too many failures - revoke the session and notify user
          await this.revokeSessionWithNotification(
            existingSession,
            'security',
            'Multiple failed refresh attempts from different device',
            ipAddress,
          );

          throw new UnauthorizedException(
            'Session revoked due to suspicious activity. Please login again.',
          );
        }

        throw new UnauthorizedException(
          'Device verification failed. Please login again if this persists.',
        );
      }
    }

    // ============================================
    // TOKEN VALIDATION
    // ============================================
    if (existingSession.refreshToken !== hashedOldToken) {
      // Token mismatch - this could be:
      // 1. A legitimate race condition (another request already refreshed)
      // 2. A token reuse attack (attacker using stolen old token)

      // Track the failure
      await this.trackRefreshFailure(sessionId, ipAddress, 'token_mismatch');

      // Check if session was recently updated (within last 5 seconds) - likely race condition
      const fiveSecondsAgo = new Date(Date.now() - 5000);
      if (existingSession.lastActivityAt > fiveSecondsAgo) {
        // Recent activity - likely a race condition, not an attack
        this.logger.warn(
          `Token refresh race condition detected for session ${sessionId}. ` +
          `Session was updated ${Date.now() - existingSession.lastActivityAt.getTime()}ms ago.`
        );
        throw new UnauthorizedException(
          'Session was recently updated. Please retry with the current token.',
        );
      }

      // Not recent - this is likely a token reuse attack
      this.logger.error(
        `Token reuse attack detected for session ${sessionId}. ` +
        `Revoking entire token family: ${existingSession.tokenFamily}`
      );

      await this.revokeTokenFamily(existingSession.tokenFamily);

      // Log the security event and send notification
      await this.logSessionActivity(sessionId, existingSession.userId, 'token_reuse_attack', {
        ipAddress,
        userAgent,
        tokenFamily: existingSession.tokenFamily,
      });

      // Send security notification
      await this.sendSecurityNotification(
        existingSession.userId,
        'token_reuse_attack',
        'Suspicious token usage detected',
        `We detected an attempt to use an expired security token. All your sessions have been revoked for safety. If this wasn't you, please change your password immediately.`,
        { ipAddress, sessionId },
      );

      throw new UnauthorizedException(
        'Invalid refresh token - security violation detected. All sessions have been revoked.',
      );
    }

    // ============================================
    // IP/LOCATION CHANGE DETECTION
    // ============================================
    let securityAlert: SecurityAlert | undefined;

    if (ipAddress && ipAddress !== existingSession.ipAddress) {
      // Get geolocation for new IP
      const newLocation = await this.geolocationService.getLocation(ipAddress);
      const oldLocation = existingSession.country ? {
        country: existingSession.country,
        city: existingSession.city,
        latitude: existingSession.latitude,
        longitude: existingSession.longitude,
      } : null;

      // Check for continent change (drastic location change)
      if (oldLocation && newLocation.country && oldLocation.country !== newLocation.country) {
        const isContinentChange = this.isContinentChange(oldLocation.country, newLocation.country);

        if (isContinentChange) {
          this.logger.warn(
            `Continent change detected for session ${sessionId}: ` +
            `${oldLocation.country} -> ${newLocation.country}`
          );

          securityAlert = {
            type: 'ip_change',
            message: `Your session is now being used from ${newLocation.country}. Previous location: ${oldLocation.country}.`,
            details: {
              previousCountry: oldLocation.country,
              newCountry: newLocation.country,
              isContinentChange: true,
            },
          };

          // Send notification for continent change
          await this.sendSecurityNotification(
            existingSession.userId,
            'continent_change',
            'Login from new continent detected',
            `We detected your account being accessed from ${newLocation.country}. Your previous location was ${oldLocation.country}. If this wasn't you, please secure your account immediately.`,
            { ipAddress, previousCountry: oldLocation.country, newCountry: newLocation.country },
          );
        }
      }

      // Check for impossible travel
      if (
        oldLocation?.latitude &&
        oldLocation?.longitude &&
        newLocation.latitude &&
        newLocation.longitude
      ) {
        const timeDifferenceMs = Date.now() - existingSession.lastActivityAt.getTime();
        const isImpossible = this.geolocationService.isImpossibleTravel(
          oldLocation.latitude,
          oldLocation.longitude,
          newLocation.latitude,
          newLocation.longitude,
          timeDifferenceMs,
        );

        if (isImpossible) {
          const distanceKm = this.geolocationService.calculateDistance(
            oldLocation.latitude,
            oldLocation.longitude,
            newLocation.latitude,
            newLocation.longitude,
          );
          const timeMinutes = Math.round(timeDifferenceMs / (1000 * 60));

          this.logger.error(
            `Impossible travel detected during refresh for session ${sessionId}: ` +
            `${distanceKm.toFixed(0)}km in ${timeMinutes} minutes`
          );

          // Revoke session due to impossible travel
          await this.revokeSessionWithNotification(
            existingSession,
            'suspicious_location',
            `Impossible travel detected: ${distanceKm.toFixed(0)}km in ${timeMinutes} minutes`,
            ipAddress,
          );

          throw new UnauthorizedException(
            'Session revoked due to suspicious location change. Please login again.',
          );
        }
      }
    }

    // ============================================
    // UPDATE SESSION
    // ============================================
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + SESSION_EXPIRY_DAYS);

    // Access token expiry
    const tokenExpiresAt = new Date(Date.now() + ACCESS_TOKEN_MAX_AGE);

    // Use optimistic locking with version field to prevent race conditions
    const updateResult = await this.prisma.session.updateMany({
      where: {
        id: sessionId,
        refreshToken: hashedOldToken,
        isValid: true,
        version: existingSession.version,
      },
      data: {
        refreshToken: hashedNewToken,
        expiresAt: newExpiresAt,
        lastActivityAt: new Date(),
        version: { increment: 1 },
        refreshFailureCount: 0, // Reset failure count on successful refresh
        lastRefreshFailureAt: null,
        // Update IP if changed
        ...(ipAddress && ipAddress !== existingSession.ipAddress ? {
          previousIpAddress: existingSession.ipAddress,
          ipAddress: ipAddress,
          lastRefreshIp: ipAddress,
        } : {}),
        // Update device fingerprint if not set
        ...(deviceFingerprint && !existingSession.deviceFingerprint ? {
          deviceFingerprint,
        } : {}),
      },
    });

    if (updateResult.count === 0) {
      this.logger.warn(
        `Token refresh version conflict for session ${sessionId}. ` +
        `Client should retry with fresh cookies.`
      );
      throw new UnauthorizedException(
        'Concurrent token refresh detected. Please retry.',
      );
    }

    // Get the updated session
    const updatedSession = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    // Log the token refresh activity
    await this.logSessionActivity(sessionId, existingSession.userId, 'token_refresh', {
      ipAddress,
      userAgent: userAgent?.substring(0, 200),
      ipChanged: ipAddress !== existingSession.ipAddress,
      deviceFingerprintValidated: !!deviceFingerprint,
    });

    // Check for IP change and return security alert if needed
    if (ipAddress && ipAddress !== existingSession.ipAddress && !securityAlert) {
      securityAlert = await this.checkIpChange(sessionId, ipAddress) || undefined;
      if (securityAlert) {
        this.logger.warn(
          `IP change detected during token refresh for session ${sessionId}: ` +
          `${existingSession.ipAddress} -> ${ipAddress}`
        );
      }
    }

    return { session: updatedSession, tokenExpiresAt, securityAlert };
  }

  /**
   * Track refresh failure for suspicious activity detection
   */
  private async trackRefreshFailure(sessionId: string, ipAddress?: string, reason?: string): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        refreshFailureCount: { increment: 1 },
        lastRefreshFailureAt: new Date(),
        lastRefreshIp: ipAddress || null,
      },
    });

    await this.logSessionActivity(sessionId, '', 'refresh_failure', {
      ipAddress,
      reason,
    });
  }

  /**
   * Revoke session and send notification to user
   */
  private async revokeSessionWithNotification(
    session: any,
    reason: string,
    message: string,
    ipAddress?: string,
  ): Promise<void> {
    // Revoke the session
    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        isValid: false,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });

    // Log the activity
    await this.logSessionActivity(session.id, session.userId, 'session_revoked', {
      reason,
      message,
      ipAddress,
    });

    // Send notification
    await this.sendSecurityNotification(
      session.userId,
      'session_revoked',
      'Session terminated for security',
      message,
      { sessionId: session.id, ipAddress, reason },
    );
  }

  /**
   * Send security notification via in-app notification
   * Email notifications are handled by the notifications service based on user preferences
   */
  private async sendSecurityNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    details: Record<string, any>,
  ): Promise<void> {
    try {
      // Create in-app notification
      await this.prisma.notification.create({
        data: {
          userId,
          type: 'SECURITY',
          title,
          message,
          data: { ...details, securityEventType: type },
        },
      });

      this.logger.log(`Security notification created for user ${userId}: ${type}`);
    } catch (error) {
      this.logger.error(`Failed to create security notification: ${error}`);
    }
  }

  /**
   * Check if two countries are on different continents
   */
  private isContinentChange(country1: string, country2: string): boolean {
    // Map countries to continents (simplified)
    const continentMap: Record<string, string> = {
      // North America
      'United States': 'NA', 'Canada': 'NA', 'Mexico': 'NA',
      // South America
      'Brazil': 'SA', 'Argentina': 'SA', 'Colombia': 'SA', 'Chile': 'SA', 'Peru': 'SA',
      // Europe
      'United Kingdom': 'EU', 'Germany': 'EU', 'France': 'EU', 'Italy': 'EU', 'Spain': 'EU',
      'Netherlands': 'EU', 'Belgium': 'EU', 'Switzerland': 'EU', 'Austria': 'EU', 'Poland': 'EU',
      'Sweden': 'EU', 'Norway': 'EU', 'Denmark': 'EU', 'Finland': 'EU', 'Ireland': 'EU',
      'Portugal': 'EU', 'Greece': 'EU', 'Czech Republic': 'EU', 'Romania': 'EU', 'Hungary': 'EU',
      // Asia
      'China': 'AS', 'Japan': 'AS', 'South Korea': 'AS', 'India': 'AS', 'Indonesia': 'AS',
      'Thailand': 'AS', 'Vietnam': 'AS', 'Philippines': 'AS', 'Malaysia': 'AS', 'Singapore': 'AS',
      'Taiwan': 'AS', 'Hong Kong': 'AS', 'Pakistan': 'AS', 'Bangladesh': 'AS',
      // Middle East
      'United Arab Emirates': 'ME', 'Saudi Arabia': 'ME', 'Israel': 'ME', 'Turkey': 'ME',
      'Iran': 'ME', 'Iraq': 'ME', 'Qatar': 'ME', 'Kuwait': 'ME',
      // Africa
      'South Africa': 'AF', 'Nigeria': 'AF', 'Egypt': 'AF', 'Kenya': 'AF', 'Morocco': 'AF',
      'Ghana': 'AF', 'Ethiopia': 'AF', 'Tanzania': 'AF',
      // Oceania
      'Australia': 'OC', 'New Zealand': 'OC',
      // Russia spans multiple continents, treat as EU for simplicity
      'Russia': 'EU',
    };

    const continent1 = continentMap[country1];
    const continent2 = continentMap[country2];

    // If we don't know the continent, assume no change
    if (!continent1 || !continent2) {
      return false;
    }

    return continent1 !== continent2;
  }

  /**
   * Update last activity timestamp
   */
  async updateLastActivity(sessionId: string, ipAddress?: string) {
    try {
      const updateData: any = { lastActivityAt: new Date() };

      // Optionally update IP if provided
      if (ipAddress) {
        const session = await this.prisma.session.findUnique({
          where: { id: sessionId },
          select: { ipAddress: true },
        });

        if (session && session.ipAddress !== ipAddress) {
          updateData.previousIpAddress = session.ipAddress;
          updateData.ipAddress = ipAddress;
        }
      }

      await this.prisma.session.update({
        where: { id: sessionId },
        data: updateData,
      });
    } catch (error) {
      // Silently fail - don't break the request
      this.logger.warn(
        `Failed to update last activity for session ${sessionId}`,
      );
    }
  }

  /**
   * Delete a session immediately (preferred over just marking invalid)
   */
  async deleteSession(sessionId: string, reason: string) {
    // Log the deletion reason before deleting
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });

    if (session) {
      await this.logSessionActivity(sessionId, session.userId, 'session_ended', {
        reason,
      });
    }

    try {
      await this.prisma.session.delete({
        where: { id: sessionId },
      });
      this.logger.log(`Session ${sessionId} deleted: ${reason}`);
    } catch (error) {
      // Session might already be deleted
      this.logger.warn(`Failed to delete session ${sessionId}: ${error.message}`);
    }
  }

  /**
   * Revoke a specific session (marks invalid, doesn't delete - for audit trail)
   * Use deleteSession for immediate removal
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

    // Delete all sessions in this token family for security
    return this.prisma.session.deleteMany({
      where: { tokenFamily },
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

    // Delete sessions instead of just marking invalid
    const result = await this.prisma.session.deleteMany({
      where,
    });

    this.logger.log(`Deleted ${result.count} sessions for user ${userId}`);
    return result;
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
        authMethod: true,
        deviceType: true,
        deviceName: true,
        browser: true,
        os: true,
        ipAddress: true,
        country: true,
        city: true,
        createdAt: true,
        lastActivityAt: true,
        isTrusted: true,
        trustDeviceName: true,
      },
      orderBy: { lastActivityAt: 'desc' },
    });

    return sessions;
  }

  /**
   * Mark a session/device as trusted
   */
  async trustDevice(
    sessionId: string,
    userId: string,
    deviceName?: string,
  ): Promise<void> {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        isTrusted: true,
        trustedAt: new Date(),
        trustDeviceName: deviceName || session.deviceName,
      },
    });

    await this.logSessionActivity(sessionId, userId, 'device_trusted', {
      deviceName: deviceName || session.deviceName,
    });

    this.logger.log(`Device trusted for session ${sessionId}`);
  }

  /**
   * Remove trust from a device
   */
  async untrustDevice(sessionId: string, userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, userId },
      data: {
        isTrusted: false,
        trustedAt: null,
        trustDeviceName: null,
      },
    });

    await this.logSessionActivity(sessionId, userId, 'device_untrusted', {});

    this.logger.log(`Device untrusted for session ${sessionId}`);
  }

  /**
   * Check if the session's device is trusted
   */
  async isDeviceTrusted(sessionId: string): Promise<boolean> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { isTrusted: true },
    });

    return session?.isTrusted || false;
  }

  /**
   * Log session activity for security audits
   */
  async logSessionActivity(
    sessionId: string,
    userId: string,
    action: string,
    details?: Record<string, any>,
  ): Promise<void> {
    try {
      await this.prisma.sessionActivity.create({
        data: {
          sessionId,
          userId,
          action,
          details: details ? JSON.stringify(details) : null,
          ipAddress: details?.ipAddress || null,
        },
      });
    } catch (error) {
      // Don't fail the main operation if logging fails
      this.logger.warn(`Failed to log session activity: ${error.message}`);
    }
  }

  /**
   * Get session activity history
   */
  async getSessionActivities(
    sessionId: string,
    limit: number = 50,
  ): Promise<any[]> {
    return this.prisma.sessionActivity.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get user's recent activity across all sessions
   */
  async getUserRecentActivity(
    userId: string,
    limit: number = 100,
  ): Promise<any[]> {
    return this.prisma.sessionActivity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        session: {
          select: {
            deviceName: true,
            browser: true,
            os: true,
          },
        },
      },
    });
  }

  /**
   * Check if a session belongs to a user
   */
  async sessionBelongsToUser(
    sessionId: string,
    userId: string,
  ): Promise<boolean> {
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
   * Clean up inactive sessions - runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupInactiveSessions() {
    const inactivityCutoff = new Date();
    inactivityCutoff.setDate(inactivityCutoff.getDate() - INACTIVITY_TIMEOUT_DAYS);

    // Delete sessions inactive for more than INACTIVITY_TIMEOUT_DAYS
    const inactiveResult = await this.prisma.session.deleteMany({
      where: {
        isValid: true,
        lastActivityAt: { lt: inactivityCutoff },
      },
    });

    if (inactiveResult.count > 0) {
      this.logger.log(
        `Deleted ${inactiveResult.count} inactive sessions (>${INACTIVITY_TIMEOUT_DAYS} days)`,
      );
    }

    // Also delete expired sessions
    const expiredResult = await this.prisma.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    if (expiredResult.count > 0) {
      this.logger.log(`Deleted ${expiredResult.count} expired sessions`);
    }

    return inactiveResult.count + expiredResult.count;
  }

  /**
   * Clean up old session activities - runs daily at 3 AM
   * Keeps activities for 90 days
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOldActivities() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    const result = await this.prisma.sessionActivity.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    if (result.count > 0) {
      this.logger.log(`Deleted ${result.count} old session activities (>90 days)`);
    }

    return result.count;
  }

  /**
   * Get session statistics for a user
   */
  async getSessionStats(userId: string) {
    const [activeCount, trustedCount] = await Promise.all([
      this.prisma.session.count({
        where: { userId, isValid: true, expiresAt: { gt: new Date() } },
      }),
      this.prisma.session.count({
        where: { userId, isValid: true, isTrusted: true },
      }),
    ]);

    return {
      activeCount,
      trustedCount,
      maxAllowed: MAX_SESSIONS_PER_USER,
    };
  }
}
