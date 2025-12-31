import { AdminSkeleton } from "@/components/skeletons/page-skeletons";

export default function AdminLoading() {
  return (
    <div className="flex-1 bg-background py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <AdminSkeleton />
      </div>
    </div>
  );
}
