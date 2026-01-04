"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";
import { Button, cn } from "@/components/ui";
import {
  Lock,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  Gift,
  Calendar,
  CheckCircle,
  XCircle,
  Timer,
} from "lucide-react";
import { AdminSkeleton } from "@/components/skeletons";

const LOCK_STATUSES = ["ACTIVE", "COMPLETED", "CANCELLED"];

export default function AdminLocksPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "locks", page, statusFilter],
    queryFn: () => adminApi.getLocks({ page, limit: 20, status: statusFilter || undefined }),
  });

  const { data: stats } = useQuery({
    queryKey: ["admin", "locks", "stats"],
    queryFn: () => adminApi.getLockStats(),
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <AdminSkeleton />
      </div>
    );
  }

  const locks = data?.locks || [];
  const pagination = data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Lock className="h-3 w-3" />;
      case "COMPLETED":
        return <CheckCircle className="h-3 w-3" />;
      case "CANCELLED":
        return <XCircle className="h-3 w-3" />;
      default:
        return <Timer className="h-3 w-3" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
      case "COMPLETED":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
      case "CANCELLED":
        return "bg-red-500/10 text-red-600 dark:text-red-400";
      default:
        return "bg-gray-500/10 text-gray-600 dark:text-gray-400";
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent dark:from-blue-500/20 dark:via-blue-500/10 dark:to-transparent border border-blue-200/50 dark:border-blue-500/20 p-4 md:p-5 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Active Locks</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{stats.statusBreakdown?.active?.count || 0}</p>
                <p className="text-[10px] md:text-xs font-medium mt-1 text-blue-500">Currently Active</p>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                <Lock className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500/10 via-brand-500/5 to-transparent dark:from-brand-500/20 dark:via-brand-500/10 dark:to-transparent border border-brand-200/50 dark:border-brand-500/20 p-4 md:p-5 transition-all duration-300 hover:shadow-lg hover:shadow-brand-500/10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-brand-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Total Locked</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{parseFloat(stats.totalActiveLocked).toLocaleString()}</p>
                <p className="text-[10px] md:text-xs font-medium mt-1 text-brand-500">HBCT Tokens</p>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/30 group-hover:scale-110 transition-transform duration-300">
                <Coins className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-500/20 dark:via-amber-500/10 dark:to-transparent border border-amber-200/50 dark:border-amber-500/20 p-4 md:p-5 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Total Bonus</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{parseFloat(stats.totalBonusAwarded).toLocaleString()}</p>
                <p className="text-[10px] md:text-xs font-medium mt-1 text-amber-500">HBCT Awarded</p>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform duration-300">
                <Gift className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-500/20 dark:via-emerald-500/10 dark:to-transparent border border-emerald-200/50 dark:border-emerald-500/20 p-4 md:p-5 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Completed</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{stats.statusBreakdown?.completed?.count || 0}</p>
                <p className="text-[10px] md:text-xs font-medium mt-1 text-emerald-500">Unlocked</p>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm p-4">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={statusFilter === "" ? "default" : "outline"}
            size="sm"
            onClick={() => { setStatusFilter(""); setPage(1); }}
            className={cn(statusFilter === "" && "bg-gradient-to-r from-amber-500 to-amber-600")}
          >
            All
          </Button>
          {LOCK_STATUSES.map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => { setStatusFilter(status); setPage(1); }}
              className={cn(
                statusFilter === status && (
                  status === "ACTIVE" ? "bg-gradient-to-r from-blue-500 to-blue-600" :
                  status === "COMPLETED" ? "bg-gradient-to-r from-emerald-500 to-emerald-600" :
                  "bg-gradient-to-r from-red-500 to-red-600"
                )
              )}
            >
              {getStatusIcon(status)}
              <span className="ml-1">{status}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Locks Table */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
          <Lock className="h-5 w-5 text-amber-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Token Locks ({pagination.total})</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">User</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Tier</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Amount</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Bonus</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Start Date</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Unlock Date</th>
              </tr>
            </thead>
            <tbody>
              {locks.map((lock) => (
                <tr key={lock.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {lock.user.firstName && lock.user.lastName
                          ? `${lock.user.firstName} ${lock.user.lastName}`
                          : "No name"}
                      </p>
                      <p className="text-xs text-gray-500">{lock.user.email}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{lock.tier.name}</p>
                      <p className="text-xs text-gray-500">{lock.tier.lockMonths} months</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <Coins className="h-4 w-4 text-brand-500" />
                      <span className="font-semibold text-gray-900 dark:text-white">{parseFloat(lock.amount).toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <Gift className="h-4 w-4 text-amber-500" />
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        +{parseFloat(lock.bonusAmount).toLocaleString()}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                      getStatusColor(lock.status)
                    )}>
                      {getStatusIcon(lock.status)}
                      {lock.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Calendar className="h-4 w-4" />
                      {new Date(lock.startDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className={cn(
                        new Date(lock.unlockDate) <= new Date() && lock.status === "ACTIVE"
                          ? "text-emerald-600 dark:text-emerald-400 font-medium"
                          : "text-gray-700 dark:text-gray-300"
                      )}>
                        {new Date(lock.unlockDate).toLocaleDateString()}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * pagination.limit + 1} to {Math.min(page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="h-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
