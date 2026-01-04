"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";
import { Button, cn } from "@/components/ui";
import {
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Coins,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Wallet,
  Building,
  ExternalLink,
} from "lucide-react";
import { AdminSkeleton } from "@/components/skeletons";

const PURCHASE_STATUSES = ["PENDING", "COMPLETED", "FAILED", "CANCELLED"];
const DELIVERY_METHODS = ["OFF_CHAIN", "ON_CHAIN"];

export default function AdminPurchasesPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [deliveryFilter, setDeliveryFilter] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "purchases", page, statusFilter, deliveryFilter],
    queryFn: () => adminApi.getPurchases({
      page,
      limit: 20,
      status: statusFilter || undefined,
      deliveryMethod: deliveryFilter || undefined
    }),
  });

  const { data: stats } = useQuery({
    queryKey: ["admin", "purchases", "stats"],
    queryFn: () => adminApi.getPurchaseStats(),
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <AdminSkeleton />
      </div>
    );
  }

  const purchases = data?.purchases || [];
  const pagination = data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle className="h-3 w-3" />;
      case "PENDING":
        return <Clock className="h-3 w-3" />;
      case "FAILED":
      case "CANCELLED":
        return <XCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
      case "PENDING":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
      case "FAILED":
      case "CANCELLED":
        return "bg-red-500/10 text-red-600 dark:text-red-400";
      default:
        return "bg-gray-500/10 text-gray-600 dark:text-gray-400";
    }
  };

  const getCurrencyIcon = (currency: string) => {
    return <span className="text-xs font-medium uppercase">{currency}</span>;
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-500/20 dark:via-emerald-500/10 dark:to-transparent border border-emerald-200/50 dark:border-emerald-500/20 p-4 md:p-5 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Total Volume</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">${parseFloat(stats.totalCompletedVolume).toLocaleString()}</p>
                <p className="text-[10px] md:text-xs font-medium mt-1 text-emerald-500">USD Revenue</p>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500/10 via-brand-500/5 to-transparent dark:from-brand-500/20 dark:via-brand-500/10 dark:to-transparent border border-brand-200/50 dark:border-brand-500/20 p-4 md:p-5 transition-all duration-300 hover:shadow-lg hover:shadow-brand-500/10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-brand-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Tokens Sold</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{parseFloat(stats.totalTokensSold).toLocaleString()}</p>
                <p className="text-[10px] md:text-xs font-medium mt-1 text-brand-500">HBCT Tokens</p>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/30 group-hover:scale-110 transition-transform duration-300">
                <Coins className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent dark:from-blue-500/20 dark:via-blue-500/10 dark:to-transparent border border-blue-200/50 dark:border-blue-500/20 p-4 md:p-5 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Completed</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{stats.completedPurchases}</p>
                <p className="text-[10px] md:text-xs font-medium mt-1 text-blue-500">Purchases</p>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                <ShoppingCart className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-500/20 dark:via-amber-500/10 dark:to-transparent border border-amber-200/50 dark:border-amber-500/20 p-4 md:p-5 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Pending</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{stats.statusBreakdown?.pending?.count || 0}</p>
                <p className="text-[10px] md:text-xs font-medium mt-1 text-amber-500">Awaiting</p>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform duration-300">
                <Clock className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-sm text-gray-500 font-medium">Status:</span>
            <Button
              variant={statusFilter === "" ? "default" : "outline"}
              size="sm"
              onClick={() => { setStatusFilter(""); setPage(1); }}
              className={cn(statusFilter === "" && "bg-gradient-to-r from-emerald-500 to-emerald-600")}
            >
              All
            </Button>
            {PURCHASE_STATUSES.map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? "default" : "outline"}
                size="sm"
                onClick={() => { setStatusFilter(status); setPage(1); }}
                className={cn(
                  statusFilter === status && (
                    status === "COMPLETED" ? "bg-gradient-to-r from-emerald-500 to-emerald-600" :
                    status === "PENDING" ? "bg-gradient-to-r from-amber-500 to-amber-600" :
                    "bg-gradient-to-r from-red-500 to-red-600"
                  )
                )}
              >
                {getStatusIcon(status)}
                <span className="ml-1">{status}</span>
              </Button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-sm text-gray-500 font-medium">Delivery:</span>
            <Button
              variant={deliveryFilter === "" ? "default" : "outline"}
              size="sm"
              onClick={() => { setDeliveryFilter(""); setPage(1); }}
              className={cn(deliveryFilter === "" && "bg-gradient-to-r from-blue-500 to-blue-600")}
            >
              All
            </Button>
            {DELIVERY_METHODS.map((method) => (
              <Button
                key={method}
                variant={deliveryFilter === method ? "default" : "outline"}
                size="sm"
                onClick={() => { setDeliveryFilter(method); setPage(1); }}
                className={cn(
                  deliveryFilter === method && (
                    method === "OFF_CHAIN" ? "bg-gradient-to-r from-blue-500 to-blue-600" :
                    "bg-gradient-to-r from-purple-500 to-purple-600"
                  )
                )}
              >
                {method === "OFF_CHAIN" ? <Building className="h-3 w-3" /> : <Wallet className="h-3 w-3" />}
                <span className="ml-1">{method === "OFF_CHAIN" ? "Platform" : "On-Chain"}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-emerald-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Token Purchases ({pagination.total})</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">User</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Payment</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">HBCT Amount</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Total USD</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Delivery</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Date</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">TX Hash</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((purchase) => (
                <tr key={purchase.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {purchase.user.firstName && purchase.user.lastName
                          ? `${purchase.user.firstName} ${purchase.user.lastName}`
                          : "No name"}
                      </p>
                      <p className="text-xs text-gray-500">{purchase.user.email}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      {getCurrencyIcon(purchase.paymentCurrency)}
                      <span className="font-medium text-gray-700 dark:text-gray-300">{parseFloat(purchase.paymentAmount).toFixed(4)}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <Coins className="h-4 w-4 text-brand-500" />
                      <span className="font-semibold text-gray-900 dark:text-white">{parseFloat(purchase.hbctAmount).toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      ${parseFloat(purchase.totalUsd).toFixed(2)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                      purchase.deliveryMethod === "OFF_CHAIN"
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                    )}>
                      {purchase.deliveryMethod === "OFF_CHAIN" ? (
                        <Building className="h-3 w-3" />
                      ) : (
                        <Wallet className="h-3 w-3" />
                      )}
                      {purchase.deliveryMethod === "OFF_CHAIN" ? "Platform" : "On-Chain"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                      getStatusColor(purchase.status)
                    )}>
                      {getStatusIcon(purchase.status)}
                      {purchase.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Calendar className="h-4 w-4" />
                      {new Date(purchase.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {purchase.txHash ? (
                      <a
                        href={`https://bscscan.com/tx/${purchase.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-brand-500 hover:underline font-mono"
                      >
                        {purchase.txHash.slice(0, 8)}...{purchase.txHash.slice(-6)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
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
