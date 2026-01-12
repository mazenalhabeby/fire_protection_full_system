"use client";

import * as React from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  Shield,
  ShieldCheck,
  Users,
  UserPlus,
  ShoppingCart,
  Lock,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Settings,
  LayoutDashboard,
  LogOut,
  ChevronRight,
  Globe,
  ExternalLink,
  Sparkles,
  Sun,
  Moon,
  Monitor,
  HeadphonesIcon,
  Wallet,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/components/ui";
import { useAdminAuth } from "@/providers/AuthProvider";
import { locales, type Locale } from "@/i18n/request";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui";

const languageNames: Record<Locale, string> = {
  en: "English",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
  it: "Italiano",
};

const languageFlags: Record<Locale, string> = {
  en: "🇺🇸",
  de: "🇩🇪",
  fr: "🇫🇷",
  es: "🇪🇸",
  it: "🇮🇹",
};

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const locale = useLocale() as Locale;
  const router = useRouter();
  const t = useTranslations("admin");
  const tAuth = useTranslations("auth");
  const { logout, hasPermission, user, userRole } = useAdminAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [showLanguages, setShowLanguages] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = [
    {
      title: t("dashboard"),
      url: "/",
      icon: LayoutDashboard,
      color: "violet",
      permission: "dashboard.view",
    },
    {
      title: t("users"),
      url: "/users",
      icon: Users,
      color: "blue",
      permission: "users.view",
    },
    {
      title: t("wallets"),
      url: "/wallets",
      icon: Wallet,
      color: "teal",
      permission: "users.view",
    },
    {
      title: t("affiliates"),
      url: "/affiliates",
      icon: UserPlus,
      color: "purple",
      permission: "affiliates.view",
    },
    {
      title: t("purchases"),
      url: "/purchases",
      icon: ShoppingCart,
      color: "emerald",
      permission: "purchases.view",
    },
    {
      title: t("locks"),
      url: "/locks",
      icon: Lock,
      color: "amber",
      permission: "locks.view",
    },
    {
      title: t("deposits"),
      url: "/deposits",
      icon: ArrowDownLeft,
      color: "cyan",
      permission: "deposits.view",
    },
    {
      title: t("withdrawals"),
      url: "/withdrawals",
      icon: ArrowUpRight,
      color: "rose",
      permission: "withdrawals.view",
    },
    {
      title: t("buyback"),
      url: "/buyback",
      icon: TrendingUp,
      color: "emerald",
      permission: "settings.view",
    },
    {
      title: t("support"),
      url: "/support",
      icon: HeadphonesIcon,
      color: "indigo",
      permission: "support.view",
    },
    {
      title: t("roles"),
      url: "/roles",
      icon: ShieldCheck,
      color: "fuchsia",
      permission: "roles.view",
    },
    {
      title: t("settings"),
      url: "/settings",
      icon: Settings,
      color: "gray",
      permission: "settings.view",
    },
  ];

  const colorClasses: Record<string, { bg: string; text: string; activeBg: string; activeText: string; glow: string }> = {
    violet: {
      bg: "bg-violet-500/10",
      text: "text-violet-500",
      activeBg: "bg-violet-500",
      activeText: "text-white",
      glow: "shadow-violet-500/25",
    },
    blue: {
      bg: "bg-blue-500/10",
      text: "text-blue-500",
      activeBg: "bg-blue-500",
      activeText: "text-white",
      glow: "shadow-blue-500/25",
    },
    purple: {
      bg: "bg-purple-500/10",
      text: "text-purple-500",
      activeBg: "bg-purple-500",
      activeText: "text-white",
      glow: "shadow-purple-500/25",
    },
    emerald: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-500",
      activeBg: "bg-emerald-500",
      activeText: "text-white",
      glow: "shadow-emerald-500/25",
    },
    amber: {
      bg: "bg-amber-500/10",
      text: "text-amber-500",
      activeBg: "bg-amber-500",
      activeText: "text-white",
      glow: "shadow-amber-500/25",
    },
    cyan: {
      bg: "bg-cyan-500/10",
      text: "text-cyan-500",
      activeBg: "bg-cyan-500",
      activeText: "text-white",
      glow: "shadow-cyan-500/25",
    },
    teal: {
      bg: "bg-teal-500/10",
      text: "text-teal-500",
      activeBg: "bg-teal-500",
      activeText: "text-white",
      glow: "shadow-teal-500/25",
    },
    rose: {
      bg: "bg-rose-500/10",
      text: "text-rose-500",
      activeBg: "bg-rose-500",
      activeText: "text-white",
      glow: "shadow-rose-500/25",
    },
    gray: {
      bg: "bg-gray-500/10",
      text: "text-gray-500",
      activeBg: "bg-gray-500",
      activeText: "text-white",
      glow: "shadow-gray-500/25",
    },
    fuchsia: {
      bg: "bg-fuchsia-500/10",
      text: "text-fuchsia-500",
      activeBg: "bg-fuchsia-500",
      activeText: "text-white",
      glow: "shadow-fuchsia-500/25",
    },
    indigo: {
      bg: "bg-indigo-500/10",
      text: "text-indigo-500",
      activeBg: "bg-indigo-500",
      activeText: "text-white",
      glow: "shadow-indigo-500/25",
    },
  };

  // Check if a nav item is active
  const isActive = (url: string) => {
    if (url === "/") {
      return pathname === "/" || pathname === "";
    }
    return pathname.startsWith(url);
  };

  const handleLocaleChange = (newLocale: Locale) => {
    router.replace(pathname, { locale: newLocale });
    setShowLanguages(false);
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader className="p-4">
        {/* User Profile Header */}
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div
              className="flex size-12 items-center justify-center rounded-full text-white text-base font-semibold shadow-lg"
              style={{
                background: userRole?.color
                  ? `linear-gradient(135deg, ${userRole.color}, ${userRole.color}cc)`
                  : 'linear-gradient(135deg, #6366f1, #8b5cf6)'
              }}
            >
              {user ? (
                user.firstName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'A'
              ) : (
                <Shield className="size-5" />
              )}
            </div>
            {/* Online dot */}
            <div className="absolute bottom-0 right-0 size-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-sidebar" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate capitalize">
              {user?.firstName && user?.lastName
                ? `${user.firstName} ${user.lastName}`
                : user?.email?.split('@')[0] || t("title")}
            </p>
            {/* Role Badge */}
            <span
              className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
              style={{
                backgroundColor: userRole?.color ? `${userRole.color}20` : '#6366f120',
                color: userRole?.color || '#6366f1'
              }}
            >
              <span
                className="size-1.5 rounded-full"
                style={{ backgroundColor: userRole?.color || '#6366f1' }}
              />
              {userRole?.name || (user?.role === 'ADMIN' ? t('administrator') : t('user'))}
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <div className="flex items-center gap-2 px-3 mb-3">
            <Sparkles className="h-3 w-3 text-gray-400" />
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{t("menu")}</span>
          </div>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navItems
                .filter((item) => hasPermission(item.permission))
                .map((item) => {
                const active = isActive(item.url);
                const colors = colorClasses[item.color];
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className={cn(
                        "group relative h-11 rounded-xl transition-all duration-200",
                        active
                          ? "bg-gray-100 dark:bg-gray-800/80"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800/40"
                      )}
                    >
                      <Link href={item.url}>
                        {/* Active indicator line */}
                        {active && (
                          <div className={cn(
                            "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full",
                            colors.activeBg
                          )} />
                        )}

                        <div
                          className={cn(
                            "flex size-8 items-center justify-center rounded-lg transition-all duration-200",
                            active
                              ? cn(colors.activeBg, colors.activeText, "shadow-lg", colors.glow)
                              : cn(colors.bg, colors.text, "group-hover:scale-110")
                          )}
                        >
                          <item.icon className="size-4" />
                        </div>
                        <span className={cn(
                          "font-medium text-sm transition-colors",
                          active
                            ? "text-gray-900 dark:text-white"
                            : "text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                        )}>
                          {item.title}
                        </span>
                        <ChevronRight className={cn(
                          "ml-auto size-4 transition-all duration-200",
                          active
                            ? "text-gray-400 opacity-100"
                            : "text-gray-300 dark:text-gray-600 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
                        )} />
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-gray-100 dark:border-gray-800/50 pt-4 px-2">
        <SidebarMenu className="space-y-1">
          {/* Theme Switcher */}
          <SidebarMenuItem>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t("theme")}</span>
              {mounted ? (
                <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100 dark:bg-gray-800">
                  <button
                    onClick={() => setTheme("light")}
                    className={cn(
                      "flex items-center justify-center w-7 h-7 rounded-md transition-all duration-200",
                      theme === "light"
                        ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm"
                        : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-700/80"
                    )}
                    title={t("lightMode")}
                  >
                    <Sun className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setTheme("dark")}
                    className={cn(
                      "flex items-center justify-center w-7 h-7 rounded-md transition-all duration-200",
                      theme === "dark"
                        ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm"
                        : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-700/80"
                    )}
                    title={t("darkMode")}
                  >
                    <Moon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setTheme("system")}
                    className={cn(
                      "flex items-center justify-center w-7 h-7 rounded-md transition-all duration-200",
                      theme === "system"
                        ? "bg-gradient-to-br from-gray-500 to-gray-600 text-white shadow-sm"
                        : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-700/80"
                    )}
                    title={t("systemMode")}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse">
                  <div className="w-7 h-7" />
                  <div className="w-7 h-7" />
                  <div className="w-7 h-7" />
                </div>
              )}
            </div>
          </SidebarMenuItem>

          {/* Language Switcher */}
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={t("language")}
              onClick={() => setShowLanguages(!showLanguages)}
              className={cn(
                "h-11 rounded-xl transition-all duration-200",
                showLanguages
                  ? "bg-gray-100 dark:bg-gray-800/80"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800/40"
              )}
            >
              <div className="flex size-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500">
                <Globe className="size-4" />
              </div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {languageFlags[locale]} {languageNames[locale]}
              </span>
              <ChevronRight className={cn(
                "ml-auto size-4 text-gray-400 transition-transform duration-200",
                showLanguages && "rotate-90"
              )} />
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Language Options */}
          {showLanguages && (
            <div className="overflow-hidden rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 mx-1 mb-2">
              {locales.map((loc, index) => (
                <button
                  key={loc}
                  onClick={() => handleLocaleChange(loc)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-all duration-150",
                    index !== locales.length - 1 && "border-b border-gray-100 dark:border-gray-700/50",
                    locale === loc
                      ? "bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                  )}
                >
                  <span className="text-base">{languageFlags[loc]}</span>
                  <span>{languageNames[loc]}</span>
                  {locale === loc && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-500" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Back to App */}
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip={t("backToApp")}
              className="h-11 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-all duration-200 group"
            >
              <a
                href={`${process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000"}/${locale}/dashboard`}
              >
                <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
                  <ExternalLink className="size-4" />
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white">
                  {t("backToApp")}
                </span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Logout */}
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={tAuth("logout")}
              onClick={handleLogout}
              className="h-11 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all duration-200 group"
            >
              <div className="flex size-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500 group-hover:bg-rose-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-rose-500/25 transition-all duration-200">
                <LogOut className="size-4" />
              </div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-rose-600 dark:group-hover:text-rose-400">
                {tAuth("logout")}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
