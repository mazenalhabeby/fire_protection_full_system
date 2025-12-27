"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Users,
  Coins,
  TrendingUp,
  Clock,
  DollarSign,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import type { AffiliateStats } from "@/types/api";

interface AffiliateStatsGridProps {
  stats: AffiliateStats;
  className?: string;
}

interface StatItemProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  variant?: "default" | "primary" | "success" | "warning";
}

function StatItem({
  label,
  value,
  subValue,
  icon,
  trend,
  trendValue,
  variant = "default",
}: StatItemProps) {
  const variantStyles = {
    default: "bg-secondary/50",
    primary: "bg-primary/5 border-primary/20",
    success: "bg-success/5 border-success/20",
    warning: "bg-warning/5 border-warning/20",
  };

  const iconStyles = {
    default: "bg-secondary text-muted-foreground",
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
  };

  return (
    <Card className={cn("border", variantStyles[variant])}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {subValue && (
              <p className="text-xs text-muted-foreground">{subValue}</p>
            )}
            {trend && trendValue && (
              <div
                className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  trend === "up" && "text-success",
                  trend === "down" && "text-danger",
                  trend === "neutral" && "text-muted-foreground"
                )}
              >
                {trend === "up" && <ArrowUpRight className="h-3 w-3" />}
                {trend === "down" && <ArrowDownRight className="h-3 w-3" />}
                <span>{trendValue}</span>
              </div>
            )}
          </div>
          <div className={cn("p-2.5 rounded-xl", iconStyles[variant])}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AffiliateStatsGrid({ stats, className }: AffiliateStatsGridProps) {
  // Calculate trends
  const referralsTrend =
    stats.thisMonthReferrals > (stats.lastMonthReferrals || 0)
      ? "up"
      : stats.thisMonthReferrals < (stats.lastMonthReferrals || 0)
      ? "down"
      : "neutral";

  const referralsChange =
    stats.lastMonthReferrals > 0
      ? Math.round(
          ((stats.thisMonthReferrals - stats.lastMonthReferrals) /
            stats.lastMonthReferrals) *
            100
        )
      : 0;

  const earningsTrend =
    parseFloat(stats.thisMonthEarnings) > parseFloat(stats.lastMonthEarnings || "0")
      ? "up"
      : parseFloat(stats.thisMonthEarnings) < parseFloat(stats.lastMonthEarnings || "0")
      ? "down"
      : "neutral";

  const earningsChange =
    parseFloat(stats.lastMonthEarnings || "0") > 0
      ? Math.round(
          ((parseFloat(stats.thisMonthEarnings) -
            parseFloat(stats.lastMonthEarnings || "0")) /
            parseFloat(stats.lastMonthEarnings || "0")) *
            100
        )
      : 0;

  return (
    <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      <StatItem
        label="Total Referrals"
        value={stats.totalReferrals}
        subValue={`${stats.thisMonthReferrals} this month`}
        icon={<Users className="h-5 w-5" />}
        trend={referralsTrend}
        trendValue={`${referralsChange > 0 ? "+" : ""}${referralsChange}% vs last month`}
        variant="primary"
      />

      <StatItem
        label="Total Earnings"
        value={`${parseFloat(stats.totalEarnings).toLocaleString()} HBCT`}
        subValue={`${parseFloat(stats.thisMonthEarnings).toLocaleString()} this month`}
        icon={<Coins className="h-5 w-5" />}
        trend={earningsTrend}
        trendValue={`${earningsChange > 0 ? "+" : ""}${earningsChange}% vs last month`}
        variant="success"
      />

      <StatItem
        label="Pending Earnings"
        value={`${parseFloat(stats.pendingEarnings).toLocaleString()} HBCT`}
        subValue="Available to claim"
        icon={<Clock className="h-5 w-5" />}
        variant="warning"
      />

      <StatItem
        label="Total Volume"
        value={`$${parseFloat(stats.totalVolume || "0").toLocaleString()}`}
        subValue={`$${parseFloat(stats.thisMonthVolume || "0").toLocaleString()} this month`}
        icon={<TrendingUp className="h-5 w-5" />}
      />

      <StatItem
        label="Conversion Rate"
        value={`${stats.conversionRate || "0"}%`}
        subValue="Referrals to customers"
        icon={<Percent className="h-5 w-5" />}
      />

      <StatItem
        label="Avg. Order Value"
        value={`$${parseFloat(stats.averageOrderValue || "0").toLocaleString()}`}
        subValue="Per converted referral"
        icon={<DollarSign className="h-5 w-5" />}
      />

      <StatItem
        label="Paid Earnings"
        value={`${parseFloat(stats.paidEarnings).toLocaleString()} HBCT`}
        subValue="Total claimed"
        icon={<Coins className="h-5 w-5" />}
        variant="success"
      />

      <StatItem
        label="This Month"
        value={stats.thisMonthReferrals}
        subValue={`${parseFloat(stats.thisMonthEarnings).toLocaleString()} HBCT earned`}
        icon={<TrendingUp className="h-5 w-5" />}
        variant="primary"
      />
    </div>
  );
}
