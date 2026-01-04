"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { adminApi } from "@/lib/api";
import { RoleForm } from "@/components/roles";
import { ShieldCheck, Edit, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function EditRolePage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const roleId = params.id as string;

  const { data: role, isLoading } = useQuery({
    queryKey: ["admin", "role", roleId],
    queryFn: () => adminApi.getRole(roleId),
    enabled: !!roleId,
  });

  const updateMutation = useMutation({
    mutationFn: (data: {
      name: string;
      slug: string;
      description: string;
      color: string;
      permissionIds: string[];
    }) => adminApi.updateRole(roleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "role", roleId] });
      toast.success("Role updated successfully");
      router.push("/en/roles");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update role");
    },
  });

  const handleSubmit = async (data: {
    name: string;
    slug: string;
    description: string;
    color: string;
    permissionIds: string[];
  }) => {
    await updateMutation.mutateAsync(data);
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!role) {
    return (
      <div className="flex-1 p-6">
        <div className="text-center py-12">
          <ShieldCheck className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Role not found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            The role you&apos;re looking for doesn&apos;t exist or has been deleted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="h-7 w-7 text-purple-500" />
          <Edit className="h-5 w-5 text-gray-400" />
          Edit Role
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Modify role settings and permissions for &quot;{role.name}&quot;
        </p>
      </div>

      <RoleForm
        role={role}
        onSubmit={handleSubmit}
        isSubmitting={updateMutation.isPending}
      />
    </div>
  );
}
