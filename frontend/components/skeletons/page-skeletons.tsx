"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

// Helper components for skeleton variants
function SkeletonAvatar({ size = "md", className }: { size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  const sizes = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  };
  return <Skeleton className={cn("rounded-full", sizes[size], className)} />;
}

function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn("h-4", i === lines - 1 ? "w-3/4" : "w-full")} />
      ))}
    </div>
  );
}

// ============================================
// SKELETON STAT CARD - Reusable for all pages
// ============================================

function SkeletonStatCard({ color = "gray" }: { color?: "purple" | "emerald" | "amber" | "blue" | "brand" | "gray" }) {
  const colorClasses = {
    purple: "from-purple-500/10 via-purple-500/5 border-purple-200/50 dark:from-purple-500/20 dark:border-purple-500/20",
    emerald: "from-emerald-500/10 via-emerald-500/5 border-emerald-200/50 dark:from-emerald-500/20 dark:border-emerald-500/20",
    amber: "from-amber-500/10 via-amber-500/5 border-amber-200/50 dark:from-amber-500/20 dark:border-amber-500/20",
    blue: "from-blue-500/10 via-blue-500/5 border-blue-200/50 dark:from-blue-500/20 dark:border-blue-500/20",
    brand: "from-brand-500/10 via-brand-500/5 border-brand-200/50 dark:from-brand-500/20 dark:border-brand-500/20",
    gray: "from-gray-500/10 via-gray-500/5 border-gray-200/50 dark:from-gray-500/20 dark:border-gray-500/20",
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl bg-gradient-to-br to-transparent border p-5",
      colorClasses[color]
    )}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-14 w-14 rounded-xl" />
      </div>
    </div>
  );
}

// ============================================
// DASHBOARD SKELETON
// Matches: Header card + 4 stats + 2 columns
// ============================================

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Premium Header Card - Dark */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          {/* Left - Text */}
          <div className="md:w-1/2 space-y-3">
            <Skeleton className="h-4 w-24 bg-gray-700" />
            <Skeleton className="h-8 w-64 bg-gray-700" />
            <Skeleton className="h-4 w-80 bg-gray-800" />
          </div>
          {/* Right - Chart */}
          <div className="hidden md:flex items-center justify-end gap-4 md:w-1/2">
            <Skeleton className="flex-1 h-24 bg-gray-800 rounded-xl" />
            <div className="text-right space-y-2">
              <Skeleton className="h-6 w-16 bg-gray-700 ml-auto" />
              <Skeleton className="h-3 w-20 bg-gray-800 ml-auto" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid - Stats + Actions | Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side */}
        <div className="space-y-6">
          {/* Stats Grid 2x2 */}
          <div className="grid grid-cols-2 gap-4">
            <SkeletonStatCard color="brand" />
            <SkeletonStatCard color="purple" />
            <SkeletonStatCard color="emerald" />
            <SkeletonStatCard color="blue" />
          </div>

          {/* Quick Actions */}
          <div className="hidden md:block p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <Skeleton className="h-4 w-28 mb-4" />
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side - Transactions */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SETTINGS SKELETON
// Matches: Header + Sidebar + Content
// ============================================

export function SettingsSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="mb-8">
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Settings Layout */}
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 shrink-0">
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-2">
            <div className="space-y-1">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                  <Skeleton className="h-5 w-5 rounded-lg" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 max-w-2xl space-y-6">
          {/* Profile Card */}
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center gap-4 mb-6">
              <SkeletonAvatar size="xl" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              ))}
            </div>
          </div>

          {/* Another Section */}
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6">
            <Skeleton className="h-5 w-40 mb-4" />
            <SkeletonText lines={3} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// LOCKING SKELETON
// Matches: Header + 3 Stats + Lock Form + My Locks
// ============================================

