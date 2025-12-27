"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useMyDeposits } from "@/hooks/useDeposits";
import type { OnchainDeposit, OnchainDepositStatus } from "@/types/deposits";
import { CurrencyIcon } from "./CurrencyIcon";

interface DepositHistoryProps {
  limit?: number;
  showPagination?: boolean;
}

const statusConfig: Record<OnchainDepositStatus, {
  label: string;
  icon: typeof CheckCircle2;
  bgClass: string;
  textClass: string;
}> = {
  PENDING: { label: "Pending", icon: Clock, bgClass: "bg-amber-100 dark:bg-amber-500/20", textClass: "text-amber-600 dark:text-amber-400" },
  CONFIRMED: { label: "Confirmed", icon: Clock, bgClass: "bg-blue-100 dark:bg-blue-500/20", textClass: "text-blue-600 dark:text-blue-400" },
  CREDITED: { label: "Credited", icon: CheckCircle2, bgClass: "bg-emerald-100 dark:bg-emerald-500/20", textClass: "text-emerald-600 dark:text-emerald-400" },
  FAILED: { label: "Failed", icon: XCircle, bgClass: "bg-red-100 dark:bg-red-500/20", textClass: "text-red-600 dark:text-red-400" },
  UNMAPPED: { label: "Unmapped", icon: AlertCircle, bgClass: "bg-orange-100 dark:bg-orange-500/20", textClass: "text-orange-600 dark:text-orange-400" },
};

export function DepositHistory({ limit = 10, showPagination = true }: DepositHistoryProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading, refetch } = useMyDeposits({ page, limit });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    if (num === 0) return "0.00";
    if (num < 0.0001) return "<0.0001";
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        ))}
      </div>
    );
  }

  const deposits = data?.deposits ?? [];
  const totalPages = data?.totalPages ?? 1;

  if (deposits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ArrowDownLeft className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
        <p className="text-gray-600 dark:text-gray-400 font-medium">No deposits yet</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
          Your on-chain deposits will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-white">On-Chain Deposits</h3>
        <button
          onClick={() => refetch()}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      {/* Deposit List */}
      <div className="divide-y divide-gray-200 dark:divide-gray-800 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900">
        {deposits.map((deposit) => (
          <DepositRow
            key={deposit.id}
            deposit={deposit}
            copiedId={copiedId}
            onCopy={handleCopy}
            formatAmount={formatAmount}
            formatAddress={formatAddress}
            getTimeAgo={getTimeAgo}
          />
        ))}
      </div>

      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function DepositRow({
  deposit,
  copiedId,
  onCopy,
  formatAmount,
  formatAddress,
  getTimeAgo,
}: {
  deposit: OnchainDeposit;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  formatAmount: (amount: string) => string;
  formatAddress: (address: string) => string;
  getTimeAgo: (dateStr: string) => string;
}) {
  const statusInfo = statusConfig[deposit.status];
  const StatusIcon = statusInfo.icon;

  return (
    <div className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      {/* Icon */}
      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-100 dark:bg-emerald-500/20 shrink-0">
        <ArrowDownLeft className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Deposit
            </p>
            <CurrencyIcon size="xs" />
            <span className={cn(
              "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
              statusInfo.bgClass,
              statusInfo.textClass
            )}>
              <StatusIcon className="h-3 w-3" />
              {statusInfo.label}
            </span>
          </div>
          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            +{formatAmount(deposit.amount)} HBCT
          </span>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-3">
            <span>From: {formatAddress(deposit.fromAddress)}</span>
            <button
              onClick={() => onCopy(deposit.fromAddress, `from-${deposit.id}`)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              {copiedId === `from-${deposit.id}` ? (
                <Check className="h-3 w-3 text-emerald-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
            {deposit.confirmations > 0 && (
              <span className="text-gray-400">
                {deposit.confirmations} confirmations
              </span>
            )}
          </div>
          <span>{getTimeAgo(deposit.createdAt)}</span>
        </div>

        {/* Transaction Hash */}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-400">
            TX: {formatAddress(deposit.txHash)}
          </span>
          <button
            onClick={() => onCopy(deposit.txHash, `tx-${deposit.id}`)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            {copiedId === `tx-${deposit.id}` ? (
              <Check className="h-3 w-3 text-emerald-500" />
            ) : (
              <Copy className="h-3 w-3 text-gray-400" />
            )}
          </button>
          <a
            href={deposit.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <ExternalLink className="h-3 w-3 text-gray-400" />
          </a>
        </div>
      </div>
    </div>
  );
}
