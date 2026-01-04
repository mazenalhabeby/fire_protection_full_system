"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useAuth, useRequireAuth } from "@/hooks/useAuth";
import { useAffiliate, useAffiliateStats, useLeaderboard, useReferrals, useCommissions, useRegisterAffiliate, useClaimCommission } from "@/hooks/useAppData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Users,
  Rocket,
  Gift,
  TrendingUp,
  ArrowRight,
  Sparkles,
  CheckCircle,
  Zap,
  Copy,
  Check,
  Link as LinkIcon,
  Share2,
  DollarSign,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Trophy,
  Crown,
  Medal,
  Search,
  UserCheck,
  XCircle,
  Coins,
} from "lucide-react";
import { AffiliatesSkeleton } from "@/components/skeletons/page-skeletons";
import { usePageLoading } from "@/hooks/useMinimumLoading";
import { PageHeader } from "@/components/ui/page-header";
import { toast } from "sonner";
import Image from "next/image";
import { getTierStyle, affiliateTiers } from "@/lib/config/tiers";
import { getTimeAgo } from "@/lib/utils/format";
import type { AffiliateStats } from "@/types/api";

// Status display configuration
const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  ACTIVE: { color: "primary", icon: <UserCheck className="h-3 w-3" />, label: "Active" },
  CONVERTED: { color: "success", icon: <CheckCircle className="h-3 w-3" />, label: "Converted" },
  INACTIVE: { color: "secondary", icon: <XCircle className="h-3 w-3" />, label: "Inactive" },
};

