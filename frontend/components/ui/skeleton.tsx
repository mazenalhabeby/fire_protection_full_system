"use client";

import { cn } from "@/lib/utils";

// ============================================
// BASE SKELETON COMPONENT
// Premium shimmer animation for both light/dark modes
// ============================================

interface SkeletonProps {
  className?: string;
  variant?: "default" | "circular" | "rounded" | "text";
  animation?: "shimmer" | "pulse" | "none";
  style?: React.CSSProperties;
}

export function Skeleton({
  className,
  variant = "default",
  animation = "shimmer",
  style,
}: SkeletonProps) {
  return (
    <div
      className={cn(
        // Base styles
        "relative overflow-hidden",
        "bg-gray-200/80 dark:bg-gray-800/80",

        // Variant styles
        variant === "circular" && "rounded-full",
        variant === "rounded" && "rounded-xl",
        variant === "text" && "rounded-md",
        variant === "default" && "rounded-lg",

        // Animation styles
        animation === "shimmer" && "skeleton-shimmer",
        animation === "pulse" && "animate-pulse",

        className
      )}
      style={style}
    />
  );
}

// ============================================
// SKELETON PRIMITIVES
// Reusable building blocks
// ============================================

export function SkeletonAvatar({
  size = "md",
  className
}: {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizes = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  };

  return <Skeleton variant="circular" className={cn(sizes[size], className)} />;
}

export function SkeletonText({
  lines = 1,
  lastLineWidth = "75%",
  className,
}: {
  lines?: number;
  lastLineWidth?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className="h-4"
          style={{
            width: i === lines - 1 && lines > 1 ? lastLineWidth : "100%",
          }}
        />
      ))}
    </div>
  );
}

export function SkeletonButton({
  size = "md",
  className
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "h-8 w-20",
    md: "h-10 w-28",
    lg: "h-12 w-36",
  };

  return <Skeleton variant="rounded" className={cn(sizes[size], className)} />;
}

export function SkeletonBadge({ className }: { className?: string }) {
  return <Skeleton variant="rounded" className={cn("h-5 w-16", className)} />;
}

export function SkeletonIcon({
  size = "md",
  className
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return <Skeleton variant="rounded" className={cn(sizes[size], className)} />;
}

// ============================================
// SKELETON CARD LAYOUTS
// Common card patterns
// ============================================

export function SkeletonCard({
  hasHeader = true,
  hasFooter = false,
  contentLines = 3,
  className,
  children,
}: {
  hasHeader?: boolean;
  hasFooter?: boolean;
  contentLines?: number;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn(
      "rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden",
      className
    )}>
      {hasHeader && (
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <SkeletonIcon size="lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        </div>
      )}
      <div className="p-6">
        {children || <SkeletonText lines={contentLines} />}
      </div>
      {hasFooter && (
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
          <SkeletonButton size="sm" />
          <SkeletonButton size="sm" />
        </div>
      )}
    </div>
  );
}

export function SkeletonStatCard({ className }: { className?: string }) {
  return (
    <div className={cn(
      "p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800",
      className
    )}>
      <div className="flex items-start justify-between mb-4">
        <Skeleton variant="rounded" className="h-12 w-12" />
        <SkeletonBadge />
      </div>
      <Skeleton className="h-8 w-24 mb-2" />
      <Skeleton className="h-4 w-32" />
    </div>
  );
}

export function SkeletonListItem({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-4 p-4", className)}>
      <SkeletonAvatar size="lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-8 w-20" />
    </div>
  );
}

export function SkeletonTableRow({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-gray-100 dark:border-gray-800 last:border-0">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i === 0 ? "w-1/4" : "flex-1"
          )}
        />
      ))}
    </div>
  );
}

// ============================================
// SKELETON SECTION LAYOUTS
// Page section patterns
// ============================================

export function SkeletonPageHeader({ className }: { className?: string }) {
  return (
    <div className={cn("mb-8", className)}>
      <Skeleton className="h-8 w-48 mb-2" />
      <Skeleton className="h-4 w-72" />
    </div>
  );
}

export function SkeletonStatsGrid({
  count = 4,
  className
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn(
      "grid gap-4",
      count === 2 && "grid-cols-1 md:grid-cols-2",
      count === 3 && "grid-cols-1 md:grid-cols-3",
      count === 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
      className
    )}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonList({
  items = 5,
  className
}: {
  items?: number;
  className?: string;
}) {
  return (
    <div className={cn(
      "rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden divide-y divide-gray-100 dark:divide-gray-800",
      className
    )}>
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonListItem key={i} />
      ))}
    </div>
  );
}

// ============================================
// SKELETON WALLET CARD
// For wallet/crypto related content
// ============================================

export function SkeletonWalletCard({ className }: { className?: string }) {
  return (
    <div className={cn(
      "p-4 rounded-xl border border-gray-200 dark:border-gray-700",
      className
    )}>
      <div className="flex items-start gap-4">
        <Skeleton variant="rounded" className="h-12 w-12" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48 font-mono" />
          <div className="flex items-center gap-4 mt-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="flex gap-2">
          <SkeletonButton size="sm" />
          <Skeleton variant="rounded" className="h-8 w-8" />
        </div>
      </div>
    </div>
  );
}

// ============================================
// SKELETON CHART
// For charts and graphs
// ============================================

export function SkeletonChart({
  height = 200,
  className
}: {
  height?: number;
  className?: string;
}) {
  return (
    <div className={cn(
      "rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6",
      className
    )}>
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-5 w-32" />
        <div className="flex gap-2">
          <SkeletonButton size="sm" />
          <SkeletonButton size="sm" />
        </div>
      </div>
      <Skeleton
        variant="rounded"
        className="w-full"
        style={{ height }}
      />
    </div>
  );
}

// ============================================
// FULL PAGE SKELETONS
// Complete page layouts
// ============================================

export function SkeletonDashboard() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <SkeletonPageHeader />
      <SkeletonStatsGrid count={4} />
      <div className="grid gap-6 lg:grid-cols-2">
        <SkeletonChart height={250} />
        <SkeletonCard hasHeader contentLines={0}>
          <SkeletonList items={4} />
        </SkeletonCard>
      </div>
    </div>
  );
}

export function SkeletonSettings() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <SkeletonPageHeader />
      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <SkeletonCard hasHeader={false} contentLines={0} className="p-2">
            <div className="space-y-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </SkeletonCard>
        </div>
        <div className="lg:col-span-3 space-y-6">
          <SkeletonCard hasHeader contentLines={4} />
          <SkeletonCard hasHeader contentLines={3} />
        </div>
      </div>
    </div>
  );
}

export function SkeletonWallets() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <SkeletonCard hasHeader contentLines={0}>
        <div className="flex items-center gap-4 p-4">
          <Skeleton variant="rounded" className="h-14 w-14" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex gap-2">
            <SkeletonButton />
            <SkeletonButton />
          </div>
        </div>
      </SkeletonCard>
      <SkeletonCard hasHeader contentLines={0}>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonWalletCard key={i} />
          ))}
        </div>
      </SkeletonCard>
    </div>
  );
}

export function SkeletonProfile() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <SkeletonCard hasHeader contentLines={0}>
        <div className="flex items-center gap-6 mb-8">
          <SkeletonAvatar size="xl" className="h-20 w-20" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </SkeletonCard>
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden animate-in fade-in duration-500">
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className={cn("h-4", i === 0 ? "w-1/4" : "flex-1")} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonTableRow key={i} columns={columns} />
      ))}
    </div>
  );
}
