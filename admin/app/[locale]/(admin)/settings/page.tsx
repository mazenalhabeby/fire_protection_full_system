"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi, purchaseApi } from "@/lib/api";
import { Button, Input, Label, Switch, cn } from "@/components/ui";
import {
  Coins,
  Loader2,
  Lock,
  Percent,
  Plus,
  Settings,
  TrendingUp,
  RefreshCw,
  CheckCircle,
  Edit2,
  X,
  Activity,
  Zap,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { AdminSkeleton } from "@/components/skeletons";

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();

  // Lock Tier State
  const [newTierName, setNewTierName] = useState("");
  const [newTierMonths, setNewTierMonths] = useState("");
  const [newTierBonus, setNewTierBonus] = useState("");
  const [newTierMinAmount, setNewTierMinAmount] = useState("");
  const [showAddTier, setShowAddTier] = useState(false);
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [editTierData, setEditTierData] = useState<{
    name: string;
    lockMonths: string;
    bonusPercent: string;
    feeDiscountPercent: string;
    minAmount: string;
  } | null>(null);

  // Affiliate Tier State
  const [newAffTierName, setNewAffTierName] = useState("");
  const [newAffTierCommission, setNewAffTierCommission] = useState("");
  const [newAffTierMinReferrals, setNewAffTierMinReferrals] = useState("");
  const [newAffTierColor, setNewAffTierColor] = useState("#3B82F6");
  const [showAddAffTier, setShowAddAffTier] = useState(false);
  const [editingAffTierId, setEditingAffTierId] = useState<string | null>(null);
  const [editAffTierData, setEditAffTierData] = useState<{
    name: string;
    commissionRate: string;
    minReferrals: string;
    color: string;
  } | null>(null);

  // Fetch Token Config
  const { data: tokenConfig, isLoading: isTokenLoading } = useQuery({
    queryKey: ["admin", "token-config"],
    queryFn: () => adminApi.getTokenConfig(),
  });

  // Fetch Live Market Prices
  const { data: marketPrices, isLoading: isPricesLoading, refetch: refetchPrices } = useQuery({
    queryKey: ["market-prices"],
    queryFn: () => purchaseApi.getPrice(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch Lock Tiers
  const { data: lockTiers, isLoading: isTiersLoading } = useQuery({
    queryKey: ["admin", "lock-tiers"],
    queryFn: () => adminApi.getLockTiers(),
  });

  // Fetch Affiliate Tiers
  const { data: affiliateTiers, isLoading: isAffTiersLoading } = useQuery({
    queryKey: ["admin", "affiliate-tiers"],
    queryFn: () => adminApi.getAffiliateTiers(),
  });

  // Fetch Purchase Stats
  const { data: purchaseStats } = useQuery({
    queryKey: ["admin", "purchases", "stats"],
    queryFn: () => adminApi.getPurchaseStats(),
  });

  // Create Lock Tier Mutation
  const createLockTierMutation = useMutation({
    mutationFn: (data: {
      name: string;
      lockMonths: number;
      bonusPercent: number;
      minAmount: number;
    }) => adminApi.createLockTier(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "lock-tiers"] });
      toast.success("Lock tier created");
      setShowAddTier(false);
      setNewTierName("");
      setNewTierMonths("");
      setNewTierBonus("");
      setNewTierMinAmount("");
    },
    onError: () => {
      toast.error("Failed to create lock tier");
    },
  });

  // Update Lock Tier Mutation
  const updateLockTierMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      adminApi.updateLockTier(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "lock-tiers"] });
      toast.success("Lock tier updated");
      setEditingTierId(null);
      setEditTierData(null);
    },
    onError: () => {
      toast.error("Failed to update lock tier");
    },
  });

  // Create Affiliate Tier Mutation
  const createAffTierMutation = useMutation({
    mutationFn: (data: {
      name: string;
      commissionRate: number;
      minReferrals: number;
      color?: string;
    }) => adminApi.createAffiliateTier(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "affiliate-tiers"] });
      toast.success("Affiliate tier created");
      setShowAddAffTier(false);
      setNewAffTierName("");
      setNewAffTierCommission("");
      setNewAffTierMinReferrals("");
      setNewAffTierColor("#3B82F6");
    },
    onError: () => {
      toast.error("Failed to create affiliate tier");
    },
  });

  // Update Affiliate Tier Mutation
  const updateAffTierMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      adminApi.updateAffiliateTier(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "affiliate-tiers"] });
      toast.success("Affiliate tier updated");
      setEditingAffTierId(null);
      setEditAffTierData(null);
    },
    onError: () => {
      toast.error("Failed to update affiliate tier");
    },
  });

  const handleCreateTier = () => {
    if (!newTierName || !newTierMonths || !newTierBonus || !newTierMinAmount) {
      toast.error("Please fill in all fields");
      return;
    }

    createLockTierMutation.mutate({
      name: newTierName,
      lockMonths: parseInt(newTierMonths),
      bonusPercent: parseFloat(newTierBonus),
      minAmount: parseFloat(newTierMinAmount),
    });
  };

  const handleEditTier = (tier: any) => {
    setEditingTierId(tier.id);
    setEditTierData({
      name: tier.name,
      lockMonths: tier.lockMonths.toString(),
      bonusPercent: tier.bonusPercent.toString(),
      feeDiscountPercent: tier.feeDiscountPercent?.toString() || tier.bonusPercent.toString(),
      minAmount: tier.minAmount.toString(),
    });
  };

  const handleSaveEditTier = () => {
    if (!editingTierId || !editTierData) return;

    updateLockTierMutation.mutate({
      id: editingTierId,
      data: {
        name: editTierData.name,
        lockMonths: parseInt(editTierData.lockMonths),
        bonusPercent: parseFloat(editTierData.bonusPercent),
        feeDiscountPercent: parseFloat(editTierData.feeDiscountPercent),
        minAmount: parseFloat(editTierData.minAmount),
      },
    });
  };

  // Affiliate Tier Handlers
  const handleCreateAffTier = () => {
    if (!newAffTierName || !newAffTierCommission || !newAffTierMinReferrals) {
      toast.error("Please fill in all fields");
      return;
    }

    createAffTierMutation.mutate({
      name: newAffTierName,
      commissionRate: parseFloat(newAffTierCommission) / 100, // Convert percentage to decimal
      minReferrals: parseInt(newAffTierMinReferrals),
      color: newAffTierColor,
    });
  };

  const handleEditAffTier = (tier: any) => {
    setEditingAffTierId(tier.id);
    setEditAffTierData({
      name: tier.name,
      commissionRate: (parseFloat(tier.commissionRate) * 100).toString(), // Convert to percentage
      minReferrals: tier.minReferrals.toString(),
      color: tier.color || "#3B82F6",
    });
  };

  const handleSaveEditAffTier = () => {
    if (!editingAffTierId || !editAffTierData) return;

    updateAffTierMutation.mutate({
      id: editingAffTierId,
      data: {
        name: editAffTierData.name,
        commissionRate: parseFloat(editAffTierData.commissionRate) / 100,
        minReferrals: parseInt(editAffTierData.minReferrals),
        color: editAffTierData.color,
      },
    });
  };

  if (isTokenLoading || isTiersLoading || isAffTiersLoading) {
    return (
      <div className="p-6">
        <AdminSkeleton />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center shadow-lg">
            <Settings className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h1>
            <p className="text-sm text-gray-500">Configure your platform settings</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => queryClient.invalidateQueries()}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Token & Market Overview */}
      <div className="relative rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-black dark:via-gray-900 dark:to-black p-6 md:p-8 shadow-2xl overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-brand-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-emerald-500/10 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
                <Coins className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Token & Market</h3>
                <p className="text-sm text-gray-400">Live prices • Auto-refresh 30s</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-400 text-xs font-semibold">LIVE</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchPrices()}
                className="text-gray-400 hover:text-white hover:bg-white/10 rounded-xl"
              >
                <RefreshCw className={cn("h-4 w-4", isPricesLoading && "animate-spin")} />
              </Button>
            </div>
          </div>

          {/* Token Info Pills */}
          {tokenConfig && (
            <div className="flex flex-wrap items-center gap-2 mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Symbol</span>
                <span className="text-sm font-bold text-white">{tokenConfig.symbol}</span>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Name</span>
                <span className="text-sm font-bold text-white">{tokenConfig.name}</span>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Supply</span>
                <span className="text-sm font-bold text-white">{parseFloat(tokenConfig.totalSupply).toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {/* HBCT Price Card */}
            <div className="group relative p-6 rounded-2xl bg-gradient-to-br from-brand-500/20 via-brand-500/10 to-transparent border border-brand-500/20 backdrop-blur-sm transition-all duration-300 hover:border-brand-500/40 hover:shadow-lg hover:shadow-brand-500/10">
              <div className="absolute top-4 right-4">
                <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Coins className="h-5 w-5 text-brand-400" />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-400 mb-2">HBCT Price</p>
              <p className="text-4xl font-bold text-white mb-1 tracking-tight">
                ${parseFloat(marketPrices?.hbctPriceUsd || "0").toFixed(4)}
              </p>
              <p className="text-xs text-gray-500">PancakeSwap DEX</p>
            </div>

            {/* BNB Price Card */}
            <div className="group relative p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-white/10 backdrop-blur-sm transition-all duration-300 hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/10">
              <div className="absolute top-4 right-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Zap className="h-5 w-5 text-amber-400" />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-400 mb-2">BNB Price</p>
              <p className="text-4xl font-bold text-white mb-1 tracking-tight">
                ${parseFloat(marketPrices?.bnbPriceUsd || "0").toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">Binance API</p>
            </div>

            {/* Total Volume Card */}
            <div className="group relative p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-white/10 backdrop-blur-sm transition-all duration-300 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/10">
              <div className="absolute top-4 right-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-400 mb-2">Total Volume</p>
              <p className="text-4xl font-bold text-white mb-1 tracking-tight">
                ${parseFloat(purchaseStats?.totalCompletedVolume || "0").toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">All-time sales</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lock Tiers */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-purple-500" />
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Lock Tiers</h2>
              <p className="text-xs text-gray-500">Configure token locking tiers and bonuses</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddTier(!showAddTier)}
            className="border-purple-200 text-purple-600 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-900/20"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Tier
          </Button>
        </div>
        <div className="p-5">
          {showAddTier && (
            <div className="p-4 border border-purple-200 dark:border-purple-800 rounded-xl mb-4 bg-purple-50/50 dark:bg-purple-900/10">
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">Create New Lock Tier</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700 dark:text-gray-300">Name</Label>
                  <Input
                    placeholder="e.g., Diamond"
                    value={newTierName}
                    onChange={(e) => setNewTierName(e.target.value)}
                    className="bg-white dark:bg-gray-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 dark:text-gray-300">Lock Months</Label>
                  <Input
                    type="number"
                    placeholder="36"
                    value={newTierMonths}
                    onChange={(e) => setNewTierMonths(e.target.value)}
                    className="bg-white dark:bg-gray-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 dark:text-gray-300">Bonus %</Label>
                  <Input
                    type="number"
                    placeholder="75"
                    value={newTierBonus}
                    onChange={(e) => setNewTierBonus(e.target.value)}
                    className="bg-white dark:bg-gray-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 dark:text-gray-300">Min Amount</Label>
                  <Input
                    type="number"
                    placeholder="100"
                    value={newTierMinAmount}
                    onChange={(e) => setNewTierMinAmount(e.target.value)}
                    className="bg-white dark:bg-gray-800"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={handleCreateTier}
                  disabled={createLockTierMutation.isPending}
                  className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                >
                  {createLockTierMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Create Tier
                </Button>
                <Button variant="outline" onClick={() => setShowAddTier(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {lockTiers && lockTiers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Lock Period</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Bonus</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Fee Discount</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Min Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lockTiers.map((tier: any) => (
                    <tr key={tier.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                      {editingTierId === tier.id && editTierData ? (
                        <>
                          <td className="py-3 px-4">
                            <Input
                              value={editTierData.name}
                              onChange={(e) => setEditTierData({ ...editTierData, name: e.target.value })}
                              className="h-8"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <Input
                              type="number"
                              value={editTierData.lockMonths}
                              onChange={(e) => setEditTierData({ ...editTierData, lockMonths: e.target.value })}
                              className="h-8 w-20"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <Input
                              type="number"
                              value={editTierData.bonusPercent}
                              onChange={(e) => setEditTierData({ ...editTierData, bonusPercent: e.target.value })}
                              className="h-8 w-20"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <Input
                              type="number"
                              value={editTierData.feeDiscountPercent}
                              onChange={(e) => setEditTierData({ ...editTierData, feeDiscountPercent: e.target.value })}
                              className="h-8 w-20"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <Input
                              type="number"
                              value={editTierData.minAmount}
                              onChange={(e) => setEditTierData({ ...editTierData, minAmount: e.target.value })}
                              className="h-8 w-24"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <Switch
                              checked={tier.isActive || false}
                              onCheckedChange={(checked: boolean) =>
                                updateLockTierMutation.mutate({
                                  id: tier.id,
                                  data: { isActive: checked },
                                })
                              }
                              disabled={updateLockTierMutation.isPending}
                            />
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                onClick={handleSaveEditTier}
                                disabled={updateLockTierMutation.isPending}
                                className="h-8 bg-emerald-500 hover:bg-emerald-600"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingTierId(null);
                                  setEditTierData(null);
                                }}
                                className="h-8"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">{tier.name}</td>
                          <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{tier.lockMonths} months</td>
                          <td className="py-3 px-4">
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              {tier.bonusPercent}%
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-purple-600 dark:text-purple-400 font-medium">
                              {tier.feeDiscountPercent || tier.bonusPercent}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{parseFloat(tier.minAmount).toLocaleString()} HBCT</td>
                          <td className="py-3 px-4">
                            <Switch
                              checked={tier.isActive || false}
                              onCheckedChange={(checked: boolean) =>
                                updateLockTierMutation.mutate({
                                  id: tier.id,
                                  data: { isActive: checked },
                                })
                              }
                              disabled={updateLockTierMutation.isPending}
                            />
                          </td>
                          <td className="py-3 px-4">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditTier(tier)}
                              className="h-8"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Lock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No lock tiers configured</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddTier(true)}
                className="mt-3"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add First Tier
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Affiliate Tiers */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Affiliate Tiers</h2>
              <p className="text-xs text-gray-500">Configure affiliate commission tiers</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddAffTier(!showAddAffTier)}
            className="border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Tier
          </Button>
        </div>
        <div className="p-5">
          {showAddAffTier && (
            <div className="p-4 border border-blue-200 dark:border-blue-800 rounded-xl mb-4 bg-blue-50/50 dark:bg-blue-900/10">
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">Create New Affiliate Tier</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700 dark:text-gray-300">Name</Label>
                  <Input
                    placeholder="e.g., Gold"
                    value={newAffTierName}
                    onChange={(e) => setNewAffTierName(e.target.value)}
                    className="bg-white dark:bg-gray-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 dark:text-gray-300">Commission %</Label>
                  <Input
                    type="number"
                    placeholder="10"
                    value={newAffTierCommission}
                    onChange={(e) => setNewAffTierCommission(e.target.value)}
                    className="bg-white dark:bg-gray-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 dark:text-gray-300">Min Referrals</Label>
                  <Input
                    type="number"
                    placeholder="10"
                    value={newAffTierMinReferrals}
                    onChange={(e) => setNewAffTierMinReferrals(e.target.value)}
                    className="bg-white dark:bg-gray-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 dark:text-gray-300">Color</Label>
                  <Input
                    type="color"
                    value={newAffTierColor}
                    onChange={(e) => setNewAffTierColor(e.target.value)}
                    className="bg-white dark:bg-gray-800 h-10 p-1 cursor-pointer"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={handleCreateAffTier}
                  disabled={createAffTierMutation.isPending}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                >
                  {createAffTierMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Create Tier
                </Button>
                <Button variant="outline" onClick={() => setShowAddAffTier(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {affiliateTiers && affiliateTiers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Commission</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Min Referrals</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Affiliates</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {affiliateTiers.map((tier: any) => (
                    <tr key={tier.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                      {editingAffTierId === tier.id && editAffTierData ? (
                        <>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Input
                                type="color"
                                value={editAffTierData.color}
                                onChange={(e) => setEditAffTierData({ ...editAffTierData, color: e.target.value })}
                                className="h-8 w-8 p-0.5 cursor-pointer"
                              />
                              <Input
                                value={editAffTierData.name}
                                onChange={(e) => setEditAffTierData({ ...editAffTierData, name: e.target.value })}
                                className="h-8"
                              />
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Input
                              type="number"
                              value={editAffTierData.commissionRate}
                              onChange={(e) => setEditAffTierData({ ...editAffTierData, commissionRate: e.target.value })}
                              className="h-8 w-20"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <Input
                              type="number"
                              value={editAffTierData.minReferrals}
                              onChange={(e) => setEditAffTierData({ ...editAffTierData, minReferrals: e.target.value })}
                              className="h-8 w-20"
                            />
                          </td>
                          <td className="py-3 px-4 text-gray-500">{tier.affiliateCount || 0}</td>
                          <td className="py-3 px-4">
                            <Switch
                              checked={tier.isActive || false}
                              onCheckedChange={(checked: boolean) =>
                                updateAffTierMutation.mutate({
                                  id: tier.id,
                                  data: { isActive: checked },
                                })
                              }
                              disabled={updateAffTierMutation.isPending}
                            />
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                onClick={handleSaveEditAffTier}
                                disabled={updateAffTierMutation.isPending}
                                className="h-8 bg-emerald-500 hover:bg-emerald-600"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingAffTierId(null);
                                  setEditAffTierData(null);
                                }}
                                className="h-8"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: tier.color || "#3B82F6" }}
                              />
                              <span className="font-semibold text-gray-900 dark:text-white">{tier.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                              {(parseFloat(tier.commissionRate) * 100).toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{tier.minReferrals}</td>
                          <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{tier.affiliateCount || 0}</td>
                          <td className="py-3 px-4">
                            <Switch
                              checked={tier.isActive || false}
                              onCheckedChange={(checked: boolean) =>
                                updateAffTierMutation.mutate({
                                  id: tier.id,
                                  data: { isActive: checked },
                                })
                              }
                              disabled={updateAffTierMutation.isPending}
                            />
                          </td>
                          <td className="py-3 px-4">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditAffTier(tier)}
                              className="h-8"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No affiliate tiers configured</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddAffTier(true)}
                className="mt-3"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add First Tier
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
