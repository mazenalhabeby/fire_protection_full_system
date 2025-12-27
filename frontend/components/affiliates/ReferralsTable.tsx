"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Users,
  Search,
  ChevronDown,
  Clock,
  CheckCircle,
  XCircle,
  UserCheck,
  Calendar,
  TrendingUp,
  Sparkles,
  DollarSign,
  ArrowUpRight,
} from "lucide-react";
import type { ReferralDetails } from "@/types/api";

interface ReferralsTableProps {
  referrals: ReferralDetails[];
  summary?: {
    total: number;
    active: number;
    converted: number;
    inactive: number;
    pending?: number;
  };
  className?: string;
}

type StatusFilter = "all" | "pending" | "active" | "converted" | "inactive";

const statusConfig: Record<
  string,
  {
    bgGradient: string;
    textColor: string;
    icon: React.ReactNode;
    label: string;
    glowColor: string;
  }
> = {
  PENDING: {
    bgGradient: "bg-gradient-to-r from-amber-500/20 to-orange-500/20 dark:from-amber-500/30 dark:to-orange-500/30",
    textColor: "text-amber-600 dark:text-amber-400",
    icon: <Clock className="h-3 w-3" />,
    label: "Pending",
    glowColor: "shadow-amber-500/20",
  },
  ACTIVE: {
    bgGradient: "bg-gradient-to-r from-blue-500/20 to-indigo-500/20 dark:from-blue-500/30 dark:to-indigo-500/30",
    textColor: "text-blue-600 dark:text-blue-400",
    icon: <UserCheck className="h-3 w-3" />,
    label: "Active",
    glowColor: "shadow-blue-500/20",
  },
  CONVERTED: {
    bgGradient: "bg-gradient-to-r from-emerald-500/20 to-green-500/20 dark:from-emerald-500/30 dark:to-green-500/30",
    textColor: "text-emerald-600 dark:text-emerald-400",
    icon: <CheckCircle className="h-3 w-3" />,
    label: "Converted",
    glowColor: "shadow-emerald-500/20",
  },
  INACTIVE: {
    bgGradient: "bg-gradient-to-r from-gray-500/20 to-slate-500/20 dark:from-gray-500/30 dark:to-slate-500/30",
    textColor: "text-gray-600 dark:text-gray-400",
    icon: <XCircle className="h-3 w-3" />,
    label: "Inactive",
    glowColor: "shadow-gray-500/20",
  },
};

const filterConfig: Record<StatusFilter, { icon: React.ReactNode; activeGradient: string }> = {
  all: {
    icon: <Users className="h-3.5 w-3.5" />,
    activeGradient: "bg-gradient-to-r from-purple-600 to-indigo-600"
  },
  pending: {
    icon: <Clock className="h-3.5 w-3.5" />,
    activeGradient: "bg-gradient-to-r from-amber-500 to-orange-500"
  },
  active: {
    icon: <UserCheck className="h-3.5 w-3.5" />,
    activeGradient: "bg-gradient-to-r from-blue-500 to-indigo-500"
  },
  converted: {
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    activeGradient: "bg-gradient-to-r from-emerald-500 to-green-500"
  },
  inactive: {
    icon: <XCircle className="h-3.5 w-3.5" />,
    activeGradient: "bg-gradient-to-r from-gray-500 to-slate-500"
  },
};

