import { UnauthorizedException, ForbiddenException } from '@nestjs/common';

/**
 * User status checking utility
 * Centralizes all user status validation logic
 */

export interface UserStatusFields {
  isActive?: boolean;
  isBanned?: boolean;
  banReason?: string | null;
  lockedUntil?: Date | null;
}

export interface UserStatusCheckOptions {
  /** Skip inactive check */
  allowInactive?: boolean;
  /** Skip banned check */
  allowBanned?: boolean;
  /** Skip locked check */
  allowLocked?: boolean;
  /** Custom error messages */
  messages?: {
    inactive?: string;
    banned?: string;
    locked?: string;
  };
}

export interface UserStatusResult {
  isValid: boolean;
  reason?: 'inactive' | 'banned' | 'locked';
  message?: string;
  remainingLockMinutes?: number;
}

const DEFAULT_MESSAGES = {
  inactive: 'Account is deactivated. Please contact support.',
  banned: 'Your account has been suspended. Please contact support for assistance.',
  locked: 'Account is temporarily locked due to too many failed attempts.',
};

/**
 * Check if user status is valid for authentication/operations
 * @returns UserStatusResult with validation details
 */
export function checkUserStatus(
  user: UserStatusFields,
  options: UserStatusCheckOptions = {},
): UserStatusResult {
  const messages = { ...DEFAULT_MESSAGES, ...options.messages };

  // Check if account is active
  if (!options.allowInactive && user.isActive === false) {
    return {
      isValid: false,
      reason: 'inactive',
      message: messages.inactive,
    };
  }

  // Check if user is banned
  if (!options.allowBanned && user.isBanned === true) {
    return {
      isValid: false,
      reason: 'banned',
      message: messages.banned,
    };
  }

  // Check if account is locked
  if (!options.allowLocked && user.lockedUntil) {
    const now = new Date();
    if (now < user.lockedUntil) {
      const remainingMinutes = Math.ceil(
        (user.lockedUntil.getTime() - now.getTime()) / (1000 * 60),
      );
      return {
        isValid: false,
        reason: 'locked',
        message: `${messages.locked} Please try again in ${remainingMinutes} minute(s).`,
        remainingLockMinutes: remainingMinutes,
      };
    }
  }

  return { isValid: true };
}

/**
 * Validate user status and throw appropriate exception if invalid
 * @throws UnauthorizedException if user status is invalid
 */
export function validateUserStatus(
  user: UserStatusFields,
  options: UserStatusCheckOptions = {},
): void {
  const result = checkUserStatus(user, options);

  if (!result.isValid) {
    throw new UnauthorizedException(result.message);
  }
}

/**
 * Validate user status for admin operations
 * Uses ForbiddenException instead of UnauthorizedException
 */
export function validateUserStatusForAdmin(
  user: UserStatusFields,
  options: UserStatusCheckOptions = {},
): void {
  const result = checkUserStatus(user, options);

  if (!result.isValid) {
    throw new ForbiddenException(result.message);
  }
}

/**
 * Check if user account is currently locked
 */
export function isAccountLocked(user: UserStatusFields): boolean {
  if (!user.lockedUntil) return false;
  return new Date() < user.lockedUntil;
}

/**
 * Get remaining lock time in minutes
 * @returns number of minutes remaining, or 0 if not locked
 */
export function getRemainingLockMinutes(user: UserStatusFields): number {
  if (!user.lockedUntil) return 0;
  const remaining = user.lockedUntil.getTime() - Date.now();
  return remaining > 0 ? Math.ceil(remaining / (1000 * 60)) : 0;
}

/**
 * Check if user can perform sensitive operations
 * More strict than basic auth - requires verified email
 */
export function canPerformSensitiveOperations(
  user: UserStatusFields & { isEmailVerified?: boolean },
): UserStatusResult {
  const basicCheck = checkUserStatus(user);
  if (!basicCheck.isValid) return basicCheck;

  if (user.isEmailVerified === false) {
    return {
      isValid: false,
      reason: 'inactive',
      message: 'Please verify your email address to perform this operation.',
    };
  }

  return { isValid: true };
}
