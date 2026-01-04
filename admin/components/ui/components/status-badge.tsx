"use client";

import { type ReactNode } from "react";
import { cn } from "@/components/ui";
import {
  type StatusConfig,
  depositStatusConfig,
  withdrawalStatusConfig,
  lockStatusConfig,
  transactionStatusConfig,
  getStatusConfig,
} from "@/lib/utils/status";

type StatusType = "deposit" | "withdrawal" | "lock" | "transaction" | "custom";

interface StatusBadgeProps {
  status: string;
  type?: StatusType;
  config?: Record<string, StatusConfig>;
  icon?: ReactNode;
  className?: string;
  size?: "sm" | "md";
}

const statusConfigMaps: Record<string, Record<string, StatusConfig>> = {
  deposit: depositStatusConfig,
  withdrawal: withdrawalStatusConfig,
  lock: lockStatusConfig,
  transaction: transactionStatusConfig,
};

export function StatusBadge({
  status,
  type = "transaction",
  config,
  icon,
  className,
  size = "sm",
}: StatusBadgeProps) {
  const configMap = config || statusConfigMaps[type] || transactionStatusConfig;
  const statusInfo = getStatusConfig(status, configMap);

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        sizeClasses[size],
        statusInfo.bgClass,
        statusInfo.textClass,
        className
      )}
    >
      {icon}
      {statusInfo.label}
    </span>
  );
}
