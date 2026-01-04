"use client";

import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
  Lock,
  Unlock,
  Gift,
  Users,
  RefreshCcw,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronRight,
  ExternalLink,
  Shield,
} from "lucide-react";
import type { WalletTransaction, WalletTransactionType, WalletTransactionStatus } from "@/types/api";
import { getTimeAgo } from "@/lib/utils/format";
import { CurrencyIcon } from "./CurrencyIcon";

interface TransactionListProps {
  transactions: WalletTransaction[];
  onTransactionClick?: (transaction: WalletTransaction) => void;
  compact?: boolean;
  explorerBaseUrl?: string;
  showPendingActions?: boolean;
}

const typeConfig: Record<WalletTransactionType, {
  label: string;
  icon: typeof ArrowUpRight;
  isIncoming: boolean;
  iconBg: string;
  iconColor: string;
}> = {
  DEPOSIT: {
    label: "Deposit",
    icon: ArrowDownLeft,
    isIncoming: true,
    iconBg: "bg-emerald-100 dark:bg-emerald-500/20",
    iconColor: "text-emerald-600 dark:text-emerald-400"
  },
  WITHDRAWAL: {
    label: "Withdrawal",
    icon: ArrowUpRight,
    isIncoming: false,
    iconBg: "bg-red-100 dark:bg-red-500/20",
    iconColor: "text-red-600 dark:text-red-400"
  },
  INTERNAL_TRANSFER_SEND: {
    label: "Sent",
    icon: ArrowUpRight,
    isIncoming: false,
    iconBg: "bg-gray-100 dark:bg-gray-800",
    iconColor: "text-gray-600 dark:text-gray-400"
  },
  INTERNAL_TRANSFER_RECEIVE: {
    label: "Received",
    icon: ArrowDownLeft,
    isIncoming: true,
    iconBg: "bg-emerald-100 dark:bg-emerald-500/20",
    iconColor: "text-emerald-600 dark:text-emerald-400"
  },
  TOKEN_PURCHASE: {
    label: "Purchase",
    icon: Coins,
    isIncoming: true,
    iconBg: "bg-brand-100 dark:bg-brand-500/20",
    iconColor: "text-brand-600 dark:text-brand-400"
  },
  TOKEN_SALE: {
    label: "Sale",
    icon: Coins,
    isIncoming: false,
    iconBg: "bg-purple-100 dark:bg-purple-500/20",
    iconColor: "text-purple-600 dark:text-purple-400"
  },
  LOCK: {
    label: "Locked",
    icon: Lock,
    isIncoming: false,
    iconBg: "bg-amber-100 dark:bg-amber-500/20",
    iconColor: "text-amber-600 dark:text-amber-400"
  },
  UNLOCK: {
    label: "Unlocked",
    icon: Unlock,
    isIncoming: true,
    iconBg: "bg-emerald-100 dark:bg-emerald-500/20",
    iconColor: "text-emerald-600 dark:text-emerald-400"
  },
  REWARD: {
    label: "Reward",
    icon: Gift,
    isIncoming: true,
    iconBg: "bg-pink-100 dark:bg-pink-500/20",
    iconColor: "text-pink-600 dark:text-pink-400"
  },
  AIRDROP: {
    label: "Airdrop",
    icon: Gift,
    isIncoming: true,
    iconBg: "bg-cyan-100 dark:bg-cyan-500/20",
    iconColor: "text-cyan-600 dark:text-cyan-400"
  },
  AFFILIATE_COMMISSION: {
    label: "Commission",
    icon: Users,
    isIncoming: true,
    iconBg: "bg-blue-100 dark:bg-blue-500/20",
    iconColor: "text-blue-600 dark:text-blue-400"
  },
  FEE: {
    label: "Fee",
    icon: Coins,
    isIncoming: false,
    iconBg: "bg-gray-100 dark:bg-gray-800",
    iconColor: "text-gray-600 dark:text-gray-400"
  },
  REFUND: {
    label: "Refund",
    icon: RefreshCcw,
    isIncoming: true,
    iconBg: "bg-emerald-100 dark:bg-emerald-500/20",
    iconColor: "text-emerald-600 dark:text-emerald-400"
  },
};

