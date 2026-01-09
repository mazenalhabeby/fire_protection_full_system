"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";
import { Button, cn } from "@/components/ui";
import {
  TrendingUp,
  RefreshCw,
  Coins,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Play,
  Wallet,
  Copy,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Zap,
  LayoutDashboard,
  List,
  Rocket,
} from "lucide-react";
import { toast } from "sonner";
import { AdminSkeleton } from "@/components/skeletons";
import { useState } from "react";

type TabType = "overview" | "execute" | "allocations";

export default function BuybackPoolPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isChecking, setIsChecking] = useState(false);
  const [walletCheck, setWalletCheck] = useState<{
    ready: boolean;
    message: string;
    shortfall: number;
    currentBnbBalance: number;
  } | null>(null);
  const [executionResult, setExecutionResult] = useState<{
    success: boolean;
    message: string;
    executionId?: string;
    totalProcessed?: number;
    totalBnbSwapped?: number;
    totalHbctBought?: number;
    txHash?: string;
    error?: string;
  } | null>(null);

  // Fetch Buyback Stats
  const { data: stats, isLoading: isStatsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["admin", "buyback", "stats"],
    queryFn: () => adminApi.getBuybackStats(),
    refetchInterval: 30000,
  });

  // Fetch Buyback Config
  const { data: config, isLoading: isConfigLoading } = useQuery({
    queryKey: ["admin", "buyback", "config"],
    queryFn: () => adminApi.getBuybackConfig(),
  });

  // Fetch Pending Total in BNB
  const { data: pendingTotal, isLoading: isPendingLoading, refetch: refetchPending } = useQuery({
    queryKey: ["admin", "buyback", "pending-total"],
    queryFn: () => adminApi.getPendingTotal(),
    refetchInterval: 30000,
  });

  // Fetch Wallet Status
  const { data: walletStatus, isLoading: isWalletLoading, refetch: refetchWallet } = useQuery({
    queryKey: ["admin", "buyback", "wallet"],
    queryFn: () => adminApi.getBuybackWallet(),
    refetchInterval: 30000,
  });

  // Fetch Swap Config Verification
  const { data: swapConfig, refetch: refetchSwapConfig } = useQuery({
    queryKey: ["admin", "buyback", "swap-config"],
    queryFn: () => adminApi.verifySwapConfig(),
    refetchInterval: 60000,
  });

  // Fetch Allocations (pending only for execute tab)
  const [statusFilter, setStatusFilter] = useState<string>("");
  const { data: allocationsData, isLoading: isAllocationsLoading, refetch: refetchAllocations } = useQuery({
    queryKey: ["admin", "buyback", "allocations", statusFilter],
    queryFn: () => adminApi.getBuybackAllocations({ status: statusFilter || undefined, limit: 50 }),
    refetchInterval: 30000,
  });

  // Fetch Executions
  const { data: executionsData, isLoading: isExecutionsLoading, refetch: refetchExecutions } = useQuery({
    queryKey: ["admin", "buyback", "executions"],
    queryFn: () => adminApi.getBuybackExecutions({ limit: 20 }),
    refetchInterval: 30000,
  });

  // Track expanded execution
  const [expandedExecution, setExpandedExecution] = useState<string | null>(null);

  // Check wallet readiness
  const handleCheckWallet = async () => {
    setIsChecking(true);
    try {
      const result = await adminApi.checkBuybackReady();
      setWalletCheck({
        ready: result.ready,
        message: result.message,
        shortfall: result.shortfall,
        currentBnbBalance: result.currentBnbBalance,
      });
      if (result.ready) {
        toast.success("Wallet ready to execute buybacks!");
      } else {
        toast.warning(result.message);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to check wallet");
    } finally {
      setIsChecking(false);
    }
  };

  // Execute all pending buybacks
  const executeMutation = useMutation({
    mutationFn: () => adminApi.executeBuybacks(),
    onSuccess: (data) => {
      setExecutionResult(data);
      queryClient.invalidateQueries({ queryKey: ["admin", "buyback"] });
      setWalletCheck(null);

      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message || data.error || "Execution failed");
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to execute buybacks");
      setExecutionResult(null);
    },
  });

  // Refresh all data
  const handleRefresh = () => {
    refetchStats();
    refetchPending();
    refetchWallet();
    refetchSwapConfig();
    refetchAllocations();
    refetchExecutions();
    setWalletCheck(null);
    setExecutionResult(null);
  };

  // Copy address to clipboard
  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast.success("Address copied!");
  };

  // Create test allocations
  const handleCreateTestData = async () => {
    try {
      const result = await adminApi.createTestBuybackAllocations();
      toast.success(result.message);
      handleRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create test allocations');
    }
  };

  const isLoading = isStatsLoading || isConfigLoading || isPendingLoading || isWalletLoading;

  if (isLoading) {
    return (
      <div className="p-6">
        <AdminSkeleton />
      </div>
    );
  }

  const bnbPrice = pendingTotal?.bnbPriceUsd || walletStatus?.bnbPriceUsd || 700;
  const isLiveData = pendingTotal?.success && pendingTotal?.dataSource?.bnbPrice === 'binance' && pendingTotal?.dataSource?.gasPrice === 'network';

  const tabs = [
    { id: "overview" as TabType, label: "Overview", icon: LayoutDashboard },
    { id: "execute" as TabType, label: "Execute", icon: Rocket, badge: stats?.pendingCount },
    { id: "allocations" as TabType, label: "Executions", icon: List, badge: executionsData?.pagination.total },
  ];

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Buyback Pool</h1>
            <p className="text-sm text-gray-500">Manage token buybacks from PancakeSwap</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateTestData}
            className="gap-2"
          >
            <Zap className="h-4 w-4" />
            Add Test Data
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <nav className="flex gap-1" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-brand-500 text-brand-600 dark:text-brand-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:hover:text-gray-300"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-bold",
                  activeTab === tab.id
                    ? "bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                )}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Swap Config Status */}
      {swapConfig && !swapConfig.success && (
        <div className="rounded-xl p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-700 dark:text-red-300">Swap Configuration Error</p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {swapConfig.testQuoteError || 'Unable to verify swap configuration'}
              </p>
              <div className="mt-2 p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-xs font-mono text-red-700 dark:text-red-300">
                <p>HBCT Address: {swapConfig.hbctAddress}</p>
                <p>Wallet: {swapConfig.walletAddress || 'Not configured'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Config Status Banner */}
          {config && (
            <div className={cn(
              "rounded-xl p-4 border",
              config.enabled
                ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-3 h-3 rounded-full",
                    config.enabled ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                  )} />
                  <div>
                    <p className={cn(
                      "font-medium",
                      config.enabled ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"
                    )}>
                      Buyback is {config.enabled ? "ENABLED" : "DISABLED"}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {config.percentageOfPayment}% of each purchase is allocated to buyback
                    </p>
                  </div>
                </div>
                {swapConfig && swapConfig.success && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                      Swap Verified
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">Total Allocated</span>
                <Coins className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${stats?.totalAllocatedUsd.toFixed(2) || "0.00"}
              </p>
              <p className="text-xs text-gray-500 mt-1">From all purchases</p>
            </div>

            <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">Total Executed</span>
                <CheckCircle className="h-5 w-5 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                ${stats?.totalExecutedUsd.toFixed(2) || "0.00"}
              </p>
              <p className="text-xs text-gray-500 mt-1">{stats?.completedCount || 0} completed</p>
            </div>

            <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">HBCT Bought</span>
                <TrendingUp className="h-5 w-5 text-brand-500" />
              </div>
              <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">
                {stats?.totalHbctBought.toLocaleString() || "0"}
              </p>
              <p className="text-xs text-gray-500 mt-1">Tokens purchased</p>
            </div>

            <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">BNB Price</span>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  pendingTotal?.dataSource?.bnbPrice === 'binance'
                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                    : "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                )}>
                  {pendingTotal?.dataSource?.bnbPrice === 'binance' ? 'Live' : 'Fallback'}
                </span>
              </div>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                ${bnbPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500 mt-1">Current rate</p>
            </div>
          </div>

          {/* Status Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/10 border border-amber-200 dark:border-amber-800 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Pending</span>
                  <p className="text-3xl font-bold text-amber-900 dark:text-amber-100">{stats?.pendingCount || 0}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-900/10 border border-emerald-200 dark:border-emerald-800 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Completed</span>
                  <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">{stats?.completedCount || 0}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/10 border border-red-200 dark:border-red-800 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <span className="text-sm font-medium text-red-700 dark:text-red-300">Failed</span>
                  <p className="text-3xl font-bold text-red-900 dark:text-red-100">{stats?.failedCount || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Buyback Wallet Info */}
          {walletStatus?.walletAddress && (
            <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Buyback Wallet
              </h3>
              <div className="flex items-center gap-2 mb-4">
                <code className="flex-1 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm font-mono text-gray-700 dark:text-gray-300">
                  {walletStatus.walletAddress}
                </code>
                <Button variant="outline" size="sm" onClick={() => copyAddress(walletStatus.walletAddress!)}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.open(`https://bscscan.com/address/${walletStatus.walletAddress}`, '_blank')}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <p className="text-xs text-gray-500 mb-1">BNB</p>
                  <p className="font-bold text-amber-600 dark:text-amber-400">
                    {parseFloat(walletStatus.balances.bnb).toFixed(6)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <p className="text-xs text-gray-500 mb-1">USDT</p>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400">
                    {parseFloat(walletStatus.balances.usdt).toFixed(2)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <p className="text-xs text-gray-500 mb-1">USDC</p>
                  <p className="font-bold text-blue-600 dark:text-blue-400">
                    {parseFloat(walletStatus.balances.usdc).toFixed(2)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <p className="text-xs text-gray-500 mb-1">HBCT</p>
                  <p className="font-bold text-brand-600 dark:text-brand-400">
                    {parseFloat(walletStatus.balances.hbct).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "execute" && (
        <div className="space-y-6">
          {/* Data Source Warning */}
          {pendingTotal && !isLiveData && (
            <div className="rounded-xl p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-amber-700 dark:text-amber-300">
                  Using estimated data.
                  {pendingTotal.dataSource?.bnbPrice !== 'binance' && ' BNB price from fallback.'}
                  {pendingTotal.dataSource?.gasPrice !== 'network' && ' Gas price from fallback.'}
                </span>
              </div>
            </div>
          )}

          {/* Main Action Card */}
          <div className="rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-black dark:via-gray-900 dark:to-black p-6 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-full blur-3xl" />

            <div className="relative">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                    <Wallet className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Execute Buybacks</h3>
                    <p className="text-sm text-gray-400">Send BNB to execute pending buybacks</p>
                  </div>
                </div>
                {walletStatus?.walletAddress && (
                  <button
                    onClick={() => copyAddress(walletStatus.walletAddress!)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm text-gray-300"
                  >
                    <span className="font-mono">{walletStatus.walletAddress.slice(0, 6)}...{walletStatus.walletAddress.slice(-4)}</span>
                    <Copy className="h-4 w-4" />
                  </button>
                )}
              </div>

              {pendingTotal && pendingTotal.totalBnbRequired > 0 ? (
                <div className="space-y-6">
                  {/* Breakdown by Currency */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {pendingTotal.breakdown.map((item) => {
                      const currencyConfig = {
                        BNB: { gradient: "from-amber-500 to-orange-500", bg: "bg-gradient-to-br from-amber-500/10 to-orange-500/10", border: "border-amber-500/30", icon: "B", iconBg: "bg-amber-500", textColor: "text-amber-400" },
                        USDT: { gradient: "from-emerald-500 to-teal-500", bg: "bg-gradient-to-br from-emerald-500/10 to-teal-500/10", border: "border-emerald-500/30", icon: "₮", iconBg: "bg-emerald-500", textColor: "text-emerald-400" },
                        USDC: { gradient: "from-blue-500 to-indigo-500", bg: "bg-gradient-to-br from-blue-500/10 to-indigo-500/10", border: "border-blue-500/30", icon: "$", iconBg: "bg-blue-500", textColor: "text-blue-400" },
                      }[item.currency] || { gradient: "from-gray-500 to-gray-600", bg: "bg-gray-500/10", border: "border-gray-500/30", icon: "?", iconBg: "bg-gray-500", textColor: "text-gray-400" };

                      return (
                        <div key={item.currency} className={cn("relative p-5 rounded-2xl border overflow-hidden", currencyConfig.bg, currencyConfig.border)}>
                          <div className={cn("absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-20 blur-2xl", `bg-gradient-to-br ${currencyConfig.gradient}`)} />
                          <div className="relative">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-lg", currencyConfig.iconBg)}>
                                  {currencyConfig.icon}
                                </div>
                                <div>
                                  <p className="text-lg font-bold text-white">{item.currency}</p>
                                  <p className="text-xs text-gray-400">Pending</p>
                                </div>
                              </div>
                              <div className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium", currencyConfig.bg, currencyConfig.textColor)}>
                                <span>{item.txCount}</span>
                                <span className="text-gray-500">tx</span>
                              </div>
                            </div>
                            <div className="mb-3">
                              <p className={cn("text-2xl font-bold", currencyConfig.textColor)}>
                                {item.amount.toFixed(item.currency === "BNB" ? 6 : 2)}
                              </p>
                              <p className="text-sm text-gray-400">~${item.usdValue.toFixed(2)} USD</p>
                            </div>
                            <div className="pt-3 border-t border-white/10">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">BNB Equivalent</span>
                                <span className="text-sm font-semibold text-amber-400">{item.bnbEquivalent.toFixed(6)} BNB</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Total Required */}
                  <div className="p-5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30">
                    <div className="flex items-center gap-2 mb-5">
                      <div className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30">
                        <span className="text-sm font-bold text-amber-300">{pendingTotal.totalTxCount} transactions</span>
                      </div>
                      <span className="text-xs text-gray-500">→ 1 BNB swap</span>
                    </div>

                    <div className="space-y-3 mb-5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Buyback Amount</span>
                        <span className="text-lg font-bold text-white font-mono">{pendingTotal.totalBnbRequired.toFixed(6)} BNB</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-400">Gas Fee</span>
                          <span className={cn("text-xs px-2 py-0.5 rounded", pendingTotal.dataSource?.gasPrice === 'network' ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400")}>
                            {pendingTotal.gasPriceGwei.toFixed(1)} gwei
                          </span>
                        </div>
                        <span className="text-lg font-bold text-white font-mono">+ {pendingTotal.estimatedGasFee.toFixed(6)} BNB</span>
                      </div>

                      {pendingTotal.estimatedGasFee > pendingTotal.totalBnbRequired && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/20 border border-amber-500/30">
                          <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                          <span className="text-xs text-amber-300">Gas fee is higher than buyback amount.</span>
                        </div>
                      )}

                      <div className="border-t border-white/20 my-2"></div>

                      <div className="flex items-center justify-between">
                        <span className="text-base font-semibold text-amber-300">Total to Send</span>
                        <span className="text-2xl font-bold text-amber-400 font-mono">{pendingTotal.totalWithGas.toFixed(6)} BNB</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">USD Value</span>
                        <span className="text-sm text-gray-400">~${(pendingTotal.totalWithGas * bnbPrice).toFixed(2)} USD</span>
                      </div>
                    </div>

                    {walletStatus && (
                      <div className="p-3 rounded-lg bg-black/20 border border-white/10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-400">Wallet Balance:</span>
                          </div>
                          <span className={cn("text-lg font-bold font-mono", parseFloat(walletStatus.balances.bnb) >= pendingTotal.totalWithGas ? "text-emerald-400" : "text-red-400")}>
                            {parseFloat(walletStatus.balances.bnb).toFixed(6)} BNB
                          </span>
                        </div>
                        {parseFloat(walletStatus.balances.bnb) < pendingTotal.totalWithGas && (
                          <div className="mt-2 text-xs text-red-400">
                            Need {(pendingTotal.totalWithGas - parseFloat(walletStatus.balances.bnb)).toFixed(6)} more BNB
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Wallet Check Result */}
                  {walletCheck && (
                    <div className={cn("p-4 rounded-xl border", walletCheck.ready ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30")}>
                      <div className="flex items-center gap-3">
                        {walletCheck.ready ? <ShieldCheck className="h-6 w-6 text-emerald-400" /> : <AlertCircle className="h-6 w-6 text-red-400" />}
                        <div>
                          <p className={cn("font-medium", walletCheck.ready ? "text-emerald-300" : "text-red-300")}>{walletCheck.message}</p>
                          {!walletCheck.ready && walletCheck.shortfall > 0 && (
                            <p className="text-sm text-red-400/80">Transfer {walletCheck.shortfall.toFixed(6)} more BNB to the buyback wallet</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button onClick={handleCheckWallet} disabled={isChecking} variant="outline" className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10" size="lg">
                      {isChecking ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Checking...</> : <><ShieldCheck className="h-5 w-5 mr-2" />Check Wallet</>}
                    </Button>
                    <Button
                      onClick={() => executeMutation.mutate()}
                      disabled={executeMutation.isPending || !walletCheck?.ready}
                      className={cn("flex-1", walletCheck?.ready ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white" : "bg-gray-600 text-gray-300 cursor-not-allowed")}
                      size="lg"
                    >
                      {executeMutation.isPending ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Executing...</> : <><Play className="h-5 w-5 mr-2" />Execute Buybacks</>}
                    </Button>
                  </div>

                  {/* Execution Result */}
                  {executionResult && (
                    <div className={cn("p-4 rounded-xl border", executionResult.success ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30")}>
                      <div className="flex items-start gap-3">
                        {executionResult.success ? <CheckCircle className="h-6 w-6 text-emerald-400 shrink-0" /> : <XCircle className="h-6 w-6 text-red-400 shrink-0" />}
                        <div className="flex-1">
                          <p className={cn("font-semibold mb-2", executionResult.success ? "text-emerald-300" : "text-red-300")}>
                            {executionResult.message}
                          </p>
                          {executionResult.success && executionResult.totalProcessed && (
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-4">
                                <span className="text-gray-400">Allocations: <span className="font-bold text-white">{executionResult.totalProcessed}</span></span>
                                <span className="text-amber-400">BNB Swapped: <span className="font-bold">{executionResult.totalBnbSwapped?.toFixed(6)}</span></span>
                                <span className="text-emerald-400">HBCT Bought: <span className="font-bold">{executionResult.totalHbctBought?.toFixed(2)}</span></span>
                              </div>
                              {executionResult.txHash && (
                                <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                                  <span className="text-gray-400">Transaction:</span>
                                  <a
                                    href={`https://bscscan.com/tx/${executionResult.txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-mono text-xs"
                                  >
                                    {executionResult.txHash.slice(0, 20)}...
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </div>
                              )}
                              {executionResult.executionId && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400">Execution ID:</span>
                                  <span className="font-mono text-xs text-gray-300">{executionResult.executionId}</span>
                                </div>
                              )}
                            </div>
                          )}
                          {!executionResult.success && executionResult.error && (
                            <p className="text-red-400 text-sm mt-1">{executionResult.error}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
                  <p className="text-xl font-medium text-white mb-2">No Pending Buybacks</p>
                  <p className="text-gray-400 mb-6">All buybacks have been executed</p>
                  <Button onClick={handleCreateTestData} variant="outline" className="bg-white/5 border-white/20 text-white hover:bg-white/10">
                    <Zap className="h-4 w-4 mr-2" />
                    Create Test Allocations
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "allocations" && (
        <div className="space-y-4">
          <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="p-5 border-b border-gray-200 dark:border-gray-800">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Rocket className="h-5 w-5" />
                Execution History
              </h3>
              <p className="text-sm text-gray-500 mt-1">Each execution represents one BNB→HBCT swap for multiple allocations</p>
            </div>

            {isExecutionsLoading ? (
              <div className="p-8 text-center text-gray-500">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                Loading executions...
              </div>
            ) : executionsData?.executions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No executions yet. Execute pending buybacks from the Execute tab.
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {executionsData?.executions.map((execution) => (
                  <div key={execution.id}>
                    {/* Execution Header */}
                    <button
                      onClick={() => setExpandedExecution(expandedExecution === execution.id ? null : execution.id)}
                      className="w-full p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* Status Icon */}
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            execution.status === 'COMPLETED' && "bg-emerald-100 dark:bg-emerald-900/30",
                            execution.status === 'FAILED' && "bg-red-100 dark:bg-red-900/30",
                            execution.status === 'PROCESSING' && "bg-blue-100 dark:bg-blue-900/30",
                            execution.status === 'PENDING' && "bg-amber-100 dark:bg-amber-900/30",
                          )}>
                            {execution.status === 'COMPLETED' && <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
                            {execution.status === 'FAILED' && <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />}
                            {execution.status === 'PROCESSING' && <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />}
                            {execution.status === 'PENDING' && <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
                          </div>

                          {/* Execution Info */}
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                                {execution.id.slice(0, 12)}...
                              </span>
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-xs font-medium",
                                execution.status === 'COMPLETED' && "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
                                execution.status === 'FAILED' && "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
                                execution.status === 'PROCESSING' && "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
                                execution.status === 'PENDING' && "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
                              )}>
                                {execution.status}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {new Date(execution.createdAt).toLocaleString()} • {execution.allocationCount} allocations
                            </p>
                          </div>
                        </div>

                        {/* Execution Stats */}
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                              {parseFloat(execution.totalBnbSwapped).toFixed(6)} BNB
                            </p>
                            <p className="text-xs text-gray-500">${parseFloat(execution.totalUsdValue).toFixed(2)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-brand-600 dark:text-brand-400">
                              {execution.totalHbctBought ? parseFloat(execution.totalHbctBought).toLocaleString() : '-'} HBCT
                            </p>
                            <p className="text-xs text-gray-500">received</p>
                          </div>
                          {execution.swapTxHash && (
                            <a
                              href={`https://bscscan.com/tx/${execution.swapTxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <ExternalLink className="h-4 w-4 text-blue-500" />
                            </a>
                          )}
                          <div className={cn("transition-transform", expandedExecution === execution.id && "rotate-180")}>
                            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {execution.errorMessage && (
                        <div className="mt-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-left">
                          <p className="text-xs text-red-600 dark:text-red-400">{execution.errorMessage}</p>
                        </div>
                      )}
                    </button>

                    {/* Expanded Allocations */}
                    {expandedExecution === execution.id && (
                      <div className="px-4 pb-4">
                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden ml-14">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800/50">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Currency</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Amount</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">USD Value</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">HBCT Share</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                              {execution.allocations.map((alloc) => (
                                <tr key={alloc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                                  <td className="px-3 py-2">
                                    <span className={cn(
                                      "px-2 py-0.5 rounded text-xs font-medium",
                                      alloc.currency === 'BNB' && "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
                                      alloc.currency === 'USDT' && "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
                                      alloc.currency === 'USDC' && "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
                                    )}>
                                      {alloc.currency}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 font-mono text-gray-700 dark:text-gray-300">
                                    {parseFloat(alloc.amount).toFixed(alloc.currency === 'BNB' ? 6 : 2)}
                                  </td>
                                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                                    ${parseFloat(alloc.usdValue).toFixed(2)}
                                  </td>
                                  <td className="px-3 py-2 font-medium text-brand-600 dark:text-brand-400">
                                    {alloc.hbctBought ? parseFloat(alloc.hbctBought).toLocaleString() : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
