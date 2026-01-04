/**
 * Format utilities for consistent data display across the admin panel
 */

/**
 * Format a wallet/transaction address with truncation
 */
export function formatAddress(address: string, prefixLength = 6, suffixLength = 4): string {
  if (!address) return '';
  if (address.length <= prefixLength + suffixLength) return address;
  return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`;
}

/**
 * Format a number as currency with locale formatting
 */
export function formatCurrency(
  value: string | number,
  options: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    currency?: string;
  } = {}
): string {
  const { minimumFractionDigits = 2, maximumFractionDigits = 6 } = options;
  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) return '0';

  return numValue.toLocaleString('en-US', {
    minimumFractionDigits,
    maximumFractionDigits,
  });
}

/**
 * Format a number with compact notation for large values
 */
export function formatCompact(value: string | number): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) return '0';

  if (numValue >= 1_000_000) {
    return `${(numValue / 1_000_000).toFixed(2)}M`;
  }
  if (numValue >= 1_000) {
    return `${(numValue / 1_000).toFixed(2)}K`;
  }
  return numValue.toFixed(2);
}

/**
 * Format a date string to locale date
 */
export function formatDate(
  dateString: string | Date,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }
): string {
  if (!dateString) return '';
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleDateString('en-US', options);
}

/**
 * Format a date string to locale date and time
 */
export function formatDateTime(
  dateString: string | Date,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
): string {
  if (!dateString) return '';
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleString('en-US', options);
}

/**
 * Format a percentage value
 */
export function formatPercent(value: string | number, decimals = 1): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return '0%';
  return `${numValue.toFixed(decimals)}%`;
}

/**
 * Format a user's display name from first/last name or email
 */
export function formatUserName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  email?: string | null
): string {
  if (firstName || lastName) {
    return [firstName, lastName].filter(Boolean).join(' ');
  }
  if (email) {
    return email.split('@')[0];
  }
  return 'Unknown';
}

/**
 * Get relative time string (e.g., "2 hours ago")
 */
export function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return formatDate(dateString);
}
