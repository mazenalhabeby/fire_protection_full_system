/**
 * Formatting Utility Functions
 */

/**
 * Formats a date to relative time (e.g., "2h ago", "3d ago")
 */
export const getTimeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

/**
 * Formats a number with locale string
 */
export const formatNumber = (value: string | number): string => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return num.toLocaleString();
};

/**
 * Formats currency with $ symbol
 */
export const formatCurrency = (value: string | number): string => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return `$${num.toLocaleString()}`;
};

/**
 * Formats wallet address with ellipsis
 */
export function formatWalletAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Formats any address (wallet, tx hash) with ellipsis - alias for formatWalletAddress
 */
export const formatAddress = formatWalletAddress;

/**
 * Formats token amount with proper decimal places
 */
export function formatAmount(amount: string | number, options: {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
} = {}): string {
  const { minimumFractionDigits = 2, maximumFractionDigits = 6 } = options;
  const num = typeof amount === "string" ? parseFloat(amount) : amount;

  if (isNaN(num)) return "0";
  if (num === 0) return "0.00";
  if (num < 0.0001) return "<0.0001";

  return num.toLocaleString("en-US", {
    minimumFractionDigits,
    maximumFractionDigits,
  });
}

/**
 * Formats token balance (handles edge cases)
 */
export function formatTokenBalance(balance: string | number): string {
  return formatAmount(balance);
}

/**
 * Formats a date to locale string
 */
export function formatDate(
  dateString: string | Date,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  }
): string {
  if (!dateString) return "";
  const date = typeof dateString === "string" ? new Date(dateString) : dateString;
  return date.toLocaleDateString("en-US", options);
}

/**
 * Formats a date to locale date and time
 */
export function formatDateTime(
  dateString: string | Date,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }
): string {
  if (!dateString) return "";
  const date = typeof dateString === "string" ? new Date(dateString) : dateString;
  return date.toLocaleString("en-US", options);
}

/**
 * Formats a date to a more readable relative time
 */
export function getTimeAgoLong(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffDays > 30) {
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`;
  } else if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
  } else {
    return "Just now";
  }
}

/**
 * Formats a percentage value
 */
export function formatPercent(value: string | number, decimals = 1): string {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(numValue)) return "0%";
  return `${numValue.toFixed(decimals)}%`;
}
