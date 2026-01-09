"use client";

import { useEffect } from "react";
import { useParams, usePathname } from "next/navigation";
import { AppNavbar } from "@/components/navbar";
import { AppFooter } from "@/components/AppFooter";
import { HelpWidget } from "@/components/help";
import { CompleteProfileModal } from "@/components/auth/CompleteProfileModal";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "@/i18n/navigation";

// Pages that don't require authentication
const PUBLIC_PATHS = [
  "/marketplace",
  "/about-us",
  "/help",
  "/help/contact",
  "/help/ticket",
];

// Full page loading skeleton for protected routes
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

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const locale = params.locale as string;
  const router = useRouter();
  const { user, isLoading, isAuthenticated, sessionExpired } = useAuth();

  // Check if current path is public (doesn't require auth)
  const pathWithoutLocale = pathname.replace(`/${locale}`, "") || "/";
  const isPublicPage = PUBLIC_PATHS.some(
    (publicPath) => pathWithoutLocale === publicPath || pathWithoutLocale.startsWith(`${publicPath}/`)
  );

  // Redirect to login if not authenticated (only for protected pages)
  // Note: sessionExpired modal handles user-friendly redirect, no need to redirect here when expired
  useEffect(() => {
    if (!isPublicPage && !isLoading && !isAuthenticated && !sessionExpired) {
      router.replace("/login");
    }
  }, [isPublicPage, isLoading, isAuthenticated, sessionExpired, router]);

  // Determine if profile completion is needed
  const needsName = user && (!user.firstName || !user.lastName);
  const needsEmailVerification = user && user.email && !user.isEmailVerified;
  const showProfileModal = !isLoading && user && (needsName || needsEmailVerification);

  // Show loading skeleton while:
  // - Checking auth (isLoading)
  // - Not authenticated (during redirect)
  // - Session expired (waiting for modal interaction)
  // Only for protected pages
  const showAuthLoading = !isPublicPage && (isLoading || !isAuthenticated || sessionExpired);

  return (
    <div className="flex flex-col min-h-screen">
      <AppNavbar />
      <main className="flex-1 flex flex-col">
        {showAuthLoading ? <AuthLoadingSkeleton /> : children}
      </main>
      <AppFooter />
      <HelpWidget />
      <CompleteProfileModal isOpen={!!showProfileModal} />
    </div>
  );
}
