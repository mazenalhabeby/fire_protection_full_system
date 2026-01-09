"use client";

import { useState } from "react";
import {
  useAdminWithdrawals,
  useWithdrawalStats,
  useHotWalletStatus,
  useApproveWithdrawal,
  useRejectWithdrawal,
  useProcessWithdrawal,
} from "@/hooks/useWithdrawals";
import { StatCard } from "@/components/stat-card";
import { AdminSkeleton } from "@/components/skeletons";
import { cn } from "@/components/ui";
import {
  ArrowUpRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Wallet,
  ExternalLink,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { formatTokenBalance } from "@/components/ui/lib/utils";
import type { WithdrawalRequest, WithdrawalRequestStatus } from "@/types";

const statusConfig: Record<WithdrawalRequestStatus, {
  label: string;
  bgClass: string;
  textClass: string;
}> = {
  PENDING_CONFIRMATION: { label: "Awaiting Confirm", bgClass: "bg-amber-100 dark:bg-amber-500/20", textClass: "text-amber-600 dark:text-amber-400" },
  PENDING_APPROVAL: { label: "Needs Approval", bgClass: "bg-purple-100 dark:bg-purple-500/20", textClass: "text-purple-600 dark:text-purple-400" },
  APPROVED: { label: "Approved", bgClass: "bg-blue-100 dark:bg-blue-500/20", textClass: "text-blue-600 dark:text-blue-400" },
  PROCESSING: { label: "Processing", bgClass: "bg-blue-100 dark:bg-blue-500/20", textClass: "text-blue-600 dark:text-blue-400" },
  COMPLETED: { label: "Completed", bgClass: "bg-emerald-100 dark:bg-emerald-500/20", textClass: "text-emerald-600 dark:text-emerald-400" },
  REJECTED: { label: "Rejected", bgClass: "bg-red-100 dark:bg-red-500/20", textClass: "text-red-600 dark:text-red-400" },
  CANCELLED: { label: "Cancelled", bgClass: "bg-gray-100 dark:bg-gray-500/20", textClass: "text-gray-600 dark:text-gray-400" },
  FAILED: { label: "Failed", bgClass: "bg-red-100 dark:bg-red-500/20", textClass: "text-red-600 dark:text-red-400" },
};

const formatName = (firstName?: string | null, lastName?: string | null) => {
  if (firstName && lastName) return `${firstName} ${lastName}`;
  return firstName || lastName || "";
};

export default function AdminWithdrawalsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<WithdrawalRequestStatus | "">("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Queries
  const { data: withdrawalsData, isLoading: withdrawalsLoading, refetch: refetchWithdrawals } = useAdminWithdrawals({
    page,
    limit: 20,
    status: statusFilter || undefined,
  });
  const { data: stats, refetch: refetchStats } = useWithdrawalStats();
  const { data: hotWallet, refetch: refetchHotWallet } = useHotWalletStatus();

  // Mutations
  const approveWithdrawal = useApproveWithdrawal();
  const rejectWithdrawal = useRejectWithdrawal();
  const processWithdrawal = useProcessWithdrawal();

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApprove = async (id: string) => {
    if (!confirm("Are you sure you want to approve this withdrawal?")) return;
    try {
      await approveWithdrawal.mutateAsync(id);
      toast.success("Withdrawal approved successfully");
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        toast.error("You don't have permission to approve withdrawals");
      } else {
        toast.error(error instanceof Error ? error.message : "Failed to approve withdrawal");
      }
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) return;
    try {
      await rejectWithdrawal.mutateAsync({ withdrawalId: id, reason: rejectReason });
      setRejectingId(null);
      setRejectReason("");
      toast.success("Withdrawal rejected");
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        toast.error("You don't have permission to reject withdrawals");
      } else {
        toast.error(error instanceof Error ? error.message : "Failed to reject withdrawal");
      }
    }
  };

  const handleProcess = async (id: string) => {
    if (!confirm("Manually process this withdrawal now?")) return;
    try {
      await processWithdrawal.mutateAsync(id);
      toast.success("Withdrawal processing started");
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        toast.error("You don't have permission to process withdrawals");
      } else {
        toast.error(error instanceof Error ? error.message : "Failed to process withdrawal");
      }
    }
  };

  const handleRefresh = () => {
    refetchWithdrawals();
    refetchStats();
    refetchHotWallet();
  };

  if (withdrawalsLoading) {
    return (
      <div className="p-6">
        <AdminSkeleton />
      </div>
    );
  }

  const withdrawals = withdrawalsData?.withdrawals;
  const totalPages = withdrawalsData?.totalPages;

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Withdrawal Management</h1>
          <p className="text-sm text-gray-500">Monitor and process user withdrawals</p>
        </div>
        <button
          onClick={handleRefresh}
          className="p-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Withdrawals"
          value={stats?.totalWithdrawals || 0}
          icon={<ArrowUpRight className="h-5 w-5" />}
        />
        <StatCard
          label="Total Amount (HBCT)"
          value={formatTokenBalance(stats?.totalAmount)}
          icon={<ArrowUpRight className="h-5 w-5" />}
        />
        <StatCard
          label="Pending Approval"
          value={stats?.pendingApprovalCount || 0}
          icon={<ShieldAlert className="h-5 w-5" />}
          variant={stats?.pendingApprovalCount ? "warning" : "default"}
        />
        <StatCard
          label="Total Fees (HBCT)"
          value={formatTokenBalance(stats?.totalFees)}
          icon={<CheckCircle2 className="h-5 w-5" />}
          variant="success"
        />
      </div>

      {/* Hot Wallet Status */}
      <div className={cn(
        "p-4 rounded-xl border",
        hotWallet?.isLow
          ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20"
          : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              "p-2 rounded-lg",
              hotWallet?.isLow ? "bg-red-100 dark:bg-red-500/20" : "bg-emerald-100 dark:bg-emerald-500/20"
            )}>
              <Wallet className={cn("h-5 w-5", hotWallet?.isLow ? "text-red-500" : "text-emerald-500")} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Hot Wallet</p>
              <p className="text-xs text-gray-500 font-mono">{hotWallet?.address}</p>
            </div>
          </div>
          <div className="text-right">
            <p className={cn("text-lg font-bold", hotWallet?.isLow ? "text-red-500" : "text-gray-900 dark:text-white")}>
              {parseFloat(hotWallet?.balance || "0").toLocaleString()} HBCT
            </p>
            <p className="text-xs text-gray-500">
              Pending: {parseFloat(hotWallet?.pendingWithdrawalsAmount || "0").toLocaleString()} HBCT
            </p>
          </div>
        </div>
        {hotWallet?.isLow && (
          <div className="mt-3 flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Low balance warning! Refill hot wallet.</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as WithdrawalRequestStatus | ""); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
        >
          <option value="">All Status</option>
          <option value="PENDING_CONFIRMATION">Awaiting Confirmation</option>
          <option value="PENDING_APPROVAL">Pending Approval</option>
          <option value="APPROVED">Approved</option>
          <option value="PROCESSING">Processing</option>
          <option value="COMPLETED">Completed</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>

      {/* Withdrawals Table */}
      <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
        {!withdrawals?.length ? (
          <div className="p-8 text-center">
            <ArrowUpRight className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No withdrawals found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">To Address</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">TX</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {withdrawals.map((withdrawal) => (
                  <WithdrawalRow
                    key={withdrawal.id}
                    withdrawal={withdrawal}
                    copiedId={copiedId}
                    rejectingId={rejectingId}
                    rejectReason={rejectReason}
                    onCopy={handleCopy}
                    onApprove={handleApprove}
                    onStartReject={setRejectingId}
                    onRejectReasonChange={setRejectReason}
                    onConfirmReject={handleReject}
                    onCancelReject={() => { setRejectingId(null); setRejectReason(""); }}
                    onProcess={handleProcess}
                    isApproving={approveWithdrawal.isPending}
                    isRejecting={rejectWithdrawal.isPending}
                    isProcessing={processWithdrawal.isPending}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
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
  rejectingId,
  rejectReason,
  onCopy,
  onApprove,
  onStartReject,
  onRejectReasonChange,
  onConfirmReject,
  onCancelReject,
  onProcess,
  isApproving,
  isRejecting,
  isProcessing,
}: {
  withdrawal: WithdrawalRequest;
  copiedId: string | null;
  rejectingId: string | null;
  rejectReason: string;
  onCopy: (text: string, id: string) => void;
  onApprove: (id: string) => void;
  onStartReject: (id: string) => void;
  onRejectReasonChange: (value: string) => void;
  onConfirmReject: (id: string) => void;
  onCancelReject: () => void;
  onProcess: (id: string) => void;
  isApproving: boolean;
  isRejecting: boolean;
  isProcessing: boolean;
}) {
  const status = statusConfig[withdrawal.status];
  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const canApprove = withdrawal.status === "PENDING_APPROVAL";
  const canProcess = withdrawal.status === "APPROVED";

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <td className="px-4 py-3">
        <div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {withdrawal.user?.email || withdrawal.userId.slice(0, 8)}
          </span>
          {(withdrawal.user?.firstName || withdrawal.user?.lastName) && (
            <p className="text-xs text-gray-500">
              {formatName(withdrawal.user.firstName, withdrawal.user.lastName)}
            </p>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {parseFloat(withdrawal.amount).toLocaleString()} HBCT
          </span>
          <p className="text-xs text-gray-500">
            Fee: {parseFloat(withdrawal.feeAmount).toLocaleString()}
          </p>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
            {formatAddress(withdrawal.toAddress)}
          </span>
          <button onClick={() => onCopy(withdrawal.toAddress, `to-${withdrawal.id}`)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            {copiedId === `to-${withdrawal.id}` ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 text-gray-400" />}
          </button>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={cn("px-2 py-1 text-xs font-medium rounded-full", status.bgClass, status.textClass)}>
          {status.label}
        </span>
        {withdrawal.rejectionReason && (
          <p className="text-xs text-red-500 mt-1">{withdrawal.rejectionReason}</p>
        )}
      </td>
      <td className="px-4 py-3">
        {withdrawal.txHash ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-500">{formatAddress(withdrawal.txHash)}</span>
            {withdrawal.explorerUrl && (
              <a href={withdrawal.explorerUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3 text-gray-400" />
              </a>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-400">-</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-gray-500">
          {new Date(withdrawal.createdAt).toLocaleDateString()}
        </span>
      </td>
      <td className="px-4 py-3">
        {rejectingId === withdrawal.id ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={rejectReason}
              onChange={(e) => onRejectReasonChange(e.target.value)}
              placeholder="Reason"
              className="px-2 py-1 text-sm border rounded w-32"
            />
            <button
              onClick={() => onConfirmReject(withdrawal.id)}
              disabled={isRejecting}
              className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
            >
              <Check className="h-4 w-4" />
            </button>
            <button onClick={onCancelReject} className="p-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200">
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {canApprove && (
              <>
                <button
                  onClick={() => onApprove(withdrawal.id)}
                  disabled={isApproving}
                  className="text-xs font-medium text-emerald-500 hover:underline"
                >
                  Approve
                </button>
                <button
                  onClick={() => onStartReject(withdrawal.id)}
                  className="text-xs font-medium text-red-500 hover:underline"
                >
                  Reject
                </button>
              </>
            )}
            {canProcess && (
              <button
                onClick={() => onProcess(withdrawal.id)}
                disabled={isProcessing}
                className="text-xs font-medium text-blue-500 hover:underline"
              >
                Process
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
