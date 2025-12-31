"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useAuth, useRequireAuth } from "@/hooks/useAuth";
import { useUserLocks, useCreateLock, useUnlock } from "@/hooks/useAppData";
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
} from "lucide-react";
import { toast } from "sonner";
import { LockingSkeleton } from "@/components/skeletons/page-skeletons";
import { usePageLoading } from "@/hooks/useMinimumLoading";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { PremiumButton } from "@/components/ui/premium-button";
import { ScrollableList } from "@/components/ui/scrollable-list";
import { getTierStyle, lockTiers } from "@/lib/config/tiers";

export default function LockingPage() {
  const t = useTranslations("locking");
  const locale = useLocale();
  const { isAuthenticated } = useAuth();
  const { isLoading: authLoading } = useRequireAuth(`/${locale}/login`);

  // Use cached data hooks - data is prefetched on login
  // Tiers are now fixed from config instead of fetched from API
  const { data: locksData, isLoading: locksLoading } = useUserLocks();
  const { data: balancesData } = useWalletBalances();

  // Get HBCT available balance
  const hbctBalance = balancesData?.balances?.find(b => b.currency === "HBCT");
  const availableBalance = parseFloat(hbctBalance?.availableBalance || "0");

  // Mutations with optimistic updates
  const createLockMutation = useCreateLock();
  const unlockMutation = useUnlock();

  const [selectedTier, setSelectedTier] = useState<string>("");
  const [amount, setAmount] = useState<string>("");

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

  // Set default selected tier from API data
  useEffect(() => {
    if (!selectedTier && tiers.length > 0) {
      setSelectedTier(tiers[0].id);
    }
  }, [selectedTier, tiers]);

  // Check if user has any locks
  const showNewUserState = locks.length === 0;

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

  // Check if any mutation is in progress
  const isSubmitting = createLockMutation.isPending || unlockMutation.isPending;

  // Use tiers from API
  const displayTiers = tiers;
  const displayLocks = locks;
  const selectedTierData = displayTiers.find((tier) => tier.id === selectedTier);

  // Validation
  const enteredAmount = parseFloat(amount) || 0;
  const minAmount = parseFloat(selectedTierData?.minAmount || "0");
  const hasInsufficientBalance = enteredAmount > availableBalance;
  const isBelowMinimum = enteredAmount > 0 && enteredAmount < minAmount;
  const canLock = amount && selectedTier && enteredAmount >= minAmount && !hasInsufficientBalance;

  const estimatedReward = selectedTierData && amount
    ? (parseFloat(amount) * parseFloat(selectedTierData.bonusPercent) / 100).toFixed(2)
    : "0";

  // Stats
  const totalLocked = displayLocks
    .filter(l => l.status === "ACTIVE")
    .reduce((sum, l) => sum + parseFloat(l.amount.replace(/,/g, '')), 0);
  const totalRewards = displayLocks
    .reduce((sum, l) => sum + parseFloat(l.rewardAmount.replace(/,/g, '')), 0);
  const activeLocks = displayLocks.filter(l => l.status === "ACTIVE").length;

  const showSkeleton = authLoading || !isAuthenticated || isDataLoading || isMinLoading;

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
            backgroundSize: '50px 50px',
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
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Total Locked</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{totalLocked.toLocaleString()}</p>
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
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Total Rewards</p>
                <p className="text-2xl md:text-3xl font-bold text-emerald-500">+{totalRewards.toLocaleString()}</p>
                <p className="text-xs text-emerald-500 font-medium mt-1">HBCT Earned</p>
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
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Active Locks</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{activeLocks}</p>
                <p className="text-xs text-amber-500 font-medium mt-1">Currently Staking</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform duration-300">
                <Clock className="h-7 w-7 text-white" />
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
                    Lock Tokens
                  </h2>
                  <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1 px-2 py-1 bg-emerald-500/10 rounded-full">
                    <TrendingUp className="h-3 w-3" />
                    Up to 50% Bonus
                  </span>
                </div>
              </div>

              <div className="p-5 space-y-5">
                {/* Tier Selection - 3D Coin Cards */}
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 md:mb-4 font-medium">Select Lock Period</p>
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
                            <div className={cn(
                              "relative w-12 h-12 md:w-20 md:h-20 mx-auto transition-all duration-300",
                              isSelected && "transform -translate-y-1",
                              "group-hover:transform group-hover:-translate-y-1"
                            )}>
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
                          <p className={cn(
                            "font-bold text-xs md:text-base mb-0.5 transition-colors",
                            isSelected ? config.textColor : "text-gray-700 dark:text-gray-300"
                          )}>
                            {tier.name}
                          </p>
                          <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 mb-1 md:mb-2">
                            {tier.lockMonths} {t("months")}
                          </p>
                          <div className={cn(
                            "inline-flex items-center gap-0.5 md:gap-1 px-2 py-1 md:px-3 md:py-1.5 rounded-full text-[10px] md:text-xs font-bold",
                            "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                            isSelected && "bg-emerald-500/25"
                          )}>
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
                    <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Amount to Lock</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] sm:text-xs text-gray-400">
                        Available: <span className="font-semibold text-gray-600 dark:text-gray-300">{availableBalance.toLocaleString()}</span> HBCT
                      </span>
                      {availableBalance > 0 && (
                        <button
                          onClick={() => setAmount(availableBalance.toString())}
                          className="text-[10px] sm:text-xs px-2 py-0.5 rounded bg-brand-500/10 text-brand-600 dark:text-brand-400 font-medium hover:bg-brand-500/20 transition-colors"
                        >
                          MAX
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="flex-1 min-w-0 bg-transparent text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm shrink-0">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                        <Image src="/images/logo-white.svg" alt="HBCT" width={14} height={14} className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </div>
                      <span className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white">HBCT</span>
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
                        +{estimatedReward} <span className="text-sm sm:text-base font-semibold">HBCT</span>
                      </p>
                    </div>
                    {selectedTierData && (
                      <div className="flex items-center gap-2 sm:block sm:text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-emerald-500/20">
                        <p className="text-xs text-gray-400">Lock Period:</p>
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
                    ? "No Balance"
                    : !amount || enteredAmount === 0
                    ? "Enter Amount"
                    : hasInsufficientBalance
                    ? "Insufficient Balance"
                    : isBelowMinimum
                    ? `Min: ${minAmount.toLocaleString()} HBCT`
                    : t("lockNow")}
                </PremiumButton>
              </div>
            </div>
          </div>

          {/* My Locks - Right Side */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-800/50 shadow-xl shadow-gray-200/50 dark:shadow-black/20 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800/50">
                <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Clock className="h-4 w-4 text-brand-500" />
                  {t("myLocks")}
                </h2>
                <span className="text-xs font-medium px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500">{displayLocks.length} locks</span>
              </div>

              {displayLocks.length === 0 ? (
                <div className="p-4">
                  <EmptyState icon={Lock} message={t("noLocks")} size="lg" />
                </div>
              ) : (
                <ScrollableList maxHeight="580px" showScrollIndicator={displayLocks.length > 4} className="p-4">
                  <div className="space-y-3">
                    {displayLocks.map((lock) => {
                      const isActive = lock.status === "ACTIVE";
                      const canUnlock = isActive && new Date(lock.endDate) <= new Date();
                      const daysRemaining = Math.max(0, Math.ceil((new Date(lock.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                      const config = getTierStyle(lock.tier.name);

                      return (
                        <div
                          key={lock.id}
                          className={cn(
                            "p-4 rounded-xl border transition-all",
                            isActive
                              ? `bg-gradient-to-br ${config.bgGradient} ${config.borderColor}`
                              : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            {/* Tier Coin with Logo */}
                            <div className="relative w-12 h-12 shrink-0">
                              {config.coin && (
                                <Image
                                  src={config.coin}
                                  alt={lock.tier.name}
                                  width={48}
                                  height={48}
                                  className={cn(
                                    "absolute inset-0 w-full h-full object-contain",
                                    isActive ? "drop-shadow-md" : "opacity-60 grayscale"
                                  )}
                                />
                              )}
                              <div className="absolute inset-0 flex items-center justify-center">
                                {config.logo && (
                                  <Image
                                    src={config.logo}
                                    alt={`${lock.tier.name} logo`}
                                    width={26}
                                    height={26}
                                    className={cn(
                                      "object-contain",
                                      !isActive && "opacity-60 grayscale"
                                    )}
                                  />
                                )}
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <p className={cn("font-semibold text-sm", config.textColor)}>{lock.tier.name}</p>
                                  <p className="text-base font-bold text-gray-900 dark:text-white">
                                    {lock.amount} <span className="text-xs text-gray-500 font-medium">HBCT</span>
                                  </p>
                                </div>
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0",
                                  isActive
                                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                    : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                                )}>
                                  {isActive ? t("active") : t("completed")}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-xs">
                                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/60 dark:bg-gray-800/60">
                                  <Clock className="h-3 w-3 text-gray-400" />
                                  <span className="text-gray-600 dark:text-gray-400">
                                    {isActive ? `${daysRemaining}d left` : new Date(lock.endDate).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10">
                                  <Gift className="h-3 w-3 text-emerald-500" />
                                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">+{lock.rewardAmount}</span>
                                </div>
                              </div>

                              {canUnlock && (
                                <button
                                  onClick={() => handleUnlock(lock.id)}
                                  disabled={isSubmitting}
                                  className="mt-3 w-full py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                                >
                                  {isSubmitting ? (
                                    <>
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      {t("unlocking")}
                                    </>
                                  ) : (
                                    <>
                                      <Unlock className="h-3.5 w-3.5" />
                                      {t("unlock")}
                                    </>
                                  )}
                                </button>
                              )}
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
        </div>
      </div>
    </div>
  );
}
