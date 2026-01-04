"use client";

import { useState, Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi, DeletedUser } from "@/lib/api";
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
} from "@/components/ui";
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Loader2,
  Trash2,
  RefreshCw,
  ArrowLeft,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Mail,
  User,
  Wallet,
  Globe,
  Monitor,
  FileText,
  Lock,
  Coins,
  ArrowDownCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AdminSkeleton } from "@/components/skeletons";
import { HasPermission } from "@/components/auth/HasPermission";

export default function DeletedUsersPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<DeletedUser | null>(null);
  const [showRecoverModal, setShowRecoverModal] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Fetch deleted users
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", "deleted", page, search],
    queryFn: () => adminApi.getDeletedUsers({ page, limit: 20, search: search || undefined }),
  });

  // Recover user mutation
  const recoverMutation = useMutation({
    mutationFn: (userId: string) => adminApi.recoverUser(userId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success(`Account recovered: ${data.email}`);
      setShowRecoverModal(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to recover account");
    },
  });

  const toggleRowExpansion = (userId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDaysRemaining = (dateString: string | null) => {
    if (!dateString) return 0;
    const now = new Date();
    const target = new Date(dateString);
    const diffMs = target.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  };

  const getReasonLabel = (reason: string | null) => {
    const labels: Record<string, string> = {
      user_requested: "User Requested",
      admin_action: "Admin Action",
      fraud: "Fraud",
      inactive: "Inactive",
      compliance: "Compliance",
    };
    return labels[reason || ""] || reason || "Unknown";
  };

  const getReasonColor = (reason: string | null) => {
    const colors: Record<string, string> = {
      user_requested: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      admin_action: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
      fraud: "bg-red-500/10 text-red-600 dark:text-red-400",
      inactive: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
      compliance: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    };
    return colors[reason || ""] || "bg-gray-500/10 text-gray-600 dark:text-gray-400";
  };

  const getRequestedByLabel = (requestedBy: string | null) => {
    if (!requestedBy) return "Unknown";
    if (requestedBy === "user") return "Self-deletion";
    return `Admin: ${requestedBy.slice(0, 8)}...`;
  };

  const formatBalance = (balance: string | undefined | null) => {
    if (!balance) return "0.00";
    const num = parseFloat(balance);
    return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  };

  const truncateWallet = (address: string | null) => {
    if (!address) return "N/A";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <AdminSkeleton />
      </div>
    );
  }

  const users = data?.users || [];
  const pagination = data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 };

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/en/users">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Users
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Trash2 className="h-6 w-6 text-red-500" />
              Deleted Users
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage deleted accounts and recovery options
            </p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div>
            <h3 className="font-medium text-amber-800 dark:text-amber-300">Account Recovery Policy</h3>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
              Deleted accounts can be recovered within <strong>30 days</strong> of deletion.
              After the grace period, recovery is no longer possible.
              Account data is retained for <strong>1 year</strong> for compliance before permanent purge.
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">
              <strong>Tip:</strong> Click on a row to expand and view full deletion details.
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by original email or user ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10 bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
          />
        </div>
      </div>

      {/* Deleted Users Table */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-red-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Deleted Accounts ({pagination.total})</h2>
        </div>

        {users.length === 0 ? (
          <div className="p-12 text-center">
            <Trash2 className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No deleted users</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {search ? "No deleted users match your search." : "There are no deleted user accounts."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm w-8"></th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Original Email</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Deleted At</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Reason</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Recovery</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Retention</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const graceDaysRemaining = getDaysRemaining(user.gracePeriodEndsAt);
                    const retentionDaysRemaining = getDaysRemaining(user.retentionExpiresAt);
                    const isExpanded = expandedRows.has(user.id);
                    const log = user.deletionLog;

                    return (
                      <Fragment key={user.id}>
                        <tr
                          className={cn(
                            "border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer",
                            isExpanded && "bg-gray-50/50 dark:bg-gray-800/30"
                          )}
                          onClick={() => toggleRowExpansion(user.id)}
                        >
                          <td className="py-3 px-4">
                            <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                                <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                                  {(user.originalEmail?.[0] || "?").toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {user.originalEmail || (
                                      <span className="text-gray-400 italic">Legacy (email not preserved)</span>
                                    )}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">ID: {user.id.slice(0, 8)}...</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              {formatDate(user.deletedAt)}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={cn(
                              "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                              getReasonColor(user.deletionReason)
                            )}>
                              {getReasonLabel(user.deletionReason)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {!user.originalEmail ? (
                              <div className="flex items-center gap-2">
                                <XCircle className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-400 italic">
                                  Not available
                                </span>
                              </div>
                            ) : user.canRecover ? (
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-emerald-500" />
                                <div>
                                  <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                                    {graceDaysRemaining} days left
                                  </span>
                                  <p className="text-xs text-gray-500">
                                    Until {formatDate(user.gracePeriodEndsAt)}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <XCircle className="h-4 w-4 text-red-500" />
                                <span className="text-sm text-red-600 dark:text-red-400">
                                  Expired
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {user.retentionExpiresAt ? (
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-gray-400" />
                                <div>
                                  <span className="text-sm text-gray-600 dark:text-gray-300">
                                    {retentionDaysRemaining} days
                                  </span>
                                  <p className="text-xs text-gray-500">
                                    Purge: {formatDate(user.retentionExpiresAt)}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400 italic">Legacy</span>
                            )}
                          </td>
                          <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end">
                              <HasPermission permission="users.edit">
                                {user.canRecover && user.originalEmail ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setShowRecoverModal(true);
                                    }}
                                    className="gap-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                    Recover
                                  </Button>
                                ) : (
                                  <span className="text-sm text-gray-400">
                                    {!user.originalEmail ? "Legacy" : "Expired"}
                                  </span>
                                )}
                              </HasPermission>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Details Row */}
                        {isExpanded && (
                          <tr className="bg-gray-50/80 dark:bg-gray-800/50">
                            <td colSpan={7} className="px-4 py-4">
                              {log ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {/* User Details */}
                                  <div className="space-y-3">
                                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                      <User className="h-4 w-4" />
                                      User Details
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                      {log.originalUsername && (
                                        <div className="flex justify-between">
                                          <span className="text-gray-500">Username:</span>
                                          <span className="text-gray-900 dark:text-white font-medium">
                                            {log.originalUsername}
                                          </span>
                                        </div>
                                      )}
                                      {log.originalWalletAddress && (
                                        <div className="flex justify-between">
                                          <span className="text-gray-500">Wallet:</span>
                                          <span className="text-gray-900 dark:text-white font-mono text-xs">
                                            {truncateWallet(log.originalWalletAddress)}
                                          </span>
                                        </div>
                                      )}
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">Requested By:</span>
                                        <span className="text-gray-900 dark:text-white">
                                          {getRequestedByLabel(user.deletionRequestedBy)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Balance at Deletion */}
                                  <div className="space-y-3">
                                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                      <Coins className="h-4 w-4" />
                                      Balance at Deletion
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">Available:</span>
                                        <span className="text-gray-900 dark:text-white font-medium">
                                          {formatBalance(log.availableBalance)} HBCT
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">Locked:</span>
                                        <span className="text-gray-900 dark:text-white font-medium">
                                          {formatBalance(log.lockedBalance)} HBCT
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-500 flex items-center gap-1">
                                          <Lock className="h-3 w-3" /> Active Locks:
                                        </span>
                                        <span className="text-gray-900 dark:text-white">
                                          {log.activeLocks}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-500 flex items-center gap-1">
                                          <ArrowDownCircle className="h-3 w-3" /> Pending Withdrawals:
                                        </span>
                                        <span className="text-gray-900 dark:text-white">
                                          {log.pendingWithdrawals}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Technical Details */}
                                  <div className="space-y-3">
                                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                      <Monitor className="h-4 w-4" />
                                      Technical Details
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                      {log.ipAddress && (
                                        <div className="flex justify-between">
                                          <span className="text-gray-500 flex items-center gap-1">
                                            <Globe className="h-3 w-3" /> IP:
                                          </span>
                                          <span className="text-gray-900 dark:text-white font-mono text-xs">
                                            {log.ipAddress}
                                          </span>
                                        </div>
                                      )}
                                      {log.userAgent && (
                                        <div>
                                          <span className="text-gray-500">User Agent:</span>
                                          <p className="text-gray-900 dark:text-white text-xs mt-1 break-all line-clamp-2">
                                            {log.userAgent}
                                          </p>
                                        </div>
                                      )}
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">Log Created:</span>
                                        <span className="text-gray-900 dark:text-white text-xs">
                                          {formatDate(log.createdAt)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Admin Notes */}
                                  {log.adminNotes && (
                                    <div className="md:col-span-2 lg:col-span-3 space-y-2">
                                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        Admin Notes
                                      </h4>
                                      <div className="p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                          {log.adminNotes}
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Recovery Info (if recovered) */}
                                  {log.recoveredAt && (
                                    <div className="md:col-span-2 lg:col-span-3">
                                      <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                                        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                                          <CheckCircle className="h-4 w-4" />
                                          <span className="font-medium">Account Recovered</span>
                                        </div>
                                        <p className="text-sm text-emerald-600 dark:text-emerald-500 mt-1">
                                          Recovered on {formatDate(log.recoveredAt)} by {log.recoveredBy || "System"}
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-center py-4">
                                  <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    This is a legacy deleted user. Detailed deletion log is not available.
                                  </p>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page === pagination.totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Recover User Modal */}
      <Dialog open={showRecoverModal} onOpenChange={() => setShowRecoverModal(false)}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <RefreshCw className="h-5 w-5 text-emerald-500" />
              Recover Account
            </DialogTitle>
            <DialogDescription>
              This will restore the user account and allow them to log in again.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle className="h-4 w-4" />
              Account to Recover
            </div>
            <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
              <strong>{selectedUser?.originalEmail}</strong>
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
              The original email will be restored and the user will be able to log in.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecoverModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedUser && recoverMutation.mutate(selectedUser.id)}
              disabled={recoverMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {recoverMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Recover Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
