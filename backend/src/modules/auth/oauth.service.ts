import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from './token.service';
import { SessionService } from './session.service';
import { Request } from 'express';

export interface OAuthProfile {
  provider: 'GOOGLE' | 'FACEBOOK';
  providerAccountId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  avatarUrl?: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface OAuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    walletAddress: string | null;
    role: string;
    isEmailVerified: boolean;
    authProvider: string;
    createdAt: Date;
  };
  sessionId: string;
  isNewUser: boolean;
}

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    private prisma: PrismaService,
    private tokenService: TokenService,
    private sessionService: SessionService,
  ) {}

  /**
   * Handle OAuth login/registration
   * - If user exists with OAuth account, log them in
   * - If user exists with same email, link the OAuth account
   * - If no user exists, create a new user
   */
  async handleOAuthLogin(
    profile: OAuthProfile,
    req: Request,
  ): Promise<OAuthResult> {
    // 1. Check if OAuth account already exists
    const existingOAuth = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: profile.provider.toLowerCase(),
          providerAccountId: profile.providerAccountId,
        },
      },
      include: { user: true },
    });

    if (existingOAuth) {
      // User already linked this OAuth account - log them in
      return this.loginExistingUser(existingOAuth.user, profile, req);
    }

    // 2. Check if user exists with same email
    if (profile.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: profile.email.toLowerCase() },
      });

      if (existingUser) {
        // Link OAuth account to existing user
        await this.linkOAuthAccount(existingUser.id, profile);
        return this.loginExistingUser(existingUser, profile, req);
      }
    }

    // 3. Create new user with OAuth account
    return this.createOAuthUser(profile, req);
  }

  private async loginExistingUser(
    user: any,
    profile: OAuthProfile,
    req: Request,
  ): Promise<OAuthResult> {
    // Update OAuth tokens if provided
    if (profile.accessToken || profile.refreshToken) {
      await this.prisma.oAuthAccount.update({
        where: {
          provider_providerAccountId: {
            provider: profile.provider.toLowerCase(),
            providerAccountId: profile.providerAccountId,
          },
        },
        data: {
          accessToken: profile.accessToken,
          refreshToken: profile.refreshToken,
          tokenExpiresAt: profile.accessToken ? new Date(Date.now() + 3600 * 1000) : undefined,
        },
      });
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: this.getClientIp(req),
      },
    });

    // Generate tokens and create session
    const tokens = await this.tokenService.generateTokenPair(
      user.id,
      user.email,
      user.role,
      '',
    );

    const { session, securityAlert } = await this.sessionService.createSession(
      user.id,
      tokens.refreshToken,
      req,
    );

    // Log security alert if detected
    if (securityAlert) {
      this.logger.warn(`Security alert for user ${user.id}: ${securityAlert.type} - ${securityAlert.message}`);
    }

    const finalTokens = await this.tokenService.generateTokenPair(
      user.id,
      user.email,
      user.role,
      session.id,
    );

    await this.prisma.session.update({
      where: { id: session.id },
      data: { refreshToken: this.tokenService.hashToken(finalTokens.refreshToken) },
    });

    // Record login history
    await this.recordLoginHistory(user.id, profile.provider.toLowerCase(), true, req);

    this.logger.log(`OAuth login: ${user.id} via ${profile.provider}`);

    return {
      ...finalTokens,
      user: this.formatUserResponse(user),
      sessionId: session.id,
      isNewUser: false,
    };
  }

  private async createOAuthUser(
    profile: OAuthProfile,
    req: Request,
  ): Promise<OAuthResult> {
    const user = await this.prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          email: profile.email?.toLowerCase(),
          firstName: profile.firstName || profile.name?.split(' ')[0],
          lastName: profile.lastName || profile.name?.split(' ').slice(1).join(' '),
          authProvider: profile.provider,
          isEmailVerified: !!profile.email, // OAuth emails are verified by provider
          emailVerifiedAt: profile.email ? new Date() : null,
        },
      });

      // Create OAuth account link
      await tx.oAuthAccount.create({
        data: {
          userId: newUser.id,
          provider: profile.provider.toLowerCase(),
          providerAccountId: profile.providerAccountId,
          email: profile.email,
          name: profile.name || `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
          avatarUrl: profile.avatarUrl,
          accessToken: profile.accessToken,
          refreshToken: profile.refreshToken,
          tokenExpiresAt: profile.accessToken ? new Date(Date.now() + 3600 * 1000) : null,
        },
      });

      // Create token balance
      await tx.tokenBalance.create({
        data: {
          userId: newUser.id,
          availableBalance: 0,
          lockedBalance: 0,
          totalBalance: 0,
        },
      });

      return newUser;
    });

    // Generate tokens and create session
    const tokens = await this.tokenService.generateTokenPair(
      user.id,
      user.email,
      user.role,
      '',
    );

    const { session } = await this.sessionService.createSession(
      user.id,
      tokens.refreshToken,
      req,
    );

    const finalTokens = await this.tokenService.generateTokenPair(
      user.id,
      user.email,
      user.role,
      session.id,
    );

    await this.prisma.session.update({
      where: { id: session.id },
      data: { refreshToken: this.tokenService.hashToken(finalTokens.refreshToken) },
    });

    await this.recordLoginHistory(user.id, profile.provider.toLowerCase(), true, req);

    this.logger.log(`OAuth registration: ${user.id} via ${profile.provider}`);

    return {
      ...finalTokens,
      user: this.formatUserResponse(user),
      sessionId: session.id,
      isNewUser: true,
    };
  }

  private async linkOAuthAccount(userId: string, profile: OAuthProfile): Promise<void> {
    await this.prisma.oAuthAccount.create({
      data: {
        userId,
        provider: profile.provider.toLowerCase(),
        providerAccountId: profile.providerAccountId,
        email: profile.email,
        name: profile.name || `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
        avatarUrl: profile.avatarUrl,
        accessToken: profile.accessToken,
        refreshToken: profile.refreshToken,
        tokenExpiresAt: profile.accessToken ? new Date(Date.now() + 3600 * 1000) : null,
      },
    });

    this.logger.log(`Linked ${profile.provider} to user ${userId}`);
  }

  private formatUserResponse(user: any) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      walletAddress: user.walletAddress,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      authProvider: user.authProvider,
      createdAt: user.createdAt,
    };
  }

  private async recordLoginHistory(
    userId: string,
    authMethod: string,
    success: boolean,
    req: Request,
  ): Promise<void> {
    try {
      const sessionInfo = this.sessionService.parseUserAgent(req);
      await this.prisma.loginHistory.create({
        data: {
          userId,
          authMethod,
          success,
          failureReason: null,
          ipAddress: sessionInfo.ipAddress,
          userAgent: req.headers['user-agent'] || null,
          deviceType: sessionInfo.deviceType,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to record login history: ${error}`);
    }
  }

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
}
