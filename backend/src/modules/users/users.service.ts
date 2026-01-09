import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto, UserChangePasswordDto, UpdateUsernameDto } from './dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          walletAddress: true,
          legacyRole: true,
          isEmailVerified: true,
          authProvider: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        profileImageUrl: true,
        walletAddress: true,
        legacyRole: true,
        isEmailVerified: true,
        authProvider: true,
        passwordHash: true,
        createdAt: true,
        updatedAt: true,
        tokenBalance: {
          select: {
            availableBalance: true,
            lockedBalance: true,
            totalBalance: true,
          },
        },
        twoFactorAuth: {
          select: { isEnabled: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
      walletAddress: user.walletAddress,
      role: user.legacyRole,
      isEmailVerified: user.isEmailVerified,
      authProvider: user.authProvider?.toUpperCase() || 'CREDENTIALS',
      hasPassword: !!user.passwordHash,
      twoFactorEnabled: user.twoFactorAuth?.isEnabled ?? false,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      tokenBalance: user.tokenBalance,
    };
  }

  async getProfile(userId: string) {
    return this.findOne(userId);
  }

  async updateProfile(userId: string, updateUserDto: UpdateUserDto) {
    // Get current user to check for changes
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    // Check if email is being updated and if it's already taken
    if (updateUserDto.email && updateUserDto.email !== currentUser.email) {
      const normalizedEmail = updateUserDto.email.toLowerCase().trim();
      const existingEmail = await this.prisma.user.findFirst({
        where: {
          email: normalizedEmail,
          NOT: { id: userId },
        },
      });

      if (existingEmail) {
        throw new ConflictException('Email address already in use');
      }

      // Update email and reset verification status
      updateUserDto.email = normalizedEmail;
    }

    // Check if wallet address is being updated and if it's already taken
    if (updateUserDto.walletAddress) {
      const existingWallet = await this.prisma.user.findFirst({
        where: {
          walletAddress: updateUserDto.walletAddress,
          NOT: { id: userId },
        },
      });

      if (existingWallet) {
        throw new ConflictException('Wallet address already in use');
      }
    }

    // Prepare update data
    const updateData: any = { ...updateUserDto };

    // If email is being changed, reset verification
    if (updateUserDto.email && updateUserDto.email !== currentUser.email) {
      updateData.isEmailVerified = false;
      updateData.emailVerifiedAt = null;
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        profileImageUrl: true,
        walletAddress: true,
        legacyRole: true,
        isEmailVerified: true,
        authProvider: true,
        passwordHash: true,
        createdAt: true,
        twoFactorAuth: {
          select: { isEnabled: true },
        },
      },
    });

    // Transform to match frontend User type
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      profileImageUrl: user.profileImageUrl,
      walletAddress: user.walletAddress,
      role: user.legacyRole,
      isEmailVerified: user.isEmailVerified,
      authProvider: user.authProvider?.toUpperCase() || 'CREDENTIALS',
      hasPassword: !!user.passwordHash,
      twoFactorEnabled: user.twoFactorAuth?.isEnabled ?? false,
      createdAt: user.createdAt,
    };
  }

  async changePassword(userId: string, changePasswordDto: UserChangePasswordDto) {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.passwordHash) {
      throw new BadRequestException('Cannot change password for wallet-only accounts');
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 13);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    return { message: 'Password changed successfully' };
  }

  // ============================================
  // USERNAME MANAGEMENT
  // ============================================

  async checkUsernameAvailability(username: string, excludeUserId?: string) {
    const normalizedUsername = username.toLowerCase().trim();

    // Check for reserved usernames
    const reservedUsernames = ['admin', 'support', 'help', 'system', 'hbct', 'moderator', 'mod'];
    if (reservedUsernames.includes(normalizedUsername)) {
      return { available: false, reason: 'This username is reserved' };
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        username: normalizedUsername,
        ...(excludeUserId && { NOT: { id: excludeUserId } }),
      },
    });

    return {
      available: !existingUser,
      reason: existingUser ? 'Username is already taken' : null,
    };
  }

  async updateUsername(userId: string, updateUsernameDto: UpdateUsernameDto) {
    const normalizedUsername = updateUsernameDto.username.toLowerCase().trim();

    // Check availability
    const availability = await this.checkUsernameAvailability(normalizedUsername, userId);
    if (!availability.available) {
      throw new ConflictException(availability.reason || 'Username is not available');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { username: normalizedUsername },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        walletAddress: true,
        legacyRole: true,
        isEmailVerified: true,
        authProvider: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async findByUsername(username: string) {
    const normalizedUsername = username.toLowerCase().trim();

    const user = await this.prisma.user.findFirst({
      where: { username: normalizedUsername },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
      },
    });

    return user;
  }

  async findByUserId(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
      },
    });

    return user;
  }

  // ============================================
  // PROFILE IMAGE MANAGEMENT
  // ============================================

  async updateProfileImage(userId: string, profileImageUrl: string | null) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { profileImageUrl },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        profileImageUrl: true,
        walletAddress: true,
        legacyRole: true,
        isEmailVerified: true,
        authProvider: true,
        passwordHash: true,
        createdAt: true,
        twoFactorAuth: {
          select: { isEnabled: true },
        },
      },
    });

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      profileImageUrl: user.profileImageUrl,
      walletAddress: user.walletAddress,
      role: user.legacyRole,
      isEmailVerified: user.isEmailVerified,
      authProvider: user.authProvider?.toUpperCase() || 'CREDENTIALS',
      hasPassword: !!user.passwordHash,
      twoFactorEnabled: user.twoFactorAuth?.isEnabled ?? false,
      createdAt: user.createdAt,
    };
  }
}
