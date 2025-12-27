"use client";

import { Link } from "@/i18n/navigation";
import { usePathname } from "next/navigation";
import { UserPlus, LogIn, ArrowRight } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggleCompact } from "@/components/ui/theme-toggle";

interface AuthNavbarProps {
  className?: string;
}

export function AuthNavbar({ className }: AuthNavbarProps) {
  const pathname = usePathname();

  // Check if current page is login or register
  const isLoginPage = pathname?.includes("/login");
  const isRegisterPage = pathname?.includes("/register");

  return (
    <header
      className={cn(
        "sticky top-0 z-50",
        "bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl",
        "border-b border-gray-200/50 dark:border-gray-800/50",
        className
      )}
    >
      <nav
        className={cn(
          "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8",
          "h-16 flex items-center justify-between"
        )}
        role="navigation"
        aria-label="Auth navigation"
      >
        {/* Left: Logo */}
        <Logo variant="auto" href="/" />

        {/* Right: Theme + Language + Auth Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Toggle */}
          <ThemeToggleCompact />

          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Dynamic Auth Button */}
          {isLoginPage ? (
            // Show Register button on Login page
            <Link
              href="/register"
              className={cn(
                "flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl",
                "text-sm font-medium",
                "text-gray-700 dark:text-gray-200",
                "bg-gray-100 dark:bg-gray-800",
                "hover:bg-gray-200 dark:hover:bg-gray-700",
                "border border-gray-200 dark:border-gray-700",
                "transition-all duration-200"
              )}
            >
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Register</span>
            </Link>
          ) : isRegisterPage ? (
            // Show Login button on Register page
            <Link
              href="/login"
              className={cn(
                "group relative flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl overflow-hidden",
                "text-sm font-semibold text-white",
                "gradient-primary shadow-brand",
                "transition-all duration-300",
                "hover:-translate-y-0.5 active:translate-y-0"
              )}
            >
              {/* Shimmer effect */}
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <span className="relative flex items-center gap-1.5">
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Login</span>
              </span>
            </Link>
          ) : (
            // Default: Show Login button
            <Link
              href="/login"
              className={cn(
                "group relative flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl overflow-hidden",
                "text-sm font-semibold text-white",
                "gradient-primary shadow-brand",
                "transition-all duration-300",
                "hover:-translate-y-0.5 active:translate-y-0"
              )}
            >
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <span className="relative flex items-center gap-1.5">
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Login</span>
              </span>
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
