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
  Lock,
  Unlock,
  AlertTriangle,
  Gift,
  LucideIcon,
} from "lucide-react";
import { cn, formatTokenBalance } from "@/lib/utils";
import { getTimeAgo } from "@/lib/utils/format";
import type { ActivityItem as ActivityItemType } from "@/hooks/useAppData";

export interface ActivityItemProps {
  activity: ActivityItemType;
  onClick?: (activity: ActivityItemType) => void;
}

// Actions that represent incoming/received funds
const INCOMING_ACTIONS = [
  "REWARD_DISTRIBUTION",
  "AFFILIATE_BONUS",
  "AIRDROP",
  "BUY_WEBSITE",
  "FEE_CASHBACK",
  "MARKETPLACE_REFUND",
  "UNLOCK",
  "TRANSFER_RECEIVE",
  "EARLY_UNLOCK", // Returns funds (with penalty)
  "CANCEL", // Returns locked funds
];

// Lock-specific actions with their icons and colors
const LOCK_ACTION_CONFIG: Record<string, { icon: LucideIcon; label: string; color: string; bgColor: string }> = {
  LOCK: {
    icon: Lock,
    label: "Tokens Locked",
    color: "text-purple-500",
    bgColor: "bg-purple-100 dark:bg-purple-500/20",
  },
  UNLOCK: {
    icon: Unlock,
    label: "Tokens Unlocked",
    color: "text-emerald-500",
    bgColor: "bg-emerald-100 dark:bg-emerald-500/20",
  },
  EARLY_UNLOCK: {
    icon: AlertTriangle,
    label: "Early Unlock",
    color: "text-amber-500",
    bgColor: "bg-amber-100 dark:bg-amber-500/20",
  },
  CANCEL: {
    icon: XCircle,
    label: "Lock Cancelled",
    color: "text-gray-500",
    bgColor: "bg-gray-100 dark:bg-gray-500/20",
  },
  REWARD_DISTRIBUTION: {
    icon: Gift,
    label: "Lock Reward",
    color: "text-emerald-500",
    bgColor: "bg-emerald-100 dark:bg-emerald-500/20",
  },
};

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

export const ActivityItem = React.memo(function ActivityItem({
  activity,
  onClick,
}: ActivityItemProps) {
  const t = useTranslations("dashboard");

  const isReceived = useMemo(
    () => INCOMING_ACTIONS.includes(activity.action),
    [activity.action]
  );

  const isLockActivity = activity.type === "lock";
  const lockConfig = isLockActivity ? LOCK_ACTION_CONFIG[activity.action] : null;

  // Determine icon and colors
  const IconComponent = lockConfig?.icon || (isReceived ? ArrowDownLeft : ArrowUpRight);
  const iconBgClass = lockConfig?.bgColor || (isReceived ? "bg-emerald-100 dark:bg-emerald-500/20" : "bg-gray-100 dark:bg-gray-800");
  const iconColorClass = lockConfig?.color || (isReceived ? "text-emerald-500" : "text-gray-500 dark:text-gray-400");

  const statusConfig = STATUS_CONFIG[activity.status] || STATUS_CONFIG.PENDING;
  const StatusIcon = statusConfig.icon;

  const formattedType = useMemo(() => {
    if (isLockActivity && lockConfig) {
      return lockConfig.label;
    }
    return t(`transactionTypes.${activity.action}`, {
      defaultValue: activity.action.replace(/_/g, " "),
    });
  }, [t, activity.action, isLockActivity, lockConfig]);

  const formattedStatus = useMemo(() => {
    return t(`status.${activity.status.toLowerCase()}`, {
      defaultValue: activity.status,
    });
  }, [t, activity.status]);

  const timeAgo = useMemo(
    () => getTimeAgo(activity.createdAt),
    [activity.createdAt]
  );

  // For lock activities, show tier name
  const subtitle = useMemo(() => {
    if (isLockActivity && activity.tierName) {
      return activity.tierName;
    }
    return timeAgo;
  }, [isLockActivity, activity.tierName, timeAgo]);

  // Calculate display amount (for early unlock, show net amount)
  const displayAmount = useMemo(() => {
    if (activity.action === "EARLY_UNLOCK" && activity.penaltyAmount) {
      const amount = parseFloat(activity.amount);
      const penalty = parseFloat(activity.penaltyAmount);
      return formatTokenBalance((amount - penalty).toString());
    }
    return formatTokenBalance(activity.amount);
  }, [activity.action, activity.amount, activity.penaltyAmount]);

  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors",
        onClick && "cursor-pointer"
      )}
      onClick={() => onClick?.(activity)}
    >
      {/* Icon */}
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
          iconBgClass
        )}
      >
        <IconComponent className={cn("h-5 w-5", iconColorClass)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {formattedType}
            </p>
            {isLockActivity && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex-shrink-0">
                Lock
              </span>
            )}
          </div>
          <span
            className={cn(
              "text-sm font-semibold flex-shrink-0 ml-2",
              isReceived ? "text-emerald-500" : "text-gray-900 dark:text-white"
            )}
          >
            {isReceived ? "+" : "-"}
            {displayAmount} HBCT
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {isLockActivity && activity.tierName ? (
                <>
                  <span className="text-purple-500 dark:text-purple-400 font-medium">{activity.tierName}</span>
                  <span className="mx-1">·</span>
                  {timeAgo}
                </>
              ) : (
                timeAgo
              )}
            </span>
          </div>
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
        {/* Show penalty info for early unlock */}
        {activity.action === "EARLY_UNLOCK" && activity.penaltyAmount && (
          <div className="mt-1 text-[10px] text-amber-500">
            Penalty: -{formatTokenBalance(activity.penaltyAmount)} HBCT
          </div>
        )}
        {/* Show reward info for unlock */}
        {(activity.action === "UNLOCK" || activity.action === "REWARD_DISTRIBUTION") && activity.rewardAmount && parseFloat(activity.rewardAmount) > 0 && (
          <div className="mt-1 text-[10px] text-emerald-500">
            Reward: +{formatTokenBalance(activity.rewardAmount)} HBCT
          </div>
        )}
      </div>
    </div>
  );
});

export default ActivityItem;
