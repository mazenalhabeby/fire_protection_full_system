"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Link } from "@/i18n/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { Menu, X, User, LogOut, ChevronDown, ChevronLeft, UserPlus, ArrowRight, Sun, Moon, Monitor, Globe, Check, Settings, HelpCircle, Users, Wallet, Link2, Bell, Shield } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { cn, capitalize, formatName, formatTokenBalance } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggleCompact } from "@/components/ui/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "next-themes";
import { type Locale } from "@/i18n/request";
import { NotificationDropdown } from "./NotificationDropdown";
import { WalletButton, CombinedWalletMobile } from "@/components/wallet";
import { useWalletBalances } from "@/hooks/useWalletData";
import { useInitialHints } from "@/providers/InitialHintsProvider";

const languages = [
  { code: "en" as Locale, name: "English", flag: "🇺🇸", short: "EN" },
  { code: "de" as Locale, name: "Deutsch", flag: "🇩🇪", short: "DE" },
  { code: "fr" as Locale, name: "Français", flag: "🇫🇷", short: "FR" },
];

interface NavItem {
  href: string;
  label: string;
  protected?: boolean;
  adminOnly?: boolean;
  comingSoon?: boolean;
}


interface AppNavbarProps {
  className?: string;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", protected: true },
  { href: "/buy-tokens", label: "Buy Tokens", protected: true },
  { href: "/locking", label: "Locking", protected: true },
  { href: "/marketplace", label: "Marketplace", protected: true, comingSoon: true },
];

// Navbar skeleton shown during auth loading
function NavbarSkeleton() {
  return (
    <div className="flex items-center gap-2">
      {/* Skeleton for wallet/action bar - matches Premium Action Bar */}
      <div className="hidden md:flex items-center gap-1 p-1 rounded-2xl bg-gray-100/80 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50">
        <div className="h-10 w-32 rounded-xl bg-gray-200/60 dark:bg-gray-700/60 animate-pulse" />
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
        <div className="h-10 w-24 rounded-xl bg-gray-200/60 dark:bg-gray-700/60 animate-pulse" />
      </div>

      {/* Skeleton for notification */}
      <div className="hidden md:block ml-2">
        <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200/50 dark:border-gray-700/50 animate-pulse" />
      </div>

      {/* Separator */}
      <div className="hidden md:block w-px h-8 bg-gray-200 dark:bg-gray-700 mx-3" />

      {/* Skeleton for user menu - matches User Menu button */}
      <div className="hidden md:flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-2xl bg-gray-100/80 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50">
        <div className="w-8 h-8 rounded-xl bg-gray-300 dark:bg-gray-600 animate-pulse" />
        <div className="flex flex-col gap-1">
          <div className="h-3 w-14 rounded bg-gray-300 dark:bg-gray-600 animate-pulse" />
          <div className="h-2 w-10 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </div>
      </div>

      {/* Mobile skeleton */}
      <div className="md:hidden flex items-center gap-2">
        <div className="h-9 w-20 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200/50 dark:border-gray-700/50 animate-pulse" />
        <div className="h-9 w-9 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200/50 dark:border-gray-700/50 animate-pulse" />
      </div>
    </div>
  );
}

