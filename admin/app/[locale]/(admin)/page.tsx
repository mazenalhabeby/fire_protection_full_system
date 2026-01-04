"use client";

import { useState, useEffect } from "react";
import { adminApi, purchaseApi } from "@/lib/api";
import {
  Users,
  DollarSign,
  Coins,
  Lock,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  ShoppingCart,
  Activity,
  UserPlus,
  Gift,
  RefreshCw,
  Trophy,
  Crown,
  Medal,
} from "lucide-react";
import { cn } from "@/components/ui";
import type { DashboardStats } from "@/types";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

// Types for additional stats
interface PurchaseStats {
  statusBreakdown: Record<string, { count: number; totalUsd: string; hbctAmount: string }>;
  totalCompletedVolume: string;
  totalTokensSold: string;
  completedPurchases: number;
  deliveryBreakdown: Record<string, { count: number; totalUsd: string }>;
  currencyBreakdown: Record<string, { count: number; totalUsd: string; totalAmount?: string; totalBnb?: string }>;
}


interface LockStats {
  statusBreakdown: Record<string, { count: number; amount: string }>;
  totalActiveLocked: string;
  totalBonusAwarded: string;
}

interface AffiliateStats {
  totalAffiliates: number;
  activeAffiliates: number;
  totalCommissions: string;
  pendingCommissions: string;
  paidCommissions: string;
  tierBreakdown: Record<string, number>;
}

interface RecentTransaction {
  id: string;
  userId: string;
  type: string;
  amount: string;
  status: string;
  createdAt: string;
  user?: { email?: string; firstName?: string; lastName?: string };
}

interface TopAffiliate {
  id: string;
  referralCode: string;
  tier: string;
  totalEarnings: string;
  referralCount: number;
  user: { email: string; firstName?: string; lastName?: string };
}

// Format large numbers with K, M, B suffixes
function formatNumber(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";

  const absNum = Math.abs(num);
  const sign = num < 0 ? "-" : "";

  if (absNum >= 1_000_000_000) {
    const formatted = (absNum / 1_000_000_000);
    return sign + (formatted % 1 === 0 ? formatted.toFixed(0) : formatted.toFixed(formatted < 10 ? 2 : 1)) + "B";
  }
  if (absNum >= 1_000_000) {
    const formatted = (absNum / 1_000_000);
    return sign + (formatted % 1 === 0 ? formatted.toFixed(0) : formatted.toFixed(formatted < 10 ? 2 : 1)) + "M";
  }
  if (absNum >= 1_000) {
    const formatted = (absNum / 1_000);
    return sign + (formatted % 1 === 0 ? formatted.toFixed(0) : formatted.toFixed(formatted < 10 ? 2 : 1)) + "K";
  }
  if (absNum >= 1) {
    return sign + (absNum % 1 === 0 ? absNum.toFixed(0) : absNum.toFixed(2));
  }
  // Small numbers (less than 1)
  return sign + absNum.toFixed(Math.min(3, Math.max(2, -Math.floor(Math.log10(absNum)) + 1)));
}

// Format currency with K, M, B suffixes
function formatCurrency(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "$0";

  const absNum = Math.abs(num);
  const sign = num < 0 ? "-" : "";

  if (absNum >= 1_000_000_000) {
    const formatted = (absNum / 1_000_000_000);
    return sign + "$" + (formatted % 1 === 0 ? formatted.toFixed(0) : formatted.toFixed(2)) + "B";
  }
  if (absNum >= 1_000_000) {
    const formatted = (absNum / 1_000_000);
    return sign + "$" + (formatted % 1 === 0 ? formatted.toFixed(0) : formatted.toFixed(2)) + "M";
  }
  if (absNum >= 1_000) {
    const formatted = (absNum / 1_000);
    return sign + "$" + (formatted % 1 === 0 ? formatted.toFixed(0) : formatted.toFixed(2)) + "K";
  }
  // Small numbers - show with 2 decimal places
  return sign + "$" + absNum.toFixed(2);
}

// Format time ago
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

