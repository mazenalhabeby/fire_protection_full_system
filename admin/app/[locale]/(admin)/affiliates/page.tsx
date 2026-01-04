"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";
import { Button, Input, cn } from "@/components/ui";
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Percent,
  TrendingUp,
  MoreVertical,
  CheckCircle,
  XCircle,
  Loader2,
  Copy,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { AdminSkeleton } from "@/components/skeletons";

export default function AdminAffiliatesPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedAffiliate, setSelectedAffiliate] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ [key: string]: "top" | "bottom" }>({});
  const dropdownButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const [editingAffiliate, setEditingAffiliate] = useState<string | null>(null);
  const [editCommission, setEditCommission] = useState("");

  // Calculate dropdown position based on available viewport space
  const calculateDropdownPosition = useCallback((affiliateId: string) => {
    const buttonRef = dropdownButtonRefs.current[affiliateId];
    if (!buttonRef) return "bottom";

    const buttonRect = buttonRef.getBoundingClientRect();
    const dropdownHeight = 120;
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;

    if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
      return "top";
    }
    return "bottom";
  }, []);

  const toggleDropdown = useCallback((affiliateId: string) => {
    if (selectedAffiliate === affiliateId) {
      setSelectedAffiliate(null);
    } else {
      const position = calculateDropdownPosition(affiliateId);
      setDropdownPosition(prev => ({ ...prev, [affiliateId]: position }));
      setSelectedAffiliate(affiliateId);
    }
  }, [selectedAffiliate, calculateDropdownPosition]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectedAffiliate) {
        const target = event.target as HTMLElement;
        if (!target.closest('[data-dropdown]')) {
          setSelectedAffiliate(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedAffiliate]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "affiliates", page, search],
    queryFn: () => adminApi.getAffiliates({ page, limit: 20, search: search || undefined }),
  });

  const { data: stats } = useQuery({
    queryKey: ["admin", "affiliates", "stats"],
    queryFn: () => adminApi.getAffiliateStats(),
  });

  const updateAffiliateMutation = useMutation({
    mutationFn: ({ affiliateId, data }: { affiliateId: string; data: { commissionRate?: number; isActive?: boolean; tier?: string } }) =>
      adminApi.updateAffiliate(affiliateId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "affiliates"] });
      toast.success("Affiliate updated successfully");
      setSelectedAffiliate(null);
      setEditingAffiliate(null);
    },
    onError: () => {
      toast.error("Failed to update affiliate");
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <AdminSkeleton />
      </div>
    );
  }

  const affiliates = data?.affiliates || [];
  const pagination = data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 };

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent dark:from-blue-500/20 dark:via-blue-500/10 dark:to-transparent border border-blue-200/50 dark:border-blue-500/20 p-4 md:p-5 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Total Affiliates</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{stats.totalAffiliates}</p>
                <p className="text-[10px] md:text-xs font-medium mt-1 text-blue-500">Registered</p>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                <Users className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-500/20 dark:via-emerald-500/10 dark:to-transparent border border-emerald-200/50 dark:border-emerald-500/20 p-4 md:p-5 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Active Affiliates</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{stats.activeAffiliates}</p>
                <p className="text-[10px] md:text-xs font-medium mt-1 text-emerald-500">Currently Active</p>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-500/20 dark:via-amber-500/10 dark:to-transparent border border-amber-200/50 dark:border-amber-500/20 p-4 md:p-5 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Total Referrals</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{stats.totalReferrals}</p>
                <p className="text-[10px] md:text-xs font-medium mt-1 text-amber-500">Users Referred</p>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform duration-300">
                <UserPlus className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent dark:from-purple-500/20 dark:via-purple-500/10 dark:to-transparent border border-purple-200/50 dark:border-purple-500/20 p-4 md:p-5 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Total Paid</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{parseFloat(stats.paidCommissions).toFixed(2)}</p>
                <p className="text-[10px] md:text-xs font-medium mt-1 text-purple-500">HBCT Paid Out</p>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by email or name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10 bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
          />
        </div>
      </div>

      {/* Affiliates Table */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-purple-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Affiliates ({pagination.total})</h2>
        </div>

        <div className="overflow-visible min-h-[200px]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Affiliate</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Referral Code</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Tier</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Commission</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Referrals</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Earnings</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Status</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {affiliates.map((affiliate) => (
                <tr key={affiliate.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {affiliate.user.firstName && affiliate.user.lastName
                          ? `${affiliate.user.firstName} ${affiliate.user.lastName}`
                          : "No name"}
                      </p>
                      <p className="text-xs text-gray-500">{affiliate.user.email}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => copyToClipboard(affiliate.referralCode)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 font-mono text-sm text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      {affiliate.referralCode}
                      <Copy className="h-3 w-3" />
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400">
                      {affiliate.tier}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {editingAffiliate === affiliate.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={editCommission}
                          onChange={(e) => setEditCommission(e.target.value)}
                          className="w-20 h-8 text-sm"
                          min="0"
                          max="100"
                        />
                        <span className="text-sm text-gray-500">%</span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-gray-700 dark:text-gray-300">
                        {(parseFloat(affiliate.commissionRate) * 100).toFixed(0)}%
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-gray-900 dark:text-white">{affiliate.referralCount}</span>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-gray-900 dark:text-white">{parseFloat(affiliate.totalEarnings).toFixed(2)} HBCT</p>
                  </td>
                  <td className="py-3 px-4">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                      affiliate.isActive
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-red-500/10 text-red-600 dark:text-red-400"
                    )}>
                      {affiliate.isActive ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {affiliate.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="relative" data-dropdown>
                      {editingAffiliate === affiliate.id ? (
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingAffiliate(null)}
                            className="h-8"
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              updateAffiliateMutation.mutate({
                                affiliateId: affiliate.id,
                                data: {
                                  commissionRate: parseFloat(editCommission),
                                },
                              });
                            }}
                            disabled={updateAffiliateMutation.isPending}
                            className="h-8 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                          >
                            {updateAffiliateMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Save"
                            )}
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Button
                            ref={(el) => { dropdownButtonRefs.current[affiliate.id] = el; }}
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleDropdown(affiliate.id)}
                            className="h-8 w-8 p-0"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                          {selectedAffiliate === affiliate.id && (
                            <div className={cn(
                              "absolute right-0 w-48 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50",
                              dropdownPosition[affiliate.id] === "top"
                                ? "bottom-full mb-1"
                                : "top-full mt-1"
                            )}>
                              <button
                                onClick={() => {
                                  setEditingAffiliate(affiliate.id);
                                  setEditCommission((parseFloat(affiliate.commissionRate) * 100).toString());
                                  setSelectedAffiliate(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 text-gray-700 dark:text-gray-300"
                              >
                                <Percent className="h-4 w-4" />
                                Edit Commission
                              </button>
                              <button
                                onClick={() => updateAffiliateMutation.mutate({
                                  affiliateId: affiliate.id,
                                  data: { isActive: !affiliate.isActive }
                                })}
                                disabled={updateAffiliateMutation.isPending}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 text-gray-700 dark:text-gray-300"
                              >
                                {updateAffiliateMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : affiliate.isActive ? (
                                  <XCircle className="h-4 w-4" />
                                ) : (
                                  <CheckCircle className="h-4 w-4" />
                                )}
                                {affiliate.isActive ? "Deactivate" : "Activate"}
                              </button>
                            </div>
                          )}
                        </>
                      )}
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
