import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from './token.service';
import { ethers } from 'ethers';
import * as crypto from 'crypto';
import { recoverTypedDataAddress, getAddress, isAddressEqual } from 'viem';

// Maximum wallets per user
const MAX_WALLETS_PER_USER = 3;

// Wallet linking nonce expiry (5 minutes)
const NONCE_EXPIRY_MS = 5 * 60 * 1000;

// In-memory nonce store (in production, use Redis)
const nonceStore = new Map<string, { nonce: string; createdAt: Date; userId: string }>();

export interface WalletInfo {
  id: string;
  walletAddress: string;
  label: string | null;
  isPrimary: boolean;
  verifiedAt: Date;
  lastUsedAt: Date | null;
  createdAt: Date;
}

export interface LinkWalletDto {
  walletAddress: string;
  signature: string;
  nonce: string;
  label?: string;
}

@Injectable()
export class WalletManagementService {
  constructor(
    private prisma: PrismaService,
    private tokenService: TokenService,
  ) {
    // Cleanup expired nonces every minute
    setInterval(() => this.cleanupExpiredNonces(), 60000);
  }

  /**
   * Generate a nonce for wallet linking verification
   */
  async generateLinkingNonce(
    userId: string,
    walletAddress: string,
    ipAddress?: string,
  ): Promise<{ nonce: string; message: string; expiresAt: Date }> {
    const normalizedAddress = walletAddress.toLowerCase();

    // Validate wallet address format
    if (!ethers.isAddress(normalizedAddress)) {
      throw new BadRequestException('Invalid wallet address format');
    }

    // Check if wallet is already linked to any account
    const existingWallet = await this.prisma.userWallet.findUnique({
      where: { walletAddress: normalizedAddress },
      include: { user: { select: { id: true, email: true } } },
    });

    if (existingWallet) {
      if (existingWallet.userId === userId) {
        throw new ConflictException('This wallet is already linked to your account');
      }
      throw new ConflictException('This wallet is already linked to another account');
    }

    // Check if user has reached wallet limit
    const walletCount = await this.prisma.userWallet.count({
      where: { userId },
    });

    if (walletCount >= MAX_WALLETS_PER_USER) {
      throw new ForbiddenException(
        `You can only link up to ${MAX_WALLETS_PER_USER} wallets to your account`,
      );
    }

    // Generate unique nonce
    const nonce = this.tokenService.generateSecureToken(32);
    const expiresAt = new Date(Date.now() + NONCE_EXPIRY_MS);

    // Store nonce with wallet address as key
    const nonceKey = `${userId}:${normalizedAddress}`;
    nonceStore.set(nonceKey, {
      nonce,
      createdAt: new Date(),
      userId,
    });

    // Create the message to be signed
    const message = this.createSigningMessage(normalizedAddress, nonce);

    return {
      nonce,
      message,
      expiresAt,
    };
  }

