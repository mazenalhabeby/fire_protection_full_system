import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Capitalizes the first letter of each word in a string
 * Example: "john doe" -> "John Doe"
 */
export function capitalize(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Formats a full name from firstName and lastName with proper capitalization
 */
export function formatName(firstName?: string | null, lastName?: string | null): string {
  const parts = [firstName, lastName].filter(Boolean);
  return parts.map(part => capitalize(part)).join(' ');
}

/**
 * Formats a number for display with appropriate decimal places
 * - Shows up to 2 decimal places for numbers < 1000
 * - Shows no decimals for large numbers
 * - Adds thousand separators
 */
export function formatNumber(
  value: string | number | null | undefined,
  options: { decimals?: number; compact?: boolean } = {}
): string {
  if (value === null || value === undefined || value === '') return '0';

  let num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';

  // Handle -0 and very small numbers close to zero (floating point precision issues)
  if (Math.abs(num) < 0.000001) {
    num = 0;
  }

  const { decimals = 2, compact = false } = options;

  // Compact format for large numbers (1K, 1M, etc.)
  if (compact && Math.abs(num) >= 1000) {
    const formatter = new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    });
    return formatter.format(num);
  }

  // Standard format with thousand separators
  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });

  return formatter.format(num);
}

/**
 * Formats a token balance for display
 * - Very large numbers (1B+): compact format (11.6T, 5.2B, 100M)
 * - Large numbers (1M+): compact or full with separators
 * - Normal numbers: up to 2 decimals with thousand separators
 * - Small numbers (<0.01): up to 6 decimals
 */
export function formatTokenBalance(
  value: string | number | null | undefined,
  options: { compact?: boolean; maxDecimals?: number } = {}
): string {
  if (value === null || value === undefined || value === '') return '0';

  let num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';

  // Handle -0 and very small numbers close to zero (floating point precision issues)
  if (Math.abs(num) < 0.000001) {
    num = 0;
  }

  // For zero, just return "0"
  if (num === 0) return '0';

  const { compact = true, maxDecimals = 2 } = options;

  // For very small numbers, show more decimals
  if (Math.abs(num) < 0.01 && num !== 0) {
    return num.toFixed(6).replace(/\.?0+$/, '');
  }

  // For very large numbers (1 billion+), use compact notation
  if (compact && Math.abs(num) >= 1_000_000_000) {
    const formatter = new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 2,
    });
    return formatter.format(num);
  }

  // For large numbers (1 million+), use compact notation
  if (compact && Math.abs(num) >= 1_000_000) {
    const formatter = new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 2,
    });
    return formatter.format(num);
  }

  // For normal numbers, show up to 2 decimals with thousand separators
  return formatNumber(num, { decimals: maxDecimals });
}
