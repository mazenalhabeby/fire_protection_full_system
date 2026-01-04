"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  useWalletOverview,
  useWalletTransactionSummary,
} from "@/hooks/useWalletData";
import { useTokenPrice } from "@/hooks/useAppData";
import { usePageLoading } from "@/hooks/useMinimumLoading";
import { cn } from "@/lib/utils";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Eye,
  EyeOff,
  ChevronRight,
  History,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Lock,
  Coins,
  Download,
  Upload,
  Send,
  QrCode,
  Wallet,
  Sparkles,
  Shield,
  Zap,
} from "lucide-react";
import { CurrencyIcon } from "@/components/wallet-internal/CurrencyIcon";
import type { WalletTransaction } from "@/types/api";

export default function WalletPage() {
  const router = useRouter();
  useAuth();

  const [hideBalances, setHideBalances] = useState(false);

  // Fetch wallet data
  const {
    balances,
    pendingCount,
    recentTransactions,
    limits,
    isLoading,
    refetch,
  } = useWalletOverview();

  const { data: summary } = useWalletTransactionSummary({ period: "month" });
  const { data: tokenPrice } = useTokenPrice();

  // Minimum loading for premium feel
  const { isLoading: isMinLoading, stopLoading } = usePageLoading();

  useEffect(() => {
    if (!isLoading) {
      stopLoading();
    }
  }, [isLoading, stopLoading]);

  const showSkeleton = isLoading || isMinLoading;

  if (showSkeleton) {
    return <WalletSkeleton />;
  }

  // Get HBCT balance only
  const hbctBalance = balances.find(b => b.currency === "HBCT");
  const availableBalance = parseFloat(hbctBalance?.availableBalance || "0");
  const lockedBalance = parseFloat(hbctBalance?.lockedBalance || "0");
  const pendingBalance = parseFloat(hbctBalance?.pendingBalance || "0");
  const totalBalance = availableBalance + lockedBalance + pendingBalance;

  // Dynamic token price from API
  const hbctPrice = tokenPrice ?? 0.05; // Fallback to 0.05 if not loaded
  const totalEstimatedUsd = totalBalance * hbctPrice;

  const formatBalance = (value: number) => {
    if (hideBalances) return "••••••";
    if (value === 0) return "0.00";
    if (value < 0.0001) return "<0.0001";
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  };

  const formatUsd = (value: number) => {
    if (hideBalances) return "$••••";
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const monthlyChange = summary ? parseFloat(summary.netChange) : 0;
  const isPositiveChange = monthlyChange >= 0;

  return (
    <div className="flex-1 relative overflow-hidden min-h-screen">
      {/* Premium Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 dark:from-gray-950 dark:via-gray-900 dark:to-slate-950" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-brand-500/5 to-transparent dark:from-brand-500/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-6 md:py-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/25">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">My Wallet</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manage your HBCT tokens</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="p-2.5 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80 hover:bg-gray-50 dark:hover:bg-gray-700/80 transition-all hover:scale-105 active:scale-95 shadow-sm"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </button>
            <button
              onClick={() => router.push('/wallet/transactions')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80 hover:bg-gray-50 dark:hover:bg-gray-700/80 transition-all hover:scale-105 active:scale-95 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm"
            >
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </button>
          </div>
        </div>

        <div className="space-y-5">
          {/* Hero Balance Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-gray-800 dark:via-gray-900 dark:to-black p-6 md:p-8 shadow-2xl">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
            </div>

            {/* Grid Pattern Overlay */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 1px)`,
                backgroundSize: '24px 24px',
              }}
            />

            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                {/* Balance Info */}
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
                      <CurrencyIcon size="lg" className="text-white" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-gray-900">
                      <Shield className="h-3 w-3 text-white" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-gray-400 text-sm font-medium uppercase tracking-wider">Total Balance</span>
                      <button
                        onClick={() => setHideBalances(!hideBalances)}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        {hideBalances ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl md:text-5xl font-bold text-white tracking-tight">{formatBalance(totalBalance)}</span>
                      <span className="text-gray-400 text-xl font-medium">HBCT</span>
                    </div>
                    <p className="text-gray-500 text-base mt-1">
                      ≈ {formatUsd(totalEstimatedUsd)} USD
                    </p>

                    {/* Monthly Change Badge */}
                    {summary && (
                      <div className={cn(
                        "inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-full text-sm font-medium",
                        monthlyChange === 0
                          ? "bg-gray-500/20 text-gray-400"
                          : isPositiveChange
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-red-500/20 text-red-400"
                      )}>
                        {monthlyChange === 0 ? (
                          <TrendingUp className="h-4 w-4 opacity-50" />
                        ) : isPositiveChange ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                        <span>
                          {hideBalances ? "••••" : monthlyChange === 0
                            ? "No change"
                            : `${isPositiveChange ? "+" : ""}${monthlyChange.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`} this month
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Balance Breakdown */}
                <div className="flex flex-col gap-3 lg:min-w-[200px]">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-sm text-gray-400">Available</span>
                    </div>
                    <span className="text-sm font-semibold text-white">{formatBalance(availableBalance)}</span>
                  </div>
                  {pendingBalance > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-amber-500/30">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-amber-400" />
                        <span className="text-sm text-gray-400">Reserved</span>
                      </div>
                      <span className="text-sm font-semibold text-amber-400">
                        {formatBalance(pendingBalance)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                    <div className="flex items-center gap-2">
                      <Lock className="h-3.5 w-3.5 text-brand-400" />
                      <span className="text-sm text-gray-400">Locked</span>
                    </div>
                    <span className={cn("text-sm font-semibold", lockedBalance > 0 ? "text-brand-400" : "text-white")}>
                      {formatBalance(lockedBalance)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-5 gap-3">
            <QuickActionButton
              icon={Send}
              label="Send"
              onClick={() => router.push('/wallet/send')}
              disabled={availableBalance <= 0}
              variant="primary"
            />
            <QuickActionButton
              icon={QrCode}
              label="Receive"
              onClick={() => router.push('/wallet/receive')}
            />
            <QuickActionButton
              icon={Download}
              label="Deposit"
              onClick={() => router.push('/wallet/deposit')}
              variant="success"
            />
            <QuickActionButton
              icon={Upload}
              label="Withdraw"
              onClick={() => router.push('/wallet/withdraw')}
              disabled={availableBalance <= 0}
            />
            <QuickActionButton
              icon={Coins}
              label="Buy"
              onClick={() => router.push('/buy-tokens')}
              variant="brand"
            />
          </div>

          {/* Pending Transfers Alert */}
          {pendingCount > 0 && (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/20 p-4">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-orange-500/5" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center animate-pulse">
                    <Clock className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-amber-600 dark:text-amber-400">
                      {pendingCount} Pending Transfer{pendingCount > 1 ? "s" : ""}
                      {pendingBalance > 0 && (
                        <span className="font-normal text-amber-500/80 ml-1">
                          ({formatBalance(pendingBalance)} HBCT reserved)
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Confirm or cancel to release reserved funds
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => router.push('/wallet/transfers')}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-600 dark:text-amber-400 text-sm font-medium transition-colors"
                >
                  View
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Transfer Limits Card */}
            {limits && (
              <div className="md:col-span-2 p-5 rounded-2xl bg-white dark:bg-gray-900/80 border border-gray-200/80 dark:border-gray-800/80 shadow-sm backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="h-5 w-5 text-brand-500" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Transfer Limits</h3>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <LimitBar
                    label="Daily Limit"
                    used={parseFloat(limits.dailyUsed)}
                    total={parseFloat(limits.dailyLimit)}
                    color="brand"
                    hideValues={hideBalances}
                  />
                  <LimitBar
                    label="Weekly Limit"
                    used={parseFloat(limits.weeklyUsed)}
                    total={parseFloat(limits.weeklyLimit)}
                    color="purple"
                    hideValues={hideBalances}
                  />
                </div>
              </div>
            )}

            {/* Monthly Summary Card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-gray-900/80 border border-gray-200/80 dark:border-gray-800/80 shadow-sm backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-purple-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">This Month</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Transactions</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {summary ? summary.transactionCount : 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Volume</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {hideBalances ? "••••" : summary ? formatBalance(parseFloat(summary.totalIn) + parseFloat(summary.totalOut)) : "0"} HBCT
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-2xl bg-white dark:bg-gray-900/80 border border-gray-200/80 dark:border-gray-800/80 overflow-hidden shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800/80">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-gray-400" />
                <h2 className="font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
              </div>
              <button
                onClick={() => router.push('/wallet/transactions')}
                className="text-sm text-brand-500 hover:text-brand-600 flex items-center gap-1 font-medium transition-colors"
              >
                View All
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {recentTransactions.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 font-medium">No recent activity</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Your transactions will appear here</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800/80">
                {recentTransactions.slice(0, 5).map((tx) => (
                  <TransactionRow key={tx.id} transaction={tx} hideBalances={hideBalances} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Quick Action Button Component
function QuickActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  variant = "default",
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "primary" | "success" | "brand";
}) {
  const variantStyles = {
    default: "bg-white dark:bg-gray-800/80 border-gray-200/80 dark:border-gray-700/80 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/80",
    primary: "bg-gradient-to-br from-brand-500 to-brand-600 border-brand-500/50 text-white hover:from-brand-600 hover:to-brand-700 shadow-lg shadow-brand-500/25",
    success: "bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 dark:hover:bg-emerald-500/30",
    brand: "bg-brand-500/10 dark:bg-brand-500/20 border-brand-500/30 text-brand-600 dark:text-brand-400 hover:bg-brand-500/20 dark:hover:bg-brand-500/30",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all hover:scale-105 active:scale-95 shadow-sm",
        variantStyles[variant],
        disabled && "opacity-50 cursor-not-allowed hover:scale-100"
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

// Limit Bar Component
function LimitBar({
  label,
  used,
  total,
  color,
  hideValues,
}: {
  label: string;
  used: number;
  total: number;
  color: "brand" | "purple";
  hideValues: boolean;
}) {
  const percentage = Math.min(100, (used / total) * 100);
  const remaining = total - used;

  const colorStyles = {
    brand: "from-brand-500 to-brand-600",
    purple: "from-purple-500 to-purple-600",
  };

  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-gray-500 dark:text-gray-400">{label}</span>
        <span className="text-gray-700 dark:text-gray-300 font-medium">
          {hideValues ? "••••" : remaining.toLocaleString()} left
        </span>
      </div>
      <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={cn("h-full bg-gradient-to-r rounded-full transition-all duration-500", colorStyles[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between text-xs mt-1.5 text-gray-400">
        <span>{hideValues ? "••••" : used.toLocaleString()} used</span>
        <span>{total.toLocaleString()} max</span>
      </div>
    </div>
  );
}

// Transaction Row Component
function TransactionRow({
  transaction,
  hideBalances,
}: {
  transaction: WalletTransaction;
  hideBalances: boolean;
}) {
  // Memoize time calculation to avoid impure function in render
  const timeAgoText = useMemo(() => {
    const diff = Date.now() - new Date(transaction.createdAt).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(transaction.createdAt).toLocaleDateString();
  }, [transaction.createdAt]);

  const isIncoming = [
    "DEPOSIT",
    "INTERNAL_TRANSFER_RECEIVE",
    "TOKEN_PURCHASE",
    "REWARD",
    "AIRDROP",
    "AFFILIATE_COMMISSION",
    "REFUND",
    "UNLOCK",
  ].includes(transaction.type);

  const formatAmount = (val: string) => {
    if (hideBalances) return "••••";
    return parseFloat(val).toLocaleString(undefined, { maximumFractionDigits: 4 });
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      DEPOSIT: "Deposit",
      WITHDRAWAL: "Withdrawal",
      INTERNAL_TRANSFER_SEND: "Sent",
      INTERNAL_TRANSFER_RECEIVE: "Received",
      TOKEN_PURCHASE: "Purchase",
      TOKEN_SALE: "Sale",
      LOCK: "Locked",
      UNLOCK: "Unlocked",
      REWARD: "Reward",
      AIRDROP: "Airdrop",
      AFFILIATE_COMMISSION: "Commission",
      FEE: "Fee",
      REFUND: "Refund",
    };
    return labels[type] || type;
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, React.ElementType> = {
      DEPOSIT: Download,
      WITHDRAWAL: Upload,
      INTERNAL_TRANSFER_SEND: ArrowUpRight,
      INTERNAL_TRANSFER_RECEIVE: ArrowDownLeft,
      TOKEN_PURCHASE: Coins,
      LOCK: Lock,
      UNLOCK: Lock,
      REWARD: Sparkles,
      AIRDROP: Sparkles,
    };
    return icons[type] || (isIncoming ? ArrowDownLeft : ArrowUpRight);
  };

  const getStatusStyle = (status: string) => {
    const styles: Record<string, { bg: string; text: string; label: string }> = {
      COMPLETED: {
        bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
        text: "text-emerald-600 dark:text-emerald-400",
        label: "Completed",
      },
      PENDING: {
        bg: "bg-amber-500/10 dark:bg-amber-500/20",
        text: "text-amber-600 dark:text-amber-400",
        label: "Pending",
      },
      CANCELLED: {
        bg: "bg-gray-500/10 dark:bg-gray-500/20",
        text: "text-gray-500 dark:text-gray-400",
        label: "Cancelled",
      },
      EXPIRED: {
        bg: "bg-red-500/10 dark:bg-red-500/20",
        text: "text-red-600 dark:text-red-400",
        label: "Expired",
      },
      FAILED: {
        bg: "bg-red-500/10 dark:bg-red-500/20",
        text: "text-red-600 dark:text-red-400",
        label: "Failed",
      },
    };
    return styles[status] || styles.COMPLETED;
  };

  const Icon = getTypeIcon(transaction.type);
  const statusStyle = getStatusStyle(transaction.status);

  return (
    <div className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
          isIncoming
            ? "bg-emerald-500/10 dark:bg-emerald-500/20"
            : "bg-gray-100 dark:bg-gray-800"
        )}>
          <Icon className={cn(
            "h-5 w-5",
            isIncoming ? "text-emerald-500" : "text-gray-500 dark:text-gray-400"
          )} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{getTypeLabel(transaction.type)}</p>
            <span className={cn(
              "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium",
              statusStyle.bg,
              statusStyle.text
            )}>
              {statusStyle.label}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>{timeAgoText}</span>
            {transaction.metadata?.note && (
              <>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <span className="truncate max-w-[150px]" title={transaction.metadata.note}>
                  "{transaction.metadata.note}"
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="text-right">
        <p className={cn(
          "text-sm font-bold",
          transaction.status === "CANCELLED" || transaction.status === "EXPIRED" || transaction.status === "FAILED"
            ? "text-gray-400 line-through"
            : isIncoming
              ? "text-emerald-500"
              : "text-gray-900 dark:text-white"
        )}>
          {isIncoming ? "+" : "-"}{formatAmount(transaction.amount)}
        </p>
        <p className="text-xs text-gray-400">HBCT</p>
      </div>
    </div>
  );
}

function WalletSkeleton() {
  return (
    <div className="flex-1 relative overflow-hidden min-h-screen">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 dark:from-gray-950 dark:via-gray-900 dark:to-slate-950" />
      </div>
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-5xl">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
            <div>
              <div className="h-5 w-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-1" />
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {/* Hero Card Skeleton */}
          <div className="h-56 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 animate-pulse" />

          {/* Quick Actions Skeleton */}
          <div className="grid grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 animate-pulse" />
            ))}
          </div>

          {/* Stats Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 h-32 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 animate-pulse" />
            <div className="h-32 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 animate-pulse" />
          </div>

          {/* Activity Skeleton */}
          <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-11 h-11 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
                  <div className="flex-1">
                    <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
                    <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </div>
                  <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