export function LockingSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="mb-6">
        <Skeleton className="h-8 w-40 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Stats Cards - 3 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <SkeletonStatCard color="purple" />
        <SkeletonStatCard color="emerald" />
        <SkeletonStatCard color="amber" />
      </div>

      {/* Main Grid - Lock Form + My Locks */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Lock Form - Left */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
            {/* Card Header */}
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-lg" />
                <Skeleton className="h-5 w-24" />
              </div>
              <Skeleton className="h-5 w-28 rounded-full" />
            </div>

            <div className="p-5 space-y-5">
              {/* Tier Selection - 3 coins */}
              <div>
                <Skeleton className="h-4 w-32 mb-4" />
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 text-center">
                      <Skeleton className="h-20 w-20 mx-auto mb-3 rounded-full" />
                      <Skeleton className="h-4 w-16 mx-auto mb-1" />
                      <Skeleton className="h-3 w-20 mx-auto mb-2" />
                      <Skeleton className="h-6 w-14 mx-auto rounded-full" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Amount Input */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <div className="flex justify-between mb-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 w-24 rounded-xl" />
                </div>
              </div>

              {/* Estimated Reward */}
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex justify-between items-center">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-8 w-40" />
                  </div>
                  <div className="text-right space-y-1">
                    <Skeleton className="h-3 w-20 ml-auto" />
                    <Skeleton className="h-5 w-24 ml-auto" />
                  </div>
                </div>
              </div>

              {/* Lock Button */}
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          </div>
        </div>

        {/* My Locks - Right */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-lg" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-14 rounded-full" />
                      </div>
                      <Skeleton className="h-5 w-24" />
                      <div className="flex gap-2">
                        <Skeleton className="h-6 w-20 rounded-lg" />
                        <Skeleton className="h-6 w-16 rounded-lg" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// BUY TOKENS SKELETON
// Matches: Header + 2 columns (Form + Info)
// ============================================

export function BuyTokensSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="mb-6">
        <Skeleton className="h-8 w-36 mb-2" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Main Grid - 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left - Buy Form */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <Skeleton className="h-6 w-16" />
            </div>

            <div className="p-6 space-y-4">
              {/* You Pay */}
              <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-800/80">
                <div className="flex justify-between mb-3">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-12 w-28 rounded-2xl" />
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <Skeleton className="h-10 w-10 rounded-full" />
              </div>

              {/* You Receive */}
              <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-800/80">
                <div className="flex justify-between mb-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-12 w-24 rounded-2xl" />
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>

              {/* Buy Button */}
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          </div>
        </div>

        {/* Right - Stats & Info */}
        <div className="space-y-6">
          {/* Price Card */}
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-10 w-32 mb-2" />
            <Skeleton className="h-4 w-40" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                <Skeleton className="h-3 w-20 mb-2" />
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>

          {/* Info Card */}
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6">
            <Skeleton className="h-5 w-36 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// AFFILIATES SKELETON
// Matches: Header + Tier Card + Stats + Tabs + Content
// ============================================

export function AffiliatesSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="mb-6">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Current Tier Card - Dark */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <Skeleton className="h-20 w-20 bg-gray-600 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 bg-gray-600" />
              <Skeleton className="h-8 w-32 bg-gray-600" />
              <Skeleton className="h-4 w-40 bg-gray-700" />
            </div>
          </div>
          <div className="flex-1 max-w-md space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-32 bg-gray-600" />
              <Skeleton className="h-4 w-12 bg-gray-600" />
            </div>
            <Skeleton className="h-3 w-full rounded-full bg-gray-600" />
            <div className="flex justify-between">
              <Skeleton className="h-3 w-28 bg-gray-700" />
              <Skeleton className="h-3 w-20 bg-gray-700" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards - 3 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SkeletonStatCard color="blue" />
        <SkeletonStatCard color="brand" />
        <SkeletonStatCard color="amber" />
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24 rounded-xl" />
        <Skeleton className="h-10 w-24 rounded-xl" />
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Referral Link Card */}
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-4 mb-6">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <div className="p-3 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center gap-2 mb-4">
            <Skeleton className="h-5 flex-1" />
            <Skeleton className="h-9 w-20 rounded-lg" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-28 rounded-lg" />
            <Skeleton className="h-10 w-20 rounded-lg" />
          </div>
        </div>

        {/* Leaderboard */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="p-5 text-center border-b border-gray-100 dark:border-gray-800">
            <Skeleton className="h-12 w-12 mx-auto mb-2 rounded-xl" />
            <Skeleton className="h-5 w-28 mx-auto" />
          </div>
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MARKETPLACE SKELETON
// Matches: Header + Search + Product Grid
// ============================================

export function MarketplaceSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header with Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-36 mb-2" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-64 rounded-lg" />
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-10 w-24 rounded-full shrink-0" />
        ))}
      </div>

      {/* Product Grid - 4 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
            {/* Product Image */}
            <Skeleton className="aspect-square w-full" />
            {/* Product Info */}
            <div className="p-4 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <div className="flex items-center justify-between pt-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-9 w-20 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// ADMIN SKELETON
// Matches: Header + Stats Grid + Quick Links
// ============================================

export function AdminSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="mb-6">
        <Skeleton className="h-8 w-44 mb-2" />
        <Skeleton className="h-4 w-60" />
      </div>

      {/* Stats Grid - 4 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-8 w-20 mb-1" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>

      {/* Quick Links Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Table Preview */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
