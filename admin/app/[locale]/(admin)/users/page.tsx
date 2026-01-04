"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi, AdminUserDetails, Role } from "@/lib/api";
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
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  ShieldCheck,
  Mail,
  Calendar,
  MoreVertical,
  UserCheck,
  UserX,
  Loader2,
  Eye,
  Edit,
  Ban,
  Trash2,
  KeyRound,
  UserCog,
  Wallet,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Globe,
  Smartphone,
  Archive,
} from "lucide-react";
import { toast } from "sonner";
import { AdminSkeleton } from "@/components/skeletons";
import { HasPermission } from "@/components/auth/HasPermission";

type ModalType = "view" | "edit" | "ban" | "delete" | "role" | "revoke" | null;

export default function AdminUsersPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [dropdownUser, setDropdownUser] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ [key: string]: "top" | "bottom" }>({});
  const dropdownButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  // Calculate dropdown position based on available viewport space
  const calculateDropdownPosition = useCallback((userId: string) => {
    const buttonRef = dropdownButtonRefs.current[userId];
    if (!buttonRef) return "bottom";

    const buttonRect = buttonRef.getBoundingClientRect();
    const dropdownHeight = 320; // Approximate dropdown height
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;

    // If there's not enough space below but enough above, open upward
    if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
      return "top";
    }
    // Default to bottom
    return "bottom";
  }, []);

  const toggleDropdown = useCallback((userId: string) => {
    if (dropdownUser === userId) {
      setDropdownUser(null);
    } else {
      const position = calculateDropdownPosition(userId);
      setDropdownPosition(prev => ({ ...prev, [userId]: position }));
      setDropdownUser(userId);
    }
  }, [dropdownUser, calculateDropdownPosition]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownUser) {
        const target = event.target as HTMLElement;
        // Check if click is outside dropdown and button
        if (!target.closest('[data-dropdown]')) {
          setDropdownUser(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownUser]);

  // Modal state
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Form state
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    isEmailVerified: false,
  });
  const [banReason, setBanReason] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  // Delete form state
  const [deleteReason, setDeleteReason] = useState("admin_action");
  const [deleteNotes, setDeleteNotes] = useState("");
  const [forceDelete, setForceDelete] = useState(false);

  // Fetch users
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", page, search, roleFilter],
    queryFn: () => adminApi.getUsers({ page, limit: 20, search: search || undefined, role: roleFilter || undefined }),
  });

  // Fetch user details when viewing
  const { data: userDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ["admin", "users", selectedUserId, "details"],
    queryFn: () => adminApi.getUserById(selectedUserId!),
    enabled: !!selectedUserId && (modalType === "view" || modalType === "edit"),
  });

  // Fetch roles for assignment
  const { data: roles } = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: () => adminApi.getRoles(),
  });

  // Mutations
  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: typeof editForm }) =>
      adminApi.updateUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("User updated successfully");
      closeModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update user");
    },
  });

  const banUserMutation = useMutation({
    mutationFn: ({ userId, isBanned, reason }: { userId: string; isBanned: boolean; reason?: string }) =>
      adminApi.banUser(userId, isBanned, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success(variables.isBanned ? "User banned successfully" : "User unbanned successfully");
      closeModal();
    },
    onError: () => {
      toast.error("Failed to update ban status");
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: ({ userId, options }: { userId: string; options?: { reason?: string; adminNotes?: string; forceDelete?: boolean } }) =>
      adminApi.deleteUser(userId, options),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      const gracePeriodDate = new Date(data.gracePeriodEndsAt).toLocaleDateString();
      toast.success(`User deleted. Can be recovered until ${gracePeriodDate}`);
      closeModal();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete user");
    },
  });

  const assignRoleMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string | null }) =>
      adminApi.assignRbacRole(userId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("Role assigned successfully");
      closeModal();
    },
    onError: () => {
      toast.error("Failed to assign role");
    },
  });

  const revokeSessionsMutation = useMutation({
    mutationFn: (userId: string) => adminApi.revokeUserSessions(userId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success(`Revoked ${data.revokedCount} sessions`);
      closeModal();
    },
    onError: () => {
      toast.error("Failed to revoke sessions");
    },
  });

  const openModal = (type: ModalType, userId: string) => {
    setSelectedUserId(userId);
    setModalType(type);
    setDropdownUser(null);

    // Pre-fill edit form if we have user data
    if (type === "edit") {
      const user = data?.users.find(u => u.id === userId);
      if (user) {
        setEditForm({
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          username: user.username || "",
          email: user.email || "",
          isEmailVerified: user.isEmailVerified || false,
        });
      }
    }

    if (type === "role") {
      const user = data?.users.find(u => u.id === userId);
      setSelectedRoleId(user?.roleId || null);
    }

    if (type === "ban") {
      setBanReason("");
    }
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedUserId(null);
    setBanReason("");
    setSelectedRoleId(null);
    setDeleteReason("admin_action");
    setDeleteNotes("");
    setForceDelete(false);
  };

  const getSelectedUser = () => data?.users.find(u => u.id === selectedUserId);

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
      {/* Filters */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by email, username, or name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-10 bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={roleFilter === "" ? "default" : "outline"}
              size="sm"
              onClick={() => { setRoleFilter(""); setPage(1); }}
              className={cn(roleFilter === "" && "bg-gradient-to-r from-blue-500 to-blue-600")}
            >
              All
            </Button>
            <Button
              variant={roleFilter === "USER" ? "default" : "outline"}
              size="sm"
              onClick={() => { setRoleFilter("USER"); setPage(1); }}
              className={cn(roleFilter === "USER" && "bg-gradient-to-r from-gray-500 to-gray-600")}
            >
              <Users className="h-4 w-4 mr-1" />
              Users
            </Button>
            <Button
              variant={roleFilter === "ADMIN" ? "default" : "outline"}
              size="sm"
              onClick={() => { setRoleFilter("ADMIN"); setPage(1); }}
              className={cn(roleFilter === "ADMIN" && "bg-gradient-to-r from-purple-500 to-purple-600")}
            >
              <ShieldCheck className="h-4 w-4 mr-1" />
              Admins
            </Button>
            <HasPermission permission="users.view">
              <Link href="/en/users/deleted">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800"
                >
                  <Archive className="h-4 w-4 mr-1" />
                  Deleted
                </Button>
              </Link>
            </HasPermission>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Users ({pagination.total})</h2>
        </div>

        <div className="overflow-visible min-h-[200px]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">User</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Email</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Role</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Joined</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className={cn(
                  "border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors",
                  user.isBanned && "bg-red-50/30 dark:bg-red-900/10"
                )}>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center border",
                        user.isBanned
                          ? "bg-red-500/20 border-red-500/30"
                          : "bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-500/30"
                      )}>
                        <span className={cn(
                          "text-sm font-semibold",
                          user.isBanned ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"
                        )}>
                          {(user.firstName?.[0] || user.email?.[0] || "?").toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                          {user.firstName && user.lastName
                            ? `${user.firstName} ${user.lastName}`
                            : user.username || "No name"}
                          {user.isBanned && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-red-500/10 text-red-600 dark:text-red-400">
                              <Ban className="h-3 w-3" />
                              Banned
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">@{user.username || "no-username"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{user.email}</span>
                      {user.isEmailVerified && (
                        <UserCheck className="h-4 w-4 text-emerald-500" />
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-1">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium w-fit",
                        user.role === "ADMIN"
                          ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                          : "bg-gray-500/10 text-gray-600 dark:text-gray-400"
                      )}>
                        {user.role === "ADMIN" ? <ShieldCheck className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                        {user.role}
                      </span>
                      {user.roleName && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium w-fit"
                          style={{
                            backgroundColor: `${user.roleColor || '#6b7280'}20`,
                            color: user.roleColor || '#6b7280'
                          }}
                        >
                          <UserCog className="h-3 w-3" />
                          {user.roleName}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                      user.isEmailVerified
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    )}>
                      {user.isEmailVerified ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                      {user.isEmailVerified ? "Verified" : "Unverified"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="h-4 w-4" />
                      {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="relative" data-dropdown>
                      <Button
                        ref={(el) => { dropdownButtonRefs.current[user.id] = el; }}
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleDropdown(user.id)}
                        className="h-8 w-8 p-0"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                      {dropdownUser === user.id && (
                        <div className={cn(
                          "absolute right-0 w-56 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50",
                          // Open based on calculated position
                          dropdownPosition[user.id] === "top"
                            ? "bottom-full mb-1"
                            : "top-full mt-1"
                        )}>
                          <button
                            onClick={() => openModal("view", user.id)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 text-gray-700 dark:text-gray-300"
                          >
                            <Eye className="h-4 w-4" />
                            View Details
                          </button>

                          <HasPermission permission="users.edit">
                            <button
                              onClick={() => openModal("edit", user.id)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 text-gray-700 dark:text-gray-300"
                            >
                              <Edit className="h-4 w-4" />
                              Edit User
                            </button>
                          </HasPermission>

                          <HasPermission permission="roles.assign">
                            <button
                              onClick={() => openModal("role", user.id)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 text-gray-700 dark:text-gray-300"
                            >
                              <UserCog className="h-4 w-4" />
                              Assign Role
                            </button>
                          </HasPermission>

                          <HasPermission permission="users.edit">
                            <button
                              onClick={() => openModal("revoke", user.id)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 text-gray-700 dark:text-gray-300"
                            >
                              <KeyRound className="h-4 w-4" />
                              Revoke Sessions
                            </button>
                          </HasPermission>

                          <div className="my-1 border-t border-gray-100 dark:border-gray-800" />

                          <HasPermission permission="users.ban">
                            <button
                              onClick={() => openModal("ban", user.id)}
                              className={cn(
                                "w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2",
                                user.isBanned
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-amber-600 dark:text-amber-400"
                              )}
                            >
                              <Ban className="h-4 w-4" />
                              {user.isBanned ? "Unban User" : "Ban User"}
                            </button>
                          </HasPermission>

                          <HasPermission permission="users.delete">
                            <button
                              onClick={() => openModal("delete", user.id)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 text-red-600 dark:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete User
                            </button>
                          </HasPermission>
                        </div>
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

      {/* Click outside to close dropdown */}
      {dropdownUser && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setDropdownUser(null)}
        />
      )}

      {/* View User Details Modal */}
      <Dialog open={modalType === "view"} onOpenChange={() => closeModal()}>
        <DialogContent className="sm:max-w-2xl bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Eye className="h-5 w-5 text-blue-500" />
              User Details
            </DialogTitle>
          </DialogHeader>

          {isLoadingDetails ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : userDetails ? (
            <div className="space-y-6">
              {/* User Info */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center border-2",
                  userDetails.isBanned
                    ? "bg-red-500/20 border-red-500/50"
                    : "bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-500/50"
                )}>
                  <span className={cn(
                    "text-2xl font-bold",
                    userDetails.isBanned ? "text-red-600" : "text-blue-600"
                  )}>
                    {(userDetails.firstName?.[0] || userDetails.email?.[0] || "?").toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    {userDetails.firstName && userDetails.lastName
                      ? `${userDetails.firstName} ${userDetails.lastName}`
                      : userDetails.username || "No name"}
                    {userDetails.isBanned && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-red-500/10 text-red-600">
                        <Ban className="h-3 w-3" />
                        Banned
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-500">@{userDetails.username || "no-username"}</p>
                  <p className="text-sm text-gray-500">{userDetails.email}</p>
                </div>
                <div className="text-right">
                  {userDetails.role && (
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `${userDetails.role.color || '#6b7280'}20`,
                        color: userDetails.role.color || '#6b7280'
                      }}
                    >
                      <UserCog className="h-3 w-3" />
                      {userDetails.role.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Ban Info */}
              {userDetails.isBanned && userDetails.banReason && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-medium mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    Ban Reason
                  </div>
                  <p className="text-sm text-red-700 dark:text-red-300">{userDetails.banReason}</p>
                  {userDetails.bannedAt && (
                    <p className="text-xs text-red-500 mt-1">
                      Banned on {new Date(userDetails.bannedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <Wallet className="h-4 w-4" />
                    Available Balance
                  </div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {parseFloat(userDetails.balance.available).toLocaleString()} HBCT
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <Activity className="h-4 w-4" />
                    Locked Balance
                  </div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {parseFloat(userDetails.balance.locked).toLocaleString()} HBCT
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <Activity className="h-4 w-4" />
                    Total Purchases
                  </div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {userDetails.stats.totalPurchases}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <Users className="h-4 w-4" />
                    Referrals
                  </div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {userDetails.stats.referralCount}
                  </p>
                </div>
              </div>

              {/* Account Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Email Verified:</span>
                  <span className={cn(
                    "ml-2 font-medium",
                    userDetails.isEmailVerified ? "text-emerald-600" : "text-amber-600"
                  )}>
                    {userDetails.isEmailVerified ? "Yes" : "No"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Auth Provider:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {userDetails.authProvider}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Wallet Address:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white font-mono text-xs">
                    {userDetails.walletAddress ? `${userDetails.walletAddress.slice(0, 6)}...${userDetails.walletAddress.slice(-4)}` : "Not connected"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Created:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {new Date(userDetails.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Active Sessions */}
              {userDetails.sessions.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Active Sessions ({userDetails.sessions.length})
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {userDetails.sessions.map((session) => (
                      <div key={session.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-sm">
                        <div className="flex items-center gap-3">
                          <Globe className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-gray-900 dark:text-white">{session.deviceInfo || "Unknown device"}</p>
                            <p className="text-xs text-gray-500">{session.ipAddress || "Unknown IP"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          {new Date(session.lastActiveAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={modalType === "edit"} onOpenChange={() => closeModal()}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Edit className="h-5 w-5 text-blue-500" />
              Edit User
            </DialogTitle>
            <DialogDescription>
              Update user profile information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  First Name
                </label>
                <Input
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  className="bg-gray-50 dark:bg-gray-800/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Last Name
                </label>
                <Input
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  className="bg-gray-50 dark:bg-gray-800/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Username
              </label>
              <Input
                value={editForm.username}
                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                className="bg-gray-50 dark:bg-gray-800/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="bg-gray-50 dark:bg-gray-800/50"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isEmailVerified"
                checked={editForm.isEmailVerified}
                onChange={(e) => setEditForm({ ...editForm, isEmailVerified: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isEmailVerified" className="text-sm text-gray-700 dark:text-gray-300">
                Email Verified
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedUserId && updateUserMutation.mutate({ userId: selectedUserId, data: editForm })}
              disabled={updateUserMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateUserMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban User Modal */}
      <Dialog open={modalType === "ban"} onOpenChange={() => closeModal()}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Ban className={cn("h-5 w-5", getSelectedUser()?.isBanned ? "text-emerald-500" : "text-amber-500")} />
              {getSelectedUser()?.isBanned ? "Unban User" : "Ban User"}
            </DialogTitle>
            <DialogDescription>
              {getSelectedUser()?.isBanned
                ? "This will allow the user to access the platform again."
                : "This will prevent the user from accessing the platform."
              }
            </DialogDescription>
          </DialogHeader>

          {!getSelectedUser()?.isBanned && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ban Reason (optional)
              </label>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Enter the reason for banning this user..."
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const user = getSelectedUser();
                if (selectedUserId && user) {
                  banUserMutation.mutate({
                    userId: selectedUserId,
                    isBanned: !user.isBanned,
                    reason: banReason || undefined
                  });
                }
              }}
              disabled={banUserMutation.isPending}
              className={cn(
                getSelectedUser()?.isBanned
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-amber-600 hover:bg-amber-700"
              )}
            >
              {banUserMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Ban className="h-4 w-4 mr-2" />
              )}
              {getSelectedUser()?.isBanned ? "Unban User" : "Ban User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Modal */}
      <Dialog open={modalType === "delete"} onOpenChange={() => closeModal()}>
        <DialogContent className="sm:max-w-lg bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Trash2 className="h-5 w-5 text-red-500" />
              Delete User
            </DialogTitle>
            <DialogDescription>
              This action will soft-delete the user. Account can be recovered within 30 days. Data is retained for 1 year.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-medium">
                <AlertTriangle className="h-4 w-4" />
                Warning
              </div>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                You are about to delete user: <strong>{getSelectedUser()?.email}</strong>
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-gray-700 dark:text-gray-300">Deletion Reason</Label>
                <select
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="admin_action">Admin Action</option>
                  <option value="user_requested">User Requested</option>
                  <option value="fraud">Fraud</option>
                  <option value="inactive">Inactive Account</option>
                  <option value="compliance">Compliance</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700 dark:text-gray-300">Admin Notes (Optional)</Label>
                <textarea
                  value={deleteNotes}
                  onChange={(e) => setDeleteNotes(e.target.value)}
                  placeholder="Internal notes about this deletion..."
                  className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                <input
                  type="checkbox"
                  id="forceDelete"
                  checked={forceDelete}
                  onChange={(e) => setForceDelete(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <div>
                  <label htmlFor="forceDelete" className="text-sm font-medium text-orange-700 dark:text-orange-400 cursor-pointer">
                    Force Delete
                  </label>
                  <p className="text-xs text-orange-600 dark:text-orange-500">
                    Skip balance and lock checks (for fraud/compliance cases)
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedUserId && deleteUserMutation.mutate({
                userId: selectedUserId,
                options: {
                  reason: deleteReason,
                  adminNotes: deleteNotes || undefined,
                  forceDelete,
                },
              })}
              disabled={deleteUserMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteUserMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Role Modal */}
      <Dialog open={modalType === "role"} onOpenChange={() => closeModal()}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <UserCog className="h-5 w-5 text-blue-500" />
              Assign Role
            </DialogTitle>
            <DialogDescription>
              Select a role to assign to this user
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <button
              onClick={() => setSelectedRoleId(null)}
              className={cn(
                "w-full p-4 rounded-xl border text-left transition-colors",
                selectedRoleId === null
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-gray-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">No Role</p>
                  <p className="text-xs text-gray-500">Remove all RBAC permissions</p>
                </div>
              </div>
            </button>

            {roles?.map((role: Role) => (
              <button
                key={role.id}
                onClick={() => setSelectedRoleId(role.id)}
                className={cn(
                  "w-full p-4 rounded-xl border text-left transition-colors",
                  selectedRoleId === role.id
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: role.color || '#6b7280' }}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{role.name}</p>
                    {role.description && (
                      <p className="text-xs text-gray-500">{role.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    {role.permissions?.length || 0} permissions
                  </span>
                </div>
              </button>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedUserId && assignRoleMutation.mutate({ userId: selectedUserId, roleId: selectedRoleId })}
              disabled={assignRoleMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {assignRoleMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Assign Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Sessions Modal */}
      <Dialog open={modalType === "revoke"} onOpenChange={() => closeModal()}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <KeyRound className="h-5 w-5 text-amber-500" />
              Revoke Sessions
            </DialogTitle>
            <DialogDescription>
              This will log the user out from all devices and require them to sign in again.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium">
              <AlertTriangle className="h-4 w-4" />
              Confirm Action
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              All active sessions for <strong>{getSelectedUser()?.email}</strong> will be terminated.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedUserId && revokeSessionsMutation.mutate(selectedUserId)}
              disabled={revokeSessionsMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {revokeSessionsMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <KeyRound className="h-4 w-4 mr-2" />
              )}
              Revoke All Sessions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
