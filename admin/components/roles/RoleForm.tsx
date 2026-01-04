"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { adminApi, type Role } from "@/lib/api";
import { Button, Input, cn } from "@/components/ui";
import { PermissionMatrix } from "./PermissionMatrix";
import {
  ArrowLeft,
  Loader2,
  Save,
  ShieldCheck,
  Palette,
} from "lucide-react";

interface RoleFormProps {
  role?: Role;
  onSubmit: (data: {
    name: string;
    slug: string;
    description: string;
    color: string;
    permissionIds: string[];
  }) => Promise<void>;
  isSubmitting: boolean;
}

const PRESET_COLORS = [
  "#7c3aed", // Purple
  "#2563eb", // Blue
  "#059669", // Green
  "#f59e0b", // Amber
  "#dc2626", // Red
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#8b5cf6", // Violet
];

export function RoleForm({ role, onSubmit, isSubmitting }: RoleFormProps) {
  const router = useRouter();
  const [name, setName] = useState(role?.name || "");
  const [slug, setSlug] = useState(role?.slug || "");
  const [description, setDescription] = useState(role?.description || "");
  const [color, setColor] = useState(role?.color || "#7c3aed");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    role?.permissions.map(p => p.code) || []
  );
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(!!role);

  // Fetch all permissions
  const { data: permissionGroups, isLoading: loadingPermissions } = useQuery({
    queryKey: ["admin", "permissions"],
    queryFn: () => adminApi.getPermissions(),
  });

  // Create a map of permission code to id
  const permissionCodeToId = new Map<string, string>();
  permissionGroups?.forEach(group => {
    group.permissions.forEach((p: { code: string; id: string }) => {
      permissionCodeToId.set(p.code, p.id);
    });
  });

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugManuallyEdited && name) {
      const generatedSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      setSlug(generatedSlug);
    }
  }, [name, slugManuallyEdited]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Convert permission codes to IDs
    const permissionIds = selectedPermissions
      .map(code => permissionCodeToId.get(code))
      .filter((id): id is string => !!id);

    await onSubmit({
      name,
      slug,
      description,
      color,
      permissionIds,
    });
  };

  if (loadingPermissions) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/en/roles")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Roles
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !name || !slug}
          className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {role ? "Save Changes" : "Create Role"}
        </Button>
      </div>

      {/* Basic Info */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-purple-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Role Details
          </h2>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Role Name *
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Content Manager"
                className="bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Slug *
              </label>
              <Input
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugManuallyEdited(true);
                }}
                placeholder="e.g., content-manager"
                className="bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Unique identifier for this role
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this role is for..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Role Color
            </label>
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                {PRESET_COLORS.map((presetColor) => (
                  <button
                    key={presetColor}
                    type="button"
                    onClick={() => setColor(presetColor)}
                    className={cn(
                      "w-8 h-8 rounded-lg transition-transform hover:scale-110",
                      color === presetColor && "ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-900"
                    )}
                    style={{ backgroundColor: presetColor }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer"
                />
                <Input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#7c3aed"
                  className="w-28 bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Preview
            </p>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${color}20` }}
              >
                <ShieldCheck
                  className="h-5 w-5"
                  style={{ color }}
                />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {name || "Role Name"}
                </p>
                <p className="text-sm text-gray-500">{slug || "role-slug"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Permissions */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-purple-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Permissions
          </h2>
        </div>

        <div className="p-5">
          {permissionGroups && (
            <PermissionMatrix
              permissionGroups={permissionGroups}
              selectedPermissions={selectedPermissions}
              onChange={setSelectedPermissions}
            />
          )}
        </div>
      </div>
    </form>
  );
}

export default RoleForm;
