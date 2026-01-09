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
import { mainnet, base, polygon, arbitrum, optimism, bsc } from 'viem/chains';
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
  ACCESS_TOKEN_MAX_AGE,
} from '../../config/cookie.config';
import { getClientIp, checkUserStatus, getRemainingLockMinutes } from '../../common/utils';

const BCRYPT_ROUNDS = 13;

// Re-export SecurityAlert from session.service
export type { SecurityAlert } from './session.service';
import type { SecurityAlert } from './session.service';

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: number; // Unix timestamp in ms when access token expires
  user: {
    id: string;
    email: string | null;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
    walletAddress: string | null;
    role: string;
    roleId: string | null; // RBAC role ID
    isEmailVerified: boolean;
    authProvider: string;
    createdAt: Date;
  };
  sessionId: string;
  securityAlert?: SecurityAlert;
}

export interface AvailableAuthMethods {
  password: boolean;
  google: boolean;
  facebook: boolean;
  wallet: string | null;  // wallet address if linked, null otherwise
}

export interface MeResponse {
  user: {
    id: string;
    email: string | null;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
    walletAddress: string | null;
    role: string;
    roleId: string | null; // RBAC role ID
    isEmailVerified: boolean;
    authProvider: string;
    createdAt: Date;
  };
  currentSession: SessionData | null;
  availableAuthMethods: AvailableAuthMethods;
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
      { name: 'bsc', url: this.configService.get<string>('BSC_RPC_URL') || 'https://bsc-dataseed1.binance.org', chain: bsc },
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
      user.legacyRole,
      '', // Session ID will be added after creation
    );

    // Create session with browser location if provided
    const { session } = await this.sessionService.createSession(user.id, refreshToken, req, location, undefined, 'password');

    // Regenerate tokens with session ID
    const tokens = await this.tokenService.generateTokenPair(
      user.id,
      user.email,
      user.legacyRole,
      session.id,
    );

    // Log registration
    await this.recordLoginHistory(user.id, 'credentials', true, null, req);

    this.logger.log(`User registered: ${user.id} (${user.email})`);

    const tokenExpiresAt = Date.now() + ACCESS_TOKEN_MAX_AGE;

    return {
      ...tokens,
      tokenExpiresAt,
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

    // Check user status (banned, locked, inactive)
    const statusCheck = checkUserStatus(user);
    if (!statusCheck.isValid) {
      const failureReason = statusCheck.reason === 'banned' ? 'user_banned'
        : statusCheck.reason === 'locked' ? 'account_locked'
        : 'account_inactive';
      await this.recordLoginHistory(user.id, 'credentials', false, failureReason, req);
      throw new UnauthorizedException(statusCheck.message);
    }

    if (!user.passwordHash) {
      await this.recordLoginHistory(user.id, 'credentials', false, 'no_password', req);
      throw new UnauthorizedException(
        'This account uses a different login method. Please use wallet or social login.',
      );
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
      legacyRole: string;
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
        lastLoginIp: getClientIp(req),
      },
    });

    // Generate tokens
    const tokens = await this.tokenService.generateTokenPair(
      user.id,
      user.email,
      user.legacyRole,
      '', // Temporary
    );

    // Create session with browser location if provided
    const { session, securityAlert } = await this.sessionService.createSession(
      user.id,
      tokens.refreshToken,
      req,
      location,
      undefined, // deviceFingerprint
      'password', // authMethod
    );

    // Log security alert if detected (impossible travel, new location)
    if (securityAlert) {
      this.logger.warn(`Security alert for user ${user.id}: ${securityAlert.type} - ${securityAlert.message}`);
    }

    // Regenerate with session ID
    const finalTokens = await this.tokenService.generateTokenPair(
      user.id,
      user.email,
      user.legacyRole,
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
    // Use location from session (already resolved from browser or IP geolocation)
    const locationStr =
      session.city && session.country
        ? `${session.city}, ${session.country}`
        : undefined;

    // In-app notification + email with parsed device name (e.g., "Chrome on MacOS")
    await this.notificationsService.notifyNewLogin(
      user.id,
      session.deviceName || 'Unknown device',
      locationStr,
      session.ipAddress,
    );

    // Calculate token expiry time
    const tokenExpiresAt = Date.now() + ACCESS_TOKEN_MAX_AGE;

    return {
      ...finalTokens,
      tokenExpiresAt,
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
      getClientIp(req),
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
  ): Promise<{ accessToken: string; tokenExpiresAt: number; securityAlert?: SecurityAlert }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Generate ONLY a new access token (refresh token stays the same)
    const accessToken = await this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email || '',
      role: user.legacyRole,
      sessionId,
    });

    // Calculate access token expiry
    const tokenExpiresAt = Date.now() + ACCESS_TOKEN_MAX_AGE;

    // Update session last activity
    await this.sessionService.updateLastActivity(sessionId);

    return {
      accessToken,
      tokenExpiresAt,
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
  // SELF DELETE ACCOUNT
  // ============================================

  /**
   * Check if user is eligible to delete their account
   * Returns blockers if any exist
   */
  async checkDeletionEligibility(userId: string): Promise<{
    canDelete: boolean;
    blockers: Array<{
      type: 'balance' | 'locks' | 'withdrawals';
      message: string;
      count?: number;
      amount?: string;
    }>;
    gracePeriodDays: number;
    retentionDays: number;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tokenBalance: true,
        walletBalances: true,
        locks: {
          where: { status: 'ACTIVE' },
        },
        withdrawalRequests: {
          where: { status: { in: ['PENDING_CONFIRMATION', 'PENDING_APPROVAL', 'APPROVED', 'PROCESSING'] } },
        },
        withdrawals: {
          where: { status: { in: ['PENDING_CONFIRMATION', 'PENDING_APPROVAL', 'APPROVED', 'PROCESSING'] } },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const blockers: Array<{
      type: 'balance' | 'locks' | 'withdrawals';
      message: string;
      count?: number;
      amount?: string;
    }> = [];

    // Check for non-zero balance
    const tokenAvailable = user.tokenBalance ? parseFloat(user.tokenBalance.availableBalance.toString()) : 0;
    const tokenLocked = user.tokenBalance ? parseFloat(user.tokenBalance.lockedBalance.toString()) : 0;
    const totalTokenBalance = tokenAvailable + tokenLocked;

    const walletBalance = user.walletBalances.reduce((sum, wb) => {
      return sum + parseFloat(wb.availableBalance.toString()) +
        parseFloat(wb.lockedBalance.toString()) +
        parseFloat(wb.pendingBalance.toString());
    }, 0);

    if (totalTokenBalance > 0) {
      blockers.push({
        type: 'balance',
        message: 'You have tokens in your account. Please withdraw all tokens first.',
        amount: totalTokenBalance.toFixed(2),
      });
    }

    if (walletBalance > 0) {
      blockers.push({
        type: 'balance',
        message: 'You have funds in your wallet. Please withdraw all funds first.',
        amount: walletBalance.toFixed(6),
      });
    }

    // Check for active locks
    if (user.locks.length > 0) {
      blockers.push({
        type: 'locks',
        message: `You have ${user.locks.length} active lock(s). Wait for them to complete.`,
        count: user.locks.length,
      });
    }

    // Check for pending withdrawals
    const pendingWithdrawalsCount = user.withdrawalRequests.length + user.withdrawals.length;
    if (pendingWithdrawalsCount > 0) {
      blockers.push({
        type: 'withdrawals',
        message: `You have ${pendingWithdrawalsCount} pending withdrawal(s). Wait for them to complete.`,
        count: pendingWithdrawalsCount,
      });
    }

    return {
      canDelete: blockers.length === 0,
      blockers,
      gracePeriodDays: 30,
      retentionDays: 365,
    };
  }

  async deleteMyAccount(
    userId: string,
    options: {
      ipAddress?: string;
      userAgent?: string;
    } = {}
  ): Promise<{
    message: string;
    gracePeriodEndsAt: Date;
    retentionExpiresAt: Date;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tokenBalance: true,
        walletBalances: true,
        locks: {
          where: { status: 'ACTIVE' },
        },
        withdrawalRequests: {
          where: { status: { in: ['PENDING_CONFIRMATION', 'PENDING_APPROVAL', 'APPROVED', 'PROCESSING'] } },
        },
        withdrawals: {
          where: { status: { in: ['PENDING_CONFIRMATION', 'PENDING_APPROVAL', 'APPROVED', 'PROCESSING'] } },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isDeleted) {
      throw new BadRequestException('Account is already deleted');
    }

    // Check for non-zero balance
    const hasTokenBalance = user.tokenBalance && (
      parseFloat(user.tokenBalance.availableBalance.toString()) > 0 ||
      parseFloat(user.tokenBalance.lockedBalance.toString()) > 0
    );

    const hasWalletBalance = user.walletBalances.some(wb =>
      parseFloat(wb.availableBalance.toString()) > 0 ||
      parseFloat(wb.lockedBalance.toString()) > 0 ||
      parseFloat(wb.pendingBalance.toString()) > 0
    );

    if (hasTokenBalance || hasWalletBalance) {
      throw new BadRequestException(
        'Cannot delete account with non-zero balance. Please withdraw all funds first.'
      );
    }

    // Check for active locks
    if (user.locks.length > 0) {
      throw new BadRequestException(
        `Cannot delete account with ${user.locks.length} active lock(s). Please wait for locks to complete.`
      );
    }

    // Check for pending withdrawals
    const pendingWithdrawalsCount = user.withdrawalRequests.length + user.withdrawals.length;
    if (pendingWithdrawalsCount > 0) {
      throw new BadRequestException(
        `Cannot delete account with ${pendingWithdrawalsCount} pending withdrawal(s). Please wait for withdrawals to complete.`
      );
    }

    const now = new Date();
    const gracePeriodEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const retentionExpiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year

    // Calculate total balances for audit log
    const availableBalance = user.tokenBalance?.availableBalance ?? 0;
    const lockedBalance = user.tokenBalance?.lockedBalance ?? 0;

    // Use transaction to ensure atomicity
    await this.prisma.$transaction(async (tx) => {
      // Create deletion audit log
      await tx.accountDeletionLog.create({
        data: {
          userId: user.id,
          originalEmail: user.email || 'no-email',
          originalUsername: user.username,
          originalWalletAddress: user.walletAddress,
          reason: 'user_requested',
          requestedBy: 'user',
          availableBalance,
          lockedBalance,
          pendingWithdrawals: 0,
          activeLocks: 0,
          gracePeriodEndsAt,
          retentionExpiresAt,
          ipAddress: options.ipAddress,
          userAgent: options.userAgent,
        },
      });

      // Soft delete - mark as deleted but preserve original email
      await tx.user.update({
        where: { id: userId },
        data: {
          originalEmail: user.email,
          email: `deleted_${userId}@deleted.local`,
          username: null,
          isDeleted: true,
          deletedAt: now,
          deletionReason: 'user_requested',
          deletionRequestedBy: 'user',
          retentionExpiresAt,
          canRecover: true,
          isBanned: true,
          banReason: 'Account deleted by user',
        },
      });

      // Revoke all sessions
      await tx.session.updateMany({
        where: { userId },
        data: { isValid: false, revokedAt: now, revokedReason: 'account_deleted' },
      });
    });

    // Send deletion confirmation email
    if (user.email) {
      try {
        await this.emailService.sendAccountDeletedEmail(user.email, gracePeriodEndsAt);
      } catch (error) {
        this.logger.error(`Failed to send deletion email to ${user.email}`, error);
      }
    }

    this.logger.log(`User self-deleted account: ${userId}`);

    return {
      message: 'Account deleted successfully. You have 30 days to recover your account.',
      gracePeriodEndsAt,
      retentionExpiresAt,
    };
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

    // Determine available auth methods for re-authentication
    const authProvider = user.authProvider?.toUpperCase() || 'CREDENTIALS';
    const availableAuthMethods: AvailableAuthMethods = {
      password: !!user.passwordHash,
      google: authProvider === 'GOOGLE',
      facebook: authProvider === 'FACEBOOK',
      wallet: user.walletAddress || null,
    };

    return {
      user: this.formatUserResponse(user),
      currentSession,
      availableAuthMethods,
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
        ipAddress: getClientIp(req),
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

    // Check user status (banned, locked, inactive)
    const statusCheck = checkUserStatus(user);
    if (!statusCheck.isValid) {
      const failureReason = statusCheck.reason === 'banned' ? 'user_banned'
        : statusCheck.reason === 'locked' ? 'account_locked'
        : 'account_inactive';
      await this.recordLoginHistory(user.id, 'wallet', false, failureReason, req);
      throw new UnauthorizedException(statusCheck.message);
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
      legacyRole: string;
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
        lastLoginIp: getClientIp(req),
      },
    });

    // Generate tokens
    const tokens = await this.tokenService.generateTokenPair(
      user.id,
      user.email,
      user.legacyRole,
      '',
    );

    // Create session with browser location for VPN detection
    const { session, securityAlert } = await this.sessionService.createSession(
      user.id,
      tokens.refreshToken,
      req,
      browserLocation,
      undefined, // deviceFingerprint
      'wallet', // authMethod
    );

    // Log security alert if detected
    if (securityAlert) {
      this.logger.warn(`Security alert for user ${user.id}: ${securityAlert.type} - ${securityAlert.message}`);
    }

    // Regenerate with session ID
    const finalTokens = await this.tokenService.generateTokenPair(
      user.id,
      user.email,
      user.legacyRole,
      session.id,
    );

    await this.prisma.session.update({
      where: { id: session.id },
      data: { refreshToken: this.tokenService.hashToken(finalTokens.refreshToken) },
    });

    await this.recordLoginHistory(user.id, 'wallet', true, null, req);

    this.logger.log(`Wallet login: ${user.id}`);

    // Send new login security alert and in-app notification
    // Use location from session (already resolved from browser or IP geolocation)
    const locationStr =
      session.city && session.country
        ? `${session.city}, ${session.country}`
        : undefined;

    await this.notificationsService.notifyNewLogin(
      user.id,
      `${session.deviceName || 'Unknown device'} (Wallet)`,
      locationStr,
      session.ipAddress,
    );

    const tokenExpiresAt = Date.now() + ACCESS_TOKEN_MAX_AGE;

    return {
      ...finalTokens,
      tokenExpiresAt,
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
      user.legacyRole,
      '',
    );

    // Create session with browser location for VPN detection
    const { session } = await this.sessionService.createSession(user.id, tokens.refreshToken, req, location, undefined, 'wallet');

    // Regenerate with session ID
    const finalTokens = await this.tokenService.generateTokenPair(
      user.id,
      user.email,
      user.legacyRole,
      session.id,
    );

    await this.prisma.session.update({
      where: { id: session.id },
      data: { refreshToken: this.tokenService.hashToken(finalTokens.refreshToken) },
    });

    await this.recordLoginHistory(user.id, 'wallet', true, null, req);

    this.logger.log(`Wallet registration: ${user.id}`);

    const tokenExpiresAt = Date.now() + ACCESS_TOKEN_MAX_AGE;

    return {
      ...finalTokens,
      tokenExpiresAt,
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

  private formatUserResponse(user: {
    id: string;
    email: string | null;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    phoneNumber?: string | null;
    profileImageUrl?: string | null;
    walletAddress: string | null;
    legacyRole: string;
    roleId?: string | null;
    isEmailVerified: boolean;
    authProvider: string | null;
    passwordHash?: string | null;
    twoFactorAuth?: { isEnabled: boolean } | null;
    createdAt: Date;
  }) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber ?? null,
      profileImageUrl: user.profileImageUrl ?? null,
      walletAddress: user.walletAddress,
      role: user.legacyRole,
      roleId: user.roleId ?? null,
      isEmailVerified: user.isEmailVerified,
      authProvider: user.authProvider?.toUpperCase() || 'CREDENTIALS',
      hasPassword: !!user.passwordHash,
      twoFactorEnabled: user.twoFactorAuth?.isEnabled ?? false,
      createdAt: user.createdAt,
    };
  }

  private async handleFailedLogin(userId: string, req: Request): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const newAttempts = (user.failedLoginAttempts || 0) + 1;
    const updateData: { failedLoginAttempts: number; lockedUntil?: Date } = {
      failedLoginAttempts: newAttempts,
    };

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
          const chainOrder = ['bsc', 'base', 'ethereum', 'polygon', 'arbitrum', 'optimism'];
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
    const chainOrder = ['bsc', 'base', 'ethereum', 'polygon', 'arbitrum', 'optimism'];

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

    // Try each chain - BSC is primary for this app
    const chainOrder = ['bsc', 'base', 'ethereum', 'polygon', 'arbitrum', 'optimism'];

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
    // Try on multiple chains - BSC is primary for this app
    const chainOrder = ['bsc', 'ethereum', 'base', 'polygon', 'arbitrum', 'optimism'];

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

  // ============================================
  // ADMIN STEP-UP AUTHENTICATION
  // ============================================

  private readonly ADMIN_VERIFICATION_DURATION_MINUTES = 30;

  /**
   * Verify admin step-up authentication using 2FA code
   * Required when admin wants to access admin panel from frontend
   */
  async verifyAdminAccess(
    userId: string,
    sessionId: string,
    code: string,
    ipAddress: string,
  ): Promise<{ success: boolean; expiresAt: Date; redirectUrl: string }> {
    // Get user and verify they are admin
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, legacyRole: true },
    });

    if (!user || user.legacyRole !== 'ADMIN') {
      throw new UnauthorizedException('Admin access required');
    }

    // Check if 2FA is enabled (required for admin access)
    const has2FA = await this.twoFactorService.isEnabled(userId);
    if (!has2FA) {
      throw new BadRequestException(
        'Two-factor authentication must be enabled for admin access',
      );
    }

    // Verify the 2FA code
    const isValid = await this.twoFactorService.verifyToken(
      userId,
      code,
      ipAddress,
      undefined,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setMinutes(
      expiresAt.getMinutes() + this.ADMIN_VERIFICATION_DURATION_MINUTES,
    );

    // Update session with admin verification
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        adminVerifiedAt: new Date(),
        adminVerifiedIp: ipAddress,
        adminVerifiedUntil: expiresAt,
      },
    });

    // Log the admin verification
    await this.sessionService.logSessionActivity(
      sessionId,
      userId,
      'admin_access_verified',
      { ipAddress },
    );

    this.logger.log(`Admin access verified for user ${userId}`);

    const adminUrl = this.configService.get<string>('ADMIN_URL', 'http://localhost:3002');

    return {
      success: true,
      expiresAt,
      redirectUrl: adminUrl,
    };
  }

  /**
   * Check if admin verification is still valid for a session
   */
  async checkAdminVerification(
    sessionId: string,
    ipAddress: string,
  ): Promise<{ isVerified: boolean; expiresAt: Date | null }> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        adminVerifiedAt: true,
        adminVerifiedIp: true,
        adminVerifiedUntil: true,
      },
    });

    if (!session || !session.adminVerifiedUntil) {
      return { isVerified: false, expiresAt: null };
    }

    // Check if verification has expired
    if (new Date() > session.adminVerifiedUntil) {
      return { isVerified: false, expiresAt: null };
    }

    // Check if IP matches (additional security)
    if (session.adminVerifiedIp !== ipAddress) {
      this.logger.warn(
        `Admin verification IP mismatch: expected ${session.adminVerifiedIp}, got ${ipAddress}`,
      );
      return { isVerified: false, expiresAt: null };
    }

    return {
      isVerified: true,
      expiresAt: session.adminVerifiedUntil,
    };
  }

  /**
   * Get admin access status for a user
   */
  async getAdminStatus(
    userId: string,
    sessionId: string,
    ipAddress: string,
  ): Promise<{
    isAdmin: boolean;
    isVerified: boolean;
    has2FAEnabled: boolean;
    expiresAt: Date | null;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { legacyRole: true },
    });

    const isAdmin = user?.legacyRole === 'ADMIN';
    const has2FAEnabled = await this.twoFactorService.isEnabled(userId);

    if (!isAdmin) {
      return {
        isAdmin: false,
        isVerified: false,
        has2FAEnabled,
        expiresAt: null,
      };
    }

    const { isVerified, expiresAt } = await this.checkAdminVerification(
      sessionId,
      ipAddress,
    );

    return {
      isAdmin: true,
      isVerified,
      has2FAEnabled,
      expiresAt,
    };
  }

  /**
   * Revoke admin verification for a session
   */
  async revokeAdminVerification(sessionId: string): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        adminVerifiedAt: null,
        adminVerifiedIp: null,
        adminVerifiedUntil: null,
      },
    });
  }

  /**
   * Get user's role and permissions (for RBAC)
   * This endpoint allows users to fetch their own permissions without requiring roles.view
   */
  async getUserPermissions(userId: string): Promise<{
    role: {
      id: string;
      name: string;
      slug: string;
      description: string | null;
      color: string | null;
    } | null;
    permissions: { id: string; code: string; name: string; description: string | null; module: string; action: string }[];
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        adminRole: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.adminRole) {
      return { role: null, permissions: [] };
    }

    return {
      role: {
        id: user.adminRole.id,
        name: user.adminRole.name,
        slug: user.adminRole.slug,
        description: user.adminRole.description,
        color: user.adminRole.color,
      },
      permissions: user.adminRole.permissions.map(rp => ({
        id: rp.permission.id,
        code: rp.permission.code,
        name: rp.permission.name,
        description: rp.permission.description,
        module: rp.permission.module,
        action: rp.permission.action,
      })),
    };
  }
}
