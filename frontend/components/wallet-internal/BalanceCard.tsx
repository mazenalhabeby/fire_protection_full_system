"use client";

import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";
import type { WalletBalance, WalletCurrency } from "@/types/api";

interface BalanceCardProps {
  balance: WalletBalance;
  onSend?: () => void;
  onReceive?: () => void;
  showActions?: boolean;
  compact?: boolean;
}

// Use static class maps instead of dynamic template strings
const currencyConfig: Record<WalletCurrency, {
  name: string;
  icon: string;
  iconGradient: string;
  cardBg: string;
  cardBorder: string;
  cardHoverBorder: string;
  shadow: string;
  decorBg: string;
}> = {
  HBCT: {
    name: "Fire Protection Token",
    icon: "HBCT",
    iconGradient: "from-brand-500 to-brand-600",
    cardBg: "bg-gradient-to-br from-brand-500/10 via-brand-500/5 to-transparent dark:from-brand-500/20 dark:via-brand-500/10 dark:to-transparent",
    cardBorder: "border-brand-200/50 dark:border-brand-500/20",
    cardHoverBorder: "hover:border-brand-300 dark:hover:border-brand-500/40",
    shadow: "hover:shadow-brand-500/10 shadow-brand-500/30",
    decorBg: "from-brand-500/10 to-transparent",
  },
  BNB: {
    name: "Binance Coin",
    icon: "BNB",
    iconGradient: "from-yellow-500 to-yellow-600",
    cardBg: "bg-gradient-to-br from-yellow-500/10 via-yellow-500/5 to-transparent dark:from-yellow-500/20 dark:via-yellow-500/10 dark:to-transparent",
    cardBorder: "border-yellow-200/50 dark:border-yellow-500/20",
    cardHoverBorder: "hover:border-yellow-300 dark:hover:border-yellow-500/40",
    shadow: "hover:shadow-yellow-500/10 shadow-yellow-500/30",
    decorBg: "from-yellow-500/10 to-transparent",
  },
  USDT: {
    name: "Tether USD",
    icon: "USDT",
    iconGradient: "from-emerald-500 to-emerald-600",
    cardBg: "bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-500/20 dark:via-emerald-500/10 dark:to-transparent",
    cardBorder: "border-emerald-200/50 dark:border-emerald-500/20",
    cardHoverBorder: "hover:border-emerald-300 dark:hover:border-emerald-500/40",
    shadow: "hover:shadow-emerald-500/10 shadow-emerald-500/30",
    decorBg: "from-emerald-500/10 to-transparent",
  },
  USDC: {
    name: "USD Coin",
    icon: "USDC",
    iconGradient: "from-blue-500 to-blue-600",
    cardBg: "bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent dark:from-blue-500/20 dark:via-blue-500/10 dark:to-transparent",
    cardBorder: "border-blue-200/50 dark:border-blue-500/20",
    cardHoverBorder: "hover:border-blue-300 dark:hover:border-blue-500/40",
    shadow: "hover:shadow-blue-500/10 shadow-blue-500/30",
    decorBg: "from-blue-500/10 to-transparent",
  },
};

export function BalanceCard({
  balance,
  onSend,
  onReceive,
  showActions = true,
  compact = false,
}: BalanceCardProps) {
  const config = currencyConfig[balance.currency];
  const availableBalance = parseFloat(balance.availableBalance);
  const lockedBalance = parseFloat(balance.lockedBalance);
  const totalBalance = parseFloat(balance.totalBalance);
  const hasBalance = totalBalance > 0;

  if (compact) {
    return (
      <div className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md",
            config.iconGradient
          )}>
            <span className="text-xs font-bold text-white">{config.icon}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{balance.currency}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{config.name}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
          </p>
          {lockedBalance > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              +{lockedBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} locked
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "group relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:shadow-lg border",
      config.cardBg,
      config.cardBorder,
      config.cardHoverBorder
    )}>
      {/* Background decoration */}
      <div className={cn(
        "absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl rounded-full -translate-y-1/2 translate-x-1/2 opacity-60",
        config.decorBg
      )} />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300",
              config.iconGradient
            )}>
              <span className="text-sm font-bold text-white">{config.icon}</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">{balance.currency}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{config.name}</p>
            </div>
          </div>
        </div>

        {/* Balances */}
        <div className="space-y-3 mb-4">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Available</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
            </p>
          </div>

          {lockedBalance > 0 && (
            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-100/80 dark:bg-gray-800/50">
              <span className="text-xs text-gray-500 dark:text-gray-400">Locked</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {lockedBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </span>
            </div>
          )}

          {(lockedBalance > 0 || parseFloat(balance.pendingBalance) > 0) && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-200/80 dark:border-gray-700/50">
              <span className="text-xs text-gray-500 dark:text-gray-400">Total</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        {showActions && hasBalance && (
          <div className="flex gap-2">
            <button
              onClick={onSend}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all",
                "bg-gray-900 dark:bg-white text-white dark:text-gray-900",
                "hover:bg-gray-800 dark:hover:bg-gray-100",
                "active:scale-[0.98]"
              )}
            >
              <ArrowUpRight className="h-4 w-4" />
              Send
            </button>
            <button
              onClick={onReceive}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all",
                "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white",
                "hover:bg-gray-200 dark:hover:bg-gray-700",
                "active:scale-[0.98]"
              )}
            >
              <ArrowDownLeft className="h-4 w-4" />
              Receive
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
