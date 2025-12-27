"use client";

import { useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useAuth } from "@/hooks/useAuth";
import { useBalance, useTransactions, useAffiliate } from "@/hooks/useAppData";
import { cn } from "@/lib/utils";
import {
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  Lock,
  Users,
  ShoppingBag,
  ExternalLink,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { DashboardSkeleton } from "@/components/skeletons/page-skeletons";
import { usePageLoading } from "@/hooks/useMinimumLoading";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollableList } from "@/components/ui/scrollable-list";
import { getTimeAgo } from "@/lib/utils/format";
import { TwoFactorPrompt } from "@/components/security/TwoFactorPrompt";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const { user } = useAuth();

  // Use cached data hooks - data is prefetched on login
  const { data: balance, isLoading: balanceLoading } = useBalance();
  const { data: txData, isLoading: txLoading } = useTransactions(1, 5);
  const { data: affiliate, isLoading: affiliateLoading } = useAffiliate();

  // Minimum loading duration for premium feel
  const { isLoading: isMinLoading, stopLoading } = usePageLoading();

  // Data is loading if any of the queries are loading
  const isDataLoading = balanceLoading || txLoading || affiliateLoading;

  // Stop minimum loading when data is ready
  useEffect(() => {
    if (!isDataLoading) {
      stopLoading();
    }
  }, [isDataLoading, stopLoading]);

  // Get transactions from query result
  const transactions = txData?.transactions ?? [];

  // Check if user has any activity
  const hasBalance = balance && (
    parseFloat(balance.availableBalance) > 0 ||
    parseFloat(balance.lockedBalance) > 0
  );
  const showNewUserState = !hasBalance && transactions.length === 0;

  // Helper to get display balance
  const getDisplayBalance = (real: string | undefined, mock: string) => {
    if (showNewUserState) return "0.00";
    if (!real || real === "0" || real === "0.00") return mock;
    return real;
  };

  // Display values using centralized mock data
  const displayBalance = {
    available: getDisplayBalance(balance?.availableBalance, "0"),
    locked: getDisplayBalance(balance?.lockedBalance, "0"),
    total: getDisplayBalance(balance?.totalBalance, "0"),
  };

  // Referral count from affiliate data (cached)
  const displayReferralCount = affiliate?.totalReferrals ?? 0;

  // Use real transactions or mock data
  const displayTransactions = showNewUserState ? [] :
    transactions;

  // Chart data calculation - simple 7-point line chart showing growth
  const chartData = showNewUserState
    ? { data: [0, 0, 0, 0, 0, 0, 0], changePercent: 0 }
    : {
        data: [120, 145, 132, 167, 178, 195, 210], // Sample growth data
        changePercent: 12.5
      };

  // Generate smooth curve path for chart
  const generateChartPath = () => {
    const points = chartData.data;
    const width = 300;
    const height = 80;
    const padding = 5;

    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;

    const xStep = width / (points.length - 1);

    const coords = points.map((point, i) => ({
      x: i * xStep,
      y: padding + (height - 2 * padding) - ((point - min) / range) * (height - 2 * padding)
    }));

    // Generate smooth curve using quadratic bezier
    let path = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      const midX = (prev.x + curr.x) / 2;
      path += ` Q ${prev.x + (midX - prev.x) * 0.5} ${prev.y}, ${midX} ${(prev.y + curr.y) / 2}`;
      path += ` T ${curr.x} ${curr.y}`;
    }
    return path;
  };

  const chartPath = generateChartPath();
  const chartAreaPath = `${chartPath} L 300 80 L 0 80 Z`;
  const lastPoint = chartData.data[chartData.data.length - 1];
  const lastY = 5 + (80 - 10) - ((lastPoint - Math.min(...chartData.data)) / (Math.max(...chartData.data) - Math.min(...chartData.data) || 1)) * (80 - 10);


  // Show skeleton while data is loading OR minimum time not met
  // Note: Auth protection is handled at the layout level
  const showSkeleton = isDataLoading || isMinLoading;

  if (showSkeleton) {
    return (
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-gray-50 via-gray-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950" />
        </div>
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const quickActions = [
    {
      href: "/buy-tokens",
      icon: Coins,
      label: t("buyTokens"),
      description: "Purchase HBCT tokens",
      gradient: "from-brand-500 to-brand-600",
      shadowColor: "shadow-brand-500/25",
    },
    {
      href: "/affiliates",
      icon: Users,
      label: t("inviteFriends"),
      description: "Earn referral rewards",
      gradient: "from-blue-500 to-blue-600",
      shadowColor: "shadow-blue-500/25",
    },
    {
      href: "/locking",
      icon: Lock,
      label: t("lockTokens"),
      description: "Earn rewards by locking",
      gradient: "from-purple-500 to-purple-600",
      shadowColor: "shadow-purple-500/25",
    },
    {
      href: "/marketplace",
      icon: ShoppingBag,
      label: t("browseProducts"),
      description: "Shop with HBCT",
      gradient: "from-gray-400 to-gray-500",
      shadowColor: "shadow-gray-500/25",
      comingSoon: true,
    },
  ];

  return (
    <div className="flex-1 relative overflow-hidden">
      {/* Premium Background - Clean & Sophisticated */}
      <div className="absolute inset-0 -z-10">
        {/* Base gradient - subtle and clean */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50 via-gray-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950" />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Single subtle accent glow - very minimal */}
        <div className="absolute top-0 right-1/4 w-[800px] h-[400px] bg-gradient-to-b from-gray-200/50 to-transparent dark:from-gray-800/30 dark:to-transparent blur-[100px]" />

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-100/50 to-transparent dark:from-gray-950/50 dark:to-transparent" />
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* 2FA Security Prompt */}
        <TwoFactorPrompt className="mb-6" />

        {/* Premium Header */}
        <div className="relative mb-8 p-6 md:p-8 rounded-3xl overflow-hidden">
          {/* Header background - clean dark gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 dark:from-gray-800 dark:via-gray-900 dark:to-gray-900" />

          {/* Subtle grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
            }}
          />

          {/* Subtle top highlight */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {/* Very subtle accent glow - monochrome */}
          <div className="absolute top-0 right-0 w-96 h-32 bg-gradient-to-bl from-white/5 to-transparent blur-2xl" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-4">
            {/* Left Side - Text (50%) */}
            <div className="md:w-1/2">
              <p className="text-brand-400 text-sm font-medium mb-2">{getGreeting()}</p>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
                {showNewUserState ? `Welcome, ${user?.firstName || user?.email?.split("@")[0]}!` : `Welcome back, ${user?.firstName || user?.email?.split("@")[0]}!`}
              </h1>
              <p className="text-gray-400 text-sm md:text-base">
                {showNewUserState
                  ? "Start your HBCT journey today. Buy tokens to get started!"
                  : "Here's what's happening with your HBCT portfolio today."}
              </p>
            </div>

            {/* Right Side - Chart (50%) */}
            <div className="hidden md:flex items-center justify-end gap-4 md:w-1/2">
              {/* Chart - Takes most of the space */}
              <div className="relative flex-1 h-24">
                <svg viewBox="0 0 300 80" className="w-full h-full" preserveAspectRatio="none">
                  {/* Gradient fill under the line */}
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(249, 115, 22)" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="rgb(249, 115, 22)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Area fill */}
                  <path
                    d={chartAreaPath}
                    fill="url(#chartGradient)"
                  />
                  {/* Line */}
                  <path
                    d={chartPath}
                    fill="none"
                    stroke="rgb(249, 115, 22)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* End dot with glow */}
                  <circle cx="300" cy={lastY} r="6" fill="rgb(249, 115, 22)" opacity="0.3" />
                  <circle cx="300" cy={lastY} r="4" fill="rgb(249, 115, 22)" />
                </svg>
              </div>
              {/* Stats */}
              <div className="text-right shrink-0">
                {chartData.changePercent === 0 ? (
                  <>
                    <p className="text-brand-400 text-lg font-bold flex items-center justify-end gap-1">
                      0%
                    </p>
                    <p className="text-gray-400 text-xs">No activity yet</p>
                  </>
                ) : (
                  <>
                    <p className="text-brand-400 text-lg font-bold flex items-center justify-end gap-1">
                      <TrendingUp className="h-4 w-4" />
                      +{chartData.changePercent}%
                    </p>
                    <p className="text-gray-400 text-xs">Last 7 days</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid - Stats + Actions | Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Side - Stats + Quick Actions */}
          <div className="space-y-6">
            {/* Stats Grid - 2x2 */}
            <div className="grid grid-cols-2 gap-4">
              {/* Available Balance */}
              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500/10 via-brand-500/5 to-transparent dark:from-brand-500/20 dark:via-brand-500/10 dark:to-transparent border border-brand-200/50 dark:border-brand-500/20 p-4 md:p-5 transition-all duration-300 hover:shadow-lg hover:shadow-brand-500/10 hover:border-brand-300 dark:hover:border-brand-500/40">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-brand-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">{t("availableBalance")}</p>
                    <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{displayBalance.available}</p>
                    <p className="text-[10px] md:text-xs text-brand-500 font-medium mt-1">HBCT</p>
                  </div>
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/30 group-hover:scale-110 transition-transform duration-300">
                    <Coins className="h-5 w-5 md:h-6 md:w-6 text-white" />
                  </div>
                </div>
              </div>

              {/* Locked Balance */}
              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent dark:from-purple-500/20 dark:via-purple-500/10 dark:to-transparent border border-purple-200/50 dark:border-purple-500/20 p-4 md:p-5 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 hover:border-purple-300 dark:hover:border-purple-500/40">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">{t("lockedBalance")}</p>
                    <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{displayBalance.locked}</p>
                    <p className="text-[10px] md:text-xs text-purple-500 font-medium mt-1">HBCT</p>
                  </div>
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform duration-300">
                    <Lock className="h-5 w-5 md:h-6 md:w-6 text-white" />
                  </div>
                </div>
              </div>

              {/* Total Balance */}
              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-500/20 dark:via-emerald-500/10 dark:to-transparent border border-emerald-200/50 dark:border-emerald-500/20 p-4 md:p-5 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10 hover:border-emerald-300 dark:hover:border-emerald-500/40">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">{t("totalBalance")}</p>
                    <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{displayBalance.total}</p>
                    <p className="text-[10px] md:text-xs text-emerald-500 font-medium mt-1">HBCT</p>
                  </div>
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                    <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-white" />
                  </div>
                </div>
              </div>

              {/* Referrals */}
              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent dark:from-blue-500/20 dark:via-blue-500/10 dark:to-transparent border border-blue-200/50 dark:border-blue-500/20 p-4 md:p-5 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 hover:border-blue-300 dark:hover:border-blue-500/40">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">{t("referrals")}</p>
                    <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{displayReferralCount}</p>
                    <p className="text-[10px] md:text-xs text-blue-500 font-medium mt-1">{t("friends")}</p>
                  </div>
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                    <Users className="h-5 w-5 md:h-6 md:w-6 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions - Desktop Only */}
            <div className="hidden md:block p-5 rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-800/50 shadow-lg shadow-gray-200/50 dark:shadow-black/20">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{t("quickActions")}</h3>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((action) => (
                  <a
                    key={action.href}
                    href={action.comingSoon ? "#" : `/${locale}${action.href}`}
                    className={cn(
                      "group flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-transparent transition-all duration-200",
                      action.comingSoon
                        ? "cursor-not-allowed opacity-60"
                        : "hover:bg-white dark:hover:bg-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-md"
                    )}
                    onClick={action.comingSoon ? (e) => e.preventDefault() : undefined}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center transition-transform duration-300",
                      action.gradient,
                      action.shadowColor,
                      !action.comingSoon && "group-hover:scale-110 shadow-lg"
                    )}>
                      <action.icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{action.label}</p>
                        {action.comingSoon && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full">Soon</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{action.description}</p>
                    </div>
                    {!action.comingSoon && (
                      <ExternalLink className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Right Side - Transactions */}
          <div className="rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-800/50 shadow-lg shadow-gray-200/50 dark:shadow-black/20 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800/50">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-brand-500" />
                {t("recentActivity")}
              </h3>
              {displayTransactions.length > 0 && (
                <a
                  href={`/${locale}/transactions`}
                  className="text-xs font-medium text-brand-500 hover:text-brand-600 transition-colors"
                >
                  {t("viewAll")}
                </a>
              )}
            </div>

            {displayTransactions.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={Clock}
                  message={t("noTransactions")}
                  description={t("noTransactionsDescription")}
                  size="lg"
                />
              </div>
            ) : (
              <ScrollableList maxHeight="430px" showScrollIndicator={displayTransactions.length > 5}>
                <div className="divide-y divide-gray-100 dark:divide-gray-800/50">
                  {displayTransactions.map((tx) => {
                    const isReceived = tx.type === "REWARD_DISTRIBUTION" || tx.type === "AFFILIATE_BONUS" || tx.type === "AIRDROP" || tx.type === "BUY_WEBSITE";
                    const Icon = isReceived ? ArrowDownLeft : ArrowUpRight;

                    const getStatusIcon = () => {
                      switch (tx.status) {
                        case "COMPLETED":
                          return <CheckCircle2 className="h-3 w-3 text-emerald-500" />;
                        case "PENDING":
                          return <Clock className="h-3 w-3 text-amber-500" />;
                        case "FAILED":
                          return <AlertCircle className="h-3 w-3 text-red-500" />;
                        default:
                          return null;
                      }
                    };

                    const getStatusClass = () => {
                      switch (tx.status) {
                        case "COMPLETED":
                          return "bg-emerald-500/10 text-emerald-500";
                        case "PENDING":
                          return "bg-amber-500/10 text-amber-500";
                        case "FAILED":
                          return "bg-red-500/10 text-red-500";
                        default:
                          return "bg-gray-500/10 text-gray-500";
                      }
                    };

                    return (
                      <div
                        key={tx.id}
                        className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          isReceived
                            ? "bg-emerald-100 dark:bg-emerald-500/20"
                            : "bg-gray-100 dark:bg-gray-800"
                        )}>
                          <Icon className={cn(
                            "h-5 w-5",
                            isReceived ? "text-emerald-500" : "text-gray-500 dark:text-gray-400"
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {t(`transactionTypes.${tx.type}`, { defaultValue: tx.type.replace(/_/g, ' ') })}
                            </p>
                            <span className={cn(
                              "text-sm font-semibold",
                              isReceived ? "text-emerald-500" : "text-gray-900 dark:text-white"
                            )}>
                              {isReceived ? "+" : "-"}{tx.amount} HBCT
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {getTimeAgo(tx.createdAt)}
                            </span>
                            <span className={cn(
                              "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
                              getStatusClass()
                            )}>
                              {getStatusIcon()}
                              {t(`status.${tx.status.toLowerCase()}`, { defaultValue: tx.status })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollableList>
            )}
          </div>
        </div>

        {/* Mobile Quick Actions */}
        <div className="md:hidden mt-6 p-4 rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-800/50">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t("quickActions")}</h3>
          <div className="grid grid-cols-4 gap-2">
            {quickActions.map((action) => (
              <a
                key={action.href}
                href={action.comingSoon ? "#" : `/${locale}${action.href}`}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all",
                  action.comingSoon
                    ? "cursor-not-allowed opacity-50"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800/50 active:scale-95"
                )}
                onClick={action.comingSoon ? (e) => e.preventDefault() : undefined}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg",
                  action.gradient,
                  action.shadowColor
                )}>
                  <action.icon className="h-5 w-5 text-white" />
                </div>
                <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400 text-center leading-tight">
                  {action.label.split(' ')[0]}
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