// Custom tooltip for area chart
function CustomAreaTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 dark:bg-gray-800 px-3 py-2 rounded-lg shadow-xl border border-gray-700">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-white">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
}

// Custom tooltip for pie chart
function CustomPieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { fill: string } }> }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 dark:bg-gray-800 px-3 py-2 rounded-lg shadow-xl border border-gray-700">
        <p className="text-xs text-gray-400">{payload[0].name}</p>
        <p className="text-sm font-semibold text-white">{formatNumber(payload[0].value)}</p>
      </div>
    );
  }
  return null;
}

// Skeleton loader
function DashboardSkeleton() {
  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-gray-100 dark:bg-gray-800/50 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-80 rounded-2xl bg-gray-100 dark:bg-gray-800/50 animate-pulse" />
        <div className="h-80 rounded-2xl bg-gray-100 dark:bg-gray-800/50 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-64 rounded-2xl bg-gray-100 dark:bg-gray-800/50 animate-pulse" />
        <div className="h-64 rounded-2xl bg-gray-100 dark:bg-gray-800/50 animate-pulse" />
      </div>
    </div>
  );
}

// Stat card component
function StatCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  iconColor,
  iconBg,
}: {
  title: string;
  value: string;
  change: string;
  changeType: "up" | "down" | "neutral";
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
}) {
  return (
    <div className="relative group p-5 rounded-2xl bg-white dark:bg-gray-900/80 border border-gray-100 dark:border-gray-800 overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50 hover:border-gray-200 dark:hover:border-gray-700">
      {/* Background gradient effect */}
      <div className={cn("absolute -right-8 -top-8 w-24 h-24 rounded-full opacity-10 group-hover:opacity-20 transition-opacity", iconBg)} />

      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className={cn("p-2.5 rounded-xl", iconBg)}>
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
            changeType === "up" && "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            changeType === "down" && "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400",
            changeType === "neutral" && "bg-gray-100 dark:bg-gray-800 text-gray-500"
          )}>
            {changeType === "up" && <TrendingUp className="h-3 w-3" />}
            {changeType === "down" && <TrendingDown className="h-3 w-3" />}
            {change}
          </div>
        </div>
        <p className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{title}</p>
      </div>
    </div>
  );
}

// Get transaction icon and type
function getTransactionDisplay(type: string) {
  const displays: Record<string, { icon: React.ElementType; label: string; colorType: string }> = {
    BUY_WEBSITE: { icon: ShoppingCart, label: "Token Purchase", colorType: "success" },
    BUY_DEX: { icon: ShoppingCart, label: "DEX Purchase", colorType: "success" },
    TRANSFER: { icon: ArrowUpRight, label: "Transfer Sent", colorType: "warning" },
    TRANSFER_RECEIVE: { icon: ArrowDownLeft, label: "Transfer Received", colorType: "success" },
    LOCK: { icon: Lock, label: "Token Lock", colorType: "purple" },
    UNLOCK: { icon: Lock, label: "Token Unlock", colorType: "info" },
    REWARD_DISTRIBUTION: { icon: Gift, label: "Reward", colorType: "success" },
    AIRDROP: { icon: Gift, label: "Airdrop", colorType: "purple" },
    AFFILIATE_BONUS: { icon: UserPlus, label: "Affiliate Bonus", colorType: "info" },
    DEPOSIT: { icon: ArrowDownLeft, label: "Deposit", colorType: "success" },
    WITHDRAWAL: { icon: ArrowUpRight, label: "Withdrawal", colorType: "warning" },
  };
  return displays[type] || { icon: Activity, label: type, colorType: "info" };
}

