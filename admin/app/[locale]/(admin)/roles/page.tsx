"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { adminApi, type Role } from "@/lib/api";
import { Button, Input, cn, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui";
import {
  ShieldCheck,
  Search,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Users,
  Lock,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AdminSkeleton } from "@/components/skeletons";
import { HasPermission } from "@/components/auth";

export default function RolesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ [key: string]: "top" | "bottom" }>({});
  const dropdownButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  // Calculate dropdown position based on available viewport space
  const calculateDropdownPosition = useCallback((roleId: string) => {
    const buttonRef = dropdownButtonRefs.current[roleId];
    if (!buttonRef) return "bottom";

    const buttonRect = buttonRef.getBoundingClientRect();
    const dropdownHeight = 200;
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;

    if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
      return "top";
    }
    return "bottom";
  }, []);

  const toggleDropdown = useCallback((roleId: string) => {
    if (selectedRole === roleId) {
      setSelectedRole(null);
    } else {
      const position = calculateDropdownPosition(roleId);
      setDropdownPosition(prev => ({ ...prev, [roleId]: position }));
      setSelectedRole(roleId);
    }
  }, [selectedRole, calculateDropdownPosition]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectedRole) {
        const target = event.target as HTMLElement;
        if (!target.closest('[data-dropdown]')) {
          setSelectedRole(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedRole]);

  const { data: roles, isLoading } = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: () => adminApi.getRoles(),
  });

  const deleteMutation = useMutation({
    mutationFn: (roleId: string) => adminApi.deleteRole(roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
      toast.success("Role deleted successfully");
      setDeleteModalOpen(false);
      setRoleToDelete(null);
    },
    onError: () => {
      toast.error("Failed to delete role");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ roleId, isActive }: { roleId: string; isActive: boolean }) =>
      adminApi.updateRole(roleId, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
      toast.success("Role status updated");
      setSelectedRole(null);
    },
    onError: () => {
      toast.error("Failed to update role status");
    },
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <AdminSkeleton />
      </div>
    );
  }

  const filteredRoles = roles?.filter(role =>
    role.name.toLowerCase().includes(search.toLowerCase()) ||
    role.slug.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleDelete = (role: Role) => {
    setRoleToDelete(role);
    setDeleteModalOpen(true);
    setSelectedRole(null);
  };

  const confirmDelete = () => {
    if (roleToDelete) {
      deleteMutation.mutate(roleToDelete.id);
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-purple-500" />
            Roles & Permissions
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage user roles and their permissions
          </p>
        </div>
        <HasPermission permission="roles.create">
          <Button
            onClick={() => router.push("/en/roles/new")}
            className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Role
          </Button>
        </HasPermission>
      </div>

      {/* Search */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search roles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
          />
        </div>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredRoles.map((role) => (
          <div
            key={role.id}
            className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
          >
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${role.color}20` }}
                  >
                    <ShieldCheck
                      className="h-6 w-6"
                      style={{ color: role.color || "#7c3aed" }}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      {role.name}
                      {role.isSystem && (
                        <span title="System role">
                          <Lock className="h-3.5 w-3.5 text-gray-400" />
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {role.slug}
                    </p>
                  </div>
                </div>
                <div className="relative" data-dropdown>
                  <Button
                    ref={(el) => { dropdownButtonRefs.current[role.id] = el; }}
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleDropdown(role.id)}
                    className="h-8 w-8 p-0"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                  {selectedRole === role.id && (
                    <div className={cn(
                      "absolute right-0 w-48 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50",
                      dropdownPosition[role.id] === "top"
                        ? "bottom-full mb-1"
                        : "top-full mt-1"
                    )}>
                      <HasPermission permission="roles.edit">
                        <button
                          onClick={() => {
                            router.push(`/en/roles/${role.id}`);
                            setSelectedRole(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 text-gray-700 dark:text-gray-300"
                        >
                          <Edit className="h-4 w-4" />
                          Edit Role
                        </button>
                      </HasPermission>
                      <HasPermission permission="roles.edit">
                        <button
                          onClick={() => toggleActiveMutation.mutate({
                            roleId: role.id,
                            isActive: !role.isActive
                          })}
                          disabled={toggleActiveMutation.isPending}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 text-gray-700 dark:text-gray-300"
                        >
                          {toggleActiveMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : role.isActive ? (
                            <XCircle className="h-4 w-4" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          {role.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </HasPermission>
                      <HasPermission permission="roles.delete">
                        {!role.isSystem && (
                          <button
                            onClick={() => handleDelete(role)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-red-600 dark:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete Role
                          </button>
                        )}
                      </HasPermission>
                    </div>
                  )}
                </div>
              </div>

              {role.description && (
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {role.description}
                </p>
              )}

              <div className="mt-4 flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Users className="h-4 w-4" />
                  <span>{role._count?.users || 0} users</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <ShieldCheck className="h-4 w-4" />
                  <span>{role.permissions.length} permissions</span>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <span className={cn(
                  "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                  role.isActive
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-gray-500/10 text-gray-600 dark:text-gray-400"
                )}>
                  {role.isActive ? "Active" : "Inactive"}
                </span>
                {role.isSystem && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    System Role
                  </span>
                )}
              </div>
            </div>

            {/* Permission preview */}
            <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Permissions:</p>
              <div className="flex flex-wrap gap-1">
                {role.permissions.slice(0, 5).map((permission) => (
                  <span
                    key={permission.id}
                    className="inline-flex px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs"
                  >
                    {permission.code}
                  </span>
                ))}
                {role.permissions.length > 5 && (
                  <span className="inline-flex px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded text-xs">
                    +{role.permissions.length - 5} more
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredRoles.length === 0 && (
        <div className="text-center py-12">
          <ShieldCheck className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No roles found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {search ? "Try a different search term" : "Create your first role to get started"}
          </p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the role &quot;{roleToDelete?.name}&quot;? This action cannot be undone.
              {roleToDelete && (roleToDelete._count?.users || 0) > 0 && (
                <span className="block mt-2 text-amber-600 dark:text-amber-400">
                  Warning: {roleToDelete._count?.users} users are assigned to this role. They will lose their permissions.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteModalOpen(false);
                setRoleToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
