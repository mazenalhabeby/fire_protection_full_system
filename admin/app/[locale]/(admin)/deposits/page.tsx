"use client";

import { useState } from "react";
import {
  useAdminDeposits,
  useUnmappedDeposits,
  useDepositStats,
  useDepositListenerStatus,
  useStartDepositListener,
  useStopDepositListener,
  useTriggerDepositProcessing,
  useMapDeposit,
} from "@/hooks/useDeposits";
import { StatCard } from "@/components/stat-card";
import { AdminSkeleton } from "@/components/skeletons";
import { cn, Pagination, StatusBadge } from "@/components/ui";
import {
  ArrowDownLeft,
  RefreshCw,
  Play,
  Pause,
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Loader2,
} from "lucide-react";
import { formatAddress, formatCurrency, formatDate } from "@/lib/utils";
import type { OnchainDeposit, OnchainDepositStatus } from "@/types";

export default function AdminDepositsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<OnchainDepositStatus | "">("");
  const [showUnmapped, setShowUnmapped] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [mappingDepositId, setMappingDepositId] = useState<string | null>(null);
  const [userIdInput, setUserIdInput] = useState("");

  // Queries
  const { data: depositsData, isLoading: depositsLoading, refetch: refetchDeposits } = useAdminDeposits({
    page,
    limit: 20,
    status: statusFilter || undefined,
  });
  const { data: unmappedData, refetch: refetchUnmapped } = useUnmappedDeposits({ page: 1, limit: 50 });
  const { data: stats, refetch: refetchStats } = useDepositStats();
  const { data: listenerStatus, refetch: refetchListener } = useDepositListenerStatus();

  // Mutations
  const startListener = useStartDepositListener();
  const stopListener = useStopDepositListener();
  const triggerProcessing = useTriggerDepositProcessing();
  const mapDeposit = useMapDeposit();

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleMapDeposit = async (depositId: string) => {
    if (!userIdInput.trim()) return;
    try {
      await mapDeposit.mutateAsync({ depositId, userId: userIdInput.trim() });
      setMappingDepositId(null);
      setUserIdInput("");
      refetchDeposits();
      refetchUnmapped();
      refetchStats();
    } catch (err) {
      console.error("Failed to map deposit:", err);
    }
  };

  const handleRefresh = () => {
    refetchDeposits();
    refetchUnmapped();
    refetchStats();
    refetchListener();
  };

  if (depositsLoading) {
    return (
      <div className="p-6">
        <AdminSkeleton />
      </div>
    );
  }

  const deposits = showUnmapped ? unmappedData?.deposits : depositsData?.deposits;
  const totalPages = showUnmapped ? unmappedData?.totalPages : depositsData?.totalPages;

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Deposit Management</h1>
          <p className="text-sm text-gray-500">Monitor and manage on-chain deposits</p>
        </div>
        <button
          onClick={handleRefresh}
          className="p-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Total Deposits"
          value={stats?.totalDeposits || 0}
          icon={<ArrowDownLeft className="h-5 w-5" />}
        />
        <StatCard
          label="Total Amount"
          value={`${parseFloat(stats?.totalAmount || "0").toLocaleString()} HBCT`}
          icon={<ArrowDownLeft className="h-5 w-5" />}
          variant="success"
        />
        <StatCard
          label="Pending"
          value={stats?.pendingCount || 0}
          icon={<Clock className="h-5 w-5" />}
        />
        <StatCard
          label="Credited"
          value={stats?.creditedCount || 0}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <StatCard
          label="Unmapped"
          value={stats?.unmappedCount || 0}
          icon={<AlertCircle className="h-5 w-5" />}
          variant={stats?.unmappedCount ? "warning" : "default"}
        />
      </div>

      {/* Listener Controls */}
      <div className="p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-3 h-3 rounded-full",
                listenerStatus?.isRunning ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
              )} />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Deposit Listener: {listenerStatus?.isRunning ? "Running" : "Stopped"}
              </span>
            </div>
            {listenerStatus?.isRunning && (
              <span className="text-sm text-gray-500">
                Polling every {(listenerStatus.pollingInterval / 1000).toFixed(0)}s
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => triggerProcessing.mutate()}
              disabled={triggerProcessing.isPending}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {triggerProcessing.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Process Now"
              )}
            </button>
            {listenerStatus?.isRunning ? (
              <button
                onClick={() => stopListener.mutate()}
                disabled={stopListener.isPending}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/30 transition-colors disabled:opacity-50"
              >
                <Pause className="h-4 w-4" />
                Stop
              </button>
            ) : (
              <button
                onClick={() => startListener.mutate()}
                disabled={startListener.isPending}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                Start
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowUnmapped(false); setPage(1); }}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              !showUnmapped
                ? "bg-brand-500 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            )}
          >
            All Deposits
          </button>
          <button
            onClick={() => { setShowUnmapped(true); setPage(1); }}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              showUnmapped
                ? "bg-brand-500 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            )}
          >
            Unmapped Only ({stats?.unmappedCount || 0})
          </button>
        </div>
        {!showUnmapped && (
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as OnchainDepositStatus | ""); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CREDITED">Credited</option>
            <option value="FAILED">Failed</option>
            <option value="UNMAPPED">Unmapped</option>
          </select>
        )}
      </div>

      {/* Deposits Table */}
      <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
        {!deposits?.length ? (
          <div className="p-8 text-center">
            <ArrowDownLeft className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No deposits found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">TX Hash</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Confirmations</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {deposits.map((deposit) => (
                  <DepositRow
                    key={deposit.id}
                    deposit={deposit}
                    copiedId={copiedId}
                    mappingDepositId={mappingDepositId}
                    userIdInput={userIdInput}
                    onCopy={handleCopy}
                    onStartMapping={setMappingDepositId}
                    onUserIdChange={setUserIdInput}
                    onConfirmMapping={handleMapDeposit}
                    onCancelMapping={() => { setMappingDepositId(null); setUserIdInput(""); }}
                    isMapping={mapDeposit.isPending}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {depositsData?.pagination && depositsData.pagination.totalPages > 1 && !showUnmapped && (
        <Pagination
          pagination={depositsData.pagination}
          page={page}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

function DepositRow({
  deposit,
  copiedId,
  mappingDepositId,
  userIdInput,
  onCopy,
  onStartMapping,
  onUserIdChange,
  onConfirmMapping,
  onCancelMapping,
  isMapping,
}: {
  deposit: OnchainDeposit;
  copiedId: string | null;
  mappingDepositId: string | null;
  userIdInput: string;
  onCopy: (text: string, id: string) => void;
  onStartMapping: (id: string) => void;
  onUserIdChange: (value: string) => void;
  onConfirmMapping: (depositId: string) => void;
  onCancelMapping: () => void;
  isMapping: boolean;
}) {
  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-gray-900 dark:text-white">
            {formatAddress(deposit.txHash)}
          </span>
          <button onClick={() => onCopy(deposit.txHash, `tx-${deposit.id}`)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            {copiedId === `tx-${deposit.id}` ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 text-gray-400" />}
          </button>
          <a href={deposit.explorerUrl} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <ExternalLink className="h-3 w-3 text-gray-400" />
          </a>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
          {formatAddress(deposit.fromAddress)}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {formatCurrency(deposit.amount)} HBCT
        </span>
      </td>
      <td className="px-4 py-3">
        {deposit.userId ? (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {deposit.user?.email || deposit.userId.slice(0, 8)}
          </span>
        ) : mappingDepositId === deposit.id ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={userIdInput}
              onChange={(e) => onUserIdChange(e.target.value)}
              placeholder="User ID"
              className="px-2 py-1 text-sm border rounded w-32"
            />
            <button
              onClick={() => onConfirmMapping(deposit.id)}
              disabled={isMapping}
              className="p-1 bg-emerald-100 text-emerald-600 rounded hover:bg-emerald-200"
            >
              <Check className="h-4 w-4" />
            </button>
            <button onClick={onCancelMapping} className="p-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200">
              X
            </button>
          </div>
        ) : (
          <button
            onClick={() => onStartMapping(deposit.id)}
            className="text-sm text-brand-500 hover:underline"
          >
            Map User
          </button>
        )}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={deposit.status} type="deposit" />
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-gray-600 dark:text-gray-400">{deposit.confirmations}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-gray-500">
          {formatDate(deposit.createdAt)}
        </span>
      </td>
    </tr>
  );
}
