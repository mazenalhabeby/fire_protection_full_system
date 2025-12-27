"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import {
  useWalletTransactionHistory,
  useWalletTransactionSummary,
} from "@/hooks/useWalletData";
import { usePageLoading } from "@/hooks/useMinimumLoading";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Filter,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { TransactionList } from "@/components/wallet-internal";
import { EmptyState } from "@/components/ui/empty-state";
import type {
  WalletTransactionType,
  WalletTransactionStatus,
} from "@/types/api";

export default function TransactionsPage() {
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();

  // Filters from URL
  const initialStatus = searchParams.get("status") as WalletTransactionStatus | null;

  // Filter state - Only HBCT supported
  const [status, setStatus] = useState<WalletTransactionStatus | undefined>(initialStatus || undefined);
  const [type, setType] = useState<WalletTransactionType | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch data - Always filter by HBCT
  const {
    data: transactionsData,
    isLoading: transactionsLoading,
  } = useWalletTransactionHistory({
    currency: "HBCT",
    status,
    type,
    page,
    limit: 20,
  });

  const { data: summary } = useWalletTransactionSummary({
    currency: "HBCT",
    period: "month",
  });

  // Loading
  const { isLoading: isMinLoading, stopLoading } = usePageLoading();

  useEffect(() => {
    if (!transactionsLoading) {
      stopLoading();
    }
  }, [transactionsLoading, stopLoading]);

  const transactions = transactionsData?.transactions || [];
  const total = transactionsData?.total || 0;
  const totalPages = transactionsData?.totalPages || 1;

  const hasFilters = status || type;

  const clearFilters = () => {
    setStatus(undefined);
    setType(undefined);
    setPage(1);
  };

  const handleExport = (format: "csv" | "pdf") => {
    // TODO: Implement export
    console.log("Export", format);
  };

  const showSkeleton = transactionsLoading || isMinLoading;

  if (showSkeleton) {
    return <TransactionsSkeleton />;
  }

  return (
    <div className="flex-1 min-h-screen bg-gradient-to-b from-gray-50 via-gray-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/${locale}/wallet`)}
              className="p-2.5 rounded-xl bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700 shadow-sm"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                HBCT Transaction History
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {total} transaction{total !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border",
                showFilters || hasFilters
                  ? "bg-brand-500 text-white border-brand-500 shadow-lg shadow-brand-500/25"
                  : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              )}
            >
              <Filter className="h-4 w-4" />
              Filters
              {hasFilters && (
                <span className={cn(
                  "w-5 h-5 rounded-full text-xs flex items-center justify-center",
                  showFilters || hasFilters ? "bg-white/20" : "bg-brand-500/20 text-brand-600"
                )}>
                  {[status, type].filter(Boolean).length}
                </span>
              )}
            </button>
            <button
              onClick={() => handleExport("csv")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mb-6 p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900 dark:text-white">Filters</h3>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                >
                  <X className="h-4 w-4" />
                  Clear all
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Status</label>
                <select
                  value={status || ""}
                  onChange={(e) => {
                    setStatus(e.target.value as WalletTransactionStatus || undefined);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                >
                  <option value="">All statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="FAILED">Failed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Type</label>
                <select
                  value={type || ""}
                  onChange={(e) => {
                    setType(e.target.value as WalletTransactionType || undefined);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                >
                  <option value="">All types</option>
                  <option value="DEPOSIT">Deposit</option>
                  <option value="WITHDRAWAL">Withdrawal</option>
                  <option value="INTERNAL_TRANSFER_SEND">Sent</option>
                  <option value="INTERNAL_TRANSFER_RECEIVE">Received</option>
                  <option value="TOKEN_PURCHASE">Purchase</option>
                  <option value="REWARD">Reward</option>
                  <option value="AIRDROP">Airdrop</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                Total In
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {parseFloat(summary.totalIn).toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">HBCT</span>
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                <TrendingDown className="h-4 w-4 text-red-500" />
                Total Out
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {parseFloat(summary.totalOut).toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">HBCT</span>
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                <Calendar className="h-4 w-4 text-brand-500" />
                This Month
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {summary.transactionCount} tx
              </p>
            </div>
          </div>
        )}

        {/* Transactions List */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
          {transactions.length === 0 ? (
            <div className="p-12">
              <EmptyState
                icon={Calendar}
                message="No transactions found"
                description={hasFilters ? "Try adjusting your filters" : "Your HBCT transaction history will appear here"}
                size="lg"
              />
            </div>
          ) : (
            <TransactionList transactions={transactions} />
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className={cn(
                "flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
                "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={cn(
                      "w-10 h-10 rounded-xl text-sm font-medium transition-all",
                      page === pageNum
                        ? "bg-brand-500 text-white shadow-lg shadow-brand-500/25"
                        : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className={cn(
                "flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
                "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TransactionsSkeleton() {
  return (
    <div className="flex-1 min-h-screen bg-gradient-to-b from-gray-50 via-gray-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
            <div>
              <div className="h-7 w-56 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded mt-2 animate-pulse" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-24 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
            <div className="h-10 w-24 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>

        <div className="h-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl animate-pulse" />
      </div>
    </div>
  );
}
