"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useAuth, useRequireAuth } from "@/hooks/useAuth";
import {
  useUserLocks,
  useCreateLock,
  useUnlock,
  useEarlyUnlock,
  useCancelLock,
  useLockHistory,
} from "@/hooks/useAppData";
import { useWalletBalances } from "@/hooks/useWalletData";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  Lock,
  Unlock,
  Loader2,
  CheckCircle,
  Clock,
  TrendingUp,
  Gift,
  AlertTriangle,
  X,
  History,
  XCircle,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { LockingSkeleton } from "@/components/skeletons/page-skeletons";
import { usePageLoading } from "@/hooks/useMinimumLoading";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { PremiumButton } from "@/components/ui/premium-button";
import { ScrollableList } from "@/components/ui/scrollable-list";
import { getTierStyle, lockTiers } from "@/lib/config/tiers";
import type { TokenLock } from "@/types/api";

export default function LockingPage() {
  const t = useTranslations("locking");
  const locale = useLocale();
  const { isAuthenticated } = useAuth();
  const { isLoading: authLoading } = useRequireAuth(`/${locale}/login`);

  // Use cached data hooks - data is prefetched on login
  // Tiers are now fixed from config instead of fetched from API
  const {
    data: locksData,
    isLoading: locksLoading,
    error: locksError,
    refetch: refetchLocks,
  } = useUserLocks();
  const { data: balancesData } = useWalletBalances();

  // Get HBCT available balance
  const hbctBalance = balancesData?.balances?.find(
    (b) => b.currency === "HBCT"
  );
  const availableBalance = parseFloat(hbctBalance?.availableBalance || "0");

  // Mutations with optimistic updates
  const createLockMutation = useCreateLock();
  const unlockMutation = useUnlock();
  const earlyUnlockMutation = useEarlyUnlock();
  const cancelLockMutation = useCancelLock();

  const [selectedTier, setSelectedTier] = useState<string>("");
  const [amount, setAmount] = useState<string>("");

  // Modal states
  const [showEarlyUnlockModal, setShowEarlyUnlockModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedLock, setSelectedLock] = useState<TokenLock | null>(null);
  const [activeTab, setActiveTab] = useState<"locks" | "history">("locks");

  // History data
  const { data: historyData, isLoading: historyLoading } = useLockHistory({
    page: 1,
    limit: 20,
  });

  // Minimum loading duration for premium feel
  const { isLoading: isMinLoading, stopLoading } = usePageLoading();

  // Data is loading if locks query is loading (tiers are now fixed)
  const isDataLoading = locksLoading;

  // Stop minimum loading when data is ready
  useEffect(() => {
    if (!isDataLoading) {
      stopLoading();
    }
  }, [isDataLoading, stopLoading]);

  // Use fixed tiers from config and locks from query results
  const tiers = lockTiers;
  const locks = locksData?.locks ?? [];

  // Stable timestamp for render cycle (recalculates when locks data changes)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = useMemo(() => Date.now(), [locksData]);

  // Set default selected tier from API data
  useEffect(() => {
    if (!selectedTier && tiers.length > 0) {
      setSelectedTier(tiers[0].id);
    }
  }, [selectedTier, tiers]);

  const handleLock = async () => {
    if (!amount || !selectedTier) return;

    try {
      await createLockMutation.mutateAsync({
        lockTierId: selectedTier,
        amount: parseFloat(amount),
      });
      toast.success(t("lockSuccess"));
      setAmount("");
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error(t("lockError"));
      }
    }
  };

  const handleUnlock = async (lockId: string) => {
    try {
      await unlockMutation.mutateAsync(lockId);
      toast.success(t("unlockSuccess"));
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error(t("unlockError"));
      }
    }
  };

  const handleEarlyUnlock = async () => {
    if (!selectedLock) return;
    try {
      const result = await earlyUnlockMutation.mutateAsync(selectedLock.id);
      toast.success(
        t("earlyUnlockSuccess", {
          unlockedAmount: result.unlockedAmount,
          actualReward: result.actualReward,
          penaltyPercent: result.penaltyPercent,
        })
      );
      setShowEarlyUnlockModal(false);
      setSelectedLock(null);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error(t("earlyUnlockError"));
      }
    }
  };

  const handleCancelLock = async () => {
    if (!selectedLock) return;
    try {
      const result = await cancelLockMutation.mutateAsync(selectedLock.id);
      toast.success(
        t("cancelSuccess", { refundedAmount: result.refundedAmount })
      );
      setShowCancelModal(false);
      setSelectedLock(null);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error(t("cancelError"));
      }
    }
  };

  // Minimum completion percentage required for early unlock
  const MIN_EARLY_UNLOCK_PERCENT = 50;

  // Calculate early unlock penalty for a lock using ACCRUED rewards method
  const calculatePenalty = (lock: TokenLock) => {
    const now = new Date();
    const start = new Date(lock.startDate);
    const end = new Date(lock.endDate);
    const totalDuration = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    const completedPercent = Math.min(
      100,
      Math.max(0, (elapsed / totalDuration) * 100)
    );

    // Early unlock not available before 50%
    const canEarlyUnlock =
      completedPercent >= MIN_EARLY_UNLOCK_PERCENT && completedPercent < 100;

    // Penalty tiers (applied to ACCRUED rewards only)
    let penaltyPercent = 0;
    if (completedPercent >= 50 && completedPercent < 70) penaltyPercent = 25;
    else if (completedPercent >= 70 && completedPercent < 90)
      penaltyPercent = 15;
    else if (completedPercent >= 90 && completedPercent < 100)
      penaltyPercent = 5;

    // Calculate accrued reward (proportional to time served)
    const totalReward = parseFloat(lock.rewardAmount.replace(/,/g, ""));
    const accruedReward = (totalReward * completedPercent) / 100;
    const penaltyAmount = (accruedReward * penaltyPercent) / 100;
    const actualReward = accruedReward - penaltyAmount;
    const forfeitedReward = totalReward - actualReward;

    return {
      percent: penaltyPercent,
      completed: completedPercent,
      canEarlyUnlock,
      totalReward,
      accruedReward,
      penaltyAmount,
      actualReward,
      forfeitedReward,
    };
  };

  // Check if lock is within grace period (24 hours)
  const isWithinGracePeriod = (lock: TokenLock) => {
    const now = new Date();
    const start = new Date(lock.startDate);
    const hoursSinceStart =
      (now.getTime() - start.getTime()) / (1000 * 60 * 60);
    return hoursSinceStart <= 24;
  };

  // Check if any mutation is in progress
  const isSubmitting =
    createLockMutation.isPending ||
    unlockMutation.isPending ||
    earlyUnlockMutation.isPending ||
    cancelLockMutation.isPending;

  // Use tiers from API
  const displayTiers = tiers;
  // Show only active locks in My Locks (completed/cancelled visible in History tab)
  const displayLocks = locks.filter((l) => l.status === "ACTIVE");
  const selectedTierData = displayTiers.find(
    (tier) => tier.id === selectedTier
  );

  // Validation
  const enteredAmount = parseFloat(amount) || 0;
  const minAmount = parseFloat(selectedTierData?.minAmount || "0");
  const hasInsufficientBalance = enteredAmount > availableBalance;
  const isBelowMinimum = enteredAmount > 0 && enteredAmount < minAmount;
  const canLock =
    amount &&
    selectedTier &&
    enteredAmount >= minAmount &&
    !hasInsufficientBalance;

  const estimatedReward =
    selectedTierData && amount
      ? (
          (parseFloat(amount) * parseFloat(selectedTierData.bonusPercent)) /
          100
        ).toFixed(2)
      : "0";

  // Stats
  const totalLocked = displayLocks
    .filter((l) => l.status === "ACTIVE")
    .reduce((sum, l) => sum + parseFloat(l.amount.replace(/,/g, "")), 0);
  const totalRewards = displayLocks.reduce(
    (sum, l) => sum + parseFloat(l.rewardAmount.replace(/,/g, "")),
    0
  );
  const activeLocks = displayLocks.filter((l) => l.status === "ACTIVE").length;

  // Only show full-page skeleton during initial auth loading
  const showSkeleton = authLoading || !isAuthenticated || isMinLoading;

  if (showSkeleton) {
    return (
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950" />
        </div>
        <div className="container mx-auto px-4 py-6 md:py-8 max-w-6xl">
          <LockingSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative overflow-hidden">
      {/* Premium Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950" />
        <div
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-purple-200/40 to-transparent dark:from-purple-900/20 dark:to-transparent rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-tl from-amber-200/30 to-transparent dark:from-amber-900/15 dark:to-transparent rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 py-6 md:py-8 max-w-6xl">
        <PageHeader title={t("title")} subtitle={t("subtitle")} />

        {/* Stats Cards - Modern Design */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 md:mb-8">
          {/* Total Locked */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent dark:from-purple-500/20 dark:via-purple-500/10 dark:to-transparent border border-purple-200/50 dark:border-purple-500/20 p-5 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 hover:border-purple-300 dark:hover:border-purple-500/40">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">
                  {t("stats.totalLocked")}
                </p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                  {totalLocked.toLocaleString()}
                </p>
                <p className="text-xs text-purple-500 font-medium mt-1">HBCT</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform duration-300">
                <Lock className="h-7 w-7 text-white" />
              </div>
            </div>
          </div>

          {/* Total Rewards */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-500/20 dark:via-emerald-500/10 dark:to-transparent border border-emerald-200/50 dark:border-emerald-500/20 p-5 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10 hover:border-emerald-300 dark:hover:border-emerald-500/40">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">
                  {t("stats.totalRewards")}
                </p>
                <p className="text-2xl md:text-3xl font-bold text-emerald-500">
                  +{totalRewards.toLocaleString()}
                </p>
                <p className="text-xs text-emerald-500 font-medium mt-1">
                  {t("stats.hbctEarned")}
                </p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                <Gift className="h-7 w-7 text-white" />
              </div>
            </div>
          </div>

          {/* Active Locks */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-500/20 dark:via-amber-500/10 dark:to-transparent border border-amber-200/50 dark:border-amber-500/20 p-5 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/10 hover:border-amber-300 dark:hover:border-amber-500/40">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">
                  {t("stats.activeLocks")}
                </p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                  {activeLocks}
                </p>
                <p className="text-xs text-amber-500 font-medium mt-1">
                  {t("stats.currentlyStaking")}
                </p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform duration-300">
                <Clock className="h-7 w-7 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* How It Works - Compact Premium Design */}
        <div className="mb-6">
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-white via-gray-50/50 to-white dark:from-gray-900 dark:via-gray-800/50 dark:to-gray-900 border border-gray-200/60 dark:border-gray-700/60 shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/[0.03] via-transparent to-emerald-500/[0.03]" />

            <div className="relative px-4 py-4 md:px-6 md:py-5">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-5">
                {/* Title */}
                <div className="flex items-center gap-3 lg:shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                    <Lock className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                      {t("howItWorks.title")}
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      {t("howItWorks.subtitle")}
                    </p>
                  </div>
                </div>

                {/* Timeline Steps with Fees */}
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                  {/* Step 1 - Grace Period */}
                  <div className="relative p-3 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-200/50 dark:border-emerald-800/30">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-sm">
                        <Clock className="h-3.5 w-3.5 text-white" />
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                        {t("howItWorks.gracePeriodTime")}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                      {t("howItWorks.gracePeriod")}
                    </p>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                      {t("howItWorks.fullRefund")}
                    </p>
                  </div>

                  {/* Step 2 - Locked */}
                  <div className="relative p-3 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-200/50 dark:border-amber-800/30">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                        <Lock className="h-3.5 w-3.5 text-white" />
                      </div>
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">
                        {t("howItWorks.lockedTime")}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                      {t("howItWorks.locked")}
                    </p>
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                      {t("howItWorks.noEarlyUnlock")}
                    </p>
                  </div>

                  {/* Step 3 - Early Unlock with Fees */}
                  <div className="relative p-3 rounded-xl bg-gradient-to-br from-purple-500/10 to-fuchsia-500/5 border border-purple-200/50 dark:border-purple-800/30">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-400 to-fuchsia-500 flex items-center justify-center shadow-sm">
                        <Unlock className="h-3.5 w-3.5 text-white" />
                      </div>
                      <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase">
                        {t("howItWorks.earlyUnlockTime")}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                      {t("howItWorks.earlyUnlock")}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold">
                        {t("howItWorks.penalty50to70")}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold">
                        {t("howItWorks.penalty70to90")}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                        {t("howItWorks.penalty90plus")}
                      </span>
                    </div>
                  </div>

                  {/* Step 4 - Full Rewards */}
                  <div className="relative p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-200/50 dark:border-blue-800/30">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shadow-sm">
                        <Gift className="h-3.5 w-3.5 text-white" />
                      </div>
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">
                        {t("howItWorks.fullRewardsTime")}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                      {t("howItWorks.fullRewards")}
                    </p>
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                      {t("howItWorks.zeroFees")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Lock Tokens - Left Side */}
          <div className="lg:col-span-3 space-y-5">
            {/* Lock Card - Swap Style */}
            <div className="rounded-2xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-800/50 shadow-xl shadow-gray-200/50 dark:shadow-black/20 overflow-hidden">
              {/* Card Header */}
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800/50">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Lock className="h-4 w-4 text-purple-500" />
                    {t("form.lockTokens")}
                  </h2>
                  <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1 px-2 py-1 bg-emerald-500/10 rounded-full">
                    <TrendingUp className="h-3 w-3" />
                    {t("form.upToBonus", {
                      max: Math.max(
                        ...tiers.map((t) => parseFloat(t.bonusPercent))
                      ),
                    })}
                  </span>
                </div>
              </div>

              <div className="p-5 space-y-5">
                {/* Tier Selection - 3D Coin Cards */}
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 md:mb-4 font-medium">
                    {t("form.selectLockPeriod")}
                  </p>
                  <div className="grid grid-cols-3 gap-2 md:gap-4">
                    {displayTiers.map((tier) => {
                      const config = getTierStyle(tier.name);
                      const isSelected = selectedTier === tier.id;

                      return (
                        <button
                          key={tier.id}
                          onClick={() => setSelectedTier(tier.id)}
                          className={cn(
                            "group relative p-2 pb-3 md:p-4 md:pb-5 rounded-xl md:rounded-2xl text-center transition-all duration-300",
                            "border-2 hover:scale-[1.03] active:scale-[0.98]",
                            isSelected
                              ? `bg-gradient-to-br ${config.bgGradient} ${config.borderColor} shadow-xl ${config.shadowColor}`
                              : "bg-gray-50/80 dark:bg-gray-800/50 border-transparent hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-lg"
                          )}
                        >
                          {/* 3D Coin with Logo Overlay */}
                          <div className="relative mx-auto mb-2 md:mb-3">
                            <div
                              className={cn(
                                "relative w-12 h-12 md:w-20 md:h-20 mx-auto transition-all duration-300",
                                isSelected && "transform -translate-y-1",
                                "group-hover:transform group-hover:-translate-y-1"
                              )}
                            >
                              {/* Coin Background */}
                              {config.coin && (
                                <Image
                                  src={config.coin}
                                  alt={tier.name}
                                  width={80}
                                  height={80}
                                  className={cn(
                                    "absolute inset-0 w-full h-full object-contain drop-shadow-lg transition-all duration-300",
                                    isSelected && "drop-shadow-2xl",
                                    "group-hover:drop-shadow-2xl"
                                  )}
                                />
                              )}
                              {/* Logo Overlay */}
                              <div className="absolute inset-0 flex items-center justify-center">
                                {config.logo && (
                                  <Image
                                    src={config.logo}
                                    alt={`${tier.name} logo`}
                                    width={44}
                                    height={44}
                                    className="w-6 h-6 md:w-11 md:h-11 object-contain"
                                  />
                                )}
                              </div>
                            </div>
                            {isSelected && (
                              <div className="absolute -bottom-1 right-1/2 translate-x-1/2 translate-y-1/2 w-5 h-5 md:w-6 md:h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg ring-2 ring-white dark:ring-gray-900">
                                <CheckCircle className="h-3 w-3 md:h-3.5 md:w-3.5 text-white" />
                              </div>
                            )}
                          </div>

                          {/* Tier Info */}
                          <p
                            className={cn(
                              "font-bold text-xs md:text-base mb-0.5 transition-colors",
                              isSelected
                                ? config.textColor
                                : "text-gray-700 dark:text-gray-300"
                            )}
                          >
                            {tier.name}
                          </p>
                          <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 mb-1 md:mb-2">
                            {tier.lockMonths} {t("months")}
                          </p>
                          <div
                            className={cn(
                              "inline-flex items-center gap-0.5 md:gap-1 px-2 py-1 md:px-3 md:py-1.5 rounded-full text-[10px] md:text-xs font-bold",
                              "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                              isSelected && "bg-emerald-500/25"
                            )}
                          >
                            <TrendingUp className="h-2.5 w-2.5 md:h-3 md:w-3" />
                            +{tier.bonusPercent}%
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Amount Input */}
                <div className="p-3 md:p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      {t("form.amountToLock")}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] sm:text-xs text-gray-400">
                        {t("form.available")}{" "}
                        <span className="font-semibold text-gray-600 dark:text-gray-300">
                          {availableBalance.toLocaleString()}
                        </span>{" "}
                        HBCT
                      </span>
                      {availableBalance > 0 && (
                        <button
                          onClick={() => setAmount(availableBalance.toString())}
                          className="text-[10px] sm:text-xs px-2 py-0.5 rounded bg-brand-500/10 text-brand-600 dark:text-brand-400 font-medium hover:bg-brand-500/20 transition-colors"
                        >
                          {t("form.max")}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <input
                      type="number"
                      placeholder="0.00"
                      min="0"
                      value={amount}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "" || parseFloat(value) >= 0) {
                          setAmount(value);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "-" || e.key === "e") {
                          e.preventDefault();
                        }
                      }}
                      className="flex-1 min-w-0 bg-transparent text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm shrink-0">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                        <Image
                          src="/images/logo-white.svg"
                          alt="HBCT"
                          width={14}
                          height={14}
                          className="w-3 h-3 sm:w-3.5 sm:h-3.5"
                        />
                      </div>
                      <span className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white">
                        HBCT
                      </span>
                    </div>
                  </div>
                </div>

                {/* Estimated Reward Preview */}
                <div className="p-3 md:p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5">
                        <Gift className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500" />
                        {t("estimatedReward")}
                      </p>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-emerald-500">
                        +{estimatedReward}{" "}
                        <span className="text-sm sm:text-base font-semibold">
                          HBCT
                        </span>
                      </p>
                    </div>
                    {selectedTierData && (
                      <div className="flex items-center gap-2 sm:block sm:text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-emerald-500/20">
                        <p className="text-xs text-gray-400">
                          {t("form.lockPeriod")}
                        </p>
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {selectedTierData.lockMonths} {t("months")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Lock Button - Dynamic Text */}
                <PremiumButton
                  onClick={handleLock}
                  disabled={!canLock || availableBalance === 0}
                  isLoading={isSubmitting}
                  loadingText={t("locking")}
                  icon={Lock}
                  variant="purple"
                  size="lg"
                  fullWidth
                >
                  {availableBalance === 0
                    ? t("form.noBalance")
                    : !amount || enteredAmount === 0
                    ? t("form.enterAmount")
                    : hasInsufficientBalance
                    ? t("form.insufficientBalance")
                    : isBelowMinimum
                    ? t("form.minAmount", {
                        amount: minAmount.toLocaleString(),
                      })
                    : t("lockNow")}
                </PremiumButton>
              </div>
            </div>
          </div>

          {/* My Locks - Right Side */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-800/50 shadow-xl shadow-gray-200/50 dark:shadow-black/20 overflow-hidden">
              {/* Tabs */}
              <div className="flex items-center border-b border-gray-100 dark:border-gray-800/50">
                <button
                  onClick={() => setActiveTab("locks")}
                  className={cn(
                    "flex-1 px-5 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors",
                    activeTab === "locks"
                      ? "text-brand-600 dark:text-brand-400 border-b-2 border-brand-500"
                      : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  )}
                >
                  <Lock className="h-4 w-4" />
                  {t("myLocks")}
                  <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                    {displayLocks.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={cn(
                    "flex-1 px-5 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors",
                    activeTab === "history"
                      ? "text-brand-600 dark:text-brand-400 border-b-2 border-brand-500"
                      : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  )}
                >
                  <History className="h-4 w-4" />
                  {t("history.title")}
                </button>
              </div>

              {activeTab === "locks" ? (
                locksError ? (
                  <div className="p-4">
                    <div className="text-center py-8">
                      <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-3" />
                      <p className="text-gray-600 dark:text-gray-400 mb-2">
                        {t("locks.failedToLoad")}
                      </p>
                      <p className="text-xs text-red-500 mb-3">
                        {(locksError as Error)?.message || "Unknown error"}
                      </p>
                      <button
                        onClick={() => refetchLocks()}
                        className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
                      >
                        {t("locks.retry")}
                      </button>
                    </div>
                  </div>
                ) : locksLoading ? (
                  <div className="p-4 flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : displayLocks.length === 0 ? (
                  <div className="p-4">
                    <EmptyState icon={Lock} message={t("noLocks")} size="lg" />
                  </div>
                ) : (
                  <ScrollableList
                    maxHeight="580px"
                    showScrollIndicator={displayLocks.length > 4}
                    className="p-4"
                  >
                    <div className="space-y-5">
                      {displayLocks.map((lock) => {
                        const isActive = lock.status === "ACTIVE";
                        const isCancelled = lock.status === "CANCELLED";
                        const isCompleted = lock.status === "COMPLETED";
                        const endTime = new Date(lock.endDate).getTime();
                        const startTime = new Date(lock.startDate).getTime();
                        const canUnlock = isActive && endTime <= now;
                        const totalDays = Math.ceil(
                          (endTime - startTime) / (1000 * 60 * 60 * 24)
                        );
                        const daysRemaining = Math.max(
                          0,
                          Math.ceil((endTime - now) / (1000 * 60 * 60 * 24))
                        );
                        const daysPassed = totalDays - daysRemaining;
                        const config = getTierStyle(lock.tier.name);
                        const penalty = isActive
                          ? calculatePenalty(lock)
                          : null;
                        const canCancel = isActive && isWithinGracePeriod(lock);
                        // Early unlock only available after 50% completion and not during grace period
                        const canEarlyUnlock =
                          isActive &&
                          !canUnlock &&
                          !canCancel &&
                          (penalty?.canEarlyUnlock ?? false);
                        const progressPercent = penalty?.completed ?? 100;

                        // Tier-specific gradients
                        const tierGradients: Record<
                          string,
                          { card: string; ring: string; glow: string }
                        > = {
                          Silver: {
                            card: "from-slate-100 via-gray-50 to-slate-100 dark:from-slate-800/90 dark:via-gray-900/90 dark:to-slate-800/90",
                            ring: "ring-slate-300/50 dark:ring-slate-500/30",
                            glow: "from-slate-400/30 dark:from-slate-400/20",
                          },
                          Gold: {
                            card: "from-amber-50 via-yellow-50/80 to-orange-50 dark:from-amber-900/40 dark:via-yellow-900/30 dark:to-orange-900/40",
                            ring: "ring-amber-300/50 dark:ring-amber-500/30",
                            glow: "from-amber-400/40 dark:from-amber-400/30",
                          },
                          Platinum: {
                            card: "from-violet-50 via-purple-50/80 to-fuchsia-50 dark:from-violet-900/40 dark:via-purple-900/30 dark:to-fuchsia-900/40",
                            ring: "ring-purple-300/50 dark:ring-purple-500/30",
                            glow: "from-purple-400/40 dark:from-purple-400/30",
                          },
                        };
                        const tierStyle =
                          tierGradients[lock.tier.name] || tierGradients.Silver;

                        return (
                          <div key={lock.id} className="group relative">
                            {/* Outer Glow Ring */}
                            {isActive && (
                              <div
                                className={cn(
                                  "absolute -inset-[1px] rounded-[22px] bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm",
                                  tierStyle.glow,
                                  "to-transparent"
                                )}
                              />
                            )}

                            {/* Main Card */}
                            <div
                              className={cn(
                                "relative overflow-hidden rounded-[20px] transition-all duration-500",
                                "ring-1",
                                isActive
                                  ? tierStyle.ring
                                  : isCancelled
                                  ? "ring-red-200/50 dark:ring-red-800/30"
                                  : "ring-gray-200/50 dark:ring-gray-700/50",
                                "hover:shadow-2xl hover:-translate-y-1"
                              )}
                            >
                              {/* Card Background */}
                              <div
                                className={cn(
                                  "absolute inset-0 bg-gradient-to-br",
                                  isActive
                                    ? tierStyle.card
                                    : isCancelled
                                    ? "from-red-50 to-gray-50 dark:from-red-950/30 dark:to-gray-900"
                                    : "from-gray-50 to-gray-100 dark:from-gray-800/80 dark:to-gray-900"
                                )}
                              />

                              {/* Decorative Elements */}
                              {isActive && (
                                <>
                                  {/* Top Right Decoration */}
                                  <div className="absolute -top-12 -right-12 w-32 h-32">
                                    <div
                                      className={cn(
                                        "absolute inset-0 rounded-full blur-2xl opacity-60 group-hover:opacity-80 group-hover:scale-125 transition-all duration-700",
                                        lock.tier.name === "Gold"
                                          ? "bg-gradient-to-br from-amber-300 to-orange-400"
                                          : lock.tier.name === "Platinum"
                                          ? "bg-gradient-to-br from-purple-300 to-fuchsia-400"
                                          : "bg-gradient-to-br from-slate-300 to-gray-400"
                                      )}
                                    />
                                  </div>
                                  {/* Floating Particles */}
                                  <div className="absolute top-4 right-16 w-2 h-2 rounded-full bg-white/40 dark:bg-white/20 animate-pulse" />
                                  <div className="absolute top-8 right-8 w-1.5 h-1.5 rounded-full bg-white/30 dark:bg-white/15 animate-pulse delay-300" />
                                  <div className="absolute top-12 right-20 w-1 h-1 rounded-full bg-white/25 dark:bg-white/10 animate-pulse delay-500" />
                                </>
                              )}

                              {/* Content */}
                              <div className="relative p-5">
                                {/* Header with Circular Progress */}
                                <div className="flex items-center gap-4 mb-5">
                                  {/* Circular Progress Indicator */}
                                  <div className="relative shrink-0">
                                    <svg
                                      className="w-[72px] h-[72px] -rotate-90"
                                      viewBox="0 0 72 72"
                                    >
                                      {/* Background Circle */}
                                      <circle
                                        cx="36"
                                        cy="36"
                                        r="30"
                                        className="fill-none stroke-gray-200 dark:stroke-gray-700"
                                        strokeWidth="6"
                                      />
                                      {/* Progress Circle */}
                                      {isActive && (
                                        <circle
                                          cx="36"
                                          cy="36"
                                          r="30"
                                          className={cn(
                                            "fill-none transition-all duration-1000 ease-out",
                                            lock.tier.name === "Gold"
                                              ? "stroke-amber-500"
                                              : lock.tier.name === "Platinum"
                                              ? "stroke-purple-500"
                                              : "stroke-slate-500"
                                          )}
                                          strokeWidth="6"
                                          strokeLinecap="round"
                                          strokeDasharray={`${
                                            progressPercent * 1.885
                                          } 188.5`}
                                        />
                                      )}
                                    </svg>
                                    {/* Center Content - 3D Coin with Logo Overlay */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="relative w-14 h-14">
                                        {/* Coin Background */}
                                        {config.coin && (
                                          <Image
                                            src={config.coin}
                                            alt={lock.tier.name}
                                            width={56}
                                            height={56}
                                            className={cn(
                                              "absolute inset-0 w-full h-full object-contain drop-shadow-lg transition-all duration-300",
                                              isActive &&
                                                "group-hover:drop-shadow-2xl",
                                              !isActive &&
                                                "opacity-50 grayscale"
                                            )}
                                          />
                                        )}
                                        {/* Logo Overlay */}
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          {config.logo ? (
                                            <Image
                                              src={config.logo}
                                              alt={`${lock.tier.name} logo`}
                                              width={28}
                                              height={28}
                                              className={cn(
                                                "object-contain",
                                                !isActive && "opacity-50"
                                              )}
                                            />
                                          ) : (
                                            <Lock className="h-5 w-5 text-white" />
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Lock Details */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span
                                        className={cn(
                                          "text-xs font-bold uppercase tracking-wider",
                                          isActive
                                            ? lock.tier.name === "Gold"
                                              ? "text-amber-600 dark:text-amber-400"
                                              : lock.tier.name === "Platinum"
                                              ? "text-purple-600 dark:text-purple-400"
                                              : "text-slate-600 dark:text-slate-400"
                                            : "text-gray-500"
                                        )}
                                      >
                                        {lock.tier.name} {t("locks.lock")}
                                      </span>
                                      <span
                                        className={cn(
                                          "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase",
                                          isActive
                                            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                            : isCancelled
                                            ? "bg-red-500/20 text-red-600 dark:text-red-400"
                                            : "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                                        )}
                                      >
                                        <span
                                          className={cn(
                                            "w-1.5 h-1.5 rounded-full",
                                            isActive
                                              ? "bg-emerald-500 animate-pulse"
                                              : isCancelled
                                              ? "bg-red-500"
                                              : "bg-blue-500"
                                          )}
                                        />
                                        {isActive
                                          ? t("active")
                                          : isCancelled
                                          ? t("locks.cancelled")
                                          : t("completed")}
                                      </span>
                                    </div>
                                    <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-none">
                                      {parseFloat(lock.amount).toLocaleString()}
                                      <span className="text-base font-bold text-gray-400 ml-1.5">
                                        HBCT
                                      </span>
                                    </p>
                                    {isActive && (
                                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 flex items-center gap-1.5">
                                        <Clock className="h-3 w-3" />
                                        <span className="font-semibold">
                                          {daysRemaining}
                                        </span>{" "}
                                        {t("locks.daysRemaining")}
                                        <span className="text-gray-300 dark:text-gray-600 mx-1">
                                          •
                                        </span>
                                        <span className="font-bold text-gray-900 dark:text-white">
                                          {Math.round(progressPercent)}%
                                        </span>{" "}
                                        {t("locks.complete")}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Detailed Progress Bar */}
                                {isActive && (
                                  <div className="mb-5">
                                    <div className="relative h-3 bg-gray-200/80 dark:bg-gray-800/80 rounded-full overflow-hidden shadow-inner">
                                      {/* Progress Fill */}
                                      <div
                                        className={cn(
                                          "absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out",
                                          lock.tier.name === "Gold"
                                            ? "bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400"
                                            : lock.tier.name === "Platinum"
                                            ? "bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400"
                                            : "bg-gradient-to-r from-slate-400 via-gray-400 to-slate-500"
                                        )}
                                        style={{ width: `${progressPercent}%` }}
                                      />
                                      {/* Shine Effect */}
                                      <div
                                        className="absolute inset-y-0 left-0 bg-gradient-to-b from-white/40 to-transparent rounded-full"
                                        style={{ width: `${progressPercent}%` }}
                                      />
                                      {/* Animated Shimmer */}
                                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                                    </div>
                                    {/* Timeline Markers */}
                                    <div className="flex items-center justify-between mt-2 text-[10px]">
                                      <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                        {new Date(
                                          lock.startDate
                                        ).toLocaleDateString()}
                                      </span>
                                      <span
                                        className={cn(
                                          "font-bold px-2 py-0.5 rounded-full",
                                          lock.tier.name === "Gold"
                                            ? "text-amber-600 dark:text-amber-400 bg-amber-500/10"
                                            : lock.tier.name === "Platinum"
                                            ? "text-purple-600 dark:text-purple-400 bg-purple-500/10"
                                            : "text-slate-600 dark:text-slate-400 bg-slate-500/10"
                                        )}
                                      >
                                        {daysPassed}/{totalDays}{" "}
                                        {t("locks.days")}
                                      </span>
                                      <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                        {new Date(
                                          lock.endDate
                                        ).toLocaleDateString()}
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {/* Stats Grid */}
                                <div className="grid grid-cols-3 gap-3 mb-5">
                                  <div
                                    className={cn(
                                      "relative overflow-hidden p-3 rounded-2xl border",
                                      isActive
                                        ? "bg-white/60 dark:bg-gray-900/60 border-gray-200/50 dark:border-gray-700/50"
                                        : "bg-gray-100/50 dark:bg-gray-800/50 border-gray-200/30 dark:border-gray-700/30"
                                    )}
                                  >
                                    <div
                                      className={cn(
                                        "absolute top-0 right-0 w-12 h-12 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2",
                                        lock.tier.name === "Gold"
                                          ? "bg-amber-400/20"
                                          : lock.tier.name === "Platinum"
                                          ? "bg-purple-400/20"
                                          : "bg-slate-400/20"
                                      )}
                                    />
                                    <div className="relative">
                                      <Clock
                                        className={cn(
                                          "h-5 w-5 mb-2",
                                          lock.tier.name === "Gold"
                                            ? "text-amber-500"
                                            : lock.tier.name === "Platinum"
                                            ? "text-purple-500"
                                            : "text-slate-500"
                                        )}
                                      />
                                      <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold mb-0.5">
                                        {t("locks.duration")}
                                      </p>
                                      <p className="text-lg font-black text-gray-900 dark:text-white">
                                        {lock.tier.lockMonths}M
                                      </p>
                                    </div>
                                  </div>

                                  <div className="relative overflow-hidden p-3 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/20 border border-emerald-200/50 dark:border-emerald-700/30">
                                    <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-400/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                                    <div className="relative">
                                      <Gift className="h-5 w-5 text-emerald-500 mb-2" />
                                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-semibold mb-0.5">
                                        {t("reward")}
                                      </p>
                                      <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                                        +
                                        {parseFloat(
                                          lock.rewardAmount
                                        ).toLocaleString()}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="relative overflow-hidden p-3 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/20 border border-amber-200/50 dark:border-amber-700/30">
                                    <div className="absolute top-0 right-0 w-12 h-12 bg-amber-400/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                                    <div className="relative">
                                      <TrendingUp className="h-5 w-5 text-amber-500 mb-2" />
                                      <p className="text-[10px] text-amber-600 dark:text-amber-400 uppercase tracking-wider font-semibold mb-0.5">
                                        {t("bonus")}
                                      </p>
                                      <p className="text-lg font-black text-amber-600 dark:text-amber-400">
                                        +{lock.tier.bonusPercent}%
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                {isActive && (
                                  <div className="space-y-3">
                                    <div className="flex gap-3">
                                      {canUnlock ? (
                                        <button
                                          onClick={() => handleUnlock(lock.id)}
                                          disabled={isSubmitting}
                                          className="group/btn flex-1 relative overflow-hidden py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-500 bg-size-200 bg-pos-0 hover:bg-pos-100 text-white font-bold text-sm transition-all duration-500 flex items-center justify-center gap-2.5 disabled:opacity-50 shadow-xl shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:-translate-y-0.5"
                                        >
                                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700" />
                                          {unlockMutation.isPending ? (
                                            <>
                                              <Loader2 className="h-5 w-5 animate-spin" />
                                              <span>{t("locks.claiming")}</span>
                                            </>
                                          ) : (
                                            <>
                                              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                                                <Gift className="h-4 w-4" />
                                              </div>
                                              <span>
                                                {t("locks.claim", {
                                                  amount: parseFloat(
                                                    lock.rewardAmount
                                                  ).toLocaleString(),
                                                })}
                                              </span>
                                              <ChevronRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                                            </>
                                          )}
                                        </button>
                                      ) : (
                                        <>
                                          {canCancel && (
                                            <button
                                              onClick={() => {
                                                setSelectedLock(lock);
                                                setShowCancelModal(true);
                                              }}
                                              disabled={isSubmitting}
                                              className="group/btn flex-1 relative overflow-hidden py-4 rounded-2xl bg-gradient-to-r from-slate-500 via-gray-500 to-slate-500 bg-size-200 bg-pos-0 hover:bg-pos-100 text-white font-bold text-sm transition-all duration-500 flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-gray-500/20 hover:shadow-gray-500/40 hover:-translate-y-0.5"
                                            >
                                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700" />
                                              <span>
                                                {t("locks.cancelLock")}
                                              </span>
                                              <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-semibold">
                                                {t("locks.noFee")}
                                              </span>
                                            </button>
                                          )}
                                          {canEarlyUnlock && (
                                            <button
                                              onClick={() => {
                                                setSelectedLock(lock);
                                                setShowEarlyUnlockModal(true);
                                              }}
                                              disabled={isSubmitting}
                                              className="group/btn flex-1 relative overflow-hidden py-4 rounded-2xl bg-gradient-to-r from-rose-500 via-red-500 to-rose-500 bg-size-200 bg-pos-0 hover:bg-pos-100 text-white font-bold text-sm transition-all duration-500 flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-rose-500/30 hover:shadow-rose-500/50 hover:-translate-y-0.5"
                                            >
                                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700" />
                                              <span>
                                                {t("howItWorks.earlyUnlock")}
                                              </span>
                                              <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-semibold">
                                                {t("locks.fee", {
                                                  percent:
                                                    penalty?.percent ?? 0,
                                                })}
                                              </span>
                                            </button>
                                          )}
                                          {/* Locked state - between grace period and 50% completion */}
                                          {!canCancel && !canEarlyUnlock && (
                                            <div className="flex-1 py-4 rounded-2xl bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 flex items-center justify-center gap-3">
                                              <Lock className="h-5 w-5 text-gray-400" />
                                              <div className="text-center">
                                                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                                                  {t("locks.lockedUntil50")}
                                                </p>
                                                <p className="text-[10px] text-gray-400 dark:text-gray-500">
                                                  {(
                                                    MIN_EARLY_UNLOCK_PERCENT -
                                                    (penalty?.completed || 0)
                                                  ).toFixed(1)}
                                                  %{" "}
                                                  {t("locks.moreToUnlockEarly")}
                                                </p>
                                              </div>
                                            </div>
                                          )}
                                        </>
                                      )}
                                    </div>
                                    {/* Helpful info about early unlock */}
                                    {!canUnlock && !canCancel && (
                                      <p className="text-[10px] text-center text-gray-400 dark:text-gray-500">
                                        {canEarlyUnlock
                                          ? `${t(
                                              "locks.earlyUnlockAvailable"
                                            )} • ${t("locks.youWillReceive", {
                                              amount:
                                                penalty?.actualReward.toFixed(
                                                  2
                                                ) ?? "0",
                                              penalty: penalty?.percent ?? 0,
                                            })}`
                                          : `${t(
                                              "locks.earlyUnlockAt50"
                                            )} • ${t("locks.waitMoreDays", {
                                              days: Math.ceil(
                                                ((MIN_EARLY_UNLOCK_PERCENT -
                                                  (penalty?.completed || 0)) *
                                                  totalDays) /
                                                  100
                                              ),
                                            })}`}
                                      </p>
                                    )}
                                  </div>
                                )}

                                {/* Completed/Cancelled Footer */}
                                {!isActive && (
                                  <div
                                    className={cn(
                                      "flex items-center justify-between pt-4 mt-2 border-t",
                                      isCancelled
                                        ? "border-red-200/50 dark:border-red-800/30"
                                        : "border-gray-200/50 dark:border-gray-700/50"
                                    )}
                                  >
                                    <span className="text-xs text-gray-500 flex items-center gap-2">
                                      {isCancelled ? (
                                        <XCircle className="h-4 w-4 text-red-400" />
                                      ) : (
                                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                                      )}
                                      {isCancelled
                                        ? t("locks.cancelledOn")
                                        : t("locks.completedOn")}{" "}
                                      {new Date(
                                        lock.endDate
                                      ).toLocaleDateString()}
                                    </span>
                                    {isCompleted && (
                                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-500 px-3 py-1.5 rounded-full bg-emerald-500/10">
                                        <Gift className="h-3.5 w-3.5" />+
                                        {parseFloat(
                                          lock.rewardAmount
                                        ).toLocaleString()}{" "}
                                        {t("locks.claimed")}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollableList>
                )
              ) : (
                /* History Tab */
                <ScrollableList maxHeight="580px" className="p-4">
                  {historyLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  ) : !historyData?.history?.length ? (
                    <EmptyState
                      icon={History}
                      message={t("history.noHistory")}
                      size="lg"
                    />
                  ) : (
                    <div className="space-y-2">
                      {historyData.history.map((entry) => (
                        <div
                          key={entry.id}
                          className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center",
                                  entry.action === "LOCK" &&
                                    "bg-purple-500/10 text-purple-500",
                                  entry.action === "UNLOCK" &&
                                    "bg-emerald-500/10 text-emerald-500",
                                  entry.action === "EARLY_UNLOCK" &&
                                    "bg-amber-500/10 text-amber-500",
                                  entry.action === "CANCEL" &&
                                    "bg-red-500/10 text-red-500",
                                  entry.action === "REWARD_DISTRIBUTION" &&
                                    "bg-blue-500/10 text-blue-500"
                                )}
                              >
                                {entry.action === "LOCK" && (
                                  <Lock className="h-4 w-4" />
                                )}
                                {entry.action === "UNLOCK" && (
                                  <Unlock className="h-4 w-4" />
                                )}
                                {entry.action === "EARLY_UNLOCK" && (
                                  <AlertTriangle className="h-4 w-4" />
                                )}
                                {entry.action === "CANCEL" && (
                                  <XCircle className="h-4 w-4" />
                                )}
                                {entry.action === "REWARD_DISTRIBUTION" && (
                                  <Gift className="h-4 w-4" />
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {entry.action === "LOCK" &&
                                    t("history.lockedTokens")}
                                  {entry.action === "UNLOCK" &&
                                    t("history.unlockedTokens")}
                                  {entry.action === "EARLY_UNLOCK" &&
                                    t("history.earlyUnlock")}
                                  {entry.action === "CANCEL" &&
                                    t("history.lockCancelled")}
                                  {entry.action === "REWARD_DISTRIBUTION" &&
                                    t("history.rewardReceived")}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {entry.tierName} •{" "}
                                  {new Date(
                                    entry.createdAt
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p
                                className={cn(
                                  "text-sm font-bold",
                                  entry.action === "LOCK"
                                    ? "text-purple-500"
                                    : entry.action === "CANCEL"
                                    ? "text-red-500"
                                    : "text-emerald-500"
                                )}
                              >
                                {entry.action === "LOCK" ? "-" : "+"}
                                {entry.amount} HBCT
                              </p>
                              {entry.rewardAmount && (
                                <p className="text-xs text-emerald-500">
                                  +{entry.rewardAmount} {t("history.reward")}
                                </p>
                              )}
                              {entry.penaltyAmount &&
                                parseFloat(entry.penaltyAmount) > 0 && (
                                  <p className="text-xs text-red-500">
                                    -{entry.penaltyAmount}{" "}
                                    {t("history.penalty")}
                                  </p>
                                )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollableList>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Early Unlock Confirmation Modal */}
      {showEarlyUnlockModal &&
        selectedLock &&
        (() => {
          const penalty = calculatePenalty(selectedLock);
          const lockedAmount = parseFloat(
            selectedLock.amount.replace(/,/g, "")
          );
          const totalReceived = lockedAmount + penalty.actualReward;

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    {t("earlyUnlockModal.title")}
                  </h3>
                  <button
                    onClick={() => {
                      setShowEarlyUnlockModal(false);
                      setSelectedLock(null);
                    }}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  {/* Progress indicator */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {t("earlyUnlockModal.lockProgress")}
                      </span>
                      <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                        {penalty.completed.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${penalty.completed}%` }}
                      />
                    </div>
                  </div>

                  {/* How it works explanation */}
                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                      <span className="font-bold">
                        {t("earlyUnlockModal.howItWorks")}
                      </span>{" "}
                      {t("earlyUnlockModal.howItWorksDesc", {
                        completed: penalty.completed.toFixed(0),
                        accrued: penalty.accruedReward.toFixed(2),
                        penalty: penalty.percent,
                      })}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">
                        {t("earlyUnlockModal.lockedAmount")}
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {selectedLock.amount} HBCT
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">
                        {t("earlyUnlockModal.totalRewardIfFull")}
                      </span>
                      <span className="font-semibold text-gray-400 line-through">
                        +{penalty.totalReward.toFixed(2)} HBCT
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">
                        {t("earlyUnlockModal.accruedReward", {
                          percent: penalty.completed.toFixed(0),
                        })}
                      </span>
                      <span className="font-semibold text-emerald-500">
                        +{penalty.accruedReward.toFixed(2)} HBCT
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">
                        {t("earlyUnlockModal.penaltyOf", {
                          percent: penalty.percent,
                        })}
                      </span>
                      <span className="font-semibold text-red-500">
                        -{penalty.penaltyAmount.toFixed(2)} HBCT
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">
                        {t("earlyUnlockModal.forfeited")}
                      </span>
                      <span className="font-semibold text-gray-400">
                        -{penalty.forfeitedReward.toFixed(2)} HBCT
                      </span>
                    </div>
                    <div className="pt-3 mt-2 border-t border-gray-100 dark:border-gray-800 flex justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t("earlyUnlockModal.youWillReceive")}
                      </span>
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        {totalReceived.toFixed(2)} HBCT
                      </span>
                    </div>
                  </div>

                  {/* Tip to wait */}
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      💡{" "}
                      <span className="font-semibold">
                        {t("earlyUnlockModal.tip")}
                      </span>{" "}
                      {t("earlyUnlockModal.tipDesc", {
                        total: penalty.totalReward.toFixed(2),
                        more: (
                          penalty.totalReward - penalty.actualReward
                        ).toFixed(2),
                      })}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowEarlyUnlockModal(false);
                        setSelectedLock(null);
                      }}
                      className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-sm transition-colors"
                    >
                      {t("earlyUnlockModal.keepLocked")}
                    </button>
                    <button
                      onClick={handleEarlyUnlock}
                      disabled={earlyUnlockMutation.isPending}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {earlyUnlockMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t("earlyUnlockModal.processing")}
                        </>
                      ) : (
                        <>
                          <Unlock className="h-4 w-4" />
                          {t("earlyUnlockModal.unlockNow")}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Cancel Lock Confirmation Modal */}
      {showCancelModal && selectedLock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <XCircle className="h-5 w-5 text-gray-500" />
                {t("cancelModal.title")}
              </h3>
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedLock(null);
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  {t("cancelModal.gracePeriodMessage")}{" "}
                  <span className="font-bold">
                    {t("cancelModal.noPenalty")}
                  </span>
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">
                    {t("cancelModal.lockedAmount")}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {selectedLock.amount} HBCT
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">
                    {t("cancelModal.forfeitedReward")}
                  </span>
                  <span className="font-semibold text-gray-400 line-through">
                    {selectedLock.rewardAmount} HBCT
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex justify-between text-sm">
                  <span className="text-gray-500">
                    {t("cancelModal.refundAmount")}
                  </span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {selectedLock.amount} HBCT
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setSelectedLock(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-sm transition-colors"
                >
                  {t("cancelModal.keepLock")}
                </button>
                <button
                  onClick={handleCancelLock}
                  disabled={cancelLockMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {cancelLockMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("cancelModal.cancelling")}
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4" />
                      {t("cancelModal.cancelLock")}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
