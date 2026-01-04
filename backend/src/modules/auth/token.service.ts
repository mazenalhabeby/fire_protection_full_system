import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
} from '../../config/cookie.config';

// 2FA challenge token expiry (5 minutes)
const TWO_FACTOR_CHALLENGE_EXPIRY = '5m';

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  role: string;
  sessionId: string;
  type?: 'access' | 'refresh';
  // Standard JWT claims (added automatically by JWT library)
  iat?: number; // Issued at (Unix timestamp in seconds)
  exp?: number; // Expiration time (Unix timestamp in seconds)
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class TokenService {
  private readonly jwtSecret: string;
  private readonly jwtRefreshSecret: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');
    this.jwtRefreshSecret = this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
  }

  /**
   * Generate both access and refresh tokens
   */
  async generateTokenPair(
    userId: string,
    email: string | null,
    role: string,
    sessionId: string,
  ): Promise<TokenPair> {
    const payload: Omit<JwtPayload, 'type'> = {
      sub: userId,
      email: email || '',
      role,
      sessionId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(payload),
      this.generateRefreshToken(payload),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Generate access token (short-lived)
   */
  async generateAccessToken(payload: Omit<JwtPayload, 'type'>): Promise<string> {
    return this.jwtService.signAsync(
      { ...payload, type: 'access' },
      {
        secret: this.jwtSecret,
        expiresIn: ACCESS_TOKEN_EXPIRY,
      },
    );
  }

  /**
   * Generate refresh token (long-lived)
   */
  async generateRefreshToken(payload: Omit<JwtPayload, 'type'>): Promise<string> {
    return this.jwtService.signAsync(
      { ...payload, type: 'refresh' },
      {
        secret: this.jwtRefreshSecret,
        expiresIn: REFRESH_TOKEN_EXPIRY,
      },
    );
  }

  /**
   * Verify access token
   */
  async verifyAccessToken(token: string): Promise<JwtPayload> {
    return this.jwtService.verifyAsync<JwtPayload>(token, {
      secret: this.jwtSecret,
    });
  }

  /**
   * Verify refresh token
   */
  async verifyRefreshToken(token: string): Promise<JwtPayload> {
    return this.jwtService.verifyAsync<JwtPayload>(token, {
      secret: this.jwtRefreshSecret,
    });
  }

  /**
   * Decode token without verification (for debugging/logging)
   */
  decodeToken(token: string): JwtPayload | null {
    try {
      return this.jwtService.decode(token) as JwtPayload;
    } catch {
      return null;
    }
  }

  /**
   * Hash a token for secure storage (e.g., refresh token in DB)
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generate a secure random token (for password reset, email verification)
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate a 6-digit verification code
   */
  generateVerificationCode(): string {
    // Generate a random 6-digit number between 100000 and 999999
    const code = crypto.randomInt(100000, 999999);
    return code.toString();
  }

  /**
   * Generate a token family ID for refresh token rotation
   */
  generateTokenFamily(): string {
    return crypto.randomUUID();
  }

  /**
   * Generate a nonce for wallet authentication
   */
  generateWalletNonce(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create wallet signature message
   */
  createWalletSignMessage(walletAddress: string, nonce: string): string {
    const timestamp = Date.now();
    return `Welcome to HBCT Fire Protection!

Sign this message to authenticate your wallet.

Wallet: ${walletAddress}
Nonce: ${nonce}
Timestamp: ${timestamp}

This request will not trigger a blockchain transaction or cost any gas fees.`;
  }

  /**
   * Extract timestamp from wallet sign message
   */
  extractTimestampFromMessage(message: string): number | null {
    const match = message.match(/Timestamp: (\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  // ============================================
  // TWO-FACTOR AUTHENTICATION TOKENS
  // ============================================

  /**
   * Generate a temporary 2FA challenge token (short-lived)
   * Used after password/wallet verification when 2FA is required
   */
  async generateTwoFactorChallengeToken(
    userId: string,
    email: string | null,
    authMethod: 'credentials' | 'wallet',
  ): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: userId,
        email: email || '',
        authMethod,
        type: '2fa_challenge',
      },
      {
        secret: this.jwtSecret,
        expiresIn: TWO_FACTOR_CHALLENGE_EXPIRY,
      },
    );
  }

  /**
   * Verify a 2FA challenge token
   * Returns user info if valid, null if invalid/expired
   */
  async verifyTwoFactorChallengeToken(
    token: string,
  ): Promise<{ userId: string; email: string; authMethod: string } | null> {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.jwtSecret,
      });

      if (payload.type !== '2fa_challenge') {
        return null;
      }

      return {
        userId: payload.sub,
        email: payload.email,
        authMethod: payload.authMethod,
      };
    } catch {
      return null;
    }
  }
}
