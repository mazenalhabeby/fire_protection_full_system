/**
 * Status configuration utilities for consistent styling across the admin panel
 */

export interface StatusConfig {
  label: string;
  bgClass: string;
  textClass: string;
  icon?: string;
}

/**
 * Deposit status configurations
 */
export const depositStatusConfig: Record<string, StatusConfig> = {
  PENDING: {
    label: 'Pending',
    bgClass: 'bg-amber-100 dark:bg-amber-500/20',
    textClass: 'text-amber-600 dark:text-amber-400',
  },
  CONFIRMED: {
    label: 'Confirmed',
    bgClass: 'bg-blue-100 dark:bg-blue-500/20',
    textClass: 'text-blue-600 dark:text-blue-400',
  },
  CREDITED: {
    label: 'Credited',
    bgClass: 'bg-emerald-100 dark:bg-emerald-500/20',
    textClass: 'text-emerald-600 dark:text-emerald-400',
  },
  FAILED: {
    label: 'Failed',
    bgClass: 'bg-red-100 dark:bg-red-500/20',
    textClass: 'text-red-600 dark:text-red-400',
  },
  UNMAPPED: {
    label: 'Unmapped',
    bgClass: 'bg-orange-100 dark:bg-orange-500/20',
    textClass: 'text-orange-600 dark:text-orange-400',
  },
};

/**
 * Withdrawal status configurations
 */
export const withdrawalStatusConfig: Record<string, StatusConfig> = {
  PENDING_CONFIRMATION: {
    label: 'Pending',
    bgClass: 'bg-amber-100 dark:bg-amber-500/20',
    textClass: 'text-amber-600 dark:text-amber-400',
  },
  PENDING: {
    label: 'Processing',
    bgClass: 'bg-blue-100 dark:bg-blue-500/20',
    textClass: 'text-blue-600 dark:text-blue-400',
  },
  APPROVED: {
    label: 'Approved',
    bgClass: 'bg-cyan-100 dark:bg-cyan-500/20',
    textClass: 'text-cyan-600 dark:text-cyan-400',
  },
  PROCESSING: {
    label: 'Processing',
    bgClass: 'bg-indigo-100 dark:bg-indigo-500/20',
    textClass: 'text-indigo-600 dark:text-indigo-400',
  },
  COMPLETED: {
    label: 'Completed',
    bgClass: 'bg-emerald-100 dark:bg-emerald-500/20',
    textClass: 'text-emerald-600 dark:text-emerald-400',
  },
  FAILED: {
    label: 'Failed',
    bgClass: 'bg-red-100 dark:bg-red-500/20',
    textClass: 'text-red-600 dark:text-red-400',
  },
  REJECTED: {
    label: 'Rejected',
    bgClass: 'bg-red-100 dark:bg-red-500/20',
    textClass: 'text-red-600 dark:text-red-400',
  },
  CANCELLED: {
    label: 'Cancelled',
    bgClass: 'bg-gray-100 dark:bg-gray-500/20',
    textClass: 'text-gray-600 dark:text-gray-400',
  },
  EXPIRED: {
    label: 'Expired',
    bgClass: 'bg-gray-100 dark:bg-gray-500/20',
    textClass: 'text-gray-600 dark:text-gray-400',
  },
};

/**
 * Lock status configurations
 */
export const lockStatusConfig: Record<string, StatusConfig> = {
  ACTIVE: {
    label: 'Active',
    bgClass: 'bg-blue-100 dark:bg-blue-500/20',
    textClass: 'text-blue-600 dark:text-blue-400',
  },
  COMPLETED: {
    label: 'Completed',
    bgClass: 'bg-emerald-100 dark:bg-emerald-500/20',
    textClass: 'text-emerald-600 dark:text-emerald-400',
  },
  CANCELLED: {
    label: 'Cancelled',
    bgClass: 'bg-red-100 dark:bg-red-500/20',
    textClass: 'text-red-600 dark:text-red-400',
  },
};

/**
 * Purchase/transaction status configurations
 */
export const transactionStatusConfig: Record<string, StatusConfig> = {
  PENDING: {
    label: 'Pending',
    bgClass: 'bg-amber-100 dark:bg-amber-500/20',
    textClass: 'text-amber-600 dark:text-amber-400',
  },
  COMPLETED: {
    label: 'Completed',
    bgClass: 'bg-emerald-100 dark:bg-emerald-500/20',
    textClass: 'text-emerald-600 dark:text-emerald-400',
  },
  FAILED: {
    label: 'Failed',
    bgClass: 'bg-red-100 dark:bg-red-500/20',
    textClass: 'text-red-600 dark:text-red-400',
  },
  CANCELLED: {
    label: 'Cancelled',
    bgClass: 'bg-gray-100 dark:bg-gray-500/20',
    textClass: 'text-gray-600 dark:text-gray-400',
  },
  EXPIRED: {
    label: 'Expired',
    bgClass: 'bg-gray-100 dark:bg-gray-500/20',
    textClass: 'text-gray-600 dark:text-gray-400',
  },
};

/**
 * Generic status color configurations
 */
export const genericStatusConfig: Record<string, StatusConfig> = {
  success: {
    label: 'Success',
    bgClass: 'bg-emerald-100 dark:bg-emerald-500/20',
    textClass: 'text-emerald-600 dark:text-emerald-400',
  },
  warning: {
    label: 'Warning',
    bgClass: 'bg-amber-100 dark:bg-amber-500/20',
    textClass: 'text-amber-600 dark:text-amber-400',
  },
  error: {
    label: 'Error',
    bgClass: 'bg-red-100 dark:bg-red-500/20',
    textClass: 'text-red-600 dark:text-red-400',
  },
  info: {
    label: 'Info',
    bgClass: 'bg-blue-100 dark:bg-blue-500/20',
    textClass: 'text-blue-600 dark:text-blue-400',
  },
  neutral: {
    label: 'Neutral',
    bgClass: 'bg-gray-100 dark:bg-gray-500/20',
    textClass: 'text-gray-600 dark:text-gray-400',
  },
};

/**
 * Get status configuration with fallback
 */
export function getStatusConfig(
  status: string,
  configMap: Record<string, StatusConfig>
): StatusConfig {
  return (
    configMap[status] || {
      label: status,
      bgClass: 'bg-gray-100 dark:bg-gray-500/20',
      textClass: 'text-gray-600 dark:text-gray-400',
    }
  );
}
