"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi, UserWallet } from "@/lib/api";
import Link from "next/link";
import {
  Button,
  Input,
  cn,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  Label,
} from "@/components/ui";
import {
  Wallet,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  User,
  Copy,
  ExternalLink,
  Star,
  Activity,
  Users,
  Loader2,
  MoreVertical,
  Edit,
  Trash2,
  ArrowRightLeft,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { AdminSkeleton } from "@/components/skeletons";
import { HasPermission } from "@/components/auth/HasPermission";

type ModalType = "view" | "edit" | "delete" | "transfer" | null;

export default function AdminWalletsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedWallet, setSelectedWallet] = useState<UserWallet | null>(null);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [dropdownWallet, setDropdownWallet] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ [key: string]: "top" | "bottom" }>({});
  const dropdownButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  // Form state
  const [editForm, setEditForm] = useState({ label: "", isPrimary: false });
  const [transferUserId, setTransferUserId] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");

  // Calculate dropdown position based on available viewport space
  const calculateDropdownPosition = useCallback((walletId: string) => {
    const buttonRef = dropdownButtonRefs.current[walletId];
    if (!buttonRef) return "bottom";

    const buttonRect = buttonRef.getBoundingClientRect();
    const dropdownHeight = 220; // Approximate dropdown height
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;

    if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
      return "top";
    }
    return "bottom";
  }, []);

  const toggleDropdown = useCallback((walletId: string) => {
    if (dropdownWallet === walletId) {
      setDropdownWallet(null);
    } else {
      const position = calculateDropdownPosition(walletId);
      setDropdownPosition(prev => ({ ...prev, [walletId]: position }));
      setDropdownWallet(walletId);
    }
  }, [dropdownWallet, calculateDropdownPosition]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownWallet) {
        const target = event.target as HTMLElement;
        if (!target.closest('[data-dropdown]')) {
          setDropdownWallet(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownWallet]);

  // Fetch wallets
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "wallets", page, search],
    queryFn: () => adminApi.getWallets({ page, limit: 20, search: search || undefined }),
  });

  // Fetch wallet stats
  const { data: stats } = useQuery({
    queryKey: ["admin", "wallets", "stats"],
    queryFn: () => adminApi.getWalletStats(),
  });

  // Fetch wallet details when selected
  const { data: walletDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ["admin", "wallets", selectedWallet?.id],
    queryFn: () => adminApi.getWalletById(selectedWallet!.id),
    enabled: !!selectedWallet && modalType === "view",
  });

  // Search users for transfer
  const { data: usersData } = useQuery({
    queryKey: ["admin", "users", userSearchQuery],
    queryFn: () => adminApi.getUsers({ search: userSearchQuery, limit: 10 }),
    enabled: modalType === "transfer" && userSearchQuery.length >= 2,
  });

  // Mutations
  const updateWalletMutation = useMutation({
    mutationFn: ({ walletId, data }: { walletId: string; data: { label?: string; isPrimary?: boolean } }) =>
      adminApi.updateWallet(walletId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "wallets"] });
      toast.success("Wallet updated successfully");
      closeModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update wallet");
    },
  });

  const deleteWalletMutation = useMutation({
    mutationFn: (walletId: string) => adminApi.deleteWallet(walletId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "wallets"] });
      toast.success("Wallet deleted successfully");
      closeModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete wallet");
    },
  });

  const transferWalletMutation = useMutation({
    mutationFn: ({ walletId, newUserId }: { walletId: string; newUserId: string }) =>
      adminApi.transferWallet(walletId, newUserId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "wallets"] });
      toast.success(`Wallet transferred to ${data.newUser.email || data.newUser.name}`);
      closeModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to transfer wallet");
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const openModal = (type: ModalType, wallet: UserWallet) => {
    setSelectedWallet(wallet);
    setModalType(type);
    setDropdownWallet(null);

    if (type === "edit") {
      setEditForm({
        label: wallet.label || "",
        isPrimary: wallet.isPrimary,
      });
    }

    if (type === "transfer") {
      setTransferUserId("");
      setUserSearchQuery("");
    }
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedWallet(null);
    setEditForm({ label: "", isPrimary: false });
    setTransferUserId("");
    setUserSearchQuery("");
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <AdminSkeleton />
      </div>
    );
  }

  const wallets = data?.wallets || [];
  const pagination = data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 };

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-teal-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalWallets}</p>
                <p className="text-xs text-gray-500">Total Wallets</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Star className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.primaryWallets}</p>
                <p className="text-xs text-gray-500">Primary Wallets</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.uniqueUsers}</p>
                <p className="text-xs text-gray-500">Users with Wallets</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Activity className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.recentlyUsedWallets}</p>
                <p className="text-xs text-gray-500">Active (30 days)</p>
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
            placeholder="Search by wallet address, label, or user email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10 bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
          />
        </div>
      </div>

      {/* Wallets Table */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
          <Wallet className="h-5 w-5 text-teal-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Connected Wallets ({pagination.total})</h2>
        </div>

        <div className="overflow-visible min-h-[200px]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Wallet Address</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">User</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Label</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Verified</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Last Used</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {wallets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    No wallets found
                  </td>
                </tr>
              ) : (
                wallets.map((wallet) => (
                  <tr key={wallet.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono text-gray-700 dark:text-gray-300">
                          {truncateAddress(wallet.walletAddress)}
                        </code>
                        <button
                          onClick={() => copyToClipboard(wallet.walletAddress)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        >
                          <Copy className="h-3.5 w-3.5 text-gray-400" />
                        </button>
                        <a
                          href={`https://bscscan.com/address/${wallet.walletAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                        </a>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {wallet.user ? (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                            <span className="text-xs font-semibold text-blue-600">
                              {(wallet.user.firstName?.[0] || wallet.user.email?.[0] || "?").toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {wallet.user.firstName && wallet.user.lastName
                                ? `${wallet.user.firstName} ${wallet.user.lastName}`
                                : wallet.user.username || "No name"}
                            </p>
                            <p className="text-xs text-gray-500">{wallet.user.email}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">No user</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {wallet.label || "-"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {wallet.isPrimary ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          <Star className="h-3 w-3" />
                          Primary
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-600 dark:text-gray-400">
                          Secondary
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                        {new Date(wallet.verifiedAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {wallet.lastUsedAt ? (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock className="h-4 w-4" />
                          {new Date(wallet.lastUsedAt).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">Never</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="relative" data-dropdown>
                        <button
                          ref={(el) => { dropdownButtonRefs.current[wallet.id] = el; }}
                          onClick={() => toggleDropdown(wallet.id)}
                          className="inline-flex items-center justify-center h-8 w-8 p-0 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {dropdownWallet === wallet.id && (
                          <div className={cn(
                            "absolute right-0 w-48 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50",
                            dropdownPosition[wallet.id] === "top"
                              ? "bottom-full mb-1"
                              : "top-full mt-1"
                          )}>
                            <button
                              onClick={() => openModal("view", wallet)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 text-gray-700 dark:text-gray-300"
                            >
                              <Eye className="h-4 w-4" />
                              View Details
                            </button>

                            <HasPermission permission="users.edit">
                              <button
                                onClick={() => openModal("edit", wallet)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 text-gray-700 dark:text-gray-300"
                              >
                                <Edit className="h-4 w-4" />
                                Edit Wallet
                              </button>
                            </HasPermission>

                            <HasPermission permission="users.edit">
                              <button
                                onClick={() => openModal("transfer", wallet)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 text-gray-700 dark:text-gray-300"
                              >
                                <ArrowRightLeft className="h-4 w-4" />
                                Transfer to User
                              </button>
                            </HasPermission>

                            <div className="my-1 border-t border-gray-100 dark:border-gray-800" />

                            <HasPermission permission="users.delete">
                              <button
                                onClick={() => openModal("delete", wallet)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 text-red-600 dark:text-red-400"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete Wallet
                              </button>
                            </HasPermission>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
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

      {/* Click outside to close dropdown */}
      {dropdownWallet && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setDropdownWallet(null)}
        />
      )}

      {/* View Wallet Details Modal */}
      <Dialog open={modalType === "view"} onOpenChange={() => closeModal()}>
        <DialogContent className="sm:max-w-lg bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Wallet className="h-5 w-5 text-teal-500" />
              Wallet Details
            </DialogTitle>
          </DialogHeader>

          {isLoadingDetails ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
            </div>
          ) : walletDetails ? (
            <div className="space-y-6">
              {/* Wallet Address */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <p className="text-xs text-gray-500 mb-1">Wallet Address</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono text-gray-900 dark:text-white break-all">
                    {walletDetails.walletAddress}
                  </code>
                  <button
                    onClick={() => copyToClipboard(walletDetails.walletAddress)}
                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                  >
                    <Copy className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* User Info */}
              {walletDetails.user && (
                <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {walletDetails.user.firstName && walletDetails.user.lastName
                        ? `${walletDetails.user.firstName} ${walletDetails.user.lastName}`
                        : walletDetails.user.username || "No name"}
                    </p>
                    <p className="text-sm text-gray-500">{walletDetails.user.email}</p>
                  </div>
                  <Link href={`/users?search=${walletDetails.user.email}`}>
                    <Button variant="outline" size="sm">
                      View User
                    </Button>
                  </Link>
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Label:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {walletDetails.label || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Primary:</span>
                  <span className={cn(
                    "ml-2 font-medium",
                    walletDetails.isPrimary ? "text-amber-600" : "text-gray-600"
                  )}>
                    {walletDetails.isPrimary ? "Yes" : "No"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Verified:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {new Date(walletDetails.verifiedAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Last Used:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {walletDetails.lastUsedAt
                      ? new Date(walletDetails.lastUsedAt).toLocaleString()
                      : "Never"}
                  </span>
                </div>
                {walletDetails.linkedIp && (
                  <div>
                    <span className="text-gray-500">Linked IP:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                      {walletDetails.linkedIp}
                    </span>
                  </div>
                )}
                {walletDetails.linkedDevice && (
                  <div>
                    <span className="text-gray-500">Device:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                      {walletDetails.linkedDevice}
                    </span>
                  </div>
                )}
              </div>

              {/* Recent Withdrawals */}
              {walletDetails.recentWithdrawals && walletDetails.recentWithdrawals.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                    Recent Withdrawals
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {walletDetails.recentWithdrawals.map((withdrawal) => (
                      <div key={withdrawal.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-sm">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {parseFloat(withdrawal.amount).toLocaleString()} HBCT
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(withdrawal.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          withdrawal.status === "COMPLETED" && "bg-emerald-500/10 text-emerald-600",
                          withdrawal.status === "PENDING" && "bg-amber-500/10 text-amber-600",
                          withdrawal.status === "FAILED" && "bg-red-500/10 text-red-600"
                        )}>
                          {withdrawal.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Edit Wallet Modal */}
      <Dialog open={modalType === "edit"} onOpenChange={() => closeModal()}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Edit className="h-5 w-5 text-blue-500" />
              Edit Wallet
            </DialogTitle>
            <DialogDescription>
              Update wallet label and primary status
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-gray-700 dark:text-gray-300">Label</Label>
              <Input
                value={editForm.label}
                onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                placeholder="e.g., Main Wallet, Trading Wallet"
                className="mt-1 bg-gray-50 dark:bg-gray-800/50"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPrimary"
                checked={editForm.isPrimary}
                onChange={(e) => setEditForm({ ...editForm, isPrimary: e.target.checked })}
                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <label htmlFor="isPrimary" className="text-sm text-gray-700 dark:text-gray-300">
                Set as primary wallet
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedWallet && updateWalletMutation.mutate({
                walletId: selectedWallet.id,
                data: editForm,
              })}
              disabled={updateWalletMutation.isPending}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {updateWalletMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Wallet Modal */}
      <Dialog open={modalType === "delete"} onOpenChange={() => closeModal()}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Trash2 className="h-5 w-5 text-red-500" />
              Delete Wallet
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. The wallet will be permanently removed.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-medium">
              <AlertTriangle className="h-4 w-4" />
              Warning
            </div>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              You are about to delete wallet: <code className="font-mono">{selectedWallet?.walletAddress && truncateAddress(selectedWallet.walletAddress)}</code>
            </p>
            {selectedWallet?.user && (
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                Owned by: <strong>{selectedWallet.user.email}</strong>
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedWallet && deleteWalletMutation.mutate(selectedWallet.id)}
              disabled={deleteWalletMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteWalletMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete Wallet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Wallet Modal */}
      <Dialog open={modalType === "transfer"} onOpenChange={() => closeModal()}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <ArrowRightLeft className="h-5 w-5 text-blue-500" />
              Transfer Wallet
            </DialogTitle>
            <DialogDescription>
              Transfer this wallet to another user
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs text-gray-500 mb-1">Wallet to Transfer</p>
              <code className="text-sm font-mono text-gray-900 dark:text-white">
                {selectedWallet?.walletAddress && truncateAddress(selectedWallet.walletAddress)}
              </code>
              {selectedWallet?.user && (
                <p className="text-xs text-gray-500 mt-1">
                  Currently owned by: {selectedWallet.user.email}
                </p>
              )}
            </div>

            <div>
              <Label className="text-gray-700 dark:text-gray-300">Search User</Label>
              <Input
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Search by email or name..."
                className="mt-1 bg-gray-50 dark:bg-gray-800/50"
              />
            </div>

            {usersData?.users && usersData.users.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-2">
                {usersData.users
                  .filter(u => u.id !== selectedWallet?.user?.id)
                  .map((user) => (
                    <button
                      key={user.id}
                      onClick={() => setTransferUserId(user.id)}
                      className={cn(
                        "w-full p-3 rounded-lg border text-left transition-colors",
                        transferUserId === user.id
                          ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      )}
                    >
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {user.firstName && user.lastName
                          ? `${user.firstName} ${user.lastName}`
                          : user.username || "No name"}
                      </p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </button>
                  ))}
              </div>
            )}

            {userSearchQuery.length >= 2 && usersData?.users?.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No users found</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedWallet && transferUserId && transferWalletMutation.mutate({
                walletId: selectedWallet.id,
                newUserId: transferUserId,
              })}
              disabled={!transferUserId || transferWalletMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {transferWalletMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ArrowRightLeft className="h-4 w-4 mr-2" />
              )}
              Transfer Wallet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
