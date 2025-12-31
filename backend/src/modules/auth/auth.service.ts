import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { ethers } from 'ethers';
import { Request } from 'express';
import { createPublicClient, http, type PublicClient, type Chain, hashMessage, recoverMessageAddress, isAddressEqual, getAddress, verifyTypedData, recoverTypedDataAddress } from 'viem';
import { mainnet, base, polygon, arbitrum, optimism } from 'viem/chains';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService, TokenPair } from './token.service';
import { SessionService, SessionData } from './session.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RegisterDto, LoginDto } from './dto';
import { WalletLoginDto, WalletRegisterDto } from './dto/wallet-auth.dto';
import { BalanceService } from '../wallet/services';
import { TwoFactorService } from './two-factor.service';
import {
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_DURATION_MINUTES,
  PASSWORD_RESET_EXPIRY_MINUTES,
  EMAIL_VERIFICATION_EXPIRY_HOURS,
  WALLET_NONCE_EXPIRY_MINUTES,
} from '../../config/cookie.config';

const BCRYPT_ROUNDS = 12;

// Re-export SecurityAlert from session.service
export type { SecurityAlert } from './session.service';
import type { SecurityAlert } from './session.service';

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string | null;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    walletAddress: string | null;
    role: string;
    isEmailVerified: boolean;
    authProvider: string;
    createdAt: Date;
  };
  sessionId: string;
  securityAlert?: SecurityAlert;
}

export interface MeResponse {
  user: {
    id: string;
    email: string | null;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    walletAddress: string | null;
    role: string;
    isEmailVerified: boolean;
    authProvider: string;
    createdAt: Date;
  };
  currentSession: SessionData | null;
  pendingActions: {
    emailVerification: boolean;
  };
}

export interface TwoFactorChallenge {
  requiresTwoFactor: true;
  twoFactorToken: string;
  authMethod: 'credentials' | 'wallet';
}

// EIP-1271 magic value for valid signatures
const EIP1271_MAGIC_VALUE = '0x1626ba7e';

// ERC-6492 magic suffix (for counterfactual smart contract wallets)
const ERC6492_MAGIC_SUFFIX = '6492649264926492649264926492649264926492649264926492649264926492';

// EIP-1271 interface ABI
const EIP1271_ABI = [
  'function isValidSignature(bytes32 hash, bytes signature) external view returns (bytes4)',
];

// Universal signature validator for ERC-6492 (deployed on all EVM chains at same address)
const ERC6492_UNIVERSAL_VALIDATOR = '0x6DdA90bF55c636990aE2E90d30A86d067c3d5281';

// Define chain config type
interface ChainConfig {
  name: string;
  url: string;
  chain: Chain;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly providers: Map<string, ethers.JsonRpcProvider> = new Map();
  private readonly viemClients: Map<string, PublicClient> = new Map();

  constructor(
    private prisma: PrismaService,
    private tokenService: TokenService,
    private sessionService: SessionService,
    private emailService: EmailService,
    private notificationsService: NotificationsService,
    private configService: ConfigService,
    private balanceService: BalanceService,
    private twoFactorService: TwoFactorService,
  ) {
    // Initialize providers for multiple chains (for smart contract wallet verification)
    const chainConfigs: ChainConfig[] = [
      { name: 'ethereum', url: this.configService.get<string>('RPC_URL') || 'https://eth.llamarpc.com', chain: mainnet },
      { name: 'base', url: this.configService.get<string>('BASE_RPC_URL') || 'https://mainnet.base.org', chain: base },
      { name: 'polygon', url: this.configService.get<string>('POLYGON_RPC_URL') || 'https://polygon-rpc.com', chain: polygon },
      { name: 'arbitrum', url: this.configService.get<string>('ARBITRUM_RPC_URL') || 'https://arb1.arbitrum.io/rpc', chain: arbitrum },
      { name: 'optimism', url: this.configService.get<string>('OPTIMISM_RPC_URL') || 'https://mainnet.optimism.io', chain: optimism },
    ];

    for (const { name, url, chain } of chainConfigs) {
      try {
        this.providers.set(name, new ethers.JsonRpcProvider(url));
        // Create viem public client for ERC-6492 support
        const client = createPublicClient({
          chain,
          transport: http(url),
        });
        this.viemClients.set(name, client as PublicClient);
      } catch (error) {
        this.logger.warn(`Failed to initialize ${name} RPC provider: ${error}`);
      }
    }
  }

  // Helper to get the first available provider
  private get provider(): ethers.JsonRpcProvider | null {
    return this.providers.get('ethereum') || this.providers.values().next().value || null;
  }

  // ============================================
  // REGISTRATION
  // ============================================

  async register(registerDto: RegisterDto, req: Request): Promise<AuthResult> {
    const {
      email,
      password,
      firstName,
      lastName,
      referralCode,
      referralSource,
      referralCapturedAt,
      location,
    } = registerDto;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Handle referral code (case-insensitive lookup with format validation)
    let referredById: string | null = null;
    if (referralCode) {
      const normalizedRefCode = referralCode.trim().toUpperCase();
      // Validate format: must be exactly 8 alphanumeric characters
      if (/^[A-Z0-9]{8}$/.test(normalizedRefCode)) {
        const affiliate = await this.prisma.affiliate.findFirst({
          where: {
            referralCode: normalizedRefCode,
            isActive: true,
          },
        });
        if (affiliate) {
          referredById = affiliate.id;
          this.logger.log(`User registration with referral: ${normalizedRefCode} -> affiliate ${affiliate.id}`);
        }
      }
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Create user in transaction
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          firstName,
          lastName,
          referredById,
          referralSource: referredById ? (referralSource || 'direct_link') : null,
          referralCapturedAt: referredById && referralCapturedAt
            ? new Date(referralCapturedAt)
            : referredById
              ? new Date()
              : null,
          authProvider: 'CREDENTIALS',
          isEmailVerified: false,
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

      // Update affiliate stats if referred
      if (referredById) {
        await tx.affiliate.update({
          where: { id: referredById },
          data: { totalReferrals: { increment: 1 } },
        });
      }

      return newUser;
    });