  /**
   * Link a wallet to user's account after signature verification
   */
  async linkWallet(
    userId: string,
    dto: LinkWalletDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<WalletInfo> {
    const normalizedAddress = dto.walletAddress.toLowerCase();

    // Validate wallet address format
    if (!ethers.isAddress(normalizedAddress)) {
      throw new BadRequestException('Invalid wallet address format');
    }

    // Verify nonce exists and belongs to this user
    const nonceKey = `${userId}:${normalizedAddress}`;
    const storedNonce = nonceStore.get(nonceKey);

    if (!storedNonce) {
      throw new BadRequestException('Linking session expired. Please request a new nonce.');
    }

    if (storedNonce.userId !== userId) {
      throw new ForbiddenException('Invalid linking session');
    }

    if (storedNonce.nonce !== dto.nonce) {
      throw new BadRequestException('Invalid nonce');
    }

    // Check nonce expiry
    const nonceAge = Date.now() - storedNonce.createdAt.getTime();
    if (nonceAge > NONCE_EXPIRY_MS) {
      nonceStore.delete(nonceKey);
      throw new BadRequestException('Nonce has expired. Please request a new one.');
    }

    // Verify signature
    const message = this.createSigningMessage(normalizedAddress, dto.nonce);
    const isValidSignature = await this.verifySignature(
      message,
      dto.signature,
      normalizedAddress,
    );

    if (!isValidSignature) {
      throw new BadRequestException('Invalid signature. Please try again.');
    }

    // Delete used nonce
    nonceStore.delete(nonceKey);

    // Double-check wallet isn't linked (race condition protection)
    const existingWallet = await this.prisma.userWallet.findUnique({
      where: { walletAddress: normalizedAddress },
    });

    if (existingWallet) {
      throw new ConflictException('This wallet was just linked to another account');
    }

    // Check wallet count again (race condition protection)
    const walletCount = await this.prisma.userWallet.count({
      where: { userId },
    });

    if (walletCount >= MAX_WALLETS_PER_USER) {
      throw new ForbiddenException(
        `You can only link up to ${MAX_WALLETS_PER_USER} wallets`,
      );
    }

    // Hash the signature for storage (security)
    const hashedSignature = crypto
      .createHash('sha256')
      .update(dto.signature)
      .digest('hex');

    // Determine if this should be primary (if first wallet)
    const isPrimary = walletCount === 0;

    // Create wallet link
    const wallet = await this.prisma.userWallet.create({
      data: {
        userId,
        walletAddress: normalizedAddress,
        label: dto.label || null,
        isPrimary,
        verifiedAt: new Date(),
        verificationSig: hashedSignature,
        linkedIp: ipAddress || null,
        linkedDevice: userAgent ? this.parseDeviceInfo(userAgent) : null,
      },
    });

    return this.formatWalletInfo(wallet);
  }

  /**
   * Get all wallets linked to a user
   */
  async getUserWallets(userId: string): Promise<WalletInfo[]> {
    const wallets = await this.prisma.userWallet.findMany({
      where: { userId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });

    return wallets.map((w) => this.formatWalletInfo(w));
  }

  /**
   * Set a wallet as primary
   */
  async setPrimaryWallet(userId: string, walletId: string): Promise<WalletInfo> {
    // Verify wallet belongs to user
    const wallet = await this.prisma.userWallet.findFirst({
      where: { id: walletId, userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (wallet.isPrimary) {
      return this.formatWalletInfo(wallet);
    }

    // Use transaction to ensure atomicity
    const updatedWallet = await this.prisma.$transaction(async (tx) => {
      // Remove primary from all other wallets
      await tx.userWallet.updateMany({
        where: { userId, isPrimary: true },
        data: { isPrimary: false },
      });

      // Set new primary
      return tx.userWallet.update({
        where: { id: walletId },
        data: { isPrimary: true },
      });
    });

    return this.formatWalletInfo(updatedWallet);
  }

  /**
   * Update wallet label
   */
  async updateWalletLabel(
    userId: string,
    walletId: string,
    label: string,
  ): Promise<WalletInfo> {
    const wallet = await this.prisma.userWallet.findFirst({
      where: { id: walletId, userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Sanitize label
    const sanitizedLabel = label.trim().slice(0, 50);

    const updatedWallet = await this.prisma.userWallet.update({
      where: { id: walletId },
      data: { label: sanitizedLabel },
    });

    return this.formatWalletInfo(updatedWallet);
  }

  /**
   * Remove a wallet from user's account
   */
  async removeWallet(
    userId: string,
    walletId: string,
    requireSignature: boolean = false,
    signature?: string,
  ): Promise<{ success: boolean; message: string }> {
    const wallet = await this.prisma.userWallet.findFirst({
      where: { id: walletId, userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Get user info to check if this is their only auth method
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        authProvider: true,
        walletAddress: true,
        email: true,
        passwordHash: true,
        oauthAccounts: { select: { id: true } },
        wallets: { select: { id: true } },
      },
    });

    // Check if user has alternative auth methods
    const hasEmailAuth = user?.email && user?.passwordHash;
    const hasOAuth = (user?.oauthAccounts?.length || 0) > 0;
    const walletCount = user?.wallets?.length || 0;

    // If wallet auth is primary and no other auth, and only one wallet left, prevent removal
    if (
      user?.authProvider === 'WALLET' &&
      !hasEmailAuth &&
      !hasOAuth &&
      walletCount === 1
    ) {
      throw new ForbiddenException(
        'Cannot remove your last wallet. Add an email/password or link another authentication method first.',
      );
    }

    // If primary wallet and others exist, reassign primary
    if (wallet.isPrimary && walletCount > 1) {
      // Find another wallet to make primary
      const nextWallet = await this.prisma.userWallet.findFirst({
        where: { userId, id: { not: walletId } },
        orderBy: { createdAt: 'asc' },
      });

      if (nextWallet) {
        await this.prisma.userWallet.update({
          where: { id: nextWallet.id },
          data: { isPrimary: true },
        });
      }
    }

    // Delete the wallet
    await this.prisma.userWallet.delete({
      where: { id: walletId },
    });

    return {
      success: true,
      message: 'Wallet has been unlinked from your account',
    };
  }

  /**
   * Update last used timestamp when wallet is used for auth
   */
  async updateWalletLastUsed(walletAddress: string): Promise<void> {
    const normalizedAddress = walletAddress.toLowerCase();

    await this.prisma.userWallet.updateMany({
      where: { walletAddress: normalizedAddress },
      data: { lastUsedAt: new Date() },
    });
  }

  /**
   * Check if a wallet can be connected (switch to) for this user
   */
  async canSwitchToWallet(
    userId: string,
    walletAddress: string,
  ): Promise<{ canSwitch: boolean; reason?: string }> {
    const normalizedAddress = walletAddress.toLowerCase();

    const wallet = await this.prisma.userWallet.findFirst({
      where: { userId, walletAddress: normalizedAddress },
    });

    if (!wallet) {
      // Check if wallet is linked to another account
      const otherWallet = await this.prisma.userWallet.findUnique({
        where: { walletAddress: normalizedAddress },
      });

      if (otherWallet) {
        return {
          canSwitch: false,
          reason: 'This wallet is linked to a different account',
        };
      }

      return {
        canSwitch: false,
        reason: 'This wallet is not linked to your account',
      };
    }

    return { canSwitch: true };
  }

  /**
   * Get remaining wallet slots for user
   */
  async getRemainingSlots(userId: string): Promise<number> {
    const count = await this.prisma.userWallet.count({
      where: { userId },
    });
    return Math.max(0, MAX_WALLETS_PER_USER - count);
  }

  /**
   * Check if a wallet address is available (not linked to any account)
   * This is a public endpoint - no authentication required
   */
  async checkWalletAvailability(
    walletAddress: string,
    currentUserId?: string,
  ): Promise<{
    available: boolean;
    linkedToCurrentUser: boolean;
    message?: string;
  }> {
    // Validate wallet address format
    if (!ethers.isAddress(walletAddress)) {
      throw new BadRequestException('Invalid wallet address format');
    }

    const normalizedAddress = walletAddress.toLowerCase();

    // Check if wallet is linked to any account
    const existingWallet = await this.prisma.userWallet.findUnique({
      where: { walletAddress: normalizedAddress },
      select: {
        userId: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!existingWallet) {
      return {
        available: true,
        linkedToCurrentUser: false,
      };
    }

    // Wallet is linked to someone
    const isLinkedToCurrentUser = currentUserId
      ? existingWallet.userId === currentUserId
      : false;

    if (isLinkedToCurrentUser) {
      return {
        available: false,
        linkedToCurrentUser: true,
        message: 'This wallet is already linked to your account',
      };
    }

    // Mask the email for privacy
    const email = existingWallet.user?.email;
    const maskedEmail = email
      ? `${email.substring(0, 2)}***@${email.split('@')[1]}`
      : undefined;

    return {
      available: false,
      linkedToCurrentUser: false,
      message: maskedEmail
        ? `This wallet is already linked to another account (${maskedEmail})`
        : 'This wallet is already linked to another account',
    };
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  private createSigningMessage(walletAddress: string, nonce: string): string {
    return `Sign this message to link your wallet to your HBCT account.\n\nWallet: ${walletAddress}\nNonce: ${nonce}\n\nThis signature will only be used to verify wallet ownership.`;
  }

  private async verifySignature(
    message: string,
    signature: string,
    expectedAddress: string,
  ): Promise<boolean> {
    const sigHex = signature as `0x${string}`;
    const normalizedAddress = expectedAddress.toLowerCase() as `0x${string}`;

    // Try standard personal_sign verification first
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      if (recoveredAddress.toLowerCase() === expectedAddress.toLowerCase()) {
        return true;
      }
    } catch {
      // Continue to EIP-712 fallback
    }

    // Try EIP-712 typed data verification (for WalletConnect and other wallets)
    try {
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

      const recoveredAddress = await recoverTypedDataAddress({
        domain,
        types,
        primaryType: 'Message',
        message: { content: message },
        signature: sigHex,
      });

      if (isAddressEqual(getAddress(recoveredAddress), getAddress(normalizedAddress))) {
        return true;
      }

      // Try other chain IDs
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
            return true;
          }
        } catch {
          // Continue trying
        }
      }
    } catch {
      // EIP-712 verification failed
    }

    return false;
  }

  private parseDeviceInfo(userAgent: string): string {
    // Simple device info extraction
    const info: string[] = [];

    if (userAgent.includes('Mobile')) info.push('Mobile');
    else if (userAgent.includes('Tablet')) info.push('Tablet');
    else info.push('Desktop');

    if (userAgent.includes('Chrome')) info.push('Chrome');
    else if (userAgent.includes('Firefox')) info.push('Firefox');
    else if (userAgent.includes('Safari')) info.push('Safari');
    else if (userAgent.includes('Edge')) info.push('Edge');

    if (userAgent.includes('Windows')) info.push('Windows');
    else if (userAgent.includes('Mac')) info.push('macOS');
    else if (userAgent.includes('Linux')) info.push('Linux');
    else if (userAgent.includes('Android')) info.push('Android');
    else if (userAgent.includes('iOS') || userAgent.includes('iPhone')) info.push('iOS');

    return info.join(' / ') || 'Unknown';
  }

  private formatWalletInfo(wallet: any): WalletInfo {
    return {
      id: wallet.id,
      walletAddress: wallet.walletAddress,
      label: wallet.label,
      isPrimary: wallet.isPrimary,
      verifiedAt: wallet.verifiedAt,
      lastUsedAt: wallet.lastUsedAt,
      createdAt: wallet.createdAt,
    };
  }

  private cleanupExpiredNonces(): void {
    const now = Date.now();
    for (const [key, value] of nonceStore.entries()) {
      if (now - value.createdAt.getTime() > NONCE_EXPIRY_MS) {
        nonceStore.delete(key);
      }
    }
  }
}
