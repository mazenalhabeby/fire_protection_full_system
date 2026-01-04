"use client";

import { useMemo } from "react";
import { cn } from "@/components/ui";
import { Check } from "lucide-react";
import type { PermissionGroup, Permission } from "@/lib/api/admin";

interface PermissionMatrixProps {
  permissionGroups: PermissionGroup[];
  selectedPermissions: string[];
  onChange: (permissions: string[]) => void;
  disabled?: boolean;
}

// Module display names
const MODULE_NAMES: Record<string, string> = {
  dashboard: "Dashboard",
  users: "Users",
  affiliates: "Affiliates",
  purchases: "Purchases",
  locks: "Token Locks",
  deposits: "Deposits",
  withdrawals: "Withdrawals",
  settings: "Settings",
  roles: "Roles",
  support: "Support",
  transactions: "Transactions",
};

// Action display names
const ACTION_NAMES: Record<string, string> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  approve: "Approve",
  reject: "Reject",
  process: "Process",
  refund: "Refund",
  assign_role: "Assign Role",
  ban_user: "Ban User",
  unban_user: "Unban User",
  reset_password: "Reset Password",
  adjust_commission: "Adjust Commission",
  payout: "Payout",
  cancel_lock: "Cancel Lock",
  extend_lock: "Extend Lock",
  credit_manual: "Manual Credit",
  assign_ticket: "Assign Ticket",
  close_ticket: "Close Ticket",
};

export function PermissionMatrix({
  permissionGroups,
  selectedPermissions,
  onChange,
  disabled = false,
}: PermissionMatrixProps) {
  // Get all unique actions across all modules
  const allActions = useMemo(() => {
    const actions = new Set<string>();
    permissionGroups.forEach(group => {
      group.permissions.forEach(p => actions.add(p.action));
    });
    return Array.from(actions);
  }, [permissionGroups]);

  // Sort actions with standard ones first
  const sortedActions = useMemo(() => {
    const standardOrder = ["view", "create", "edit", "delete"];
    return [...allActions].sort((a, b) => {
      const aIndex = standardOrder.indexOf(a);
      const bIndex = standardOrder.indexOf(b);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [allActions]);

  // Create a map for quick permission lookup
  const permissionMap = useMemo(() => {
    const map = new Map<string, Permission>();
    permissionGroups.forEach(group => {
      group.permissions.forEach(p => {
        map.set(`${p.module}.${p.action}`, p);
      });
    });
    return map;
  }, [permissionGroups]);

  const togglePermission = (code: string) => {
    if (disabled) return;
    if (selectedPermissions.includes(code)) {
      onChange(selectedPermissions.filter(p => p !== code));
    } else {
      onChange([...selectedPermissions, code]);
    }
  };

  const toggleModule = (module: string) => {
    if (disabled) return;
    const group = permissionGroups.find(g => g.module === module);
    if (!group) return;

    const moduleCodes = group.permissions.map(p => p.code);
    const allSelected = moduleCodes.every(c => selectedPermissions.includes(c));

    if (allSelected) {
      onChange(selectedPermissions.filter(p => !moduleCodes.includes(p)));
    } else {
      const newPermissions = new Set([...selectedPermissions, ...moduleCodes]);
      onChange(Array.from(newPermissions));
    }
  };

  const toggleAction = (action: string) => {
    if (disabled) return;
    const actionCodes: string[] = [];
    permissionGroups.forEach(group => {
      const perm = group.permissions.find(p => p.action === action);
      if (perm) actionCodes.push(perm.code);
    });

    const allSelected = actionCodes.every(c => selectedPermissions.includes(c));

    if (allSelected) {
      onChange(selectedPermissions.filter(p => !actionCodes.includes(p)));
    } else {
      const newPermissions = new Set([...selectedPermissions, ...actionCodes]);
      onChange(Array.from(newPermissions));
    }
  };

  const selectAll = () => {
    if (disabled) return;
    const allCodes = permissionGroups.flatMap(g => g.permissions.map(p => p.code));
    onChange(allCodes);
  };

  const clearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  const isModuleFullySelected = (module: string) => {
    const group = permissionGroups.find(g => g.module === module);
    if (!group) return false;
    return group.permissions.every(p => selectedPermissions.includes(p.code));
  };

  const isModulePartiallySelected = (module: string) => {
    const group = permissionGroups.find(g => g.module === module);
    if (!group) return false;
    const hasAny = group.permissions.some(p => selectedPermissions.includes(p.code));
    const hasAll = group.permissions.every(p => selectedPermissions.includes(p.code));
    return hasAny && !hasAll;
  };

  return (
    <div className="space-y-4">
      {/* Quick actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={selectAll}
          disabled={disabled}
          className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 disabled:opacity-50"
        >
          Select All
        </button>
        <span className="text-gray-300 dark:text-gray-600">|</span>
        <button
          type="button"
          onClick={clearAll}
          disabled={disabled}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50"
        >
          Clear All
        </button>
        <span className="ml-auto text-sm text-gray-500">
          {selectedPermissions.length} of {permissionGroups.reduce((acc, g) => acc + g.permissions.length, 0)} selected
        </span>
      </div>

      {/* Permission matrix table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50">
              <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300 text-sm border-b border-gray-200 dark:border-gray-700">
                Module
              </th>
              {sortedActions.map(action => (
                <th
                  key={action}
                  className="text-center py-3 px-2 font-medium text-gray-700 dark:text-gray-300 text-sm border-b border-gray-200 dark:border-gray-700"
                >
                  <button
                    type="button"
                    onClick={() => toggleAction(action)}
                    disabled={disabled}
                    className="hover:text-purple-600 dark:hover:text-purple-400 disabled:hover:text-current"
                    title={`Toggle all ${ACTION_NAMES[action] || action}`}
                  >
                    {ACTION_NAMES[action] || action}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissionGroups.map(group => (
              <tr
                key={group.module}
                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/30"
              >
                <td className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => toggleModule(group.module)}
                    disabled={disabled}
                    className={cn(
                      "flex items-center gap-2 font-medium text-sm",
                      disabled
                        ? "text-gray-500"
                        : "hover:text-purple-600 dark:hover:text-purple-400"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                      isModuleFullySelected(group.module)
                        ? "bg-purple-500 border-purple-500"
                        : isModulePartiallySelected(group.module)
                        ? "bg-purple-200 dark:bg-purple-800 border-purple-400"
                        : "border-gray-300 dark:border-gray-600"
                    )}>
                      {isModuleFullySelected(group.module) && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                      {isModulePartiallySelected(group.module) && (
                        <div className="w-2 h-2 bg-purple-500 rounded-sm" />
                      )}
                    </div>
                    {MODULE_NAMES[group.module] || group.module}
                  </button>
                </td>
                {sortedActions.map(action => {
                  const permission = permissionMap.get(`${group.module}.${action}`);
                  const isSelected = permission && selectedPermissions.includes(permission.code);

                  return (
                    <td key={action} className="text-center py-3 px-2">
                      {permission ? (
                        <button
                          type="button"
                          onClick={() => togglePermission(permission.code)}
                          disabled={disabled}
                          className={cn(
                            "w-6 h-6 rounded border flex items-center justify-center mx-auto transition-colors",
                            isSelected
                              ? "bg-purple-500 border-purple-500"
                              : "border-gray-300 dark:border-gray-600 hover:border-purple-400",
                            disabled && "opacity-50 cursor-not-allowed"
                          )}
                          title={permission.description || permission.name}
                        >
                          {isSelected && <Check className="h-4 w-4 text-white" />}
                        </button>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-700">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PermissionMatrix;