export default function AffiliatesPage() {
  const t = useTranslations("affiliates");
  const locale = useLocale();
  const { isAuthenticated } = useAuth();
  const { isLoading: authLoading } = useRequireAuth(`/${locale}/login`);

  // Use cached data hooks - data is prefetched on login
  const { data: affiliateData, isLoading: affiliateLoading } = useAffiliate();
  const { data: statsData, isLoading: statsLoading } = useAffiliateStats();
  const { data: leaderboardData, isLoading: leaderboardLoading } = useLeaderboard();

  // Local state for filters and pagination
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "referrals">("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "converted" | "inactive">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Referrals and commissions hooks with dynamic parameters
  const { data: referralsData, isLoading: referralsLoading } = useReferrals({
    page: currentPage,
    limit: itemsPerPage,
    status: statusFilter,
    search: debouncedSearch || undefined,
  });
  const { data: commissionsData, isLoading: commissionsLoading } = useCommissions({
    page: 1,
    limit: 10,
  });

  // Mutations
  const registerMutation = useRegisterAffiliate();
  const claimMutation = useClaimCommission();

  // Minimum loading duration for premium feel
  const { isLoading: isMinLoading, stopLoading } = usePageLoading();

  // Data is loading if any of the queries are loading
  const isDataLoading = affiliateLoading || statsLoading || leaderboardLoading;

  // Stop minimum loading when data is ready
  useEffect(() => {
    if (!isDataLoading) {
      stopLoading();
    }
  }, [isDataLoading, stopLoading]);

  // Get data from query results
  const affiliate = affiliateData;
  const stats = statsData;
  const leaderboard = leaderboardData ?? [];
  const commissions = commissionsData?.commissions ?? [];
  const referrals = referralsData?.referrals ?? [];
  const referralsSummary = referralsData?.summary ?? { total: 0, active: 0, converted: 0, inactive: 0 };
  const referralsPagination = referralsData?.pagination ?? { page: 1, limit: itemsPerPage, total: 0, totalPages: 0 };

  // Check if user is registered as affiliate
  // affiliate must be a truthy object to be considered registered
  const isRegisteredAffiliate = !!affiliate && typeof affiliate === 'object';

  const handleRegister = async () => {
    try {
      await registerMutation.mutateAsync();
      toast.success("Successfully joined affiliate program!");
    } catch {
      toast.error("Failed to register as affiliate");
    }
  };

  // Claim functionality (reserved for future use)
  const _handleClaim = async () => {
    try {
      await claimMutation.mutateAsync();
      toast.success(`Claimed ${stats?.pendingEarnings || "0"} HBCT!`);
    } catch {
      toast.error("Failed to claim commission");
    }
  };

  // Mutation loading states (reserved for future use)
  const _isClaimLoading = claimMutation.isPending;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Dynamic tier calculation based on referral count
  const calculateTierData = (referralCount: number) => {
    // Find current tier based on referral count
    // Tiers: Starter (0), Silver (10+), Gold (50+), Platinum (100+)
    let currentTierIndex = 0;
    for (let i = affiliateTiers.length - 1; i >= 0; i--) {
      if (referralCount >= affiliateTiers[i].minReferrals) {
        currentTierIndex = i;
        break;
      }
    }

    const currentTier = affiliateTiers[currentTierIndex];
    const nextTier = currentTierIndex < affiliateTiers.length - 1
      ? affiliateTiers[currentTierIndex + 1]
      : null;

    // Calculate progress to next tier
    let progressToNextTier = 0;
    if (nextTier) {
      const currentMin = currentTier.minReferrals;
      const nextMin = nextTier.minReferrals;
      const range = nextMin - currentMin;
      const progress = referralCount - currentMin;
      progressToNextTier = Math.min(100, Math.round((progress / range) * 100));
    } else {
      progressToNextTier = 100; // Max tier reached
    }

    return { currentTier, nextTier, progressToNextTier };
  };

  // Get referral count for tier calculation
  const referralCountForTier = stats?.totalReferrals || affiliate?.totalReferrals || 0;

  const { currentTier, nextTier, progressToNextTier } = calculateTierData(referralCountForTier);

  // Display data - only used when user is a registered affiliate
  const displayAffiliate = affiliate ? {
    ...affiliate,
    tier: currentTier,
    nextTier: nextTier,
    progressToNextTier: progressToNextTier,
  } : null;

  const displayStats: AffiliateStats = stats || {
    totalReferrals: 0,
    totalEarnings: "0",
    pendingEarnings: "0",
    paidEarnings: "0",
    thisMonthReferrals: 0,
    thisMonthEarnings: "0",
    lastMonthReferrals: 0,
    lastMonthEarnings: "0",
    totalVolume: "0",
    thisMonthVolume: "0",
    conversionRate: "0",
    averageOrderValue: "0",
  };
  const displayCommissions = commissions;
  const displayReferrals = referrals;

  // Pagination is now handled by backend - use the pagination data from API
  const totalPages = referralsPagination.totalPages;

  const referralLink = typeof window !== "undefined"
    ? `${window.location.origin}/${locale}/register?ref=${displayAffiliate?.referralCode || ""}`
    : "";

  // Recent commissions for display (already sorted by date from API)
  const recentCommissions = displayCommissions;

  const handlePendingScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 10;
    setShowScrollIndicator(!isAtBottom);
  };

  const showSkeleton = authLoading || !isAuthenticated || isDataLoading || isMinLoading;

  if (showSkeleton) {
    return (
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950" />
        </div>
        <div className="container mx-auto px-4 py-6 md:py-8 max-w-6xl">
          <AffiliatesSkeleton />
        </div>
      </div>
    );
  }

  // Not registered - Show join CTA (registration page)
  if (!isRegisteredAffiliate) {
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
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-brand-200/40 to-transparent dark:from-brand-900/20 dark:to-transparent rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-tl from-purple-200/30 to-transparent dark:from-purple-900/15 dark:to-transparent rounded-full blur-[100px]" />
        </div>

        <div className="container mx-auto px-4 py-6 md:py-8 max-w-6xl">
          <PageHeader
            title={t("title")}
            subtitle={t("subtitle")}
          />

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 md:mb-8">
            {/* Commission Rate */}
            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500/10 via-brand-500/5 to-transparent dark:from-brand-500/20 dark:via-brand-500/10 dark:to-transparent border border-brand-200/50 dark:border-brand-500/20 p-5 transition-all duration-300 hover:shadow-lg hover:shadow-brand-500/10 hover:border-brand-300 dark:hover:border-brand-500/40">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-brand-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Commission Rate</p>
                  <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Up to 15%</p>
                  <p className="text-xs text-brand-500 font-medium mt-1">Per Sale</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/30 group-hover:scale-110 transition-transform duration-300">
                  <Gift className="h-7 w-7 text-white" />
                </div>
              </div>
            </div>

            {/* Tier Levels */}
            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent dark:from-purple-500/20 dark:via-purple-500/10 dark:to-transparent border border-purple-200/50 dark:border-purple-500/20 p-5 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 hover:border-purple-300 dark:hover:border-purple-500/40">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Tier Levels</p>
                  <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">4 Tiers</p>
                  <p className="text-xs text-purple-500 font-medium mt-1">Starter → Platinum</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="h-7 w-7 text-white" />
                </div>
              </div>
            </div>

            {/* Payout */}
            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-500/20 dark:via-emerald-500/10 dark:to-transparent border border-emerald-200/50 dark:border-emerald-500/20 p-5 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10 hover:border-emerald-300 dark:hover:border-emerald-500/40">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Payouts</p>
                  <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Weekly</p>
                  <p className="text-xs text-emerald-500 font-medium mt-1">No Minimum</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                  <Zap className="h-7 w-7 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Commission Tiers - Premium Cards */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Commission Tiers</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {affiliateTiers.map((tier, index) => {
                const config = getTierStyle(tier.name);
                return (
                  <div
                    key={tier.id}
                    className={cn(
                      "group relative overflow-hidden rounded-2xl p-5 text-center transition-all duration-300",
                      "border-2 hover:scale-[1.03] hover:-translate-y-1",
                      `bg-gradient-to-br ${config.bgGradient} ${config.borderColor}`,
                      `shadow-lg ${config.shadowColor}`,
                      "hover:shadow-xl"
                    )}
                  >
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-white/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-white/10 to-transparent rounded-full translate-y-1/2 -translate-x-1/2" />

                    {index === 0 && (
                      <div className="absolute top-3 right-3">
                        <span className="text-[10px] font-bold bg-brand-500 text-white px-2.5 py-1 rounded-full shadow-lg">
                          START HERE
                        </span>
                      </div>
                    )}
                    {index === 3 && (
                      <div className="absolute top-3 right-3">
                        <span className="text-[10px] font-bold bg-purple-500 text-white px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1">
                          <Crown className="h-3 w-3" />
                          BEST
                        </span>
                      </div>
                    )}

                    {/* Coin/Icon */}
                    <div className="relative mx-auto mb-4">
                      <div className={cn(
                        "relative w-28 h-28 mx-auto transition-all duration-300",
                        "group-hover:transform group-hover:-translate-y-2 group-hover:scale-110"
                      )}>
                        {config.coin && config.logo ? (
                          <>
                            <Image
                              src={config.coin}
                              alt={tier.name}
                              width={112}
                              height={112}
                              className="absolute inset-0 w-full h-full object-contain drop-shadow-2xl"
                            />
                            {/* Logo Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Image
                                src={config.logo}
                                alt="HBCT"
                                width={56}
                                height={56}
                                className="object-contain opacity-90"
                              />
                            </div>
                          </>
                        ) : (
                          /* Starter - Coin-like design */
                          <div className="relative w-28 h-28">
                            {/* Outer ring */}
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500 dark:from-gray-500 dark:via-gray-600 dark:to-gray-700 shadow-2xl" />
                            {/* Inner circle */}
                            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 dark:from-gray-600 dark:via-gray-700 dark:to-gray-800" />
                            {/* Highlight */}
                            <div className="absolute inset-3 rounded-full bg-gradient-to-br from-white/40 via-transparent to-transparent" />
                            {/* Center with icon */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 dark:from-gray-500 dark:to-gray-600 flex items-center justify-center shadow-inner">
                                <Rocket className="h-7 w-7 text-white drop-shadow-md" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tier Info */}
                    <p className={cn(
                      "font-bold text-lg mb-1 transition-colors",
                      config.textColor
                    )}>
                      {tier.name}
                    </p>

                    {/* Commission Rate - Large & Bold */}
                    <div className="my-3">
                      <span className={cn(
                        "text-4xl font-black",
                        tier.name === "Gold" ? "text-yellow-500" :
                        tier.name === "Platinum" ? "text-purple-500" :
                        "text-gray-700 dark:text-gray-200"
                      )}>
                        {tier.commissionRate}%
                      </span>
                    </div>

                    {/* Requirements */}
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold",
                      "bg-white/50 dark:bg-black/20 backdrop-blur-sm",
                      "text-gray-600 dark:text-gray-300"
                    )}>
                      <Users className="h-3.5 w-3.5" />
                      {tier.minReferrals === 0 ? "No minimum" : `${tier.minReferrals}+ referrals`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CTA Card - Premium Design */}
          <div className="relative overflow-hidden rounded-3xl">
            {/* Background layers */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-500/20 via-transparent to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-purple-500/20 via-transparent to-transparent" />

            {/* Animated glow orbs */}
            <div className="absolute top-0 right-1/4 w-64 h-64 bg-brand-500/30 rounded-full blur-[100px] animate-pulse" />
            <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-purple-500/20 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '1s' }} />

            {/* Grid pattern overlay */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                backgroundSize: '40px 40px',
              }}
            />

            {/* Top border glow */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/50 to-transparent" />

            {/* Content */}
            <div className="relative z-10 px-8 py-12 md:py-16">
              <div className="max-w-2xl mx-auto text-center">
                {/* Premium Coin Stack Icon */}
                <div className="relative inline-block mb-6">
                  {/* Glow effect */}
                  <div className="absolute inset-0 scale-150 bg-gradient-to-r from-brand-500/30 via-purple-500/30 to-brand-500/30 rounded-full blur-2xl animate-pulse" />

                  {/* Stacked coins effect */}
                  <div className="relative">
                    {/* Back coin (offset) */}
                    <div className="absolute -left-3 -top-1 w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400/60 to-amber-500/60 blur-[1px]" />
                    <div className="absolute -right-3 -top-1 w-16 h-16 rounded-full bg-gradient-to-br from-gray-300/60 to-gray-400/60 blur-[1px]" />

                    {/* Main coin */}
                    <div className="relative w-20 h-20">
                      <Image
                        src="/images/token/coin-gold.svg"
                        alt="Earn"
                        width={80}
                        height={80}
                        className="w-full h-full object-contain drop-shadow-2xl"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Image
                          src="/images/logo.svg"
                          alt="HBCT"
                          width={40}
                          height={40}
                          className="object-contain"
                        />
                      </div>
                    </div>

                    {/* Sparkle effects */}
                    <div className="absolute -top-2 -right-2 text-yellow-400">
                      <Sparkles className="h-5 w-5 animate-pulse" />
                    </div>
                    <div className="absolute -bottom-1 -left-2 text-brand-400">
                      <Sparkles className="h-4 w-4 animate-pulse" style={{ animationDelay: '0.5s' }} />
                    </div>
                  </div>
                </div>

                {/* Heading */}
                <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Ready to Start{" "}
                  <span className="bg-gradient-to-r from-brand-400 to-brand-500 bg-clip-text text-transparent">
                    Earning?
                  </span>
                </h3>

                {/* Description */}
                <p className="text-lg text-gray-400 mb-8 max-w-lg mx-auto">
                  Join thousands of successful affiliates already earning passive income with HBCT. Start your journey today.
                </p>

                {/* CTA Button */}
                <div className="relative inline-block group mb-8">
                  <div className="absolute -inset-1 bg-gradient-to-r from-brand-500 to-purple-500 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
                  <Button
                    variant="default"
                    size="lg"
                    onClick={handleRegister}
                    className="relative px-10 py-6 text-lg font-semibold rounded-xl shadow-2xl"
                  >
                    <Sparkles className="h-5 w-5 mr-2" />
                    Join Affiliate Program
                    <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>

                {/* Features */}
                <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                    </div>
                    <span className="text-gray-300">Free to join</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                    </div>
                    <span className="text-gray-300">No minimum payout</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                    </div>
                    <span className="text-gray-300">Weekly payouts</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Registered - Show Dashboard (displayAffiliate should exist here)
  // If for some reason it doesn't, show loading state
  if (!displayAffiliate) {
    return (
      <div className="flex-1 relative overflow-hidden">
        <div className="container mx-auto px-4 py-6 md:py-8 max-w-6xl">
          <AffiliatesSkeleton />
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
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-brand-200/40 to-transparent dark:from-brand-900/20 dark:to-transparent rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-tl from-purple-200/30 to-transparent dark:from-purple-900/15 dark:to-transparent rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 py-6 md:py-8 max-w-6xl">
        <PageHeader
          title={t("title")}
          subtitle={t("subtitle")}
        />

        {/* Deactivation Notice */}
        {displayAffiliate && !displayAffiliate.isActive && (
          <div className="relative overflow-hidden rounded-2xl mb-6 bg-gradient-to-r from-red-500/10 via-red-500/5 to-orange-500/10 dark:from-red-900/30 dark:via-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800/50">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: `linear-gradient(45deg, rgba(239,68,68,0.1) 25%, transparent 25%, transparent 75%, rgba(239,68,68,0.1) 75%), linear-gradient(45deg, rgba(239,68,68,0.1) 25%, transparent 25%, transparent 75%, rgba(239,68,68,0.1) 75%)`,
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 10px 10px',
            }} />

            <div className="relative p-6">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* Icon */}
                <div className="shrink-0">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/25">
                    <XCircle className="h-7 w-7 text-white" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-red-700 dark:text-red-400 mb-1">
                    Affiliate Account Temporarily Suspended
                  </h3>
                  <p className="text-sm text-red-600/80 dark:text-red-300/80 mb-3">
                    Your affiliate privileges have been temporarily suspended. During this time:
                  </p>
                  <ul className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                    <li className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                      Referral code is inactive
                    </li>
                    <li className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                      No new commissions earned
                    </li>
                    <li className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                      Hidden from leaderboard
                    </li>
                  </ul>
                </div>

                {/* Action */}
                <div className="shrink-0">
                  <a
                    href={`/${locale}/help/contact`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium text-sm transition-all shadow-lg shadow-red-500/25 hover:shadow-red-500/40"
                  >
                    Contact Support
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </div>

              {/* Info footer */}
              <div className="mt-4 pt-4 border-t border-red-200/50 dark:border-red-800/30">
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                  Your existing referrals and earned commissions are preserved and will be available once your account is reactivated.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Current Tier Header - Dynamic Background Based on Tier */}
        <div className={cn(
          "relative overflow-hidden rounded-2xl mb-6 md:mb-8",
          displayAffiliate.tier?.name === "Starter" && "bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800",
          displayAffiliate.tier?.name === "Silver" && "bg-gradient-to-r from-slate-800 via-gray-600 to-slate-800",
          displayAffiliate.tier?.name === "Gold" && "bg-gradient-to-r from-yellow-600 via-amber-500 to-yellow-600",
          displayAffiliate.tier?.name === "Platinum" && "bg-gradient-to-r from-purple-900 via-indigo-800 to-purple-900",
          !displayAffiliate.tier?.name && "bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900"
        )}>
          {/* Background effects - Tier specific */}
          <div className={cn(
            "absolute inset-0 bg-[radial-gradient(ellipse_at_right,_var(--tw-gradient-stops))]",
            displayAffiliate.tier?.name === "Starter" && "from-gray-500/20 via-transparent to-transparent",
            displayAffiliate.tier?.name === "Silver" && "from-gray-300/30 via-transparent to-transparent",
            displayAffiliate.tier?.name === "Gold" && "from-yellow-300/40 via-transparent to-transparent",
            displayAffiliate.tier?.name === "Platinum" && "from-purple-500/30 via-transparent to-transparent",
            !displayAffiliate.tier?.name && "from-brand-500/20 via-transparent to-transparent"
          )} />
          <div className={cn(
            "absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px]",
            displayAffiliate.tier?.name === "Starter" && "bg-gray-400/20",
            displayAffiliate.tier?.name === "Silver" && "bg-gray-300/30",
            displayAffiliate.tier?.name === "Gold" && "bg-yellow-400/50",
            displayAffiliate.tier?.name === "Platinum" && "bg-purple-400/30",
            !displayAffiliate.tier?.name && "bg-purple-500/10"
          )} />
          <div className={cn(
            "absolute bottom-0 left-0 w-48 h-48 rounded-full blur-[60px]",
            displayAffiliate.tier?.name === "Starter" && "bg-gray-500/10",
            displayAffiliate.tier?.name === "Silver" && "bg-slate-400/20",
            displayAffiliate.tier?.name === "Gold" && "bg-yellow-400/30",
            displayAffiliate.tier?.name === "Platinum" && "bg-indigo-500/20",
            !displayAffiliate.tier?.name && "bg-brand-500/10"
          )} />
          <div className={cn(
            "absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent to-transparent",
            displayAffiliate.tier?.name === "Starter" && "via-gray-400/50",
            displayAffiliate.tier?.name === "Silver" && "via-gray-300/60",
            displayAffiliate.tier?.name === "Gold" && "via-yellow-400/70",
            displayAffiliate.tier?.name === "Platinum" && "via-purple-400/60",
            !displayAffiliate.tier?.name && "via-brand-500/50"
          )} />

          <div className="relative p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              {/* Left: Current Tier Info */}
              <div className="flex items-center gap-5">
                {/* Tier Coin */}
                <div className="relative">
                  <div className={cn(
                    "absolute inset-0 scale-125 rounded-full blur-xl",
                    displayAffiliate.tier?.name === "Starter" && "bg-gradient-to-r from-gray-400/30 to-gray-500/30",
                    displayAffiliate.tier?.name === "Silver" && "bg-gradient-to-r from-gray-300/40 to-slate-400/40",
                    displayAffiliate.tier?.name === "Gold" && "bg-gradient-to-r from-yellow-400/50 to-amber-400/50",
                    displayAffiliate.tier?.name === "Platinum" && "bg-gradient-to-r from-purple-400/40 to-indigo-500/40",
                    !displayAffiliate.tier?.name && "bg-gradient-to-r from-brand-500/30 to-purple-500/30"
                  )} />
                  {displayAffiliate.tier && getTierStyle(displayAffiliate.tier.name)?.coin ? (
                    <div className="relative w-20 h-20">
                      <Image
                        src={getTierStyle(displayAffiliate.tier.name).coin!}
                        alt={displayAffiliate.tier.name}
                        width={80}
                        height={80}
                        className="w-full h-full object-contain drop-shadow-2xl"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Image
                          src={getTierStyle(displayAffiliate.tier.name).logo!}
                          alt="HBCT"
                          width={40}
                          height={40}
                          className="object-contain opacity-90"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="relative w-20 h-20">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500 shadow-2xl" />
                      <div className="absolute inset-2 rounded-full bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center">
                          <Rocket className="h-5 w-5 text-white" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tier Details */}
                <div>
                  <p className="text-sm text-white/70 mb-1">Your Current Tier</p>
                  <h2 className="text-2xl md:text-3xl font-bold mb-1 text-white">
                    {displayAffiliate.tier?.name || "Starter"}
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-lg text-white">
                      {displayAffiliate.tier?.commissionRate || "3"}% Commission
                    </span>
                    <span className="text-white/50">•</span>
                    <span className="text-white/80 text-sm">
                      {displayStats?.totalReferrals || 0} referrals
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Progress to Next Tier or Max Tier Badge */}
              {displayAffiliate.nextTier ? (
                <div className="flex-1 max-w-md">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-white/70">Progress to {displayAffiliate.nextTier.name}</span>
                    <span className="font-medium text-white">{displayAffiliate.progressToNextTier || 0}%</span>
                  </div>
                  <div className="h-3 rounded-full overflow-hidden mb-2 bg-black/20">
                    <div
                      className="h-full rounded-full transition-all bg-white"
                      style={{ width: `${displayAffiliate.progressToNextTier || 0}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/60">
                      {displayStats?.totalReferrals || 0} / {displayAffiliate.nextTier.minReferrals} referrals
                    </span>
                    <span className="text-white/70">
                      Next: <span className="font-medium text-white">{displayAffiliate.nextTier.commissionRate}%</span>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                  <div className="p-2 rounded-full bg-white/20">
                    <Crown className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Max Tier Achieved!</p>
                    <p className="text-sm text-white/70">You&apos;ve reached the highest level</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 md:mb-8">
          {/* Total Referrals */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent dark:from-blue-500/20 dark:via-blue-500/10 dark:to-transparent border border-blue-200/50 dark:border-blue-500/20 p-5 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 hover:border-blue-300 dark:hover:border-blue-500/40">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Total Referrals</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{displayStats?.totalReferrals || 0}</p>
                <p className="text-xs text-blue-500 font-medium mt-1">Users</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          {/* Total Earnings */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500/10 via-brand-500/5 to-transparent dark:from-brand-500/20 dark:via-brand-500/10 dark:to-transparent border border-brand-200/50 dark:border-brand-500/20 p-5 transition-all duration-300 hover:shadow-lg hover:shadow-brand-500/10 hover:border-brand-300 dark:hover:border-brand-500/40">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-brand-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Total Earnings</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                  {parseFloat(displayStats?.totalEarnings || "0").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-brand-500 font-medium mt-1">HBCT</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/30 group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          {/* This Month */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-500/20 dark:via-emerald-500/10 dark:to-transparent border border-emerald-200/50 dark:border-emerald-500/20 p-5 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10 hover:border-emerald-300 dark:hover:border-emerald-500/40">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">This Month</p>
                <p className="text-2xl md:text-3xl font-bold text-emerald-500">
                  {parseFloat(displayStats?.thisMonthEarnings || "0").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-emerald-500 font-medium mt-1">HBCT</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          {(["overview", "referrals"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                activeTab === tab
                  ? "bg-brand-500 text-white"
                  : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:border-brand-500/40"
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Premium Referral Link Card */}
            <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
              {/* Clean gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800" />

              {/* Subtle accent glow */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/5 dark:bg-brand-500/10 rounded-full blur-[100px]" />

              <div className="relative p-6">
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                  {/* Left: Icon & Title */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
                      <LinkIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">Your Referral Link</h2>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">Share & earn <span className="font-semibold text-brand-500">{displayAffiliate.tier?.commissionRate || "3"}%</span> on every sale</p>
                    </div>
                  </div>

                  {/* Right: Link & Actions */}
                  <div className="flex-1 space-y-3">
                    {/* Link Input */}
                    <div className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                      <code className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate font-mono">
                        {referralLink}
                      </code>
                      <button
                        onClick={() => copyToClipboard(referralLink)}
                        className={cn(
                          "shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium text-sm transition-all",
                          copied
                            ? "bg-emerald-500 text-white"
                            : "bg-brand-500 text-white hover:bg-brand-600 shadow-md shadow-brand-500/20"
                        )}
                      >
                        {copied ? (
                          <><Check className="h-4 w-4" /> Copied!</>
                        ) : (
                          <><Copy className="h-4 w-4" /> Copy</>
                        )}
                      </button>
                    </div>

                    {/* Code & Share */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Code:</span>
                        <span className="font-mono font-bold text-brand-500">{displayAffiliate.referralCode}</span>
                        <button
                          onClick={() => copyToClipboard(displayAffiliate.referralCode || "")}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                        >
                          <Copy className="h-3.5 w-3.5 text-gray-400" />
                        </button>
                      </div>
                      <button
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                        onClick={() => {
                          if (navigator.share) {
                            navigator.share({ title: 'Join HBCT', url: referralLink });
                          } else {
                            copyToClipboard(referralLink);
                          }
                        }}
                      >
                        <Share2 className="h-4 w-4" />
                        Share
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Commissions + Leaderboard */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Recent Commissions */}
              <div className="lg:col-span-2 relative overflow-hidden rounded-2xl">
                {/* Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800" />
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-[80px]" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-500/5 dark:bg-brand-500/10 rounded-full blur-[60px]" />

                <div className="relative border border-gray-200/50 dark:border-gray-700/50 rounded-2xl overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between p-5 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-brand-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <TrendingUp className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h2 className="font-bold text-gray-900 dark:text-white">Recent Commissions</h2>
                        <p className="text-xs text-gray-500">
                          {commissionsData?.summary?.totalEarned
                            ? `${parseFloat(commissionsData.summary.totalEarned).toLocaleString()} HBCT total earned`
                            : 'Commission history'}
                        </p>
                      </div>
                    </div>
                    {recentCommissions.length > 0 && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                        <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                          {recentCommissions.length} transactions
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Recent Commissions List */}
                  <div className="relative">
                    <div
                      className="divide-y divide-gray-100 dark:divide-gray-800/50 max-h-[516px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700"
                      onScroll={handlePendingScroll}
                    >
                      {commissionsLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 px-4">
                          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4 animate-pulse">
                            <Coins className="h-8 w-8 text-gray-400" />
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading commissions...</p>
                        </div>
                      ) : recentCommissions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-4">
                          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                            <Coins className="h-8 w-8 text-gray-400" />
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 font-medium">No commissions yet</p>
                          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Share your referral link to start earning!</p>
                        </div>
                      ) : (
                        recentCommissions.map((commission) => (
                          <div
                            key={commission.id}
                            className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all group"
                          >
                            <div className="relative w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50 transition-colors">
                              <Coins className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white">Referral Commission</p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>{getTimeAgo(commission.createdAt)}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                +{parseFloat(commission.amount).toLocaleString()}
                              </p>
                              <span className="text-xs text-gray-500">HBCT</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Scroll indicator - shows when more than 6 items and not at bottom */}
                    {recentCommissions.length > 6 && showScrollIndicator && (
                      <div className="absolute bottom-0 left-0 right-0 pointer-events-none transition-opacity duration-300">
                        <div className="h-16 bg-gradient-to-t from-white dark:from-gray-900 to-transparent" />
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 animate-bounce">
                          <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">Scroll for more</span>
                          <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Premium Leaderboard */}
              <div className="relative overflow-hidden rounded-2xl">
                {/* Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-900 dark:to-amber-950/20" />
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-amber-500/10 to-transparent dark:from-amber-500/20" />

                <div className="relative border border-amber-200/50 dark:border-amber-500/20 rounded-2xl overflow-hidden">
                  {/* Header */}
                  <div className="relative p-5 text-center border-b border-amber-200/50 dark:border-amber-500/20 bg-gradient-to-b from-amber-100/50 to-transparent dark:from-amber-500/10">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/30 mb-2">
                      <Trophy className="h-6 w-6 text-white" />
                    </div>
                    <h2 className="font-bold text-gray-900 dark:text-white">Top Affiliates</h2>
                    <p className="text-xs text-gray-500">This month&apos;s leaders</p>
                  </div>

                  {/* Top 3 Podium */}
                  {leaderboard.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4">
                      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                        <Trophy className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">No leaders yet</p>
                      <p className="text-xs text-gray-500 mt-1">Be the first to climb the ranks!</p>
                    </div>
                  ) : (
                    <div className="flex items-end justify-center gap-3 px-4 py-6 bg-gradient-to-b from-transparent to-white/50 dark:to-gray-800/30">
                      {/* 2nd Place */}
                      {leaderboard[1] && (
                        <div className="flex flex-col items-center">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-400 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-300 mb-2 ring-2 ring-gray-300 dark:ring-gray-600">
                            {leaderboard[1].name?.[0]}
                          </div>
                          <div className="w-16 h-16 bg-gradient-to-t from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-500 rounded-t-lg flex flex-col items-center justify-center">
                            <Medal className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-200">2nd</span>
                          </div>
                          <p className="text-[10px] text-gray-500 mt-1 truncate max-w-16">{leaderboard[1].name?.split(' ')[0]}</p>
                        </div>
                      )}

                      {/* 1st Place */}
                      {leaderboard[0] && (
                        <div className="flex flex-col items-center -mt-4">
                          <Crown className="h-5 w-5 text-amber-500 mb-1" />
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-sm font-bold text-amber-900 mb-2 ring-2 ring-amber-400 shadow-lg shadow-amber-500/30">
                            {leaderboard[0].name?.[0]}
                          </div>
                          <div className="w-16 h-20 bg-gradient-to-t from-amber-400 to-amber-500 rounded-t-lg flex flex-col items-center justify-center shadow-lg">
                            <Trophy className="h-5 w-5 text-amber-900" />
                            <span className="text-xs font-bold text-amber-900">1st</span>
                          </div>
                          <p className="text-[10px] font-medium text-gray-700 dark:text-gray-300 mt-1">{leaderboard[0].name?.split(' ')[0]}</p>
                        </div>
                      )}

                      {/* 3rd Place */}
                      {leaderboard[2] && (
                        <div className="flex flex-col items-center">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-sm font-bold text-amber-100 mb-2 ring-2 ring-amber-600">
                            {leaderboard[2].name?.[0]}
                          </div>
                          <div className="w-16 h-12 bg-gradient-to-t from-amber-600 to-amber-700 rounded-t-lg flex flex-col items-center justify-center">
                            <Medal className="h-4 w-4 text-amber-200" />
                            <span className="text-xs font-bold text-amber-100">3rd</span>
                          </div>
                          <p className="text-[10px] text-gray-500 mt-1 truncate max-w-16">{leaderboard[2].name?.split(' ')[0]}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rest of Leaderboard */}
                  <div className="px-4 pb-4 space-y-2">
                    {leaderboard.slice(3, 5).map((entry) => (
                      <div
                        key={entry.referralCode}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 hover:bg-white dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center font-bold text-sm text-gray-500 dark:text-gray-400">
                          {entry.rank}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{entry.name}</p>
                          <p className="text-xs text-gray-500">{entry.totalReferrals} referrals</p>
                        </div>
                        <p className="text-sm font-bold text-brand-500">{parseFloat(entry.totalEarnings).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal text-gray-400">HBCT</span></p>
                      </div>
                    ))}

                    {/* Your Position */}
                    <div className="mt-3 pt-3 border-t border-dashed border-gray-200 dark:border-gray-700">
                      {(() => {
                        // Find user's position in leaderboard
                        const userRankIndex = leaderboard.findIndex(
                          entry => entry.referralCode === displayAffiliate?.referralCode
                        );
                        const userRank = userRankIndex !== -1 ? userRankIndex + 1 : null;

                        return (
                          <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/50 to-yellow-500/50 rounded-xl blur opacity-30" />
                            <div className="relative flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30">
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-lg",
                                userRank !== null
                                  ? "bg-gradient-to-br from-amber-500 to-yellow-500 text-amber-900 shadow-amber-500/30"
                                  : "bg-gradient-to-br from-gray-400 to-gray-500 text-white shadow-gray-500/30"
                              )}>
                                {userRank !== null ? userRank : "-"}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-1">
                                  You
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-500 text-white">YOU</span>
                                </p>
                                <p className="text-xs text-gray-500">
                                  {displayStats?.totalReferrals || 0} referrals
                                  {!userRank && leaderboard.length > 0 && " · Not in top " + leaderboard.length}
                                </p>
                              </div>
                              <p className="text-sm font-bold text-brand-500">{parseFloat(displayStats?.totalEarnings || "0").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal text-gray-400">HBCT</span></p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Referrals Tab */}
        {activeTab === "referrals" && (
          <div className="space-y-4">
            {/* Header Card */}
            <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Title & Stats */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Your Referrals</h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                        <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                        {referralsSummary.total} total
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        {referralsSummary.converted} converted
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        {referralsSummary.active} active
                      </span>
                    </div>
                  </div>
                </div>

                {/* Search */}
                <div className="relative w-full lg:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  />
                </div>
              </div>

              {/* Status Filters */}
              <div className="flex gap-2 mt-5 flex-wrap">
                {(["all", "active", "converted", "inactive"] as const).map((status) => {
                  // Use summary counts from the API
                  const countMap: Record<string, number> = {
                    all: referralsSummary.total,
                    active: referralsSummary.active,
                    converted: referralsSummary.converted,
                    inactive: referralsSummary.inactive,
                  };
                  const count = countMap[status] ?? 0;
                  return (
                    <button
                      key={status}
                      onClick={() => { setStatusFilter(status); setCurrentPage(1); }}
                      className={cn(
                        "px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize flex items-center gap-2",
                        statusFilter === status
                          ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-lg"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                      )}
                    >
                      {status}
                      <span className={cn(
                        "text-xs px-1.5 py-0.5 rounded-md",
                        statusFilter === status
                          ? "bg-white/20 dark:bg-gray-900/20"
                          : "bg-gray-200 dark:bg-gray-700"
                      )}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Table Card */}
            <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
              {/* Table Header */}
              <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <div className="col-span-4">User</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2 text-right">Joined</div>
                <div className="col-span-2 text-right">Purchases</div>
                <div className="col-span-2 text-right">Commission</div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {referralsLoading ? (
                  <div className="p-16 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center animate-pulse">
                      <Users className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 font-medium">Loading referrals...</p>
                  </div>
                ) : displayReferrals.length === 0 ? (
                  <div className="p-16 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <Users className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-900 dark:text-white font-medium">No referrals found</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {debouncedSearch || statusFilter !== 'all'
                        ? "Try adjusting your search or filters"
                        : "Share your referral link to start earning!"}
                    </p>
                  </div>
                ) : (
                  displayReferrals.map((referral, index) => {
                    const config = statusConfig[referral.status];
                    return (
                      <div
                        key={referral.id}
                        className={cn(
                          "grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-all cursor-pointer group",
                          index % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50/50 dark:bg-gray-800/20"
                        )}
                      >
                        {/* User Info */}
                        <div className="col-span-4 flex items-center gap-3">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-brand-500/20 group-hover:scale-110 transition-transform">
                              {referral.referredUserName?.[0]?.toUpperCase() || "?"}
                            </div>
                            <div className={cn(
                              "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-900",
                              referral.status === "CONVERTED" ? "bg-emerald-500" :
                              referral.status === "ACTIVE" ? "bg-blue-500" :
                              referral.status === "PENDING" ? "bg-yellow-500" : "bg-gray-400"
                            )} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-brand-500 transition-colors">
                              {referral.referredUserName || "Anonymous"}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{referral.referredUserEmail}</p>
                          </div>
                        </div>

                        {/* Status - Mobile shows inline, desktop shows in column */}
                        <div className="col-span-2 flex items-center">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium",
                            referral.status === "CONVERTED" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" :
                            referral.status === "ACTIVE" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" :
                            referral.status === "PENDING" ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400" :
                            "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                          )}>
                            {config.icon}
                            {config.label}
                          </span>
                        </div>

                        {/* Joined Date */}
                        <div className="col-span-2 flex items-center justify-end">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(referral.registeredAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>

                        {/* Purchases */}
                        <div className="col-span-2 flex items-center justify-end">
                          <div className="text-right">
                            <p className="font-semibold text-gray-900 dark:text-white">
                              ${parseFloat(referral.totalPurchases || "0").toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* Commission */}
                        <div className="col-span-2 flex items-center justify-end">
                          <div className="text-right">
                            <p className="font-bold text-emerald-600 dark:text-emerald-400">
                              +{parseFloat(referral.totalCommissionEarned || "0").toLocaleString()}
                            </p>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wide">HBCT</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pagination */}
              {referralsPagination.total > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-800">
                  {/* Items per page */}
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span>Show</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2 py-1 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                    <span>of {referralsPagination.total} entries</span>
                  </div>

                  {/* Pagination Controls */}
                  <div className="flex items-center gap-1">
                    {/* First Page */}
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        currentPage === 1
                          ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                      )}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </button>

                    {/* Previous Page */}
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        currentPage === 1
                          ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                      )}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    {/* Page Numbers */}
                    <div className="flex items-center gap-1 mx-2">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          if (totalPages <= 5) return true;
                          if (page === 1 || page === totalPages) return true;
                          if (Math.abs(page - currentPage) <= 1) return true;
                          return false;
                        })
                        .map((page, index, arr) => (
                          <div key={page} className="flex items-center">
                            {index > 0 && arr[index - 1] !== page - 1 && (
                              <span className="px-1 text-gray-400">...</span>
                            )}
                            <button
                              onClick={() => setCurrentPage(page)}
                              className={cn(
                                "w-8 h-8 rounded-lg text-sm font-medium transition-all",
                                currentPage === page
                                  ? "bg-brand-500 text-white shadow-lg shadow-brand-500/25"
                                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                              )}
                            >
                              {page}
                            </button>
                          </div>
                        ))}
                    </div>

                    {/* Next Page */}
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        currentPage === totalPages
                          ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                      )}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>

                    {/* Last Page */}
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        currentPage === totalPages
                          ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                      )}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