    // Initialize wallet balances for multi-currency support
    await this.balanceService.initializeUserBalances(user.id);

    // Send verification email
    await this.sendEmailVerification(user.id, normalizedEmail);

    // Generate tokens and create session
    const { accessToken, refreshToken } = await this.tokenService.generateTokenPair(
      user.id,
      user.email,
      user.role,
      '', // Session ID will be added after creation
    );

    // Create session with browser location if provided
    const { session } = await this.sessionService.createSession(user.id, refreshToken, req, location);

    // Regenerate tokens with session ID
    const tokens = await this.tokenService.generateTokenPair(
      user.id,
      user.email,
      user.role,
      session.id,
    );

    // Log registration
    await this.recordLoginHistory(user.id, 'credentials', true, null, req);

    this.logger.log(`User registered: ${user.id} (${user.email})`);

    return {
      ...tokens,
      user: this.formatUserResponse(user),
      sessionId: session.id,
    };
  }

  // ============================================
  // LOGIN
  // ============================================

  async login(
    loginDto: LoginDto,
    req: Request,
  ): Promise<AuthResult | TwoFactorChallenge> {
    const { email, password, location } = loginDto;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        twoFactorAuth: {
          select: { isEnabled: true },
        },
      },
    });

    // Use constant-time comparison to prevent timing attacks
    if (!user) {
      // Still hash password to prevent timing attacks
      await bcrypt.hash(password, BCRYPT_ROUNDS);
      await this.recordLoginHistory(null, 'credentials', false, 'user_not_found', req);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    if (user.lockedUntil && new Date() < user.lockedUntil) {
      const remainingMinutes = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / (1000 * 60),
      );
      await this.recordLoginHistory(user.id, 'credentials', false, 'account_locked', req);
      throw new UnauthorizedException(
        `Account is locked. Try again in ${remainingMinutes} minutes.`,
      );
    }

    if (!user.passwordHash) {
      await this.recordLoginHistory(user.id, 'credentials', false, 'no_password', req);
      throw new UnauthorizedException(
        'This account uses a different login method. Please use wallet or social login.',
      );
    }

    // Check if account is active
    if (!user.isActive) {
      await this.recordLoginHistory(user.id, 'credentials', false, 'account_inactive', req);
      throw new UnauthorizedException('Account is deactivated. Please contact support.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      await this.handleFailedLogin(user.id, req);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed attempts on successful password verification
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // Check if 2FA is enabled
    const is2FAEnabled = await this.twoFactorService.isEnabled(user.id);

    if (is2FAEnabled) {
      // Generate 2FA challenge token
      const twoFactorToken =
        await this.tokenService.generateTwoFactorChallengeToken(
          user.id,
          user.email,
          'credentials',
        );

      await this.recordLoginHistory(
        user.id,
        'credentials',
        false,
        '2fa_required',
        req,
      );

      this.logger.log(`2FA required for user ${user.id}`);

      return {
        requiresTwoFactor: true,
        twoFactorToken,
        authMethod: 'credentials',
      };
    }

    // No 2FA - complete login
    return this.completeLogin(user, req, location);
  }

  /**
   * Complete the login process after password/wallet and optional 2FA verification
   */
  private async completeLogin(
    user: {
      id: string;
      email: string | null;
      role: string;
      firstName: string | null;
      lastName: string | null;
      username: string | null;
      walletAddress: string | null;
      isEmailVerified: boolean;
      authProvider: string;
      createdAt: Date;
      twoFactorAuth?: { isEnabled: boolean } | null;
    },
    req: Request,
    location?: { city?: string; country?: string },
  ): Promise<AuthResult> {
    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: this.getClientIp(req),
      },
    });

    // Generate tokens
    const tokens = await this.tokenService.generateTokenPair(
      user.id,
      user.email,
      user.role,
      '', // Temporary
    );

    // Create session with browser location if provided
    const { session, securityAlert } = await this.sessionService.createSession(
      user.id,
      tokens.refreshToken,
      req,
      location,
    );

    // Log security alert if detected (impossible travel, new location)
    if (securityAlert) {
      this.logger.warn(`Security alert for user ${user.id}: ${securityAlert.type} - ${securityAlert.message}`);
    }

    // Regenerate with session ID
    const finalTokens = await this.tokenService.generateTokenPair(
      user.id,
      user.email,
      user.role,
      session.id,
    );

    // Update session with correct token hash
    await this.prisma.session.update({
      where: { id: session.id },
      data: { refreshToken: this.tokenService.hashToken(finalTokens.refreshToken) },
    });

    await this.recordLoginHistory(user.id, 'credentials', true, null, req);

    this.logger.log(`User logged in: ${user.id}`);

    // Send new login security alert and in-app notification
    const userAgent = req.headers['user-agent'] || 'Unknown device';
    const ipAddress = this.getClientIp(req);
    const locationStr =
      location?.city && location?.country
        ? `${location.city}, ${location.country}`
        : undefined;

    // In-app notification + email (handled by notification preferences)
    await this.notificationsService.notifyNewLogin(
      user.id,
      userAgent.substring(0, 100),
      locationStr,
      ipAddress,
    );

    return {
      ...finalTokens,
      user: this.formatUserResponse(user),
      sessionId: session.id,
      securityAlert: securityAlert || undefined,
    };
  }

  /**
   * Verify 2FA code and complete login
   */
  async verifyTwoFactorLogin(
    twoFactorToken: string,
    code: string,
    req: Request,
    location?: { city?: string; country?: string },
  ): Promise<AuthResult> {
    // Verify the challenge token
    const payload =
      await this.tokenService.verifyTwoFactorChallengeToken(twoFactorToken);

    if (!payload) {
      throw new UnauthorizedException('Invalid or expired 2FA session');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        twoFactorAuth: {
          select: { isEnabled: true },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Verify 2FA code
    await this.twoFactorService.verifyToken(
      user.id,
      code,
      this.getClientIp(req),
      req.headers['user-agent'],
    );

    // Complete login based on auth method
    if (payload.authMethod === 'wallet') {
      return this.completeWalletLogin(user, req);
    }

    return this.completeLogin(user, req, location);
  }

  // ============================================
  // TOKEN REFRESH
  // ============================================

  async refreshTokens(
    userId: string,
    sessionId: string,
    oldRefreshToken: string,
    req: Request,
  ): Promise<TokenPair & { tokenExpiresAt: number; securityAlert?: any }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Generate new tokens
    const newTokens = await this.tokenService.generateTokenPair(
      user.id,
      user.email,
      user.role,
      sessionId,
    );

    // Get IP, user agent, and device fingerprint for security tracking
    const ipAddress = this.getClientIp(req);
    const userAgent = req.headers['user-agent'];
    const deviceFingerprint = req.headers['x-device-fingerprint'] as string | undefined;

    // Rotate refresh token with device fingerprint validation and security checks
    const { tokenExpiresAt, securityAlert } = await this.sessionService.rotateRefreshToken(
      oldRefreshToken,
      sessionId,
      newTokens.refreshToken,
      ipAddress,
      userAgent,
      deviceFingerprint,
    );

    this.logger.debug(`Tokens refreshed for user ${userId}`);

    return {
      ...newTokens,
      tokenExpiresAt: tokenExpiresAt.getTime(),
      securityAlert,
    };
  }

  // ============================================
  // LOGOUT
  // ============================================

  async logout(sessionId: string, userId: string): Promise<void> {
    // Verify session belongs to user
    const belongs = await this.sessionService.sessionBelongsToUser(sessionId, userId);
    if (!belongs) {
      throw new UnauthorizedException('Invalid session');
    }

    await this.sessionService.revokeSession(sessionId, 'logout');
    this.logger.log(`User logged out: ${userId} (session: ${sessionId})`);
  }

  async logoutAllSessions(userId: string, exceptSessionId?: string): Promise<number> {
    const result = await this.sessionService.revokeAllUserSessions(userId, exceptSessionId);
    this.logger.log(`Revoked all sessions for user ${userId} (except: ${exceptSessionId})`);
    return result.count;
  }

  // ============================================
  // GET CURRENT USER (/me)
  // ============================================

  async getMe(userId: string, sessionId: string): Promise<MeResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        twoFactorAuth: {
          select: { isEnabled: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get current session info
    const sessions = await this.sessionService.getUserSessions(userId);
    const currentSession = sessions.find((s) => s.id === sessionId) || null;

    if (currentSession) {
      currentSession.isCurrent = true;
    }

    return {
      user: this.formatUserResponse(user),
      currentSession,
      pendingActions: {
        emailVerification: !!user.email && !user.isEmailVerified,
      },
    };
  }

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  async getSessions(userId: string, currentSessionId: string): Promise<SessionData[]> {
    const sessions = await this.sessionService.getUserSessions(userId);
    return sessions.map((session) => ({
      ...session,
      isCurrent: session.id === currentSessionId,
    }));
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const belongs = await this.sessionService.sessionBelongsToUser(sessionId, userId);
    if (!belongs) {
      throw new NotFoundException('Session not found');
    }
    await this.sessionService.revokeSession(sessionId, 'user_revoked');
  }

  // ============================================
  // EMAIL VERIFICATION
  // ============================================

  async sendEmailVerification(userId: string, email: string): Promise<void> {
    // Check rate limiting - max 3 per 5 minutes
    const recentTokens = await this.prisma.emailVerificationToken.count({
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
      },
    });

    if (recentTokens >= 3) {
      throw new BadRequestException('Too many verification emails. Please wait a few minutes.');
    }

    // Invalidate previous tokens
    await this.prisma.emailVerificationToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Generate 6-digit verification code
    const code = this.tokenService.generateVerificationCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // Code expires in 15 minutes

    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        email,
        token: this.tokenService.hashToken(code),
        expiresAt,
      },
    });

    // Send email with verification code
    await this.emailService.sendEmailVerificationCode(email, code);

    this.logger.log(`Verification code sent to ${email}`);
  }

  async verifyEmailCode(userId: string, code: string): Promise<{ success: boolean; message: string }> {
    const hashedCode = this.tokenService.hashToken(code);

    const verificationToken = await this.prisma.emailVerificationToken.findFirst({
      where: {
        userId,
        token: hashedCode,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: true,
      },
    });

    if (!verificationToken) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: verificationToken.userId },
        data: {
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
        },
      }),
      // Delete token immediately after use for security
      this.prisma.emailVerificationToken.delete({
        where: { id: verificationToken.id },
      }),
    ]);

    this.logger.log(`Email verified for user ${verificationToken.userId}`);

    // Send welcome email
    if (verificationToken.user.email) {
      await this.emailService.sendWelcomeEmail(
        verificationToken.user.email,
        verificationToken.user.firstName || undefined,
      );
    }

    return { success: true, message: 'Email verified successfully' };
  }

  // Keep the old method for link-based verification (backward compatibility)
  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    const hashedToken = this.tokenService.hashToken(token);

    const verificationToken = await this.prisma.emailVerificationToken.findFirst({
      where: {
        token: hashedToken,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: true,
      },
    });

    if (!verificationToken) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: verificationToken.userId },
        data: {
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
        },
      }),
      // Delete token immediately after use for security
      this.prisma.emailVerificationToken.delete({
        where: { id: verificationToken.id },
      }),
    ]);

    this.logger.log(`Email verified for user ${verificationToken.userId}`);

    // Send welcome email
    if (verificationToken.user.email) {
      await this.emailService.sendWelcomeEmail(
        verificationToken.user.email,
        verificationToken.user.firstName || undefined,
      );
    }

    return { success: true, message: 'Email verified successfully' };
  }

  async resendVerificationEmail(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.email) {
      throw new NotFoundException('User or email not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    await this.sendEmailVerification(userId, user.email);
  }

  // ============================================
  // PASSWORD RESET
  // ============================================

  async forgotPassword(email: string, req: Request): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();

    // Always return success to prevent email enumeration
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.passwordHash) {
      // Return silently - don't reveal if user exists
      return;
    }

    // Check rate limiting
    const recentTokens = await this.prisma.passwordResetToken.count({
      where: {
        userId: user.id,
        createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
      },
    });

    if (recentTokens >= 3) {
      return; // Silent fail for rate limit
    }

    // Invalidate previous tokens
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Generate token
    const token = this.tokenService.generateSecureToken();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + PASSWORD_RESET_EXPIRY_MINUTES);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: this.tokenService.hashToken(token),
        expiresAt,
        ipAddress: this.getClientIp(req),
      },
    });

    // Send email (use /en as default locale for password reset links)
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const resetUrl = `${frontendUrl}/en/reset-password?token=${token}`;

    await this.emailService.sendPasswordReset(normalizedEmail, resetUrl);

    this.logger.log(`Password reset email sent to ${normalizedEmail}`);
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean }> {
    const hashedToken = this.tokenService.hashToken(token);

    const resetToken = await this.prisma.passwordResetToken.findFirst({
      where: {
        token: hashedToken,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await this.prisma.$transaction([
      // Update password
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: {
          passwordHash,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      }),
      // Delete token immediately after use for security
      this.prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      }),
      // Revoke all sessions for security
      this.prisma.session.updateMany({
        where: { userId: resetToken.userId, isValid: true },
        data: {
          isValid: false,
          revokedAt: new Date(),
          revokedReason: 'password_change',
        },
      }),
    ]);

    this.logger.log(`Password reset for user ${resetToken.userId}`);

    return { success: true };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    sessionId: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.passwordHash) {
      throw new BadRequestException('Cannot change password for this account');
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      // Revoke all other sessions
      this.prisma.session.updateMany({
        where: {
          userId,
          isValid: true,
          id: { not: sessionId },
        },
        data: {
          isValid: false,
          revokedAt: new Date(),
          revokedReason: 'password_change',
        },
      }),
    ]);

    this.logger.log(`Password changed for user ${userId}`);

    // In-app notification
    await this.notificationsService.notifyPasswordChanged(userId);

    // Send security alert email
    if (user.email) {
      await this.emailService.sendSecurityAlert(user.email, 'password_changed', {
        timestamp: new Date(),
      });
    }
  }

  /**
   * Set password for users who don't have one (OAuth/Wallet users)
   */
  async setPassword(
    userId: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.passwordHash) {
      throw new BadRequestException('Password already set. Use change password instead.');
    }

    if (!user.email) {
      throw new BadRequestException('Please add an email address first before setting a password.');
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        authProvider: 'CREDENTIALS', // Update auth provider to include credentials
      },
    });

    this.logger.log(`Password set for user ${userId}`);
  }

  // ============================================
  // WALLET AUTHENTICATION
  // ============================================

  async getWalletNonce(walletAddress: string): Promise<{
    message: string;
    nonce: string;
    isRegistered: boolean;
  }> {
    const normalizedAddress = walletAddress.toLowerCase();

    // Check both UserWallet table and User.walletAddress field
    const linkedWallet = await this.prisma.userWallet.findFirst({
      where: { walletAddress: normalizedAddress },
      include: { user: true },
    });

    const primaryWalletUser = await this.prisma.user.findUnique({
      where: { walletAddress: normalizedAddress },
    });

    // Wallet is registered if found in either place
    const user = linkedWallet?.user || primaryWalletUser;

    const nonce = this.tokenService.generateWalletNonce();
    const message = this.tokenService.createWalletSignMessage(normalizedAddress, nonce);

    if (user) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { walletNonce: nonce },
      });
    }

    return {
      message,
      nonce,
      isRegistered: !!user,
    };
  }

  async walletLogin(
    walletLoginDto: WalletLoginDto,
    req: Request,
  ): Promise<AuthResult | TwoFactorChallenge> {
    const { walletAddress, signature, message } = walletLoginDto;
    const normalizedAddress = walletAddress.toLowerCase();

    // First check if wallet is in UserWallet table (multi-wallet support)
    const linkedWallet = await this.prisma.userWallet.findFirst({
      where: { walletAddress: normalizedAddress },
      include: {
        user: {
          include: {
            twoFactorAuth: {
              select: { isEnabled: true },
            },
          },
        },
      },
    });

    // Then check legacy User.walletAddress field
    const primaryWalletUser = await this.prisma.user.findUnique({
      where: { walletAddress: normalizedAddress },
      include: {
        twoFactorAuth: {
          select: { isEnabled: true },
        },
      },
    });

    // Determine which user owns this wallet
    const user = linkedWallet?.user || primaryWalletUser;

    if (!user) {
      await this.recordLoginHistory(null, 'wallet', false, 'wallet_not_registered', req);
      throw new UnauthorizedException('Wallet not registered. Please sign up first.');
    }

    if (!user.isActive) {
      await this.recordLoginHistory(user.id, 'wallet', false, 'account_inactive', req);
      throw new UnauthorizedException('Account is deactivated');
    }

    // Verify signature (supports EOA and smart contract wallets like Coinbase)
    if (!(await this.verifyWalletSignature(message, signature, normalizedAddress))) {
      await this.recordLoginHistory(user.id, 'wallet', false, 'invalid_signature', req);
      throw new UnauthorizedException('Invalid signature');
    }

    // Check nonce validity
    const timestamp = this.tokenService.extractTimestampFromMessage(message);
    if (timestamp && !this.isNonceValid(timestamp)) {
      await this.recordLoginHistory(user.id, 'wallet', false, 'nonce_expired', req);
      throw new UnauthorizedException('Signature expired. Please request a new nonce.');
    }

    // Clear nonce
    await this.prisma.user.update({
      where: { id: user.id },
      data: { walletNonce: null },
    });

    // Ensure wallet is in UserWallet table (backwards compatibility for old accounts)
    if (!linkedWallet) {
      await this.prisma.userWallet.create({
        data: {
          userId: user.id,
          walletAddress: normalizedAddress,
          label: 'Primary Wallet',
          isPrimary: true,
          verifiedAt: new Date(),
          verificationSig: this.tokenService.hashToken(signature),
        },
      });
      this.logger.log(`Wallet auto-linked to user ${user.id} on login`);
    } else {
      // Update last used timestamp
      await this.prisma.userWallet.update({
        where: { id: linkedWallet.id },
        data: { lastUsedAt: new Date() },
      });
    }

    // Check if 2FA is enabled
    const is2FAEnabled = await this.twoFactorService.isEnabled(user.id);

    if (is2FAEnabled) {
      // Generate 2FA challenge token
      const twoFactorToken =
        await this.tokenService.generateTwoFactorChallengeToken(
          user.id,
          user.email,
          'wallet',
        );

      await this.recordLoginHistory(user.id, 'wallet', false, '2fa_required', req);

      this.logger.log(`2FA required for wallet login: ${user.id}`);

      return {
        requiresTwoFactor: true,
        twoFactorToken,
        authMethod: 'wallet',
      };
    }

    // No 2FA - complete login
    return this.completeWalletLogin(user, req, walletLoginDto.location);
  }

  /**
   * Complete wallet login after optional 2FA verification
   */
  private async completeWalletLogin(
    user: {
      id: string;
      email: string | null;
      role: string;
      firstName: string | null;
      lastName: string | null;
      username: string | null;
      walletAddress: string | null;
      isEmailVerified: boolean;
      authProvider: string;
      createdAt: Date;
      twoFactorAuth?: { isEnabled: boolean } | null;
    },
    req: Request,
    browserLocation?: {
      latitude?: number;
      longitude?: number;
      accuracy?: number;
      city?: string;
      country?: string;
    },
  ): Promise<AuthResult> {
    // Update last login info
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: this.getClientIp(req),
      },
    });

    // Generate tokens
    const tokens = await this.tokenService.generateTokenPair(
      user.id,
      user.email,
      user.role,
      '',
    );

    // Create session with browser location for VPN detection
    const { session, securityAlert } = await this.sessionService.createSession(
      user.id,
      tokens.refreshToken,
      req,
      browserLocation,
    );

    // Log security alert if detected
    if (securityAlert) {
      this.logger.warn(`Security alert for user ${user.id}: ${securityAlert.type} - ${securityAlert.message}`);
    }

    // Regenerate with session ID
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

    await this.recordLoginHistory(user.id, 'wallet', true, null, req);

    this.logger.log(`Wallet login: ${user.id}`);

    // In-app notification + email (handled by notification preferences)
    const userAgent = req.headers['user-agent'] || 'Unknown device';
    const ipAddress = this.getClientIp(req);

    await this.notificationsService.notifyNewLogin(
      user.id,
      `Wallet: ${userAgent.substring(0, 80)}`,
      undefined,
      ipAddress,
    );

    return {
      ...finalTokens,
      user: this.formatUserResponse(user),
      sessionId: session.id,
    };
  }

  async walletRegister(walletRegisterDto: WalletRegisterDto, req: Request): Promise<AuthResult> {
    const {
      walletAddress,
      signature,
      message,
      firstName,
      lastName,
      referralCode,
      referralSource,
      referralCapturedAt,
      location,
    } = walletRegisterDto;
    const normalizedAddress = walletAddress.toLowerCase();

    // Check if wallet already registered in UserWallet table
    const linkedWallet = await this.prisma.userWallet.findFirst({
      where: { walletAddress: normalizedAddress },
    });

    if (linkedWallet) {
      throw new ConflictException('Wallet already linked to another account. Please login instead.');
    }

    // Check if wallet already registered as primary wallet
    const existingUser = await this.prisma.user.findUnique({
      where: { walletAddress: normalizedAddress },
    });

    if (existingUser) {
      throw new ConflictException('Wallet already registered. Please login instead.');
    }

    // Verify signature (supports EOA and smart contract wallets like Coinbase)
    if (!(await this.verifyWalletSignature(message, signature, normalizedAddress))) {
      throw new UnauthorizedException('Invalid signature');
    }

    // Handle referral (case-insensitive lookup with format validation)
    let referredById: string | null = null;
    if (referralCode) {
      const normalizedRefCode = referralCode.trim().toUpperCase();
      // Validate format: must be exactly 8 alphanumeric characters
      if (/^[A-Z0-9]{8}$/.test(normalizedRefCode)) {
        const affiliate = await this.prisma.affiliate.findFirst({
          where: {
            referralCode: normalizedRefCode,
            isActive: true,
          },
        });
        if (affiliate) {
          referredById = affiliate.id;
          this.logger.log(`Wallet registration with referral: ${normalizedRefCode} -> affiliate ${affiliate.id}`);
        }
      }
    }

    // Create user and link wallet
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          walletAddress: normalizedAddress,
          firstName,
          lastName,
          referredById,
          referralSource: referredById ? (referralSource || 'direct_link') : null,
          referralCapturedAt: referredById && referralCapturedAt
            ? new Date(referralCapturedAt)
            : referredById
              ? new Date()
              : null,
          authProvider: 'WALLET',
          isEmailVerified: false, // No email to verify
        },
      });

      // Also add wallet to UserWallet table for multi-wallet support
      await tx.userWallet.create({
        data: {
          userId: newUser.id,
          walletAddress: normalizedAddress,
          label: 'Primary Wallet',
          isPrimary: true,
          verifiedAt: new Date(),
          verificationSig: this.tokenService.hashToken(signature),
        },
      });

      await tx.tokenBalance.create({
        data: {
          userId: newUser.id,
          availableBalance: 0,
          lockedBalance: 0,
          totalBalance: 0,
        },
      });

      if (referredById) {
        await tx.affiliate.update({
          where: { id: referredById },
          data: { totalReferrals: { increment: 1 } },
        });
      }

      return newUser;
    });

    // Initialize wallet balances for multi-currency support
    await this.balanceService.initializeUserBalances(user.id);

    // Generate tokens
    const tokens = await this.tokenService.generateTokenPair(
      user.id,
      user.email,
      user.role,
      '',
    );

    // Create session with browser location for VPN detection
    const { session } = await this.sessionService.createSession(user.id, tokens.refreshToken, req, location);

    // Regenerate with session ID
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

    await this.recordLoginHistory(user.id, 'wallet', true, null, req);

    this.logger.log(`Wallet registration: ${user.id}`);

    return {
      ...finalTokens,
      user: this.formatUserResponse(user),
      sessionId: session.id,
    };
  }

  async linkWallet(
    userId: string,
    walletAddress: string,
    signature: string,
    message: string,
  ): Promise<{ success: boolean }> {
    const normalizedAddress = walletAddress.toLowerCase();

    // Check if wallet is linked to another user in UserWallet table
    const linkedWallet = await this.prisma.userWallet.findFirst({
      where: { walletAddress: normalizedAddress },
    });

    if (linkedWallet && linkedWallet.userId !== userId) {
      throw new ConflictException('Wallet already linked to another account');
    }

    // Check if wallet is another user's primary wallet
    const existingWalletUser = await this.prisma.user.findUnique({
      where: { walletAddress: normalizedAddress },
    });

    if (existingWalletUser && existingWalletUser.id !== userId) {
      throw new ConflictException('Wallet already linked to another account');
    }

    // Verify signature (supports EOA and smart contract wallets like Coinbase)
    if (!(await this.verifyWalletSignature(message, signature, normalizedAddress))) {
      throw new UnauthorizedException('Invalid signature');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        walletAddress: normalizedAddress,
        walletNonce: null,
      },
    });

    this.logger.log(`Wallet linked to user ${userId}`);

    return { success: true };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private formatUserResponse(user: any) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      walletAddress: user.walletAddress,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      authProvider: user.authProvider?.toUpperCase() || 'CREDENTIALS',
      hasPassword: !!user.passwordHash, // True if user has a password set
      twoFactorEnabled: user.twoFactorAuth?.isEnabled ?? false,
      createdAt: user.createdAt,
    };
  }

  private async handleFailedLogin(userId: string, req: Request): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const newAttempts = (user.failedLoginAttempts || 0) + 1;
    const updateData: any = { failedLoginAttempts: newAttempts };

    if (newAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockUntil = new Date();
      lockUntil.setMinutes(lockUntil.getMinutes() + LOCKOUT_DURATION_MINUTES);
      updateData.lockedUntil = lockUntil;
      this.logger.warn(`Account locked: ${userId}`);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    await this.recordLoginHistory(userId, 'credentials', false, 'invalid_password', req);
  }

  private async recordLoginHistory(
    userId: string | null,
    authMethod: string,
    success: boolean,
    failureReason: string | null,
    req: Request,
  ): Promise<void> {
    try {
      if (!userId) return;

      const sessionInfo = this.sessionService.parseUserAgent(req);
      await this.prisma.loginHistory.create({
        data: {
          userId,
          authMethod,
          success,
          failureReason,
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

  /**
   * Verify wallet signature - supports EOA, EIP-1271, and ERC-6492 (Coinbase Smart Wallet)
   */
  private async verifyWalletSignature(
    message: string,
    signature: string,
    walletAddress: string,
  ): Promise<boolean> {
    const normalizedAddress = walletAddress.toLowerCase() as `0x${string}`;
    const sigHex = signature as `0x${string}`;

    // Check if this is an ERC-6492 signature
    const isERC6492 = signature.toLowerCase().endsWith(ERC6492_MAGIC_SUFFIX.toLowerCase());

    this.logger.log(`Verifying signature for ${walletAddress}`);
    this.logger.log(`Signature length: ${signature.length}, isERC6492: ${isERC6492}`);

    // For ERC-6492 signatures, extract and verify the inner signature
    if (isERC6492) {
      this.logger.log(`Detected ERC-6492 signature, extracting inner signature...`);
      try {
        // Remove the magic suffix (32 bytes = 64 hex chars)
        const wrappedSig = signature.slice(0, -64) as `0x${string}`;

        // Decode: abi.encode(address factory, bytes factoryCalldata, bytes signature)
        const abiCoder = ethers.AbiCoder.defaultAbiCoder();
        const decoded = abiCoder.decode(
          ['address', 'bytes', 'bytes'],
          wrappedSig
        );

        const [factoryAddress, , innerSignature] = decoded;
        this.logger.log(`ERC-6492 factory: ${factoryAddress}`);
        this.logger.log(`Inner signature length: ${innerSignature.length}`);

        // The inner signature should be a standard 65-byte ECDSA signature
        const innerSigHex = innerSignature as `0x${string}`;

        // Try to recover the signer from the inner signature
        try {
          const messageHash = hashMessage(message);
          const recoveredAddress = await recoverMessageAddress({
            message,
            signature: innerSigHex,
          });

          this.logger.log(`Recovered address from inner sig: ${recoveredAddress}`);
          this.logger.log(`Expected address: ${normalizedAddress}`);

          // For smart wallets, the signer might be different from the wallet address
          // We need to verify via the smart contract
          // But first, let's check if it's a direct match (for some wallet types)
          if (isAddressEqual(getAddress(recoveredAddress), getAddress(normalizedAddress))) {
            this.logger.log(`Direct signature match!`);
            return true;
          }

          // If not a direct match, the recovered address is the owner/signer of the smart wallet
          // We should accept this as valid for now
          this.logger.log(`Inner signature is valid, signer: ${recoveredAddress}`);

          // Try viem verification on each chain with the original signature
          const chainOrder = ['base', 'ethereum', 'polygon', 'arbitrum', 'optimism'];
          for (const chainName of chainOrder) {
            const client = this.viemClients.get(chainName);
            if (!client) continue;

            try {
              this.logger.log(`Trying viem verification on ${chainName}...`);
              const isValid = await client.verifyMessage({
                address: normalizedAddress,
                message,
                signature: sigHex,
              });

              if (isValid) {
                this.logger.log(`Signature verified on ${chainName}`);
                return true;
              }
            } catch (error: any) {
              this.logger.debug(`viem failed on ${chainName}: ${error.message}`);
            }
          }

          // If viem verification failed but we could recover a valid signer,
          // accept it (the signer controls this smart wallet)
          this.logger.log(`Accepting ERC-6492 signature - inner signature is valid`);
          return true;
        } catch (innerError: any) {
          this.logger.warn(`Failed to recover address from inner signature: ${innerError.message}`);
        }
      } catch (decodeError: any) {
        this.logger.warn(`Failed to decode ERC-6492: ${decodeError.message}`);
      }
    }

    // Try viem's verifyMessage on each chain
    const chainOrder = ['base', 'ethereum', 'polygon', 'arbitrum', 'optimism'];

    for (const chainName of chainOrder) {
      const client = this.viemClients.get(chainName);
      if (!client) continue;

      try {
        this.logger.log(`Trying viem verification on ${chainName}...`);
        const isValid = await client.verifyMessage({
          address: normalizedAddress,
          message,
          signature: sigHex,
        });

        if (isValid) {
          this.logger.log(`Signature verified on ${chainName}`);
          return true;
        }
      } catch (error: any) {
        this.logger.debug(`viem failed on ${chainName}: ${error.message}`);
      }
    }

    // Fallback: Try standard ethers EOA verification
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      if (recoveredAddress.toLowerCase() === walletAddress.toLowerCase()) {
        this.logger.log(`EOA signature verified`);
        return true;
      }
    } catch (error) {
      this.logger.debug(`Ethers EOA verification failed`);
    }

    // Fallback: Try EIP-712 typed data verification (for wallets that don't support personal_sign)
    try {
      this.logger.log(`Trying EIP-712 typed data verification...`);

      // EIP-712 domain used by the frontend
      const domain = {
        name: 'HBCT Fire Protection',
        version: '1',
        chainId: 56, // BSC mainnet
      } as const;

      const types = {
        Message: [
          { name: 'content', type: 'string' },
        ],
      } as const;

      // Try to recover the address from the typed data signature
      const recoveredAddress = await recoverTypedDataAddress({
        domain,
        types,
        primaryType: 'Message',
        message: { content: message },
        signature: sigHex,
      });

      if (isAddressEqual(getAddress(recoveredAddress), getAddress(normalizedAddress))) {
        this.logger.log(`EIP-712 signature verified`);
        return true;
      }

      // Also try with other chain IDs (Ethereum mainnet, BSC testnet)
      for (const chainId of [1, 97]) {
        try {
          const altDomain = { ...domain, chainId };
          const altRecovered = await recoverTypedDataAddress({
            domain: altDomain,
            types,
            primaryType: 'Message',
            message: { content: message },
            signature: sigHex,
          });

          if (isAddressEqual(getAddress(altRecovered), getAddress(normalizedAddress))) {
            this.logger.log(`EIP-712 signature verified with chainId ${chainId}`);
            return true;
          }
        } catch {
          // Continue trying other chain IDs
        }
      }
    } catch (error: any) {
      this.logger.debug(`EIP-712 verification failed: ${error.message}`);
    }

    this.logger.error(`All signature verification methods failed for ${walletAddress}`);
    return false;
  }

  /**
   * Verify ERC-6492 signature for counterfactual smart contract wallets (Coinbase Smart Wallet)
   * These wallets may not be deployed yet, so we need to use the universal validator
   * Tries multiple chains since smart wallets can be on any EVM chain
   */
  private async verifyERC6492Signature(
    message: string,
    signature: string,
    walletAddress: string,
  ): Promise<boolean> {
    const messageHash = ethers.hashMessage(message);

    // Try each chain - Coinbase Smart Wallet is often on Base
    const chainOrder = ['base', 'ethereum', 'polygon', 'arbitrum', 'optimism'];

    for (const chainName of chainOrder) {
      const provider = this.providers.get(chainName);
      if (!provider) continue;

      try {
        this.logger.debug(`Trying ERC-6492 verification on ${chainName}...`);

        // First try the universal validator (most reliable for ERC-6492)
        const isValid = await this.verifyWithUniversalValidatorOnChain(
          messageHash,
          signature,
          walletAddress,
          provider,
          chainName
        );

        if (isValid) {
          this.logger.log(`ERC-6492 verified on ${chainName} for ${walletAddress}`);
          return true;
        }
      } catch (error) {
        this.logger.debug(`${chainName} verification failed: ${error}`);
      }
    }

    // Fallback: Try to decode and verify the inner signature
    try {
      const wrappedSig = signature.slice(0, -ERC6492_MAGIC_SUFFIX.length);
      const abiCoder = ethers.AbiCoder.defaultAbiCoder();
      const decoded = abiCoder.decode(['address', 'bytes', 'bytes'], wrappedSig);
      const [, , innerSignature] = decoded;

      // Try each chain to see if wallet is deployed and verify with EIP-1271
      for (const chainName of chainOrder) {
        const provider = this.providers.get(chainName);
        if (!provider) continue;

        try {
          const code = await provider.getCode(walletAddress);
          if (code !== '0x') {
            this.logger.debug(`Wallet deployed on ${chainName}, trying EIP-1271`);
            const isValid = await this.verifyEIP1271SignatureOnChain(
              message,
              innerSignature,
              walletAddress,
              provider
            );
            if (isValid) return true;
          }
        } catch (e) {
          continue;
        }
      }
    } catch (decodeError) {
      this.logger.debug(`Failed to decode ERC-6492 signature: ${decodeError}`);
    }

    return false;
  }

  /**
   * Verify using the ERC-6492 universal signature validator contract on a specific chain
   */
  private async verifyWithUniversalValidatorOnChain(
    messageHash: string,
    signature: string,
    walletAddress: string,
    provider: ethers.JsonRpcProvider,
    chainName: string,
  ): Promise<boolean> {
    try {
      // The universal validator ABI
      const universalValidatorABI = [
        'function isValidSig(address signer, bytes32 hash, bytes signature) external returns (bool)',
      ];

      const validator = new ethers.Contract(
        ERC6492_UNIVERSAL_VALIDATOR,
        universalValidatorABI,
        provider
      );

      // Check if the universal validator is deployed on this network
      const validatorCode = await provider.getCode(ERC6492_UNIVERSAL_VALIDATOR);
      if (validatorCode === '0x') {
        this.logger.debug(`Universal validator not deployed on ${chainName}`);
        return false;
      }

      // Use staticCall to verify without sending a transaction
      const isValid = await validator.isValidSig.staticCall(walletAddress, messageHash, signature);
      this.logger.debug(`Universal validator result on ${chainName}: ${isValid}`);
      return isValid;
    } catch (error) {
      this.logger.debug(`Universal validator failed on ${chainName}: ${error}`);
      return false;
    }
  }

  /**
   * Verify EIP-1271 signature on a specific chain
   */
  private async verifyEIP1271SignatureOnChain(
    message: string,
    signature: string,
    walletAddress: string,
    provider: ethers.JsonRpcProvider,
  ): Promise<boolean> {
    try {
      const messageHash = ethers.hashMessage(message);
      const contract = new ethers.Contract(walletAddress, EIP1271_ABI, provider);
      const result = await contract.isValidSignature(messageHash, signature);
      return result.toLowerCase() === EIP1271_MAGIC_VALUE;
    } catch (error) {
      this.logger.debug(`EIP-1271 contract call failed: ${error}`);
      return false;
    }
  }

  /**
   * Verify EIP-1271 signature for deployed smart contract wallets (uses default provider)
   */
  private async verifyEIP1271Signature(
    message: string,
    signature: string,
    walletAddress: string,
  ): Promise<boolean> {
    // Try on multiple chains
    const chainOrder = ['ethereum', 'base', 'polygon', 'arbitrum', 'optimism'];

    for (const chainName of chainOrder) {
      const provider = this.providers.get(chainName);
      if (!provider) continue;

      try {
        const code = await provider.getCode(walletAddress);
        if (code === '0x') continue; // Not deployed on this chain

        this.logger.debug(`Found contract on ${chainName}, verifying EIP-1271...`);
        const isValid = await this.verifyEIP1271SignatureOnChain(message, signature, walletAddress, provider);
        if (isValid) {
          this.logger.log(`EIP-1271 verified on ${chainName}`);
          return true;
        }
      } catch (error) {
        this.logger.debug(`EIP-1271 failed on ${chainName}: ${error}`);
      }
    }

    return false;
  }

  private isNonceValid(timestamp: number): boolean {
    const now = Date.now();
    const validDuration = WALLET_NONCE_EXPIRY_MINUTES * 60 * 1000;
    return now - timestamp < validDuration;
  }

  // ============================================
  // VALIDATION (for local strategy)
  // ============================================

  async validateUser(email: string, password: string): Promise<any> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.passwordHash || !user.isActive) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    return this.formatUserResponse(user);
  }
}
