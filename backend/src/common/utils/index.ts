import { Decimal } from '@prisma/client/runtime/library';
import * as crypto from 'crypto';

// Re-export pagination utilities
export * from './pagination';

// Re-export transform utilities
export * from './transforms';

/**
 * Safely converts a Decimal or string to a number
 */
export function toNumber(value: Decimal | string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  return parseFloat(value.toString());
}

/**
 * Safely converts a value to a string with fixed decimal places
 */
export function toFixedString(value: Decimal | string | number | null | undefined, decimals: number = 2): string {
  return toNumber(value).toFixed(decimals);
}

/**
 * Formats a number as currency string
 */
export function formatCurrency(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * Calculates pagination metadata
 */
export function calculatePagination(total: number, page: number, limit: number) {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Creates a Prisma skip/take object from page and limit
 */
export function getPrismaPage(page: number = 1, limit: number = 10) {
  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}

/**
 * Safely gets client IP from request
 */
export function getClientIp(req?: { headers: Record<string, any>; socket?: { remoteAddress?: string }; ip?: string } | null): string {
  if (!req) return 'unknown';
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0];
    return ips.trim();
  }
  return req.socket?.remoteAddress || req.ip || 'unknown';
}

/**
 * Safely gets user agent from request
 */
export function getUserAgent(req?: { headers: Record<string, any> } | null): string | null {
  if (!req) return null;
  return (req.headers['user-agent'] as string) || null;
}

/**
 * Generates a cryptographically secure random alphanumeric code
 * Uses crypto.randomBytes() instead of Math.random() for security
 */
export function generateCode(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(bytes[i] % chars.length);
  }
  return result;
}

/**
 * Normalizes wallet address to lowercase
 */
export function normalizeAddress(address: string): string {
  return address.toLowerCase().trim();
}

/**
 * Normalizes email to lowercase and trims
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}
