"use client";

import React, { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  LucideIcon,
} from "lucide-react";
import { cn, formatTokenBalance } from "@/lib/utils";
import { getTimeAgo } from "@/lib/utils/format";
import type { Transaction, TransactionType } from "@/types/api";

export interface TransactionItemProps {
  transaction: Transaction;
  onClick?: (transaction: Transaction) => void;
}

// Transaction types that represent incoming/received funds
const INCOMING_TYPES: TransactionType[] = [
  "REWARD_DISTRIBUTION",
  "AFFILIATE_BONUS",
  "AIRDROP",
  "BUY_WEBSITE",
  "FEE_CASHBACK",
  "MARKETPLACE_REFUND",
  "UNLOCK",
  "TRANSFER_RECEIVE",
];

interface StatusConfig {
  icon: LucideIcon;
  className: string;
  bgClassName: string;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  COMPLETED: {
    icon: CheckCircle2,
    className: "text-emerald-500",
    bgClassName: "bg-emerald-500/10 text-emerald-500",
  },
  PENDING: {
    icon: Clock,
    className: "text-amber-500",
    bgClassName: "bg-amber-500/10 text-amber-500",
  },
  FAILED: {
    icon: AlertCircle,
    className: "text-red-500",
    bgClassName: "bg-red-500/10 text-red-500",
  },
  CANCELLED: {
    icon: XCircle,
    className: "text-gray-500",
    bgClassName: "bg-gray-500/10 text-gray-500",
  },
};

export const TransactionItem = React.memo(function TransactionItem({
  transaction,
  onClick,
}: TransactionItemProps) {
  const t = useTranslations("dashboard");

  const isReceived = useMemo(
    () => INCOMING_TYPES.includes(transaction.type),
    [transaction.type]
  );

  const DirectionIcon = isReceived ? ArrowDownLeft : ArrowUpRight;
  const statusConfig = STATUS_CONFIG[transaction.status] || STATUS_CONFIG.PENDING;
  const StatusIcon = statusConfig.icon;

  const formattedType = useMemo(() => {
    return t(`transactionTypes.${transaction.type}`, {
      defaultValue: transaction.type.replace(/_/g, " "),
    });
  }, [t, transaction.type]);

  const formattedStatus = useMemo(() => {
    return t(`status.${transaction.status.toLowerCase()}`, {
      defaultValue: transaction.status,
    });
  }, [t, transaction.status]);

  const timeAgo = useMemo(
    () => getTimeAgo(transaction.createdAt),
    [transaction.createdAt]
  );

  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors",
        onClick && "cursor-pointer"
      )}
      onClick={() => onClick?.(transaction)}
    >
      {/* Direction Icon */}
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
          isReceived
            ? "bg-emerald-100 dark:bg-emerald-500/20"
            : "bg-gray-100 dark:bg-gray-800"
        )}
      >
        <DirectionIcon
          className={cn(
            "h-5 w-5",
            isReceived ? "text-emerald-500" : "text-gray-500 dark:text-gray-400"
          )}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {formattedType}
          </p>
          <span
            className={cn(
              "text-sm font-semibold flex-shrink-0 ml-2",
              isReceived ? "text-emerald-500" : "text-gray-900 dark:text-white"
            )}
          >
            {isReceived ? "+" : "-"}
            {formatTokenBalance(transaction.amount)} HBCT
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {timeAgo}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0",
              statusConfig.bgClassName
            )}
          >
            <StatusIcon className="h-3 w-3" />
            {formattedStatus}
          </span>
        </div>
      </div>
    </div>
  );
});

export default TransactionItem;
