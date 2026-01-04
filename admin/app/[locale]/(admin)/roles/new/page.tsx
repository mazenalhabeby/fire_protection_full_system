"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/api";
import { RoleForm } from "@/components/roles";
import { ShieldCheck, Plus } from "lucide-react";
import { toast } from "sonner";

export default function NewRolePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: {
      name: string;
      slug: string;
      description: string;
      color: string;
      permissionIds: string[];
    }) => adminApi.createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
      toast.success("Role created successfully");
      router.push("/en/roles");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create role");
    },
  });

  const handleSubmit = async (data: {
    name: string;
    slug: string;
    description: string;
    color: string;
    permissionIds: string[];
  }) => {
    await createMutation.mutateAsync(data);
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="h-7 w-7 text-purple-500" />
          <Plus className="h-5 w-5 text-gray-400" />
          Create New Role
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Define a new role with custom permissions
        </p>
      </div>

      <RoleForm
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending}
      />
    </div>
  );
}
