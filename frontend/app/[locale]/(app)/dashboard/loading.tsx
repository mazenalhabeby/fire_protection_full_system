import { DashboardSkeleton } from "@/components/skeletons/page-skeletons";

export default function DashboardLoading() {
  return (
    <div className="flex-1 min-h-screen bg-gradient-to-b from-gray-50 via-gray-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <DashboardSkeleton />
      </div>
    </div>
  );
}
