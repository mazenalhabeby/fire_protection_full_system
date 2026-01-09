"use client";

import { useEffect, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useAuth } from "@/hooks/useAuth";
import { useBalance, useRecentActivity, useAffiliate } from "@/hooks/useAppData";
import { capitalize, formatTokenBalance } from "@/lib/utils";
import {
  Coins,
  Lock,
  Users,
  ShoppingBag,
  TrendingUp,
  Clock,
} from "lucide-react";
import { DashboardSkeleton } from "@/components/skeletons/page-skeletons";
import { usePageLoading } from "@/hooks/useMinimumLoading";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollableList } from "@/components/ui/scrollable-list";
import { TwoFactorPrompt } from "@/components/security/TwoFactorPrompt";
import {
  StatCard,
  ActivityItem,
  MiniChart,
  QuickActionsPanel,
} from "@/components/dashboard";
import type { StatCardProps } from "@/components/dashboard";
import type { QuickAction } from "@/components/dashboard";

// Helper function to get time-based greeting key
const getGreetingKey = (): "morning" | "afternoon" | "evening" => {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
};

// Helper to get display balance with fallback and formatting
const getDisplayBalance = (
  real: string | undefined,
  showNewUserState: boolean
): string => {
  if (showNewUserState) return "0";
  if (!real || real === "0" || real === "0.00") return "0";
  return formatTokenBalance(real);
};

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const { user } = useAuth();

  // Use cached data hooks - data is prefetched on login
  const { data: balance, isLoading: balanceLoading, isError: balanceError } = useBalance();
  const { data: activities, isLoading: activitiesLoading, isError: activitiesError } = useRecentActivity(5);
  const { data: affiliate, isLoading: affiliateLoading, isError: affiliateError } = useAffiliate();

  // Minimum loading duration for premium feel
  const { isLoading: isMinLoading, stopLoading } = usePageLoading();

  // Data is loading if queries are loading (but not if they errored - show partial data)
  const isDataLoading = (balanceLoading && !balanceError) ||
                         (activitiesLoading && !activitiesError) ||
                         (affiliateLoading && !affiliateError);

  // Stop minimum loading when data is ready or errored
  useEffect(() => {
    if (!isDataLoading) {
      stopLoading();
    }
  }, [isDataLoading, stopLoading]);

  // Get activities from query result
  const recentActivities = useMemo(() => activities ?? [], [activities]);

  // Check if user has any activity
  const showNewUserState = useMemo(() => {
    const hasBalance =
      balance &&
      (parseFloat(balance.availableBalance) > 0 ||
        parseFloat(balance.lockedBalance) > 0);
    return !hasBalance && recentActivities.length === 0;
  }, [balance, recentActivities.length]);

  // Display values using centralized fallback logic
  const displayBalance = useMemo(
    () => ({
      available: getDisplayBalance(balance?.availableBalance, showNewUserState),
      locked: getDisplayBalance(balance?.lockedBalance, showNewUserState),
      total: getDisplayBalance(balance?.totalBalance, showNewUserState),
    }),
    [balance, showNewUserState]
  );

  // Referral count from affiliate data (cached)
  const displayReferralCount = affiliate?.totalReferrals ?? 0;

  // Incoming transaction types (money coming in)
  const INCOMING_TYPES = ['BUY_WEBSITE', 'AIRDROP', 'REWARD_DISTRIBUTION', 'AFFILIATE_BONUS', 'UNLOCK', 'FEE_CASHBACK', 'MARKETPLACE_REFUND', 'TRANSFER_RECEIVE'];

  // Chart data - reconstruct balance history from activities
  const chartData = useMemo(() => {
    const currentBalance = parseFloat(balance?.totalBalance?.replace(/,/g, '') || '0') || 0;

    // No data state
    if (showNewUserState || (currentBalance === 0 && recentActivities.length === 0)) {
      return { data: [0, 0, 0, 0, 0, 0, 0], changePercent: 0 };
    }

    // No activities - show flat line at current balance
    if (recentActivities.length === 0) {
      return {
        data: Array(7).fill(currentBalance),
        changePercent: 0,
      };
    }

    // Sort activities by date (oldest first for chronological order)
    const sortedActivities = [...recentActivities].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Calculate balance before all activities (working backwards)
    let startingBalance = currentBalance;
    sortedActivities.forEach((activity) => {
      const amount = parseFloat(activity.amount?.replace(/,/g, '') || '0') || 0;
      const isIncoming = INCOMING_TYPES.includes(activity.action);
      // Reverse the activity to get previous balance
      if (isIncoming) {
        startingBalance -= amount; // Was lower before incoming
      } else {
        startingBalance += amount; // Was higher before outgoing
      }
    });
    startingBalance = Math.max(0, startingBalance);

    // Build balance history points (one per activity + start + end)
    const balancePoints: number[] = [startingBalance];
    let runningBalance = startingBalance;

    sortedActivities.forEach((activity) => {
      const amount = parseFloat(activity.amount?.replace(/,/g, '') || '0') || 0;
      const isIncoming = INCOMING_TYPES.includes(activity.action);
      if (isIncoming) {
        runningBalance += amount;
      } else {
        runningBalance -= amount;
      }
      balancePoints.push(Math.max(0, runningBalance));
    });

    // Normalize to 7 data points for the chart
    let data: number[];
    if (balancePoints.length >= 7) {
      // Take evenly spaced samples
      data = [];
      for (let i = 0; i < 7; i++) {
        const index = Math.floor((i / 6) * (balancePoints.length - 1));
        data.push(balancePoints[index]);
      }
    } else {
      // Pad with starting balance at the beginning
      const padding = 7 - balancePoints.length;
      data = [...Array(padding).fill(startingBalance), ...balancePoints];
    }

    // Calculate percentage change (capped to reasonable range)
    const firstValue = data[0];
    const lastValue = data[data.length - 1];
    let changePercent = 0;

    if (firstValue > 0 && lastValue > 0) {
      // Normal case: calculate actual percentage
      changePercent = ((lastValue - firstValue) / firstValue) * 100;
    } else if (firstValue === 0 && lastValue > 0) {
      // Started from 0: show as 100% growth (new user)
      changePercent = 100;
    } else if (lastValue < firstValue) {
      // Balance decreased
      changePercent = ((lastValue - firstValue) / firstValue) * 100;
    }

    // Cap percentage to reasonable range (-99% to +999%)
    changePercent = Math.max(-99, Math.min(999, changePercent));
    changePercent = Math.round(changePercent * 10) / 10;

    return { data, changePercent };
  }, [showNewUserState, balance?.totalBalance, recentActivities]);

  // Stats configuration - dynamic based on data
  const statsConfig = useMemo(
    (): StatCardProps[] => [
      {
        label: t("availableBalance") || "Available Balance",
        value: displayBalance.available || "0",
        subtitle: "HBCT",
        icon: Coins,
        color: "brand" as const,
      },
      {
        label: t("lockedBalance") || "Locked Balance",
        value: displayBalance.locked || "0",
        subtitle: "HBCT",
        icon: Lock,
        color: "purple" as const,
      },
      {
        label: t("totalBalance") || "Total Balance",
        value: displayBalance.total || "0",
        subtitle: "HBCT",
        icon: TrendingUp,
        color: "emerald" as const,
      },
      {
        label: t("referrals") || "Referrals",
        value: displayReferralCount ?? 0,
        subtitle: t("friends") || "Friends",
        icon: Users,
        color: "blue" as const,
      },
    ],
    [t, displayBalance, displayReferralCount]
  );

  // Quick actions configuration
  const quickActions = useMemo(
    (): QuickAction[] => [
      {
        href: "/buy-tokens",
        icon: Coins,
        label: t("buyTokens") || "Buy Tokens",
        description: t("purchaseDescription") || "Purchase HBCT tokens",
        gradient: "from-brand-500 to-brand-600",
        shadowColor: "shadow-brand-500/25",
      },
      {
        href: "/affiliates",
        icon: Users,
        label: t("inviteFriends") || "Invite Friends",
        description: t("referralDescription") || "Earn referral rewards",
        gradient: "from-blue-500 to-blue-600",
        shadowColor: "shadow-blue-500/25",
      },
      {
        href: "/locking",
        icon: Lock,
        label: t("lockTokens") || "Lock Tokens",
        description: t("lockingDescription") || "Earn rewards by locking",
        gradient: "from-purple-500 to-purple-600",
        shadowColor: "shadow-purple-500/25",
      },
      {
        href: "/marketplace",
        icon: ShoppingBag,
        label: t("browseProducts") || "Browse Products",
        description: t("marketplaceDescription") || "Shop with HBCT",
        gradient: "from-gray-400 to-gray-500",
        shadowColor: "shadow-gray-500/25",
        comingSoon: true,
      },
    ],
    [t]
  );

  // User display name
  const displayName = useMemo(
    () => capitalize(user?.firstName) || user?.email?.split("@")[0] || "User",
    [user?.firstName, user?.email]
  );

  // Show skeleton while data is loading OR minimum time not met
  // But don't block forever if there are errors
  const showSkeleton = isMinLoading || (isDataLoading && !balanceError && !activitiesError && !affiliateError);

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
            backgroundSize: "60px 60px",
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
              backgroundSize: "40px 40px",
            }}
          />

          {/* Subtle top highlight */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {/* Very subtle accent glow - monochrome */}
          <div className="absolute top-0 right-0 w-96 h-32 bg-gradient-to-bl from-white/5 to-transparent blur-2xl" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-4">
            {/* Left Side - Text (50%) */}
            <div className="md:w-1/2">
              <p className="text-brand-400 text-sm font-medium mb-2">
                {t(`greeting.${getGreetingKey()}`)}
              </p>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
                {showNewUserState
                  ? t("welcomeNew", { name: displayName })
                  : t("welcomeBack", { name: displayName })}
              </h1>
              <p className="text-gray-400 text-sm md:text-base">
                {showNewUserState
                  ? t("newUserMessage")
                  : t("returningUserMessage")}
              </p>
            </div>

            {/* Right Side - Chart (50%) */}
            <div className="hidden md:flex items-center justify-end md:w-1/2">
              <MiniChart
                data={chartData.data}
                changePercent={chartData.changePercent}
                showStats={false}
              />
            </div>
          </div>
        </div>

        {/* Main Grid - Stats + Actions | Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Side - Stats + Quick Actions */}
          <div className="space-y-6">
            {/* Stats Grid - 2x2 */}
            <div className="grid grid-cols-2 gap-4">
              {statsConfig.map((stat, index) => (
                <StatCard key={index} {...stat} />
              ))}
            </div>

            {/* Quick Actions - Desktop Only */}
            <div className="hidden md:block">
              <QuickActionsPanel
                actions={quickActions}
                locale={locale}
                title={t("quickActions")}
                variant="desktop"
              />
            </div>
          </div>

          {/* Right Side - Transactions */}
          <div className="rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-800/50 shadow-lg shadow-gray-200/50 dark:shadow-black/20 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800/50">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-brand-500" />
                {t("recentActivity")}
              </h3>
              {recentActivities.length > 0 && (
                <a
                  href={`/${locale}/wallet/transactions`}
                  className="text-xs font-medium text-brand-500 hover:text-brand-600 transition-colors"
                >
                  {t("viewAll")}
                </a>
              )}
            </div>

            {recentActivities.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={Clock}
                  message={t("noTransactions")}
                  description={t("noTransactionsDescription")}
                  size="lg"
                />
              </div>
            ) : (
              <ScrollableList
                maxHeight="430px"
                showScrollIndicator={recentActivities.length > 5}
              >
                <div className="divide-y divide-gray-100 dark:divide-gray-800/50">
                  {recentActivities.map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
              </ScrollableList>
            )}
          </div>
        </div>

        {/* Mobile Quick Actions */}
        <div className="md:hidden mt-6">
          <QuickActionsPanel
            actions={quickActions}
            locale={locale}
            title={t("quickActions")}
            variant="mobile"
          />
        </div>
      </div>
    </div>
  );
}
