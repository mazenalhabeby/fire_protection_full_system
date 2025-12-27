import { Decimal } from '@prisma/client/runtime/library';

// Re-export pagination utilities
export * from './pagination';

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
export function getClientIp(req: { headers: Record<string, any>; socket?: { remoteAddress?: string }; ip?: string }): string {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0];
    return ips.trim();
  }
  return req.socket?.remoteAddress || req.ip || 'unknown';
}

/**
 * Generates a random alphanumeric code
 */
export function generateCode(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
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