const statusConfig: Record<WalletTransactionStatus, {
  label: string;
  icon: typeof CheckCircle2;
  bgClass: string;
  textClass: string;
}> = {
  PENDING: { label: "Pending", icon: Clock, bgClass: "bg-amber-100 dark:bg-amber-500/20", textClass: "text-amber-600 dark:text-amber-400" },
  PROCESSING: { label: "Processing", icon: Clock, bgClass: "bg-blue-100 dark:bg-blue-500/20", textClass: "text-blue-600 dark:text-blue-400" },
  COMPLETED: { label: "Completed", icon: CheckCircle2, bgClass: "bg-emerald-100 dark:bg-emerald-500/20", textClass: "text-emerald-600 dark:text-emerald-400" },
  FAILED: { label: "Failed", icon: XCircle, bgClass: "bg-red-100 dark:bg-red-500/20", textClass: "text-red-600 dark:text-red-400" },
  CANCELLED: { label: "Cancelled", icon: XCircle, bgClass: "bg-gray-100 dark:bg-gray-500/20", textClass: "text-gray-600 dark:text-gray-400" },
  EXPIRED: { label: "Expired", icon: AlertCircle, bgClass: "bg-gray-100 dark:bg-gray-500/20", textClass: "text-gray-600 dark:text-gray-400" },
};


export function TransactionList({
  transactions,
  onTransactionClick,
  compact = false,
  explorerBaseUrl = "https://testnet.bscscan.com", // Default to testnet, change to bscscan.com for mainnet
  showPendingActions = true,
}: TransactionListProps) {
  const router = useRouter();

  // Check if a transaction is a pending transfer that can be confirmed
  const isPendingTransfer = (tx: WalletTransaction) => {
    return tx.status === "PENDING" && tx.type === "INTERNAL_TRANSFER_SEND";
  };

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <Clock className="h-8 w-8 text-gray-400 dark:text-gray-500" />
        </div>
        <p className="text-gray-900 dark:text-white font-medium mb-1">No transactions yet</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Your HBCT transaction history will appear here
        </p>
      </div>
    );
  }

  // Get txHash from transaction - check both txHash field and metadata
  const getTxHash = (tx: WalletTransaction): string | undefined => {
    return tx.txHash || tx.metadata?.txHash;
  };

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800/50">
      {transactions.map((tx) => {
        const typeInfo = typeConfig[tx.type];
        const statusInfo = statusConfig[tx.status];
        const Icon = typeInfo.icon;
        const StatusIcon = statusInfo.icon;
        const txHash = getTxHash(tx);

        return (
          <div
            key={tx.id}
            onClick={() => onTransactionClick?.(tx)}
            className={cn(
              "flex items-center gap-4 p-4 transition-all group",
              onTransactionClick && "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
            )}
          >
            {/* Icon */}
            <div className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
              typeInfo.iconBg
            )}>
              <Icon className={cn("h-5 w-5", typeInfo.iconColor)} />
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {typeInfo.label}
                  </p>
                  <CurrencyIcon size="xs" />
                </div>
                <span className={cn(
                  "text-sm font-semibold tabular-nums",
                  typeInfo.isIncoming ? "text-emerald-600 dark:text-emerald-400" : "text-gray-900 dark:text-white"
                )}>
                  {typeInfo.isIncoming ? "+" : "-"}{parseFloat(tx.amount).toLocaleString(undefined, { maximumFractionDigits: 4 })} HBCT
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {getTimeAgo(tx.createdAt)}
                </span>
                {!compact && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
                      statusInfo.bgClass,
                      statusInfo.textClass
                    )}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {statusInfo.label}
                  </span>
                )}
              </div>
              {!compact && tx.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 truncate">
                  {tx.description}
                </p>
              )}
              {/* Note from sender */}
              {!compact && tx.metadata?.note && (
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 italic truncate" title={tx.metadata.note}>
                  &quot;{tx.metadata.note}&quot;
                </p>
              )}
              {/* Transaction Hash Link */}
              {!compact && txHash && (
                <a
                  href={`${explorerBaseUrl}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-xs font-mono text-brand-600 dark:text-brand-400"
                >
                  <ExternalLink className="h-3 w-3" />
                  {txHash.slice(0, 8)}...{txHash.slice(-6)}
                </a>
              )}

              {/* Pending Transfer Action Button */}
              {!compact && showPendingActions && isPendingTransfer(tx) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push('/wallet/transfers');
                  }}
                  className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium transition-colors shadow-sm"
                >
                  <Shield className="h-3.5 w-3.5" />
                  Confirm Transfer
                </button>
              )}
            </div>

            {/* Chevron for clickable items */}
            {onTransactionClick && !isPendingTransfer(tx) && (
              <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}
