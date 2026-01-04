"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { AdminSidebar } from "@/components/admin-sidebar";
import { useAdminAuth } from "@/providers/AuthProvider";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  Separator,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui";

function AuthLoadingSkeleton() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-gray-300 dark:border-gray-600 border-t-gray-600 dark:border-t-gray-300 rounded-full animate-spin" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

const getPageKey = (pathname: string): string => {
  switch (pathname) {
    case "":
    case "/":
      return "dashboard";
    case "/users":
      return "users";
    case "/affiliates":
      return "affiliates";
    case "/purchases":
      return "purchases";
    case "/locks":
      return "locks";
    case "/deposits":
      return "deposits";
    case "/withdrawals":
      return "withdrawals";
    case "/settings":
      return "settings";
    default:
      return "dashboard";
  }
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("admin");
  const { user, isLoading, isAdmin } = useAdminAuth();

  const pageKey = getPageKey(pathname);
  const title = t(pageKey);
  const showParent = pageKey !== "dashboard";

  // Redirect to login if not admin
  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      router.push("/login");
    }
  }, [isLoading, user, isAdmin, router]);

  // Show loading while checking auth
  if (isLoading || !user || !isAdmin) {
    return <AuthLoadingSkeleton />;
  }

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border px-4 bg-sidebar">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink asChild>
                  <Link href="/" className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                    Admin
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {showParent && (
                <>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink asChild>
                      <Link href="/" className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                        {t("dashboard")}
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                </>
              )}
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-medium text-gray-900 dark:text-white">{title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
