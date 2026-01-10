"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  useAdminDeposits,
  useUnmappedDeposits,
  useLockedDeposits,
  useDepositStats,
  useDepositListenerStatus,
  useStartDepositListener,
  useStopDepositListener,
  useTriggerDepositProcessing,
  useMapDeposit,
  useUnmapDeposit,
  useReassignDeposit,
  useReleaseLockedDeposit,
  useDepositWithBalance,
  useLookupTransaction,
  useQuickScan,
  useHistoricalScan,
} from "@/hooks/useDeposits";
import { adminApi } from "@/lib/api";
import { StatCard } from "@/components/stat-card";
import { AdminSkeleton } from "@/components/skeletons";
import { cn, StatusBadge } from "@/components/ui";
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
  Search,
  X,
  UserPlus,
  UserMinus,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Lock,
  Unlock,
  Timer,
} from "lucide-react";
import { formatAddress, formatCurrency, formatDate } from "@/lib/utils";
import type { OnchainDeposit, OnchainDepositStatus, User } from "@/types";

export default function AdminDepositsPage() {
  const t = useTranslations("deposits");
  const tc = useTranslations("common");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<OnchainDepositStatus | "">("");
  const [showUnmapped, setShowUnmapped] = useState(false);
  const [showLocked, setShowLocked] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal states
  const [mappingDeposit, setMappingDeposit] = useState<OnchainDeposit | null>(null);
  const [unmappingDeposit, setUnmappingDeposit] = useState<OnchainDeposit | null>(null);
  const [reassigningDeposit, setReassigningDeposit] = useState<OnchainDeposit | null>(null);
  const [releasingDeposit, setReleasingDeposit] = useState<OnchainDeposit | null>(null);

  // Transaction lookup state
  const [txHashInput, setTxHashInput] = useState("");
  const [lookupResult, setLookupResult] = useState<{ success: boolean; message: string } | null>(null);

  // Queries
  const { data: depositsData, isLoading: depositsLoading, refetch: refetchDeposits } = useAdminDeposits({
    page,
    limit: 20,
    status: statusFilter || undefined,
  });
  const { data: unmappedData, refetch: refetchUnmapped } = useUnmappedDeposits({ page: 1, limit: 50 });
  const { data: lockedData, refetch: refetchLocked } = useLockedDeposits({ page: 1, limit: 50 });
  const { data: stats, refetch: refetchStats } = useDepositStats();
  const { data: listenerStatus, refetch: refetchListener } = useDepositListenerStatus();

  // Mutations
  const startListener = useStartDepositListener();
  const stopListener = useStopDepositListener();
  const triggerProcessing = useTriggerDepositProcessing();
  const mapDeposit = useMapDeposit();
  const lookupTransaction = useLookupTransaction();
  const quickScan = useQuickScan();
  const historicalScan = useHistoricalScan();

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleMapSuccess = () => {
    setMappingDeposit(null);
    refetchDeposits();
    refetchUnmapped();
    refetchStats();
  };

  const handleUnmapSuccess = () => {
    setUnmappingDeposit(null);
    refetchDeposits();
    refetchUnmapped();
    refetchStats();
  };

  const handleReassignSuccess = () => {
    setReassigningDeposit(null);
    refetchDeposits();
    refetchStats();
  };

  const handleReleaseSuccess = () => {
    setReleasingDeposit(null);
    refetchDeposits();
    refetchLocked();
    refetchStats();
  };

  const handleRefresh = () => {
    refetchDeposits();
    refetchUnmapped();
    refetchLocked();
    refetchStats();
    refetchListener();
  };

  const handleLookupTransaction = async () => {
    if (!txHashInput.trim()) return;
    setLookupResult(null);
    const result = await lookupTransaction.mutateAsync(txHashInput.trim());
    setLookupResult({ success: result.success, message: result.message });
    if (result.success) {
      setTxHashInput("");
      handleRefresh();
    }
  };

  const handleQuickScan = async () => {
    const result = await quickScan.mutateAsync(24);
    setLookupResult({ success: result.success, message: result.message });
    if (result.newDeposits > 0) {
      handleRefresh();
    }
  };

  const handleHistoricalScan = async () => {
    const result = await historicalScan.mutateAsync(7);
    setLookupResult({ success: result.success, message: result.message });
    if (result.newDeposits > 0) {
      handleRefresh();
    }
  };

  if (depositsLoading) {
    return (
      <div className="p-6">
        <AdminSkeleton />
      </div>
    );
  }

  const deposits = showLocked
    ? lockedData?.deposits
    : showUnmapped
      ? unmappedData?.deposits
      : depositsData?.deposits;
  const total = showLocked
    ? lockedData?.total
    : showUnmapped
      ? unmappedData?.total
      : depositsData?.total;
  const totalPages = showLocked
    ? lockedData?.totalPages
    : showUnmapped
      ? unmappedData?.totalPages
      : depositsData?.totalPages;

  const lockedCount = lockedData?.total || 0;

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("title")}</h1>
          <p className="text-sm text-gray-500">{t("subtitle")}</p>
        </div>
        <button
          onClick={handleRefresh}
          className="p-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard
          label={t("stats.totalDeposits")}
          value={stats?.totalDeposits || 0}
          icon={<ArrowDownLeft className="h-5 w-5" />}
        />
        <StatCard
          label={t("stats.totalAmount")}
          value={parseFloat(stats?.totalAmount || "0").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          icon={<ArrowDownLeft className="h-5 w-5" />}
          variant="success"
        />
        <StatCard
          label={t("stats.pending")}
          value={stats?.pendingCount || 0}
          icon={<Clock className="h-5 w-5" />}
        />
        <StatCard
          label={t("stats.credited")}
          value={stats?.creditedCount || 0}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <StatCard
          label={t("stats.locked24h")}
          value={lockedCount}
          icon={<Lock className="h-5 w-5" />}
          variant={lockedCount > 0 ? "warning" : "default"}
        />
        <StatCard
          label={t("stats.unmapped")}
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
                {t("listener.title")}: {listenerStatus?.isRunning ? t("listener.running") : t("listener.stopped")}
              </span>
            </div>
            {listenerStatus?.isRunning && (
              <span className="text-sm text-gray-500">
                {t("listener.pollingEvery", { seconds: (listenerStatus.pollingInterval / 1000).toFixed(0) })}
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
                t("listener.processNow")
              )}
            </button>
            {listenerStatus?.isRunning ? (
              <button
                onClick={() => stopListener.mutate()}
                disabled={stopListener.isPending}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/30 transition-colors disabled:opacity-50"
              >
                <Pause className="h-4 w-4" />
                {t("listener.stop")}
              </button>
            ) : (
              <button
                onClick={() => startListener.mutate()}
                disabled={startListener.isPending}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                {t("listener.start")}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Transaction Lookup & Scan Controls */}
      <div className="p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {t("lookup.title")}
          </h3>
          <p className="text-xs text-gray-500">
            {t("lookup.subtitle")}
          </p>
        </div>

        {/* Transaction Hash Lookup */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={txHashInput}
              onChange={(e) => setTxHashInput(e.target.value)}
              placeholder={t("lookup.placeholder")}
              className="w-full px-4 py-2 pr-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {txHashInput && (
              <button
                onClick={() => setTxHashInput("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            onClick={handleLookupTransaction}
            disabled={lookupTransaction.isPending || !txHashInput.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {lookupTransaction.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {t("lookup.button")}
          </button>
        </div>

        {/* Scan Buttons */}
        <div className="flex items-center justify-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={handleQuickScan}
            disabled={quickScan.isPending || historicalScan.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-500/30 transition-colors disabled:opacity-50"
          >
            {quickScan.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Clock className="h-4 w-4" />
            )}
            {t("lookup.quickScan")}
          </button>
          <button
            onClick={handleHistoricalScan}
            disabled={quickScan.isPending || historicalScan.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-500/30 transition-colors disabled:opacity-50"
          >
            {historicalScan.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {t("lookup.fullScan")}
          </button>
        </div>

        {/* Scanning Status - Centered */}
        {(quickScan.isPending || historicalScan.isPending) && (
          <div className="flex flex-col items-center justify-center py-4 space-y-3">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {quickScan.isPending ? t("lookup.scanning24h") : t("lookup.scanning7d")}
              </span>
            </div>
            <p className="text-xs text-gray-500 text-center">
              {historicalScan.isPending
                ? t("lookup.mayTakeSeveralMinutes")
                : t("lookup.pleaseWaitBlockchain")}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {t("lookup.scanCannotBeStopped")}
            </p>
          </div>
        )}

        {/* Result Message - Centered */}
        {lookupResult && !quickScan.isPending && !historicalScan.isPending && (
          <div className={cn(
            "p-4 rounded-lg text-sm text-center relative",
            lookupResult.success
              ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400"
          )}>
            <button
              onClick={() => setLookupResult(null)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center justify-center gap-2">
              {lookupResult.success ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              <span className="font-medium">{lookupResult.message}</span>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowUnmapped(false); setShowLocked(false); setPage(1); }}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              !showUnmapped && !showLocked
                ? "bg-brand-500 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            )}
          >
            {t("filters.allDeposits")}
          </button>
          <button
            onClick={() => { setShowLocked(true); setShowUnmapped(false); setPage(1); }}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
              showLocked
                ? "bg-amber-500 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            )}
          >
            <Lock className="h-4 w-4" />
            {t("filters.locked")} ({lockedCount})
          </button>
          <button
            onClick={() => { setShowUnmapped(true); setShowLocked(false); setPage(1); }}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              showUnmapped
                ? "bg-brand-500 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            )}
          >
            {t("filters.unmapped")} ({stats?.unmappedCount || 0})
          </button>
        </div>
        {!showUnmapped && !showLocked && (
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as OnchainDepositStatus | ""); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
          >
            <option value="">{tc("allStatus")}</option>
            <option value="PENDING">{t("status.pending")}</option>
            <option value="CONFIRMED">{t("status.confirmed")}</option>
            <option value="CREDITED">{t("status.credited")}</option>
            <option value="LOCKED">{t("status.locked")}</option>
            <option value="FAILED">{t("status.failed")}</option>
            <option value="UNMAPPED">{t("status.unmapped")}</option>
          </select>
        )}
      </div>

      {/* Deposits Table */}
      <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        {!deposits?.length ? (
          <div className="p-8 text-center">
            <ArrowDownLeft className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">{t("table.noDeposits")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("table.txHash")}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("table.from")}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("table.amount")}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("table.user")}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("table.status")}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("table.confirmations")}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("table.date")}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("table.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {deposits.map((deposit) => (
                  <DepositRow
                    key={deposit.id}
                    deposit={deposit}
                    copiedId={copiedId}
                    onCopy={handleCopy}
                    onMapClick={() => setMappingDeposit(deposit)}
                    onUnmapClick={() => setUnmappingDeposit(deposit)}
                    onReassignClick={() => setReassigningDeposit(deposit)}
                    onReleaseClick={() => setReleasingDeposit(deposit)}
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
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {page} of {totalPages} ({total} total)
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

      {/* Map Deposit Modal */}
      {mappingDeposit && (
        <MapDepositModal
          deposit={mappingDeposit}
          onClose={() => setMappingDeposit(null)}
          onSuccess={handleMapSuccess}
        />
      )}

      {/* Unmap Deposit Modal */}
      {unmappingDeposit && (
        <UnmapDepositModal
          deposit={unmappingDeposit}
          onClose={() => setUnmappingDeposit(null)}
          onSuccess={handleUnmapSuccess}
        />
      )}

      {/* Reassign Deposit Modal */}
      {reassigningDeposit && (
        <ReassignDepositModal
          deposit={reassigningDeposit}
          onClose={() => setReassigningDeposit(null)}
          onSuccess={handleReassignSuccess}
        />
      )}

      {/* Release Locked Deposit Modal */}
      {releasingDeposit && (
        <ReleaseLockedDepositModal
          deposit={releasingDeposit}
          onClose={() => setReleasingDeposit(null)}
          onSuccess={handleReleaseSuccess}
        />
      )}
    </div>
  );
}

// ============================================
// DEPOSIT ROW COMPONENT
// ============================================

function DepositRow({
  deposit,
  copiedId,
  onCopy,
  onMapClick,
  onUnmapClick,
  onReassignClick,
  onReleaseClick,
}: {
  deposit: OnchainDeposit;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  onMapClick: () => void;
  onUnmapClick: () => void;
  onReassignClick: () => void;
  onReleaseClick: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, openUp: false });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isUnmapped = !deposit.userId || deposit.status === "UNMAPPED";
  const isCredited = deposit.status === "CREDITED" && deposit.userId;
  const isLocked = deposit.status === "LOCKED" && deposit.userId;

  const handleMenuToggle = () => {
    if (!showMenu && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuHeight = 88; // Approximate menu height (2 items * ~44px)
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUp = spaceBelow < menuHeight && spaceAbove > menuHeight;

      setMenuPosition({
        top: openUp ? rect.top - menuHeight - 4 : rect.bottom + 4,
        left: rect.right - 160, // 160 is menu width (w-40)
        openUp,
      });
    }
    setShowMenu(!showMenu);
  };

  // Calculate time remaining for locked deposits
  const getTimeRemaining = () => {
    if (!deposit.lockedUntil) return null;
    const lockEnd = new Date(deposit.lockedUntil).getTime();
    const now = Date.now();
    const remaining = lockEnd - now;
    if (remaining <= 0) return "Ready to release";

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m remaining`;
  };

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
          {deposit.explorerUrl && (
            <a href={deposit.explorerUrl} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
              <ExternalLink className="h-3 w-3 text-gray-400" />
            </a>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
            {formatAddress(deposit.fromAddress)}
          </span>
          <button onClick={() => onCopy(deposit.fromAddress, `from-${deposit.id}`)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            {copiedId === `from-${deposit.id}` ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 text-gray-400" />}
          </button>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {formatCurrency(deposit.amount)} HBCT
        </span>
      </td>
      <td className="px-4 py-3">
        {deposit.userId ? (
          <div className="text-sm">
            <span className="text-gray-900 dark:text-white">
              {deposit.user?.email || "Unknown"}
            </span>
            <p className="text-xs text-gray-500 font-mono">
              {deposit.userId.slice(0, 8)}...
            </p>
          </div>
        ) : (
          <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">
            Unmapped
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1">
          <StatusBadge status={deposit.status} type="deposit" />
          {isLocked && deposit.lockedUntil && (
            <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
              <Timer className="h-3 w-3" />
              {getTimeRemaining()}
            </div>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-gray-600 dark:text-gray-400">{deposit.confirmations}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-gray-500">
          {formatDate(deposit.createdAt)}
        </span>
      </td>
      <td className="px-4 py-3">
        {isUnmapped ? (
          <button
            onClick={onMapClick}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 hover:bg-brand-200 dark:hover:bg-brand-500/30 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Map User
          </button>
        ) : isLocked ? (
          <button
            onClick={onReleaseClick}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-500/30 transition-colors"
          >
            <Unlock className="h-4 w-4" />
            Release
          </button>
        ) : isCredited ? (
          <>
            <button
              ref={buttonRef}
              onClick={handleMenuToggle}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <MoreHorizontal className="h-4 w-4 text-gray-500" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div
                  className="fixed z-50 w-40 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1"
                  style={{ top: menuPosition.top, left: menuPosition.left }}
                >
                  <button
                    onClick={() => { setShowMenu(false); onReassignClick(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                    Reassign
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); onUnmapClick(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    <UserMinus className="h-4 w-4" />
                    Unmap
                  </button>
                </div>
              </>
            )}
          </>
        ) : null}
      </td>
    </tr>
  );
}

// ============================================
// MAP DEPOSIT MODAL
// ============================================

function MapDepositModal({
  deposit,
  onClose,
  onSuccess,
}: {
  deposit: OnchainDeposit;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mapDeposit = useMapDeposit();

  // Search users with debounce
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setError(null);
      try {
        const response = await adminApi.getUsers({ search: searchQuery, limit: 10 });
        setSearchResults(response.users);
      } catch (err) {
        console.error("Failed to search users:", err);
        setError("Failed to search users");
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleMap = async () => {
    if (!selectedUser) return;

    setError(null);
    try {
      await mapDeposit.mutateAsync({ depositId: deposit.id, userId: selectedUser.id });
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to map deposit");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Map Deposit to User
            </h2>
            <p className="text-sm text-gray-500">
              Link this unmapped deposit to a user account
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Deposit Info */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Transaction</span>
              <span className="text-sm font-mono text-gray-900 dark:text-white">
                {formatAddress(deposit.txHash)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">From Address</span>
              <span className="text-sm font-mono text-gray-900 dark:text-white">
                {formatAddress(deposit.fromAddress)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Amount</span>
              <span className="text-sm font-semibold text-brand-600 dark:text-brand-400">
                {formatCurrency(deposit.amount)} HBCT
              </span>
            </div>
          </div>

          {/* User Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search User
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by email, username, or wallet address..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
              )}
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                    selectedUser?.id === user.id && "bg-brand-50 dark:bg-brand-500/10"
                  )}
                >
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      {(user.firstName?.[0] || user.email?.[0] || "?").toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {user.firstName && user.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : user.username || "No name"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    {user.walletAddress && (
                      <p className="text-xs text-gray-400 font-mono truncate">
                        {formatAddress(user.walletAddress)}
                      </p>
                    )}
                  </div>
                  {selectedUser?.id === user.id && (
                    <CheckCircle2 className="h-5 w-5 text-brand-500 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Selected User */}
          {selectedUser && (
            <div className="p-4 rounded-xl bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-brand-800 dark:text-brand-300">
                    Selected User
                  </p>
                  <p className="text-sm text-brand-600 dark:text-brand-400">
                    {selectedUser.email}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-1 rounded hover:bg-brand-100 dark:hover:bg-brand-500/20"
                >
                  <X className="h-4 w-4 text-brand-500" />
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Warning */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-700 dark:text-amber-400">
              <p className="font-medium mb-1">Verify Before Mapping</p>
              <p>Make sure the deposit actually belongs to this user. The amount will be credited to their balance immediately.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-6 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleMap}
            disabled={!selectedUser || mapDeposit.isPending}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-500 text-white font-medium hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {mapDeposit.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Mapping...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Map Deposit
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// UNMAP DEPOSIT MODAL
// ============================================

function UnmapDepositModal({
  deposit,
  onClose,
  onSuccess,
}: {
  deposit: OnchainDeposit;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [reason, setReason] = useState("");
  const [forceUnmap, setForceUnmap] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: balanceInfo, isLoading: loadingBalance } = useDepositWithBalance(deposit.id);
  const unmapDeposit = useUnmapDeposit();

  const hasInsufficientBalance = balanceInfo && !balanceInfo.canDebit;

  const handleUnmap = async () => {
    if (!reason.trim()) {
      setError("Please provide a reason for unmapping");
      return;
    }

    if (hasInsufficientBalance && !forceUnmap) {
      setError("User has insufficient balance. Check 'Force unmap' to proceed without debiting.");
      return;
    }

    setError(null);
    try {
      await unmapDeposit.mutateAsync({
        depositId: deposit.id,
        reason: reason.trim(),
        force: forceUnmap
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to unmap deposit");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Unmap Deposit
            </h2>
            <p className="text-sm text-gray-500">
              Remove user mapping and reverse credit
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Deposit Info */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Transaction</span>
              <span className="text-sm font-mono text-gray-900 dark:text-white">
                {formatAddress(deposit.txHash)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Deposit Amount</span>
              <span className="text-sm font-semibold text-brand-600 dark:text-brand-400">
                {formatCurrency(deposit.amount)} HBCT
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Current User</span>
              <span className="text-sm text-gray-900 dark:text-white">
                {deposit.user?.email || deposit.userId?.slice(0, 8) + "..."}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">User Balance</span>
              {loadingBalance ? (
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              ) : (
                <span className={cn(
                  "text-sm font-semibold",
                  hasInsufficientBalance ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
                )}>
                  {formatCurrency(balanceInfo?.userBalance || "0")} HBCT
                  {hasInsufficientBalance && " (Insufficient)"}
                </span>
              )}
            </div>
          </div>

          {/* Insufficient Balance Warning */}
          {hasInsufficientBalance && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-700 dark:text-amber-400">
                <p className="font-medium mb-1">Insufficient Balance</p>
                <p>User only has {formatCurrency(balanceInfo?.userBalance || "0")} HBCT but deposit was {formatCurrency(deposit.amount)} HBCT. They may have already withdrawn the funds.</p>
              </div>
            </div>
          )}

          {/* Force Option */}
          {hasInsufficientBalance && (
            <label className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 cursor-pointer">
              <input
                type="checkbox"
                checked={forceUnmap}
                onChange={(e) => setForceUnmap(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Force unmap without debiting</p>
                <p className="text-xs text-gray-500">Unmap the deposit record without deducting from user's balance</p>
              </div>
            </label>
          )}

          {/* Reason Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reason for Unmapping *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Deposit was mapped to wrong user by mistake..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Warning */}
          {!hasInsufficientBalance && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div className="text-sm text-red-700 dark:text-red-400">
                <p className="font-medium mb-1">Warning: Balance Reversal</p>
                <p>This will debit {formatCurrency(deposit.amount)} HBCT from the user's balance and set the deposit back to unmapped status.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-6 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUnmap}
            disabled={!reason.trim() || unmapDeposit.isPending || (!!hasInsufficientBalance && !forceUnmap)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {unmapDeposit.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Unmapping...
              </>
            ) : (
              <>
                <UserMinus className="h-4 w-4" />
                {forceUnmap ? "Force Unmap" : "Unmap Deposit"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// REASSIGN DEPOSIT MODAL
// ============================================

function ReassignDepositModal({
  deposit,
  onClose,
  onSuccess,
}: {
  deposit: OnchainDeposit;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [reason, setReason] = useState("");
  const [forceReassign, setForceReassign] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: balanceInfo, isLoading: loadingBalance } = useDepositWithBalance(deposit.id);
  const reassignDeposit = useReassignDeposit();

  const hasInsufficientBalance = balanceInfo && !balanceInfo.canDebit;

  // Search users with debounce
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setError(null);
      try {
        const response = await adminApi.getUsers({ search: searchQuery, limit: 10 });
        // Filter out the current user
        setSearchResults(response.users.filter((u: User) => u.id !== deposit.userId));
      } catch (err) {
        console.error("Failed to search users:", err);
        setError("Failed to search users");
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, deposit.userId]);

  const handleReassign = async () => {
    if (!selectedUser) {
      setError("Please select a user");
      return;
    }
    if (!reason.trim()) {
      setError("Please provide a reason for reassignment");
      return;
    }

    if (hasInsufficientBalance && !forceReassign) {
      setError("Old user has insufficient balance. Check 'Force reassign' to proceed without debiting from old user.");
      return;
    }

    setError(null);
    try {
      await reassignDeposit.mutateAsync({
        depositId: deposit.id,
        userId: selectedUser.id,
        reason: reason.trim(),
        force: forceReassign
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to reassign deposit");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Reassign Deposit
            </h2>
            <p className="text-sm text-gray-500">
              Move deposit from one user to another
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Deposit Info */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Transaction</span>
              <span className="text-sm font-mono text-gray-900 dark:text-white">
                {formatAddress(deposit.txHash)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Deposit Amount</span>
              <span className="text-sm font-semibold text-brand-600 dark:text-brand-400">
                {formatCurrency(deposit.amount)} HBCT
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Current User</span>
              <span className="text-sm text-gray-900 dark:text-white">
                {deposit.user?.email || deposit.userId?.slice(0, 8) + "..."}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">User Balance</span>
              {loadingBalance ? (
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              ) : (
                <span className={cn(
                  "text-sm font-semibold",
                  hasInsufficientBalance ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
                )}>
                  {formatCurrency(balanceInfo?.userBalance || "0")} HBCT
                  {hasInsufficientBalance && " (Insufficient)"}
                </span>
              )}
            </div>
          </div>

          {/* Insufficient Balance Warning */}
          {hasInsufficientBalance && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-700 dark:text-amber-400">
                <p className="font-medium mb-1">Insufficient Balance</p>
                <p>Old user only has {formatCurrency(balanceInfo?.userBalance || "0")} HBCT but deposit was {formatCurrency(deposit.amount)} HBCT. They may have already withdrawn.</p>
              </div>
            </div>
          )}

          {/* Force Option */}
          {hasInsufficientBalance && (
            <label className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 cursor-pointer">
              <input
                type="checkbox"
                checked={forceReassign}
                onChange={(e) => setForceReassign(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Force reassign without debiting old user</p>
                <p className="text-xs text-gray-500">Credit new user without deducting from old user's balance</p>
              </div>
            </label>
          )}

          {/* User Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search New User
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by email, username, or wallet address..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
              )}
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                    selectedUser?.id === user.id && "bg-brand-50 dark:bg-brand-500/10"
                  )}
                >
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      {(user.firstName?.[0] || user.email?.[0] || "?").toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {user.firstName && user.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : user.username || "No name"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  {selectedUser?.id === user.id && (
                    <CheckCircle2 className="h-5 w-5 text-brand-500 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Selected User */}
          {selectedUser && (
            <div className="p-4 rounded-xl bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-brand-800 dark:text-brand-300">
                    New User
                  </p>
                  <p className="text-sm text-brand-600 dark:text-brand-400">
                    {selectedUser.email}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-1 rounded hover:bg-brand-100 dark:hover:bg-brand-500/20"
                >
                  <X className="h-4 w-4 text-brand-500" />
                </button>
              </div>
            </div>
          )}

          {/* Reason Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reason for Reassignment *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Original mapping was incorrect, user provided proof of ownership..."
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Warning */}
          {!hasInsufficientBalance && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-700 dark:text-amber-400">
                <p className="font-medium mb-1">Balance Transfer</p>
                <p>This will debit {formatCurrency(deposit.amount)} HBCT from the current user and credit it to the new user.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-6 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleReassign}
            disabled={!selectedUser || !reason.trim() || reassignDeposit.isPending || (!!hasInsufficientBalance && !forceReassign)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-500 text-white font-medium hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {reassignDeposit.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Reassigning...
              </>
            ) : (
              <>
                <ArrowRightLeft className="h-4 w-4" />
                {forceReassign ? "Force Reassign" : "Reassign Deposit"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// RELEASE LOCKED DEPOSIT MODAL
// ============================================

function ReleaseLockedDepositModal({
  deposit,
  onClose,
  onSuccess,
}: {
  deposit: OnchainDeposit;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const releaseDeposit = useReleaseLockedDeposit();

  // Calculate time remaining
  const getTimeInfo = () => {
    if (!deposit.lockedUntil) return { remaining: "Unknown", canAutoRelease: false };
    const lockEnd = new Date(deposit.lockedUntil).getTime();
    const now = Date.now();
    const remaining = lockEnd - now;
    if (remaining <= 0) return { remaining: "Ready for auto-release", canAutoRelease: true };

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    return { remaining: `${hours}h ${minutes}m`, canAutoRelease: false };
  };

  const timeInfo = getTimeInfo();

  const handleRelease = async () => {
    if (!reason.trim()) {
      setError("Please provide a reason for early release");
      return;
    }

    setError(null);
    try {
      await releaseDeposit.mutateAsync({ depositId: deposit.id, reason: reason.trim() });
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to release deposit");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Release Locked Deposit
            </h2>
            <p className="text-sm text-gray-500">
              Release deposit early before 24h lock expires
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Deposit Info */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Transaction</span>
              <span className="text-sm font-mono text-gray-900 dark:text-white">
                {formatAddress(deposit.txHash)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Amount</span>
              <span className="text-sm font-semibold text-brand-600 dark:text-brand-400">
                {formatCurrency(deposit.amount)} HBCT
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Assigned User</span>
              <span className="text-sm text-gray-900 dark:text-white">
                {deposit.user?.email || deposit.userId?.slice(0, 8) + "..."}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Time Remaining</span>
              <span className={cn(
                "text-sm font-medium flex items-center gap-1",
                timeInfo.canAutoRelease ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
              )}>
                <Timer className="h-4 w-4" />
                {timeInfo.remaining}
              </span>
            </div>
            {deposit.lockReason && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Lock Reason</span>
                <span className="text-sm text-gray-600 dark:text-gray-400 text-right max-w-[200px] truncate">
                  {deposit.lockReason}
                </span>
              </div>
            )}
          </div>

          {/* Info about lock */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
            <Lock className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-400">
              <p className="font-medium mb-1">Why is this deposit locked?</p>
              <p>The deposit was mapped to a user whose wallet address doesn't match the sender. The 24-hour lock prevents immediate withdrawal in case of incorrect mapping.</p>
            </div>
          </div>

          {/* Reason Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reason for Early Release *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., User verified ownership via support ticket, confirmed transaction signature..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-6 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleRelease}
            disabled={!reason.trim() || releaseDeposit.isPending}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-500 text-white font-medium hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {releaseDeposit.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Releasing...
              </>
            ) : (
              <>
                <Unlock className="h-4 w-4" />
                Release Now
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