export function AppNavbar({ className }: AppNavbarProps) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { hasSessionHint } = useInitialHints();

  // Show skeleton while loading OR if we have session hint but auth not verified yet
  // This prevents flash of unauthenticated UI when user is actually logged in
  const showSkeleton = isLoading || (hasSessionHint && !isAuthenticated);
  const { theme, setTheme } = useTheme();
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dropdownView, setDropdownView] = useState<'main' | 'language'>('main');
  const [mobileMenuView, setMobileMenuView] = useState<'main' | 'language'>('main');
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Get HBCT balance
  const { data: balancesData } = useWalletBalances();
  const hbctBalance = balancesData?.balances?.find(b => b.currency === "HBCT");
  const rawBalance = hbctBalance?.availableBalance || "0";

  // Format balance using shared utility (handles T, B, M, K)
  const formattedBalance = formatTokenBalance(rawBalance);
  const displayBalance = parseFloat(rawBalance) > 0 ? `+${formattedBalance}` : "0";

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isUserMenuOpen]);

  // Reset dropdown view when menu closes
  useEffect(() => {
    if (!isUserMenuOpen) {
      setTimeout(() => setDropdownView('main'), 200);
    }
  }, [isUserMenuOpen]);

  // Reset mobile menu view when menu closes
  useEffect(() => {
    if (!isMobileMenuOpen) {
      setTimeout(() => setMobileMenuView('main'), 200);
    }
  }, [isMobileMenuOpen]);

  const openMobileMenu = useCallback(() => setIsMobileMenuOpen(true), []);
  const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);

  const handleLanguageChange = (newLocale: Locale) => {
    router.replace(pathname, { locale: newLocale });
  };

  // Check if a link is active
  const isActiveLink = (href: string) => {
    return pathname === href || pathname?.startsWith(href + "/");
  };

  // Close menu when screen resizes to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && isMobileMenuOpen) {
        closeMobileMenu();
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isMobileMenuOpen, closeMobileMenu]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  // Filter nav items based on auth state
  const visibleNavItems = navItems.filter((item) => {
    if (item.protected && !isAuthenticated) return false;
    if (item.adminOnly && user?.role !== "ADMIN") return false;
    return true;
  });

  return (
    <>
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
          aria-label="Main navigation"
        >
          {/* Left: Logo - links to dashboard if logged in, home if not */}
          <div className="flex items-center gap-8">
            <Logo
              variant="auto"
              href={isAuthenticated ? "/dashboard" : "/"}
            />

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-1">
              {visibleNavItems.map((item) => (
                item.comingSoon ? (
                  <div
                    key={item.href}
                    className={cn(
                      "relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg",
                      "text-gray-400 dark:text-gray-500 cursor-not-allowed"
                    )}
                  >
                    {item.label}
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                      Soon
                    </span>
                  </div>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative px-3 py-2 text-sm font-medium rounded-lg",
                      "transition-all duration-200",
                      isActiveLink(item.href)
                        ? [
                            "text-brand-600 dark:text-brand-400",
                            "bg-brand-50 dark:bg-brand-500/10",
                          ]
                        : [
                            "text-gray-600 hover:text-gray-900",
                            "dark:text-gray-300 dark:hover:text-white",
                            "hover:bg-gray-100 dark:hover:bg-gray-800",
                          ]
                    )}
                  >
                    {item.label}
                    {/* Active indicator */}
                    {isActiveLink(item.href) && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-500" />
                    )}
                  </Link>
                )
              ))}
            </div>
          </div>

          {/* Right: Theme + Language + Auth */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle & Language - Only show when NOT authenticated (they're in user dropdown when logged in) */}
            {!showSkeleton && !isAuthenticated && (
              <>
                <div className="hidden md:block">
                  <ThemeToggleCompact />
                </div>
                <div className="hidden md:block">
                  <LanguageSwitcher />
                </div>
              </>
            )}

            {/* Show skeleton while loading auth state or verifying session hint */}
            {showSkeleton ? (
              <NavbarSkeleton />
            ) : isAuthenticated ? (
              <>
                {/* Mobile Combined Wallet Toggle */}
                <div className="flex md:hidden">
                  <CombinedWalletMobile offChainBalance={displayBalance} />
                </div>

                {/* Premium Action Bar - Desktop */}
                <div className="hidden md:flex items-center">
                  {/* Unified Premium Container */}
                  <div className="flex items-center gap-1 p-1 rounded-2xl bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">

                    {/* Off-chain Wallet Button - Links to Wallet Dashboard */}
                    <Link
                      href="/wallet"
                      className={cn(
                        "group flex items-center gap-2 px-3 py-2 rounded-xl",
                        "text-sm font-medium",
                        "text-gray-600 hover:text-gray-900",
                        "dark:text-gray-300 dark:hover:text-white",
                        "hover:bg-white dark:hover:bg-gray-700",
                        "transition-all duration-200",
                        isActiveLink("/wallet") && "bg-white dark:bg-gray-700"
                      )}
                    >
                      <Wallet className="h-4 w-4" />
                      <div className="flex flex-col items-start leading-none">
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">My Wallet</span>
                        <span className="font-semibold">{displayBalance} <span className="text-[10px] font-normal text-gray-500 dark:text-gray-400">HBCT</span></span>
                      </div>
                    </Link>

                    {/* Separator */}
                    <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

                    {/* On-chain WalletConnect Button */}
                    <WalletButton />
                  </div>

                  {/* Notification Dropdown */}
                  <NotificationDropdown className="ml-2" />

                  {/* Separator between notifications and user */}
                  <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-3" />

                  {/* User Menu */}
                  <div className="relative" ref={userMenuRef}>
                    <button
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                      className={cn(
                        "group flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-2xl",
                        "bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm",
                        "border border-gray-200/50 dark:border-gray-700/50",
                        "hover:bg-white dark:hover:bg-gray-700",
                        "hover:border-gray-300 dark:hover:border-gray-600",
                        "hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-black/20",
                        "transition-all duration-200"
                      )}
                    >
                      {/* Avatar with status */}
                      <div className="relative">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white text-sm font-bold shadow-md shadow-brand-500/30">
                          {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
                        </div>
                        {/* Online status */}
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-800" />
                      </div>

                      {/* User info */}
                      <div className="flex flex-col items-start leading-none">
                        <span className="text-xs font-semibold text-gray-900 dark:text-white max-w-[80px] truncate">
                          {capitalize(user?.firstName) || user?.email?.split("@")[0]}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">View Profile</span>
                      </div>

                      {/* Chevron */}
                      <ChevronDown className={cn(
                        "h-4 w-4 text-gray-400 transition-transform duration-200",
                        isUserMenuOpen && "rotate-180"
                      )} />
                    </button>

                {/* Facebook-style Dropdown with Sliding Panels */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                    {/* Sliding Container */}
                    <div className="relative">
                      {/* Main Menu Panel */}
                      <div
                        className={cn(
                          "transition-all duration-300 ease-out",
                          dropdownView === 'main'
                            ? "translate-x-0 opacity-100"
                            : "-translate-x-full opacity-0 absolute inset-0 pointer-events-none"
                        )}
                      >
                        {/* Profile Section */}
                        <div className="px-2 py-2">
                          <Link
                            href="/dashboard"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                          >
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white text-lg font-semibold shadow-lg">
                              {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[15px] font-semibold text-gray-900 dark:text-white truncate">
                                {formatName(user?.firstName, user?.lastName)}
                              </p>
                              <p className="text-[13px] text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                            </div>
                          </Link>
                        </div>

                        {/* Divider */}
                        <div className="mx-4 border-t border-gray-200 dark:border-gray-700" />

                        {/* Menu Items */}
                        <div className="px-2 py-2 space-y-1">
                          {/* Wallet Button */}
                          <Link
                            href="/wallet"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors group"
                          >
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:shadow-lg group-hover:shadow-emerald-500/30 transition-all">
                              <Wallet className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <span className="text-[15px] font-medium text-gray-800 dark:text-gray-100">My Wallet</span>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400">Send, receive & manage tokens</p>
                            </div>
                          </Link>

                          {/* Affiliates Button */}
                          <Link
                            href="/affiliates"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors group"
                          >
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-md shadow-purple-500/20 group-hover:shadow-lg group-hover:shadow-purple-500/30 transition-all">
                              <Users className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <span className="text-[15px] font-medium text-gray-800 dark:text-gray-100">Affiliates</span>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400">Earn commissions on referrals</p>
                            </div>
                          </Link>

                          {/* Admin Button - For admins or users with RBAC roles */}
                          {(user?.role === "ADMIN" || user?.roleId) && (
                            <a
                              href={process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3002"}
                              onClick={() => setIsUserMenuOpen(false)}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors group"
                            >
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-md shadow-red-500/20 group-hover:shadow-lg group-hover:shadow-red-500/30 transition-all">
                                <Shield className="h-5 w-5 text-white" />
                              </div>
                              <div className="flex-1">
                                <span className="text-[15px] font-medium text-gray-800 dark:text-gray-100">Admin Panel</span>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400">Manage system settings</p>
                              </div>
                            </a>
                          )}
                        </div>

                        {/* Divider */}
                        <div className="mx-4 border-t border-gray-200 dark:border-gray-700" />

                        {/* Theme Toggle */}
                        <div className="px-2 py-2">
                          <div className="px-3 py-2">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center">
                                {mounted && theme === 'dark' ? (
                                  <Moon className="h-4 w-4 text-white" />
                                ) : mounted && theme === 'light' ? (
                                  <Sun className="h-4 w-4 text-white" />
                                ) : (
                                  <Monitor className="h-4 w-4 text-white" />
                                )}
                              </div>
                              <div>
                                <p className="text-[13px] font-medium text-gray-800 dark:text-gray-100">Appearance</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 dark:bg-gray-700/50 rounded-xl">
                              <button
                                onClick={() => setTheme('light')}
                                className={cn(
                                  "flex flex-col items-center gap-1 py-2 px-2 rounded-lg transition-all duration-200",
                                  mounted && theme === 'light'
                                    ? "bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                )}
                              >
                                <Sun className="h-4 w-4" />
                                <span className="text-[11px] font-medium">Light</span>
                              </button>
                              <button
                                onClick={() => setTheme('dark')}
                                className={cn(
                                  "flex flex-col items-center gap-1 py-2 px-2 rounded-lg transition-all duration-200",
                                  mounted && theme === 'dark'
                                    ? "bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                )}
                              >
                                <Moon className="h-4 w-4" />
                                <span className="text-[11px] font-medium">Dark</span>
                              </button>
                              <button
                                onClick={() => setTheme('system')}
                                className={cn(
                                  "flex flex-col items-center gap-1 py-2 px-2 rounded-lg transition-all duration-200",
                                  mounted && theme === 'system'
                                    ? "bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                )}
                              >
                                <Monitor className="h-4 w-4" />
                                <span className="text-[11px] font-medium">Auto</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="mx-4 border-t border-gray-200 dark:border-gray-700" />

                        {/* Language Button - Opens submenu */}
                        <div className="px-2 py-2">
                          <button
                            onClick={() => setDropdownView('language')}
                            className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                                <Globe className="h-5 w-5 text-white" />
                              </div>
                              <div className="text-left">
                                <span className="text-[15px] font-medium text-gray-800 dark:text-gray-100 block">Language</span>
                                <span className="text-[12px] text-gray-500 dark:text-gray-400">
                                  {languages.find(l => l.code === locale)?.name || 'English'}
                                </span>
                              </div>
                            </div>
                            <ChevronDown className="h-4 w-4 text-gray-400 -rotate-90" />
                          </button>
                        </div>

                        {/* Divider */}
                        <div className="mx-4 border-t border-gray-200 dark:border-gray-700" />

                        {/* Settings & Help */}
                        <div className="px-2 py-2">
                          <Link
                            href="/settings"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center group-hover:bg-gray-200 dark:group-hover:bg-gray-600 transition-colors">
                                <Settings className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                              </div>
                              <span className="text-[15px] font-medium text-gray-800 dark:text-gray-100">Settings</span>
                            </div>
                            <ChevronDown className="h-4 w-4 text-gray-400 -rotate-90" />
                          </Link>

                          <Link
                            href="/help"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center group-hover:bg-gray-200 dark:group-hover:bg-gray-600 transition-colors">
                                <HelpCircle className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                              </div>
                              <span className="text-[15px] font-medium text-gray-800 dark:text-gray-100">Help & Support</span>
                            </div>
                            <ChevronDown className="h-4 w-4 text-gray-400 -rotate-90" />
                          </Link>
                        </div>

                        {/* Divider */}
                        <div className="mx-4 border-t border-gray-200 dark:border-gray-700" />

                        {/* Logout */}
                        <div className="px-2 py-2">
                          <button
                            onClick={() => {
                              logout();
                              setIsUserMenuOpen(false);
                            }}
                            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group"
                          >
                            <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center group-hover:bg-red-200 dark:group-hover:bg-red-900/50 transition-colors">
                              <LogOut className="h-5 w-5 text-red-600 dark:text-red-400" />
                            </div>
                            <span className="text-[15px] font-medium text-red-600 dark:text-red-400">Log Out</span>
                          </button>
                        </div>
                      </div>

                      {/* Language Submenu Panel */}
                      <div
                        className={cn(
                          "transition-all duration-300 ease-out",
                          dropdownView === 'language'
                            ? "translate-x-0 opacity-100"
                            : "translate-x-full opacity-0 absolute inset-0 pointer-events-none"
                        )}
                      >
                        {/* Header with Back Button */}
                        <div className="px-2 py-2 border-b border-gray-200 dark:border-gray-700">
                          <button
                            onClick={() => setDropdownView('main')}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors w-full"
                          >
                            <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                              <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                            </div>
                            <span className="text-[17px] font-semibold text-gray-900 dark:text-white">Language</span>
                          </button>
                        </div>

                        {/* Language List */}
                        <div className="px-2 py-2 max-h-80 overflow-y-auto">
                          {languages.map((lang) => (
                            <button
                              key={lang.code}
                              onClick={() => {
                                handleLanguageChange(lang.code);
                                setDropdownView('main');
                              }}
                              className={cn(
                                "w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 mb-1",
                                locale === lang.code
                                  ? "bg-emerald-50 dark:bg-emerald-900/20"
                                  : "hover:bg-gray-100 dark:hover:bg-gray-700/50"
                              )}
                            >
                              <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center text-xl",
                                locale === lang.code
                                  ? "bg-gradient-to-br from-emerald-500/20 to-teal-600/20"
                                  : "bg-gray-100 dark:bg-gray-700"
                              )}>
                                {lang.flag}
                              </div>
                              <div className="flex-1 text-left">
                                <span className={cn(
                                  "text-[15px] font-medium block",
                                  locale === lang.code
                                    ? "text-emerald-700 dark:text-emerald-400"
                                    : "text-gray-800 dark:text-gray-100"
                                )}>
                                  {lang.name}
                                </span>
                                <span className="text-[12px] text-gray-500 dark:text-gray-400">{lang.short}</span>
                              </div>
                              {locale === lang.code && (
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                                  <Check className="h-3.5 w-3.5 text-white" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                  </div>
                )}
                  </div>
                </div>
              </>
            ) : (
              /* Auth Buttons */
              <div className="flex items-center gap-2">
                {/* Register Button */}
                <Link
                  href="/register"
                  className={cn(
                    "hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl",
                    "text-sm font-medium",
                    "text-gray-700 dark:text-gray-200",
                    "bg-gray-100 dark:bg-gray-800",
                    "hover:bg-gray-200 dark:hover:bg-gray-700",
                    "border border-gray-200 dark:border-gray-700",
                    "transition-all duration-200"
                  )}
                >
                  <UserPlus className="h-4 w-4" />
                  Register
                </Link>

                {/* Premium Login Button */}
                <Link
                  href="/login"
                  className={cn(
                    "group relative flex items-center gap-1.5 px-4 py-2 rounded-xl overflow-hidden",
                    "text-sm font-semibold text-white",
                    "gradient-primary shadow-brand",
                    "transition-all duration-300",
                    "hover:-translate-y-0.5 active:translate-y-0"
                  )}
                >
                  {/* Shimmer effect */}
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                  <span className="relative flex items-center gap-1.5">
                    Login
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </div>
            )}

            {/* Mobile Notification Bell - Before Burger Menu */}
            {!showSkeleton && isAuthenticated && (
              <div className="md:hidden">
                <NotificationDropdown />
              </div>
            )}

            {/* Mobile Menu Button - Hide during loading */}
            {!showSkeleton && (
              <button
                onClick={openMobileMenu}
                className={cn(
                  "md:hidden p-2 rounded-lg ml-1",
                  "text-gray-600 hover:text-gray-900",
                  "dark:text-gray-300 dark:hover:text-white",
                  "hover:bg-gray-100 dark:hover:bg-gray-800",
                  "transition-colors duration-200"
                )}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
          </div>
        </nav>

      </header>

      {/* Mobile Menu - Slide-in Panel */}
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm",
          "transition-opacity duration-300",
          isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={closeMobileMenu}
      />

      {/* Slide-in Panel */}
      <div
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-[min(85vw,320px)]",
          "transition-transform duration-300 ease-out",
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div
          className={cn(
            "h-full flex flex-col relative overflow-hidden",
            "bg-gray-900/95 backdrop-blur-xl",
            "border-l border-white/10"
          )}
        >
          {/* Main View */}
          <div
            className={cn(
              "h-full flex flex-col transition-transform duration-300 ease-out",
              mobileMenuView === 'main'
                ? "translate-x-0"
                : "-translate-x-full"
            )}
          >
          {/* Header with welcome message */}
          <div className="flex items-start justify-between px-5 py-5 border-b border-white/10">
            <div className="flex-1 pr-4">
              {isAuthenticated ? (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold">
                      {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div>
                      <p className="text-white font-semibold">
                        {capitalize(user?.firstName) || "User"}
                      </p>
                      <p className="text-white/50 text-xs truncate max-w-[150px]">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                    <p className="text-brand-400 text-xs font-medium uppercase tracking-wider">Welcome to HBCT</p>
                  </div>
                  <h2 className="text-white font-bold text-lg mb-1">Fire Protection</h2>
                  <p className="text-white/50 text-xs leading-relaxed">
                    Revolutionary blockchain technology for fire safety
                  </p>
                </>
              )}
            </div>
            <button
              onClick={closeMobileMenu}
              className={cn(
                "p-2 rounded-full shrink-0",
                "text-white/70 hover:text-white",
                "bg-white/10 hover:bg-white/20",
                "transition-colors duration-200"
              )}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation links */}
          <nav className="flex-1 overflow-y-auto px-4 py-6">
            <ul className="space-y-1">
              {visibleNavItems.map((item) => (
                <li key={item.href}>
                  {item.comingSoon ? (
                    <div
                      className={cn(
                        "relative flex items-center gap-3 w-full text-base py-3 px-4 rounded-xl",
                        "text-white/40 cursor-not-allowed",
                        "border border-transparent"
                      )}
                    >
                      {item.label}
                      <span className="ml-auto px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded-full bg-amber-500/20 text-amber-400">
                        Coming Soon
                      </span>
                    </div>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={closeMobileMenu}
                      className={cn(
                        "relative flex items-center gap-3 w-full text-base py-3 px-4 rounded-xl",
                        "transition-all duration-200",
                        isActiveLink(item.href)
                          ? [
                              "text-white",
                              "bg-gradient-to-r from-brand-500/20 to-brand-600/20",
                              "border border-brand-500/30",
                            ]
                          : [
                              "text-white/80 hover:text-white",
                              "hover:bg-white/10",
                              "border border-transparent",
                            ]
                      )}
                    >
                      {/* Active indicator dot */}
                      {isActiveLink(item.href) && (
                        <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                      )}
                      {item.label}
                      {/* Active arrow */}
                      {isActiveLink(item.href) && (
                        <ArrowRight className="ml-auto h-4 w-4 text-brand-400" />
                      )}
                    </Link>
                  )}
                </li>
              ))}

              {/* Additional Menu Items for Authenticated Users */}
              {isAuthenticated && (
                <>
                  {/* Divider */}
                  <li className="py-2">
                    <div className="border-t border-white/10" />
                  </li>

                  {/* Wallet */}
                  <li>
                    <Link
                      href="/wallet"
                      onClick={closeMobileMenu}
                      className={cn(
                        "relative flex items-center gap-3 w-full text-base py-3 px-4 rounded-xl",
                        "transition-all duration-200",
                        isActiveLink("/wallet")
                          ? [
                              "text-white",
                              "bg-gradient-to-r from-emerald-500/20 to-teal-600/20",
                              "border border-emerald-500/30",
                            ]
                          : [
                              "text-white/80 hover:text-white",
                              "hover:bg-white/10",
                              "border border-transparent",
                            ]
                      )}
                    >
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                        <Wallet className="h-3.5 w-3.5 text-white" />
                      </div>
                      My Wallet
                      {isActiveLink("/wallet") && (
                        <ArrowRight className="ml-auto h-4 w-4 text-emerald-400" />
                      )}
                    </Link>
                  </li>

                  {/* Affiliates */}
                  <li>
                    <Link
                      href="/affiliates"
                      onClick={closeMobileMenu}
                      className={cn(
                        "relative flex items-center gap-3 w-full text-base py-3 px-4 rounded-xl",
                        "transition-all duration-200",
                        isActiveLink("/affiliates")
                          ? [
                              "text-white",
                              "bg-gradient-to-r from-purple-500/20 to-indigo-600/20",
                              "border border-purple-500/30",
                            ]
                          : [
                              "text-white/80 hover:text-white",
                              "hover:bg-white/10",
                              "border border-transparent",
                            ]
                      )}
                    >
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                        <Users className="h-3.5 w-3.5 text-white" />
                      </div>
                      Affiliates
                      {isActiveLink("/affiliates") && (
                        <ArrowRight className="ml-auto h-4 w-4 text-purple-400" />
                      )}
                    </Link>
                  </li>

                  {/* Admin - For admins or users with RBAC roles */}
                  {(user?.role === "ADMIN" || user?.roleId) && (
                    <li>
                      <a
                        href={process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3002"}
                        onClick={closeMobileMenu}
                        className={cn(
                          "relative flex items-center gap-3 w-full text-base py-3 px-4 rounded-xl",
                          "transition-all duration-200",
                          "text-white/80 hover:text-white",
                          "hover:bg-white/10",
                          "border border-transparent"
                        )}
                      >
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
                          <Shield className="h-3.5 w-3.5 text-white" />
                        </div>
                        Admin Panel
                      </a>
                    </li>
                  )}

                  {/* Settings */}
                  <li>
                    <Link
                      href="/settings"
                      onClick={closeMobileMenu}
                      className={cn(
                        "relative flex items-center gap-3 w-full text-base py-3 px-4 rounded-xl",
                        "transition-all duration-200",
                        "text-white/80 hover:text-white",
                        "hover:bg-white/10",
                        "border border-transparent"
                      )}
                    >
                      <Settings className="h-5 w-5 text-white/60" />
                      Settings
                      <ChevronDown className="ml-auto h-4 w-4 text-white/40 -rotate-90" />
                    </Link>
                  </li>

                  {/* Help & Support */}
                  <li>
                    <Link
                      href="/help"
                      onClick={closeMobileMenu}
                      className={cn(
                        "relative flex items-center gap-3 w-full text-base py-3 px-4 rounded-xl",
                        "transition-all duration-200",
                        isActiveLink("/help")
                          ? [
                              "text-white",
                              "bg-gradient-to-r from-brand-500/20 to-brand-600/20",
                              "border border-brand-500/30",
                            ]
                          : [
                              "text-white/80 hover:text-white",
                              "hover:bg-white/10",
                              "border border-transparent",
                            ]
                      )}
                    >
                      <HelpCircle className="h-5 w-5 text-white/60" />
                      Help & Support
                      {isActiveLink("/help") ? (
                        <ArrowRight className="ml-auto h-4 w-4 text-brand-400" />
                      ) : (
                        <ChevronDown className="ml-auto h-4 w-4 text-white/40 -rotate-90" />
                      )}
                    </Link>
                  </li>
                </>
              )}
            </ul>

            {/* Cool Theme & Language Section */}
            <div className="mt-6 pt-6 border-t border-white/10">
              {/* Theme Section */}
              <div className="px-4 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center">
                    {mounted && theme === 'dark' ? (
                      <Moon className="h-4 w-4 text-white" />
                    ) : mounted && theme === 'light' ? (
                      <Sun className="h-4 w-4 text-white" />
                    ) : (
                      <Monitor className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">Appearance</p>
                    <p className="text-white/50 text-xs">Choose your theme</p>
                  </div>
                </div>

                {/* Theme Toggle Buttons */}
                <div className="grid grid-cols-3 gap-2 p-1 bg-white/5 rounded-xl">
                  <button
                    onClick={() => setTheme('light')}
                    className={cn(
                      "flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg transition-all duration-200",
                      mounted && theme === 'light'
                        ? "bg-white/15 text-white shadow-lg"
                        : "text-white/60 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                      mounted && theme === 'light'
                        ? "bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg shadow-orange-500/30"
                        : "bg-white/10"
                    )}>
                      <Sun className={cn(
                        "h-5 w-5 transition-transform duration-300",
                        mounted && theme === 'light' && "animate-spin-slow"
                      )} />
                    </div>
                    <span className="text-xs font-medium">Light</span>
                  </button>

                  <button
                    onClick={() => setTheme('dark')}
                    className={cn(
                      "flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg transition-all duration-200",
                      mounted && theme === 'dark'
                        ? "bg-white/15 text-white shadow-lg"
                        : "text-white/60 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                      mounted && theme === 'dark'
                        ? "bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-purple-500/30"
                        : "bg-white/10"
                    )}>
                      <Moon className={cn(
                        "h-5 w-5 transition-transform duration-300",
                        mounted && theme === 'dark' && "rotate-[-20deg]"
                      )} />
                    </div>
                    <span className="text-xs font-medium">Dark</span>
                  </button>

                  <button
                    onClick={() => setTheme('system')}
                    className={cn(
                      "flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg transition-all duration-200",
                      mounted && theme === 'system'
                        ? "bg-white/15 text-white shadow-lg"
                        : "text-white/60 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                      mounted && theme === 'system'
                        ? "bg-gradient-to-br from-gray-400 to-gray-600 shadow-lg shadow-gray-500/30"
                        : "bg-white/10"
                    )}>
                      <Monitor className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-medium">Auto</span>
                  </button>
                </div>
              </div>

              {/* Language Button - Opens submenu */}
              <div className="px-4">
                <button
                  onClick={() => setMobileMenuView('language')}
                  className="w-full flex items-center justify-between px-3 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                      <Globe className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-white font-medium text-sm">Language</p>
                      <p className="text-white/50 text-xs">{languages.find(l => l.code === locale)?.name || 'English'}</p>
                    </div>
                  </div>
                  <ChevronDown className="h-5 w-5 text-white/40 -rotate-90" />
                </button>
              </div>
            </div>
          </nav>

          {/* Actions area */}
          <div className="px-4 py-6 border-t border-white/10">
            <div className="flex flex-col gap-3">
              {isAuthenticated ? (
                <button
                  onClick={() => {
                    logout();
                    closeMobileMenu();
                  }}
                  className={cn(
                    "flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl",
                    "text-sm font-medium",
                    "text-red-400 hover:text-red-300",
                    "bg-red-500/10 hover:bg-red-500/20",
                    "border border-red-500/20",
                    "transition-all duration-200"
                  )}
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              ) : (
                <>
                  {/* Login Button */}
                  <Link
                    href="/login"
                    onClick={closeMobileMenu}
                    className={cn(
                      "group relative w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl overflow-hidden",
                      "text-sm font-semibold text-white",
                      "gradient-primary shadow-brand",
                      "transition-all duration-300"
                    )}
                  >
                    <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    <span className="relative flex items-center gap-2">
                      Login
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>

                  {/* Register Button */}
                  <Link
                    href="/register"
                    onClick={closeMobileMenu}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl",
                      "text-sm font-medium",
                      "text-white",
                      "bg-white/10 hover:bg-white/20",
                      "border border-white/20",
                      "transition-all duration-200"
                    )}
                  >
                    <UserPlus className="h-4 w-4" />
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
          </div>

          {/* Language View */}
          <div
            className={cn(
              "absolute inset-0 h-full flex flex-col transition-transform duration-300 ease-out bg-gray-900/95",
              mobileMenuView === 'language'
                ? "translate-x-0"
                : "translate-x-full"
            )}
          >
            {/* Language Header with Back Button */}
            <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
              <button
                onClick={() => setMobileMenuView('main')}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-white" />
              </button>
              <h2 className="text-white font-semibold text-lg">Language</h2>
            </div>

            {/* Language List */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="space-y-2">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      handleLanguageChange(lang.code);
                      setMobileMenuView('main');
                    }}
                    className={cn(
                      "relative w-full flex items-center gap-3 px-4 py-4 rounded-xl transition-all duration-200",
                      locale === lang.code
                        ? "bg-gradient-to-r from-emerald-500/20 to-teal-600/20 border border-emerald-500/30"
                        : "bg-white/5 hover:bg-white/10 border border-transparent"
                    )}
                  >
                    {/* Flag */}
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all duration-300",
                      locale === lang.code
                        ? "bg-gradient-to-br from-emerald-500/30 to-teal-600/30 shadow-lg shadow-emerald-500/20 scale-110"
                        : "bg-white/10"
                    )}>
                      {lang.flag}
                    </div>

                    {/* Language info */}
                    <div className="flex-1 text-left">
                      <p className={cn(
                        "font-semibold text-base transition-colors",
                        locale === lang.code ? "text-white" : "text-white/80"
                      )}>
                        {lang.name}
                      </p>
                      <p className="text-white/40 text-sm">{lang.short}</p>
                    </div>

                    {/* Check indicator */}
                    {locale === lang.code ? (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full border-2 border-white/20" />
                    )}

                    {/* Glow effect for selected */}
                    {locale === lang.code && (
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 pointer-events-none" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Decorative gradient */}
          <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none bg-gradient-to-b from-white/5 via-transparent to-transparent" />
        </div>
      </div>
    </>
  );
}
