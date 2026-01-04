"use client";

import { type ReactNode } from "react";
import { useAdminAuth } from "@/providers/AuthProvider";

interface HasPermissionProps {
  /**
   * Single permission or array of permissions to check
   */
  permission: string | string[];
  /**
   * Whether all permissions are required (default) or any single permission is sufficient
   */
  mode?: "all" | "any";
  /**
   * Content to render when user has permission
   */
  children: ReactNode;
  /**
   * Optional fallback to render when user lacks permission
   */
  fallback?: ReactNode;
}

/**
 * Component for permission-based rendering.
 * Only renders children if the user has the required permission(s).
 *
 * @example
 * // Single permission
 * <HasPermission permission="users.delete">
 *   <DeleteButton />
 * </HasPermission>
 *
 * @example
 * // Multiple permissions - all required
 * <HasPermission permission={["users.view", "users.edit"]}>
 *   <EditUserForm />
 * </HasPermission>
 *
 * @example
 * // Multiple permissions - any one sufficient
 * <HasPermission permission={["users.edit", "users.delete"]} mode="any">
 *   <UserActionsMenu />
 * </HasPermission>
 *
 * @example
 * // With fallback
 * <HasPermission permission="settings.edit" fallback={<ReadOnlySettings />}>
 *   <EditableSettings />
 * </HasPermission>
 */
export function HasPermission({
  permission,
  mode = "all",
  children,
  fallback = null,
}: HasPermissionProps) {
  const { hasPermission, isLoading } = useAdminAuth();

  // Don't render anything while loading permissions
  if (isLoading) {
    return null;
  }

  if (hasPermission(permission, mode)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

/**
 * Hook for checking permissions in logic
 *
 * @example
 * const canDelete = useHasPermission("users.delete");
 * const canManageUsers = useHasPermission(["users.edit", "users.delete"], "any");
 */
export function useHasPermission(
  permission: string | string[],
  mode: "all" | "any" = "all"
): boolean {
  const { hasPermission, isLoading } = useAdminAuth();

  if (isLoading) {
    return false;
  }

  return hasPermission(permission, mode);
}

export default HasPermission;
