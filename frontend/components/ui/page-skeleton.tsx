"use client";

import { ReactNode, useEffect } from "react";
import { usePageLoading } from "@/hooks/useMinimumLoading";
import {
  SkeletonDashboard,
  SkeletonSettings,
  SkeletonWallets,
  SkeletonProfile,
  SkeletonTable,
  SkeletonStatsGrid,
  SkeletonList,
  SkeletonCard,
  SkeletonChart,
} from "./skeleton";
import { cn } from "@/lib/utils";

// ============================================
// PAGE SKELETON TYPES
// Map of all available page skeleton variants
// ============================================

export type PageSkeletonVariant =
  | "dashboard"
  | "settings"
  | "wallets"
  | "profile"
  | "table"
  | "stats"
  | "list"
  | "card"
  | "chart"
  | "custom";

interface PageSkeletonProps {
  /** Page skeleton variant to display */
  variant?: PageSkeletonVariant;
  /** Content to render after loading */
  children: ReactNode;
  /** Whether data is still loading */
  isDataLoading?: boolean;
  /** Minimum loading duration in ms (default: 2000) */
  minimumDuration?: number;
  /** Custom skeleton component for variant="custom" */
  customSkeleton?: ReactNode;
  /** Additional class for the wrapper */
  className?: string;
  /** Props passed to skeleton variants that support them */
  skeletonProps?: {
    rows?: number;
    columns?: number;
    items?: number;
    count?: number;
    height?: number;
    hasHeader?: boolean;
    hasFooter?: boolean;
    contentLines?: number;
  };
}

// ============================================
// SKELETON RENDERER
// Renders appropriate skeleton based on variant
// ============================================

function SkeletonRenderer({
  variant,
  customSkeleton,
  skeletonProps = {},
}: {
  variant: PageSkeletonVariant;
  customSkeleton?: ReactNode;
  skeletonProps?: PageSkeletonProps["skeletonProps"];
}) {
  switch (variant) {
    case "dashboard":
      return <SkeletonDashboard />;
    case "settings":
      return <SkeletonSettings />;
    case "wallets":
      return <SkeletonWallets />;
    case "profile":
      return <SkeletonProfile />;
    case "table":
      return (
        <SkeletonTable
          rows={skeletonProps.rows ?? 5}
          columns={skeletonProps.columns ?? 4}
        />
      );
    case "stats":
      return <SkeletonStatsGrid count={skeletonProps.count ?? 4} />;
    case "list":
      return <SkeletonList items={skeletonProps.items ?? 5} />;
    case "card":
      return (
        <SkeletonCard
          hasHeader={skeletonProps.hasHeader}
          hasFooter={skeletonProps.hasFooter}
          contentLines={skeletonProps.contentLines}
        />
      );
    case "chart":
      return <SkeletonChart height={skeletonProps.height ?? 200} />;
    case "custom":
      return <>{customSkeleton}</>;
    default:
      return <SkeletonDashboard />;
  }
}

// ============================================
// PAGE SKELETON COMPONENT
// Wrapper that handles loading state with minimum duration
// ============================================

export function PageSkeleton({
  variant = "dashboard",
  children,
  isDataLoading = false,
  minimumDuration = 2000,
  customSkeleton,
  className,
  skeletonProps,
}: PageSkeletonProps) {
  const { isLoading, stopLoading } = usePageLoading(minimumDuration);

  // Stop minimum loading when data is ready
  useEffect(() => {
    if (!isDataLoading) {
      stopLoading();
    }
  }, [isDataLoading, stopLoading]);

  // Show skeleton while either minimum duration or data loading
  const showSkeleton = isLoading || isDataLoading;

  return (
    <div className={cn("relative", className)}>
      {/* Skeleton Layer */}
      <div
        className={cn(
          "transition-opacity duration-300",
          showSkeleton ? "opacity-100" : "opacity-0 pointer-events-none absolute inset-0"
        )}
        aria-hidden={!showSkeleton}
      >
        <SkeletonRenderer
          variant={variant}
          customSkeleton={customSkeleton}
          skeletonProps={skeletonProps}
        />
      </div>

      {/* Content Layer */}
      <div
        className={cn(
          "transition-opacity duration-300",
          showSkeleton ? "opacity-0 absolute inset-0 pointer-events-none" : "opacity-100"
        )}
        aria-hidden={showSkeleton}
      >
        {children}
      </div>
    </div>
  );
}

// ============================================
// SKELETON TRANSITION WRAPPER
// For cases where you want manual control
// ============================================

interface SkeletonTransitionProps {
  isLoading: boolean;
  skeleton: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SkeletonTransition({
  isLoading,
  skeleton,
  children,
  className,
}: SkeletonTransitionProps) {
  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "transition-opacity duration-300",
          isLoading ? "opacity-100" : "opacity-0 pointer-events-none absolute inset-0"
        )}
        aria-hidden={!isLoading}
      >
        {skeleton}
      </div>
      <div
        className={cn(
          "transition-opacity duration-300",
          isLoading ? "opacity-0 absolute inset-0 pointer-events-none" : "opacity-100"
        )}
        aria-hidden={isLoading}
      >
        {children}
      </div>
    </div>
  );
}

// ============================================
// HOOK FOR INLINE SKELETON USAGE
// For components that need skeleton state
// ============================================

export { usePageLoading, useMinimumLoading } from "@/hooks/useMinimumLoading";