export default function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [purchaseStats, setPurchaseStats] = useState<PurchaseStats | null>(null);
  const [lockStats, setLockStats] = useState<LockStats | null>(null);
  const [affiliateStats, setAffiliateStats] = useState<AffiliateStats | null>(null);
  const [topAffiliates, setTopAffiliates] = useState<TopAffiliate[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [bnbPriceUsd, setBnbPriceUsd] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAllData = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    try {
      // Fetch all data in parallel
      const [dashboardData, purchaseData, lockData, affiliateData, affiliatesData, transactionsData, priceData] = await Promise.all([
        adminApi.getDashboard(),
        adminApi.getPurchaseStats().catch(() => null),
        adminApi.getLockStats().catch(() => null),
        adminApi.getAffiliateStats().catch(() => null),
        adminApi.getAffiliates({ limit: 5 }).catch(() => ({ affiliates: [] })),
        adminApi.getTransactions({ limit: 10 }).catch(() => ({ transactions: [] })),
        purchaseApi.getPrice().catch(() => null),
      ]);

      setDashboard(dashboardData);
      setPurchaseStats(purchaseData);
      setLockStats(lockData);
      setAffiliateStats(affiliateData);
      // Sort affiliates by totalEarnings descending
      const sortedAffiliates = (affiliatesData.affiliates || [])
        .sort((a, b) => parseFloat(b.totalEarnings) - parseFloat(a.totalEarnings))
        .slice(0, 5);
      setTopAffiliates(sortedAffiliates);
      setRecentTransactions(transactionsData.transactions || []);
      if (priceData) {
        setBnbPriceUsd(parseFloat(priceData.bnbPriceUsd) || 0);
      }
    } catch (err) {
      console.error("Failed to fetch admin dashboard:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchAllData(), 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // Calculate total revenue from all currency breakdowns
  const currencyBreakdown = purchaseStats?.currencyBreakdown || {};
  let totalFromCurrencies = 0;

  Object.entries(currencyBreakdown).forEach(([currency, data]) => {
    const amount = parseFloat(data.totalUsd || "0");
    // For BNB, totalUsd is actually the BNB amount - need to convert to USD
    if (currency.toLowerCase() === "bnb" && bnbPriceUsd > 0) {
      totalFromCurrencies += amount * bnbPriceUsd;
    } else if (currency.toLowerCase() === "usdt" || currency.toLowerCase() === "usdc" || currency.toLowerCase() === "usd") {
      // Stablecoins are already in USD
      totalFromCurrencies += amount;
    }
  });

  // Fallback to dashboard totalSalesUsd if currencyBreakdown is empty
  const dashboardSalesUsd = parseFloat(dashboard?.totalSalesUsd || "0");
  const totalRevenue = totalFromCurrencies > 0 ? totalFromCurrencies : dashboardSalesUsd;

  // Use purchaseStats.totalTokensSold as primary, fallback to dashboard
  const tokensSold = parseFloat(purchaseStats?.totalTokensSold || dashboard?.totalTokensSold || "0");
  const tokensLocked = parseFloat(dashboard?.totalLockedTokens || "0");


  // Lock status breakdown for bar chart
  const hasLockBreakdown = lockStats?.statusBreakdown && Object.keys(lockStats.statusBreakdown).length > 0;
  const lockStatusData = hasLockBreakdown
    ? Object.entries(lockStats.statusBreakdown).map(([status, data], index) => ({
        name: status,
        value: data.count || 0,
        amount: parseFloat(data.amount || "0"),
        fill: ["#8b5cf6", "#10b981", "#f59e0b", "#ef4444"][index % 4],
      }))
    : tokensLocked > 0
      ? [
          { name: "ACTIVE", value: 1, amount: tokensLocked, fill: "#8b5cf6" },
        ]
      : [];

  // Stats metrics
  const completedPurchases = purchaseStats?.completedPurchases || 0;
  const lockRate = tokensSold > 0 ? Math.round((tokensLocked / tokensSold) * 100) : 0;

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Real-time platform analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchAllData(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Grid - Dynamic based on permissions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users - requires users.view */}
        {dashboard?.totalUsers !== undefined && (
          <StatCard
            title="Total Users"
            value={formatNumber(dashboard.totalUsers)}
            change={`${dashboard.totalUsers} registered`}
            changeType="neutral"
            icon={Users}
            iconColor="text-blue-600 dark:text-blue-400"
            iconBg="bg-blue-100 dark:bg-blue-500/20"
          />
        )}

        {/* Total Revenue - requires purchases.view */}
        {dashboard?.totalSalesUsd !== undefined && (
          <StatCard
            title="Total Revenue"
            value={formatCurrency(totalRevenue)}
            change={`${completedPurchases} purchases`}
            changeType="up"
            icon={DollarSign}
            iconColor="text-emerald-600 dark:text-emerald-400"
            iconBg="bg-emerald-100 dark:bg-emerald-500/20"
          />
        )}

        {/* Tokens Sold - requires purchases.view */}
        {dashboard?.totalTokensSold !== undefined && (
          <StatCard
            title="Tokens Sold"
            value={formatNumber(tokensSold)}
            change={formatCurrency(totalRevenue)}
            changeType="up"
            icon={Coins}
            iconColor="text-amber-600 dark:text-amber-400"
            iconBg="bg-amber-100 dark:bg-amber-500/20"
          />
        )}

        {/* Tokens Locked - requires locks.view */}
        {dashboard?.totalLockedTokens !== undefined && (
          <StatCard
            title="Tokens Locked"
            value={formatNumber(tokensLocked)}
            change={`${lockRate}% of sold`}
            changeType="neutral"
            icon={Lock}
            iconColor="text-violet-600 dark:text-violet-400"
            iconBg="bg-violet-100 dark:bg-violet-500/20"
          />
        )}

        {/* Pending Withdrawals - requires withdrawals.view */}
        {(dashboard as any)?.pendingWithdrawals !== undefined && (
          <StatCard
            title="Pending Withdrawals"
            value={formatNumber((dashboard as any).pendingWithdrawals)}
            change="Awaiting approval"
            changeType="neutral"
            icon={ArrowUpRight}
            iconColor="text-rose-600 dark:text-rose-400"
            iconBg="bg-rose-100 dark:bg-rose-500/20"
          />
        )}

        {/* Pending Deposits - requires deposits.view */}
        {(dashboard as any)?.pendingDeposits !== undefined && (
          <StatCard
            title="Pending Deposits"
            value={formatNumber((dashboard as any).pendingDeposits)}
            change="Awaiting confirmation"
            changeType="neutral"
            icon={ArrowDownLeft}
            iconColor="text-cyan-600 dark:text-cyan-400"
            iconBg="bg-cyan-100 dark:bg-cyan-500/20"
          />
        )}

        {/* Open Tickets - requires support.view */}
        {(dashboard as any)?.openTickets !== undefined && (
          <StatCard
            title="Open Tickets"
            value={formatNumber((dashboard as any).openTickets)}
            change="Need attention"
            changeType={(dashboard as any).openTickets > 0 ? "up" : "neutral"}
            icon={Activity}
            iconColor="text-orange-600 dark:text-orange-400"
            iconBg="bg-orange-100 dark:bg-orange-500/20"
          />
        )}

        {/* Affiliate Payouts - requires affiliates.view */}
        {dashboard?.affiliatePayouts !== undefined && (
          <StatCard
            title="Affiliate Payouts"
            value={formatNumber(dashboard.affiliatePayouts)}
            change="Total paid"
            changeType="neutral"
            icon={UserPlus}
            iconColor="text-purple-600 dark:text-purple-400"
            iconBg="bg-purple-100 dark:bg-purple-500/20"
          />
        )}
      </div>

      {/* Charts Grid - 2 column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column - Lock Status & Top Affiliates stacked */}
        <div className="flex flex-col gap-4">
          {/* Lock Status Chart */}
          <div className="flex-1 p-6 rounded-2xl bg-white dark:bg-gray-900/80 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Lock Status</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Token locks breakdown</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(tokensLocked)}</p>
              <p className="text-xs text-gray-500">HBCT locked</p>
            </div>
          </div>
          <div className="h-52">
            {lockStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lockStatusData} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} vertical={false} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    tickFormatter={(value) => formatNumber(value)}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(107, 114, 128, 0.1)" }}
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === "amount") return [formatNumber(value) + " HBCT", "Amount"];
                      return [value, "Locks"];
                    }}
                    labelStyle={{ color: "#9ca3af" }}
                  />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Locks" />
                  <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} name="Amount" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                No lock data available
              </div>
            )}
          </div>
          </div>

          {/* Top Affiliates */}
          <div className="flex-1 p-5 rounded-2xl bg-white dark:bg-gray-900/80 border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col min-h-[500px] lg:min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-500/20">
                  <Trophy className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Top Affiliates</h2>
              </div>
            </div>

            {/* Content: Podium Top/Left, List Bottom/Right - Vertical on mobile, Horizontal on desktop */}
            <div className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-6 min-h-0 overflow-auto">
              {/* Top 3 Podium - Top on mobile, Left on desktop (always shows all 3 places) */}
              <div className="flex items-end justify-center gap-2 pt-4 lg:pt-6 pb-2 flex-shrink-0">
                {/* 2nd Place */}
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center mb-2",
                    topAffiliates[1]
                      ? "bg-gray-200 dark:bg-gray-700"
                      : "bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600"
                  )}>
                    <span className={cn(
                      "text-lg font-bold",
                      topAffiliates[1]
                        ? "text-gray-600 dark:text-gray-300"
                        : "text-gray-400 dark:text-gray-500"
                    )}>
                      {topAffiliates[1]?.user?.firstName?.[0] || topAffiliates[1]?.referralCode?.[0] || "?"}
                    </span>
                  </div>
                  <div className={cn(
                    "w-14 h-16 rounded-t-lg flex flex-col items-center justify-end pb-2",
                    topAffiliates[1]
                      ? "bg-gradient-to-t from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-500"
                      : "bg-gradient-to-t from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 opacity-50"
                  )}>
                    <span className={cn(
                      "text-lg font-bold",
                      topAffiliates[1] ? "text-gray-800 dark:text-gray-200" : "text-gray-500 dark:text-gray-400"
                    )}>2</span>
                  </div>
                  <p className="text-xs text-center mt-1 text-gray-500 dark:text-gray-400 truncate max-w-14">
                    {topAffiliates[1]?.user?.firstName || topAffiliates[1]?.referralCode?.slice(0, 6) || "-"}
                  </p>
                </div>

                {/* 1st Place */}
                <div className="flex flex-col items-center -mt-4">
                  <Crown className={cn(
                    "h-6 w-6 mb-1",
                    topAffiliates[0] ? "text-amber-500" : "text-gray-300 dark:text-gray-600"
                  )} />
                  <div className={cn(
                    "w-14 h-14 rounded-full border-2 flex items-center justify-center mb-2",
                    topAffiliates[0]
                      ? "bg-amber-100 dark:bg-amber-900/30 border-amber-400"
                      : "bg-gray-100 dark:bg-gray-800 border-dashed border-gray-300 dark:border-gray-600"
                  )}>
                    <span className={cn(
                      "text-xl font-bold",
                      topAffiliates[0]
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-gray-400 dark:text-gray-500"
                    )}>
                      {topAffiliates[0]?.user?.firstName?.[0] || topAffiliates[0]?.referralCode?.[0] || "?"}
                    </span>
                  </div>
                  <div className={cn(
                    "w-14 h-24 rounded-t-lg flex flex-col items-center justify-end pb-2",
                    topAffiliates[0]
                      ? "bg-gradient-to-t from-amber-400 to-amber-500"
                      : "bg-gradient-to-t from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 opacity-50"
                  )}>
                    <span className={cn(
                      "text-xl font-bold",
                      topAffiliates[0] ? "text-amber-900" : "text-gray-500 dark:text-gray-400"
                    )}>1</span>
                  </div>
                  <p className={cn(
                    "text-xs text-center mt-1 truncate max-w-14",
                    topAffiliates[0]
                      ? "font-medium text-gray-900 dark:text-white"
                      : "text-gray-500 dark:text-gray-400"
                  )}>
                    {topAffiliates[0]?.user?.firstName || topAffiliates[0]?.referralCode?.slice(0, 6) || "-"}
                  </p>
                </div>

                {/* 3rd Place */}
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center mb-2",
                    topAffiliates[2]
                      ? "bg-amber-100 dark:bg-amber-900/20"
                      : "bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600"
                  )}>
                    <span className={cn(
                      "text-lg font-bold",
                      topAffiliates[2]
                        ? "text-amber-700 dark:text-amber-500"
                        : "text-gray-400 dark:text-gray-500"
                    )}>
                      {topAffiliates[2]?.user?.firstName?.[0] || topAffiliates[2]?.referralCode?.[0] || "?"}
                    </span>
                  </div>
                  <div className={cn(
                    "w-14 h-12 rounded-t-lg flex flex-col items-center justify-end pb-2",
                    topAffiliates[2]
                      ? "bg-gradient-to-t from-amber-600 to-amber-700"
                      : "bg-gradient-to-t from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 opacity-50"
                  )}>
                    <span className={cn(
                      "text-lg font-bold",
                      topAffiliates[2] ? "text-amber-100" : "text-gray-500 dark:text-gray-400"
                    )}>3</span>
                  </div>
                  <p className="text-xs text-center mt-1 text-gray-500 dark:text-gray-400 truncate max-w-14">
                    {topAffiliates[2]?.user?.firstName || topAffiliates[2]?.referralCode?.slice(0, 6) || "-"}
                  </p>
                </div>
              </div>

              {/* Affiliates List - Bottom on mobile, Right on desktop */}
              {/* On mobile: show ~5 items visible, rest scrollable (each item ~56px + 8px gap = ~280px for 5) */}
              <div className="flex-1 space-y-2 overflow-y-auto max-h-[280px] lg:max-h-none">
                {topAffiliates.length > 0 ? (
                  topAffiliates.map((affiliate, index) => (
                    <div
                      key={affiliate.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-gray-100/50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <span className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0",
                        index === 0 && "bg-gradient-to-r from-amber-400 to-amber-500 text-amber-900",
                        index === 1 && "bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800 dark:from-gray-600 dark:to-gray-500 dark:text-gray-200",
                        index === 2 && "bg-gradient-to-r from-amber-600 to-amber-700 text-amber-100",
                        index > 2 && "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                      )}>
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {affiliate.user?.firstName
                            ? `${affiliate.user.firstName} ${affiliate.user.lastName || ""}`
                            : affiliate.user?.email || affiliate.referralCode}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {affiliate.referralCount}
                          </span>
                          <span>{affiliate.tier}</span>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-violet-600 dark:text-violet-400 flex-shrink-0">
                        {formatNumber(affiliate.totalEarnings)} HBCT
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">
                    No affiliates yet
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity - Right Column */}
        <div className="rounded-2xl bg-white dark:bg-gray-900/80 border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Latest transactions</p>
            </div>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800 flex-1 overflow-y-auto">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((tx) => {
                const display = getTransactionDisplay(tx.type);
                const IconComponent = display.icon;
                return (
                  <div
                    key={tx.id}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                      display.colorType === "success" && "bg-emerald-100 dark:bg-emerald-500/20",
                      display.colorType === "info" && "bg-blue-100 dark:bg-blue-500/20",
                      display.colorType === "purple" && "bg-violet-100 dark:bg-violet-500/20",
                      display.colorType === "warning" && "bg-amber-100 dark:bg-amber-500/20",
                    )}>
                      <IconComponent className={cn(
                        "h-4 w-4",
                        display.colorType === "success" && "text-emerald-600 dark:text-emerald-400",
                        display.colorType === "info" && "text-blue-600 dark:text-blue-400",
                        display.colorType === "purple" && "text-violet-600 dark:text-violet-400",
                        display.colorType === "warning" && "text-amber-600 dark:text-amber-400",
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{display.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{formatTimeAgo(tx.createdAt)}</p>
                    </div>
                    <span className={cn(
                      "text-xs font-semibold flex-shrink-0",
                      parseFloat(tx.amount) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    )}>
                      {formatNumber(tx.amount)}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">
                No recent transactions
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
