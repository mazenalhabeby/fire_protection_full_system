import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from './token.service';
import { NotificationsService } from '../notifications/notifications.service';

// Constants
const MAX_2FA_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;
const RECOVERY_CODE_COUNT = 10;
const TOTP_WINDOW = 1; // Allow 1 step before/after for clock drift

export interface TwoFactorSetupResult {
  secret: string; // For manual entry
  qrCodeDataUrl: string; // For QR code scanning
}

export interface TwoFactorVerifyResult {
  success: boolean;
  recoveryCodes?: string[]; // Only returned on initial setup verification
}

export interface TwoFactorStatus {
  isEnabled: boolean;
  isVerified: boolean;
  enabledAt: Date | null;
  recoveryCodesRemaining: number;
}

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);
  private readonly encryptionKey: Buffer;
  private readonly appName: string;

  constructor(
    private prisma: PrismaService,
    private tokenService: TokenService,
    private configService: ConfigService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
  ) {
    // Use a dedicated 2FA encryption key (32 bytes for AES-256)
    const key = this.configService.getOrThrow<string>(
      'TWO_FACTOR_ENCRYPTION_KEY',
    );
    this.encryptionKey = Buffer.from(key, 'hex');
    this.appName = this.configService.get<string>(
      'APP_NAME',
      'HBC Fire Protection',
    );
  }

  // ============================================
  // ENCRYPTION HELPERS
  // ============================================

  private encrypt(text: string): { encrypted: string; iv: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted: encrypted + ':' + authTag.toString('hex'),
      iv: iv.toString('hex'),
    };
  }

  private decrypt(encryptedData: string, ivHex: string): string {
    const [encrypted, authTagHex] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      iv,
    );
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  // ============================================
  // SETUP FLOW
  // ============================================

  async initiateSetup(
    userId: string,
    userEmail: string,
  ): Promise<TwoFactorSetupResult> {
    // Check if 2FA already enabled
    const existing = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (existing?.isEnabled) {
      throw new BadRequestException(
        'Two-factor authentication is already enabled',
      );
    }

    // Generate new TOTP secret
    const secret = speakeasy.generateSecret({
      name: `${this.appName} (${userEmail})`,
      issuer: this.appName,
      length: 32,
    });

    // Encrypt the secret
    const { encrypted, iv } = this.encrypt(secret.base32);

    // Upsert 2FA record (pending verification)
    await this.prisma.twoFactorAuth.upsert({
      where: { userId },
      create: {
        userId,
        encryptedSecret: encrypted,
        secretIv: iv,
        isEnabled: false,
        isVerified: false,
      },
      update: {
        encryptedSecret: encrypted,
        secretIv: iv,
        isEnabled: false,
        isVerified: false,
        failedAttempts: 0,
        lockedUntil: null,
      },
    });

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url!);

    // Log setup initiation
    await this.logAuditEvent(userId, 'setup_initiated', null, null, null);

    this.logger.log(`2FA setup initiated for user ${userId}`);

    return {
      secret: secret.base32,
      qrCodeDataUrl,
    };
  }

  async verifyAndEnable(
    userId: string,
    token: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<TwoFactorVerifyResult> {
    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactorAuth) {
      throw new BadRequestException('Two-factor authentication not set up');
    }

    if (twoFactorAuth.isEnabled) {
      throw new BadRequestException(
        'Two-factor authentication is already enabled',
      );
    }

    // Check lockout
    if (twoFactorAuth.lockedUntil && new Date() < twoFactorAuth.lockedUntil) {
      const remaining = Math.ceil(
        (twoFactorAuth.lockedUntil.getTime() - Date.now()) / 60000,
      );
      throw new UnauthorizedException(
        `Too many failed attempts. Try again in ${remaining} minutes.`,
      );
    }

    // Decrypt and verify
    const secret = this.decrypt(
      twoFactorAuth.encryptedSecret,
      twoFactorAuth.secretIv,
    );

    const isValid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: TOTP_WINDOW,
    });

    if (!isValid) {
      await this.handleFailedAttempt(userId, twoFactorAuth.failedAttempts);
      await this.logAuditEvent(
        userId,
        'setup_verification_failed',
        ipAddress,
        userAgent,
        null,
      );
      throw new UnauthorizedException('Invalid verification code');
    }

    // Generate recovery codes
    const recoveryCodes = this.generateRecoveryCodes();
    const hashedCodes = recoveryCodes
      .map((code) => this.tokenService.hashToken(code))
      .join(',');

    // Enable 2FA
    await this.prisma.twoFactorAuth.update({
      where: { userId },
      data: {
        isEnabled: true,
        isVerified: true,
        enabledAt: new Date(),
        verifiedAt: new Date(),
        recoveryCodesHash: hashedCodes,
        recoveryCodesCount: RECOVERY_CODE_COUNT,
        failedAttempts: 0,
        lockedUntil: null,
      },
    });

    await this.logAuditEvent(
      userId,
      'setup_completed',
      ipAddress,
      userAgent,
      null,
    );

    // Send notification
    await this.notificationsService.notifyTwoFactorEnabled(userId);

    this.logger.log(`2FA enabled for user ${userId}`);

    return {
      success: true,
      recoveryCodes,
    };
  }

  // ============================================
  // VERIFICATION (LOGIN FLOW)
  // ============================================

  async verifyToken(
    userId: string,
    token: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<boolean> {
    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactorAuth || !twoFactorAuth.isEnabled) {
      return true; // 2FA not enabled, skip verification
    }

    // Check lockout
    if (twoFactorAuth.lockedUntil && new Date() < twoFactorAuth.lockedUntil) {
      const remaining = Math.ceil(
        (twoFactorAuth.lockedUntil.getTime() - Date.now()) / 60000,
      );
      throw new UnauthorizedException(
        `Account locked. Try again in ${remaining} minutes.`,
      );
    }

    // Try TOTP verification first
    const secret = this.decrypt(
      twoFactorAuth.encryptedSecret,
      twoFactorAuth.secretIv,
    );

    const isValid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: TOTP_WINDOW,
    });

    if (isValid) {
      await this.prisma.twoFactorAuth.update({
        where: { userId },
        data: {
          lastUsedAt: new Date(),
          failedAttempts: 0,
          lockedUntil: null,
          lastAttemptAt: new Date(),
        },
      });
      await this.logAuditEvent(userId, 'login_success', ipAddress, userAgent, {
        method: 'totp',
      });
      return true;
    }

    // Try recovery code (9 characters with hyphen, e.g., XXXX-XXXX)
    if (token.length === 9 && token.includes('-')) {
      const recoveryResult = await this.verifyRecoveryCode(
        userId,
        token,
        ipAddress,
        userAgent,
      );
      if (recoveryResult) {
        return true;
      }
    }

    // Failed attempt
    await this.handleFailedAttempt(userId, twoFactorAuth.failedAttempts);
    await this.logAuditEvent(userId, 'login_failed', ipAddress, userAgent, null);

    throw new UnauthorizedException('Invalid verification code');
  }

  private async verifyRecoveryCode(
    userId: string,
    code: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<boolean> {
    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactorAuth?.recoveryCodesHash) {
      return false;
    }

    const hashedCodes = twoFactorAuth.recoveryCodesHash.split(',');
    const hashedInput = this.tokenService.hashToken(code.toUpperCase());

    const codeIndex = hashedCodes.findIndex((h) => h === hashedInput);

    if (codeIndex === -1) {
      return false;
    }

    // Remove used recovery code
    hashedCodes.splice(codeIndex, 1);

    await this.prisma.twoFactorAuth.update({
      where: { userId },
      data: {
        recoveryCodesHash: hashedCodes.join(','),
        recoveryCodesCount: hashedCodes.length,
        lastUsedAt: new Date(),
        failedAttempts: 0,
        lockedUntil: null,
        lastAttemptAt: new Date(),
      },
    });

    await this.logAuditEvent(
      userId,
      'recovery_code_used',
      ipAddress,
      userAgent,
      {
        codeIndex,
        remainingCodes: hashedCodes.length,
      },
    );

    // Send notification about recovery code usage
    await this.notificationsService.notifyRecoveryCodeUsed(userId, hashedCodes.length);

    this.logger.warn(
      `Recovery code used for user ${userId}, ${hashedCodes.length} remaining`,
    );

    return true;
  }

  // ============================================
  // DISABLE 2FA
  // ============================================

  async disable(
    userId: string,
    token: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ success: boolean }> {
    // Verify current token before disabling
    await this.verifyToken(userId, token, ipAddress, userAgent);

    await this.prisma.twoFactorAuth.delete({
      where: { userId },
    });

    await this.logAuditEvent(userId, 'disabled', ipAddress, userAgent, null);

    // Send notification
    await this.notificationsService.notifyTwoFactorDisabled(userId);

    this.logger.log(`2FA disabled for user ${userId}`);

    return { success: true };
  }

  // ============================================
  // REGENERATE RECOVERY CODES
  // ============================================

  async regenerateRecoveryCodes(
    userId: string,
    token: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<string[]> {
    // Verify current token
    await this.verifyToken(userId, token, ipAddress, userAgent);

    const recoveryCodes = this.generateRecoveryCodes();
    const hashedCodes = recoveryCodes
      .map((code) => this.tokenService.hashToken(code))
      .join(',');

    await this.prisma.twoFactorAuth.update({
      where: { userId },
      data: {
        recoveryCodesHash: hashedCodes,
        recoveryCodesCount: RECOVERY_CODE_COUNT,
      },
    });

    await this.logAuditEvent(
      userId,
      'recovery_codes_regenerated',
      ipAddress,
      userAgent,
      null,
    );

    // Send notification
    await this.notificationsService.notifyRecoveryCodesRegenerated(userId);

    return recoveryCodes;
  }

  // ============================================
  // STATUS & HELPERS
  // ============================================

  async getStatus(userId: string): Promise<TwoFactorStatus> {
    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    return {
      isEnabled: twoFactorAuth?.isEnabled ?? false,
      isVerified: twoFactorAuth?.isVerified ?? false,
      enabledAt: twoFactorAuth?.enabledAt ?? null,
      recoveryCodesRemaining: twoFactorAuth?.recoveryCodesCount ?? 0,
    };
  }

  async isEnabled(userId: string): Promise<boolean> {
    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
      select: { isEnabled: true },
    });
    return twoFactorAuth?.isEnabled ?? false;
  }

  private generateRecoveryCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
      const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
      const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
      codes.push(`${part1}-${part2}`);
    }
    return codes;
  }

  private async handleFailedAttempt(
    userId: string,
    currentAttempts: number,
  ): Promise<void> {
    const newAttempts = currentAttempts + 1;
    const updateData: {
      failedAttempts: number;
      lastAttemptAt: Date;
      lockedUntil?: Date;
    } = {
      failedAttempts: newAttempts,
      lastAttemptAt: new Date(),
    };

    if (newAttempts >= MAX_2FA_ATTEMPTS) {
      const lockUntil = new Date();
      lockUntil.setMinutes(lockUntil.getMinutes() + LOCKOUT_DURATION_MINUTES);
      updateData.lockedUntil = lockUntil;

      await this.logAuditEvent(userId, 'locked', null, null, {
        attempts: newAttempts,
      });

      // Send notification about lockout
      await this.notificationsService.notifyTwoFactorLocked(userId, LOCKOUT_DURATION_MINUTES);

      this.logger.warn(
        `2FA locked for user ${userId} after ${newAttempts} failed attempts`,
      );
    }

    await this.prisma.twoFactorAuth.update({
      where: { userId },
      data: updateData,
    });
  }

  private async logAuditEvent(
    userId: string,
    event: string,
    ipAddress?: string | null,
    userAgent?: string | null,
    metadata?: Record<string, unknown> | null,
  ): Promise<void> {
    try {
      await this.prisma.twoFactorAuditLog.create({
        data: {
          userId,
          event,
          ipAddress,
          userAgent,
          metadata: metadata
            ? (metadata as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log 2FA audit event: ${error}`);
    }
  }
}
