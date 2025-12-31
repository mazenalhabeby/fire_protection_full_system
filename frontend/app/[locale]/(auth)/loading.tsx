import { Skeleton } from "@/components/ui/skeleton";

export default function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="w-full max-w-md p-8">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Skeleton className="h-12 w-32" />
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 shadow-lg">
          {/* Title */}
          <div className="text-center mb-8">
            <Skeleton className="h-8 w-40 mx-auto mb-2" />
            <Skeleton className="h-4 w-56 mx-auto" />
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
            <div>
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          </div>

          {/* Button */}
          <Skeleton className="h-12 w-full rounded-xl mt-6" />

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <Skeleton className="h-px flex-1" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-px flex-1" />
          </div>

          {/* Social Buttons */}
          <div className="flex gap-3">
            <Skeleton className="h-12 flex-1 rounded-xl" />
            <Skeleton className="h-12 flex-1 rounded-xl" />
          </div>

          {/* Footer Link */}
          <div className="text-center mt-6">
            <Skeleton className="h-4 w-48 mx-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}