export function ReferralsTable({
  referrals,
  summary,
  className,
}: ReferralsTableProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const filteredReferrals = referrals.filter((r) => {
    const matchesStatus =
      statusFilter === "all" ||
      r.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      r.referredUserName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.referredUserEmail?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const displayedReferrals = showAll
    ? filteredReferrals
    : filteredReferrals.slice(0, 5);

  return (
    <div className={cn("relative overflow-hidden rounded-2xl", className)}>
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-[80px]" />

      <div className="relative border border-gray-200/80 dark:border-gray-700/50 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 md:p-6 border-b border-gray-200/80 dark:border-gray-700/50">
          <div className="flex items-start justify-between flex-wrap gap-4">
            {/* Title Section */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl blur-lg opacity-40" />
                <div className="relative p-3 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg">
                  <Users className="h-5 w-5 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Your Referrals</h3>
                {summary && (
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {summary.total} total
                    </span>
                    <span className="text-gray-300 dark:text-gray-600">•</span>
                    <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {summary.converted} converted
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-72">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 dark:from-purple-500/20 dark:to-indigo-500/20 rounded-xl blur-sm" />
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search referrals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex gap-2 mt-5 flex-wrap">
            {(["all", "pending", "active", "converted", "inactive"] as StatusFilter[]).map((status) => {
              const count = status === "all"
                ? summary?.total
                : summary?.[status as keyof typeof summary];
              const config = filterConfig[status];
              const isActive = statusFilter === status;

              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive
                      ? cn(config.activeGradient, "text-white shadow-lg")
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                  )}
                >
                  {config.icon}
                  <span className="capitalize">{status}</span>
                  {count !== undefined && (
                    <span className={cn(
                      "ml-1 px-1.5 py-0.5 text-xs rounded-full",
                      isActive
                        ? "bg-white/20"
                        : "bg-gray-200 dark:bg-gray-700"
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-5">
          {displayedReferrals.length === 0 ? (
            <div className="py-12 text-center">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-full blur-xl" />
                <div className="relative p-4 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
                  <Users className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                </div>
              </div>
              <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">No referrals found</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
                Share your referral link to start earning!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedReferrals.map((referral, index) => {
                const config = statusConfig[referral.status];
                const purchases = parseFloat(referral.totalPurchases || "0");
                const commission = parseFloat(referral.totalCommissionEarned || "0");

                return (
                  <div
                    key={referral.id}
                    className={cn(
                      "group relative flex items-center gap-4 p-4 rounded-xl transition-all duration-300",
                      "bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50",
                      "hover:shadow-lg hover:shadow-purple-500/5 dark:hover:shadow-purple-500/10",
                      "hover:border-purple-200 dark:hover:border-purple-800/50",
                      "hover:-translate-y-0.5"
                    )}
                  >
                    {/* Rank Number */}
                    <div className="hidden sm:flex w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700/50 items-center justify-center">
                      <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                        {index + 1}
                      </span>
                    </div>

                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full blur-md opacity-30 group-hover:opacity-50 transition-opacity" />
                      <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
                        <span className="text-lg font-bold text-white">
                          {referral.referredUserName?.[0]?.toUpperCase() ||
                            referral.referredUserEmail?.[0]?.toUpperCase() ||
                            "?"}
                        </span>
                      </div>
                      {/* Status Dot */}
                      <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800",
                        referral.status === "CONVERTED" && "bg-emerald-500",
                        referral.status === "ACTIVE" && "bg-blue-500",
                        referral.status === "PENDING" && "bg-amber-500",
                        referral.status === "INACTIVE" && "bg-gray-400"
                      )} />
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">
                          {referral.referredUserName || "Anonymous User"}
                        </p>
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                          config.bgGradient,
                          config.textColor
                        )}>
                          {config.icon}
                          {config.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Joined {new Date(referral.registeredAt).toLocaleDateString()}
                        </span>
                        {referral.firstPurchaseAt && (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <Sparkles className="h-3 w-3" />
                            Converted {new Date(referral.firstPurchaseAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="hidden md:flex items-center gap-6">
                      {/* Purchases */}
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          <span className="font-bold text-gray-900 dark:text-white">
                            {purchases.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">purchases</p>
                      </div>

                      {/* Divider */}
                      <div className="h-10 w-px bg-gray-200 dark:bg-gray-700" />

                      {/* Commission Earned */}
                      <div className="text-right min-w-[100px]">
                        <div className="flex items-center justify-end gap-1.5">
                          <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            +{commission.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">HBCT earned</p>
                      </div>
                    </div>

                    {/* Mobile Stats */}
                    <div className="md:hidden flex flex-col items-end gap-1">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        +{commission.toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-500">HBCT</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Show More Button */}
          {filteredReferrals.length > 5 && (
            <div className="mt-5 text-center">
              <button
                onClick={() => setShowAll(!showAll)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
              >
                {showAll ? "Show Less" : `Show All (${filteredReferrals.length})`}
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform duration-300",
                    showAll && "rotate-180"
                  )}
                />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
