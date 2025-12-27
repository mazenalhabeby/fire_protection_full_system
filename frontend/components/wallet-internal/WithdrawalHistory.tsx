"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  ArrowUpRight,
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
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { useMyWithdrawals, useCancelWithdrawal } from "@/hooks/useWithdrawals";
import type { WithdrawalRequest, WithdrawalRequestStatus } from "@/types/withdrawals";
import { CurrencyIcon } from "./CurrencyIcon";

interface WithdrawalHistoryProps {
  limit?: number;
  showPagination?: boolean;
  onConfirmClick?: (withdrawal: WithdrawalRequest) => void;
}

const statusConfig: Record<WithdrawalRequestStatus, {
  label: string;
  icon: typeof CheckCircle2;
  bgClass: string;
  textClass: string;
}> = {
  PENDING_CONFIRMATION: { label: "Awaiting Confirmation", icon: Clock, bgClass: "bg-amber-100 dark:bg-amber-500/20", textClass: "text-amber-600 dark:text-amber-400" },
  PENDING_APPROVAL: { label: "Pending Approval", icon: ShieldAlert, bgClass: "bg-purple-100 dark:bg-purple-500/20", textClass: "text-purple-600 dark:text-purple-400" },
  APPROVED: { label: "Approved", icon: CheckCircle2, bgClass: "bg-blue-100 dark:bg-blue-500/20", textClass: "text-blue-600 dark:text-blue-400" },
  PROCESSING: { label: "Processing", icon: Loader2, bgClass: "bg-blue-100 dark:bg-blue-500/20", textClass: "text-blue-600 dark:text-blue-400" },
  COMPLETED: { label: "Completed", icon: CheckCircle2, bgClass: "bg-emerald-100 dark:bg-emerald-500/20", textClass: "text-emerald-600 dark:text-emerald-400" },
  REJECTED: { label: "Rejected", icon: XCircle, bgClass: "bg-red-100 dark:bg-red-500/20", textClass: "text-red-600 dark:text-red-400" },
  CANCELLED: { label: "Cancelled", icon: XCircle, bgClass: "bg-gray-100 dark:bg-gray-500/20", textClass: "text-gray-600 dark:text-gray-400" },
  FAILED: { label: "Failed", icon: AlertCircle, bgClass: "bg-red-100 dark:bg-red-500/20", textClass: "text-red-600 dark:text-red-400" },
};

export function WithdrawalHistory({ limit = 10, showPagination = true, onConfirmClick }: WithdrawalHistoryProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading, refetch } = useMyWithdrawals({ page, limit });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const cancelWithdrawal = useCancelWithdrawal();

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCancel = async (id: string) => {
    if (confirm("Are you sure you want to cancel this withdrawal?")) {
      await cancelWithdrawal.mutateAsync(id);
    }
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

  const withdrawals = data?.withdrawals ?? [];
  const totalPages = data?.totalPages ?? 1;

  if (withdrawals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ArrowUpRight className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
        <p className="text-gray-600 dark:text-gray-400 font-medium">No withdrawals yet</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
          Your withdrawal history will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-white">Withdrawals</h3>
        <button
          onClick={() => refetch()}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      {/* Withdrawal List */}
      <div className="divide-y divide-gray-200 dark:divide-gray-800 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900">
        {withdrawals.map((withdrawal) => (
          <WithdrawalRow
            key={withdrawal.id}
            withdrawal={withdrawal}
            copiedId={copiedId}
            onCopy={handleCopy}
            onCancel={handleCancel}
            onConfirm={onConfirmClick}
            formatAmount={formatAmount}
            formatAddress={formatAddress}
            getTimeAgo={getTimeAgo}
            isCancelling={cancelWithdrawal.isPending}
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

function WithdrawalRow({
  withdrawal,
  copiedId,
  onCopy,
  onCancel,
  onConfirm,
  formatAmount,
  formatAddress,
  getTimeAgo,
  isCancelling,
}: {
  withdrawal: WithdrawalRequest;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  onCancel: (id: string) => void;
  onConfirm?: (withdrawal: WithdrawalRequest) => void;
  formatAmount: (amount: string) => string;
  formatAddress: (address: string) => string;
  getTimeAgo: (dateStr: string) => string;
  isCancelling: boolean;
}) {
  const statusInfo = statusConfig[withdrawal.status];
  const StatusIcon = statusInfo.icon;
  const canConfirm = withdrawal.status === "PENDING_CONFIRMATION";
  const canCancel = ["PENDING_CONFIRMATION", "PENDING_APPROVAL"].includes(withdrawal.status);

  return (
    <div className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      {/* Icon */}
      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-gray-800 shrink-0">
        <ArrowUpRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Withdrawal
            </p>
            <CurrencyIcon size="xs" />
            <span className={cn(
              "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
              statusInfo.bgClass,
              statusInfo.textClass
            )}>
              <StatusIcon className={cn("h-3 w-3", withdrawal.status === "PROCESSING" && "animate-spin")} />
              {statusInfo.label}
            </span>
          </div>
          <div className="text-right">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              -{formatAmount(withdrawal.amount)} HBCT
            </span>
            {parseFloat(withdrawal.feeAmount) > 0 && (
              <p className="text-xs text-gray-500">
                Fee: {formatAmount(withdrawal.feeAmount)} HBCT
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-3">
            <span>To: {formatAddress(withdrawal.toAddress)}</span>
            <button
              onClick={() => onCopy(withdrawal.toAddress, `to-${withdrawal.id}`)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              {copiedId === `to-${withdrawal.id}` ? (
                <Check className="h-3 w-3 text-emerald-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          </div>
          <span>{getTimeAgo(withdrawal.createdAt)}</span>
        </div>

        {/* Transaction Hash (if completed) */}
        {withdrawal.txHash && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-400">
              TX: {formatAddress(withdrawal.txHash)}
            </span>
            <button
              onClick={() => onCopy(withdrawal.txHash!, `tx-${withdrawal.id}`)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              {copiedId === `tx-${withdrawal.id}` ? (
                <Check className="h-3 w-3 text-emerald-500" />
              ) : (
                <Copy className="h-3 w-3 text-gray-400" />
              )}
            </button>
            {withdrawal.explorerUrl && (
              <a
                href={withdrawal.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <ExternalLink className="h-3 w-3 text-gray-400" />
              </a>
            )}
          </div>
        )}

        {/* Rejection reason */}
        {withdrawal.rejectionReason && (
          <p className="text-xs text-red-500 mt-1">
            Reason: {withdrawal.rejectionReason}
          </p>
        )}

        {/* Action buttons */}
        {(canConfirm || canCancel) && (
          <div className="flex items-center gap-2 mt-2">
            {canConfirm && onConfirm && (
              <button
                onClick={() => onConfirm(withdrawal)}
                className="text-xs font-medium text-brand-500 hover:underline"
              >
                Enter Confirmation Code
              </button>
            )}
            {canCancel && (
              <button
                onClick={() => onCancel(withdrawal.id)}
                disabled={isCancelling}
                className="text-xs font-medium text-red-500 hover:underline disabled:opacity-50"
              >
                Cancel
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
