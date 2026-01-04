"use client";

import { useState, useCallback, useMemo } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { Menu, UserPlus, ArrowRight } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import { useScrollPosition } from "@/hooks/useScrollPosition";
import { useNavbarTheme } from "@/hooks/useNavbarTheme";
import { NavLink } from "./NavLink";
import { MobileMenu } from "./MobileMenu";
import { LanguageSwitcher } from "@/components/language-switcher";

interface NavItem {
  href: string;
  label: string;
}

interface NavbarProps {
  logo?: React.ReactNode;
  navItems?: NavItem[];
  actions?: React.ReactNode;
  className?: string;
  hideSpacer?: boolean;
}

const defaultNavItems: NavItem[] = [
  { href: "#about-technology", label: "Technology" },
  { href: "#why-hbct", label: "Token" },
  { href: "#token-distribution", label: "Tokenomics" },
  { href: "#timeline", label: "Roadmap" },
];

export function Navbar({
  logo,
  navItems = defaultNavItems,
  actions,
  className,
  hideSpacer = false,
}: NavbarProps) {
  const pathname = usePathname();
  const { isScrolled } = useScrollPosition({ threshold: 12 });
  const { theme: sectionTheme } = useNavbarTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Hide anchor links (home page sections) on non-home pages
  const isHomePage = pathname === "/" || pathname === "";
  const filteredNavItems = isHomePage
    ? navItems
    : navItems.filter(item => !item.href.startsWith("#"));

  // Logo variant based on section background
  // dark section = light logo, light section = dark logo
  const logoVariant = sectionTheme === "dark" ? "light" : "dark";
  // Text/links should also adapt
  const isOnDarkSection = sectionTheme === "dark";

  const openMobileMenu = useCallback(() => setIsMobileMenuOpen(true), []);
  const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);

  // Split nav items into left and right halves
  const { leftNavItems, rightNavItems } = useMemo(() => {
    const midpoint = Math.ceil(filteredNavItems.length / 2);
    return {
      leftNavItems: filteredNavItems.slice(0, midpoint),
      rightNavItems: filteredNavItems.slice(midpoint),
    };
  }, [filteredNavItems]);

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50",
          "transition-all duration-300 ease-out",
          "motion-reduce:transition-none",
          className
        )}
      >
        {/* Navbar background layer - subtle glass effect */}
        <div
          className={cn(
            "absolute inset-0 transition-all duration-300",
            "motion-reduce:transition-none",
            // Always have blur, but adjust opacity based on scroll
            "backdrop-blur-xl backdrop-saturate-150",
            isScrolled
              ? [
                  // More visible when scrolled
                  "bg-white/10 dark:bg-black/10",
                  "border-b border-black/5 dark:border-white/5",
                  "shadow-[0_2px_20px_rgba(0,0,0,0.02)] dark:shadow-[0_2px_20px_rgba(0,0,0,0.1)]",
                ]
              : [
                  // Very subtle at top
                  "bg-white/5 dark:bg-black/5",
                  "border-b border-transparent",
                ]
          )}
        />

        {/* Main navbar content */}
        <nav
          className={cn(
            "relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8",
            "h-16 flex items-center justify-between"
          )}
          role="navigation"
          aria-label="Main navigation"
        >
          {/* Mobile Menu Button - Left side on mobile */}
          <button
            onClick={openMobileMenu}
            className={cn(
              "md:hidden p-2 rounded-xl z-10",
              "transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              // Colors based on section background
              isOnDarkSection
                ? "text-white hover:text-white/80"
                : "text-gray-800 hover:text-gray-600",
              isScrolled &&
                (isOnDarkSection
                  ? "bg-white/10 hover:bg-white/20"
                  : "bg-black/5 hover:bg-black/10")
            )}
            aria-label="Open menu"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Desktop: Left nav links in glass pill */}
          {leftNavItems.length > 0 && (
          <div
            className={cn(
              "hidden md:flex items-center justify-end flex-1",
              // Glass pill styling
              "mr-6"
            )}
          >
            <div
              className={cn(
                "flex items-center",
                "px-2 py-1.5 rounded-2xl",
                "transition-all duration-300 ease-out",
                "motion-reduce:transition-none",
                isScrolled
                  ? [
                      "bg-white/40 dark:bg-white/10",
                      "backdrop-blur-md",
                      "border border-white/50 dark:border-white/20",
                      "shadow-[0_4px_24px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.6)]",
                      "dark:shadow-[0_4px_24px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]",
                    ]
                  : [
                      "bg-transparent",
                      "border border-transparent",
                    ]
              )}
            >
              {/* Shine gradient overlay - only when scrolled */}
              {isScrolled && (
                <div
                  className={cn(
                    "absolute inset-0 rounded-2xl overflow-hidden pointer-events-none",
                    "opacity-60 dark:opacity-30"
                  )}
                >
                  <div
                    className={cn(
                      "absolute inset-0",
                      "bg-linear-to-br from-white/60 via-transparent to-transparent",
                      "dark:from-white/20"
                    )}
                  />
                </div>
              )}

              <div className="relative flex items-center gap-1">
                {leftNavItems.map((item) => (
                  <NavLink key={item.href} href={item.href} isTransparent={isOnDarkSection}>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          </div>
          )}

          {/* Center Logo */}
          <div className="shrink-0 z-10">
            {logo || (
              <Logo variant={logoVariant} />
            )}
          </div>

          {/* Desktop: Right nav links in glass pill */}
          {rightNavItems.length > 0 && (
          <div
            className={cn(
              "hidden md:flex items-center justify-start flex-1",
              "ml-6"
            )}
          >
            <div
              className={cn(
                "flex items-center",
                "px-2 py-1.5 rounded-2xl",
                "transition-all duration-300 ease-out",
                "motion-reduce:transition-none",
                isScrolled
                  ? [
                      "bg-white/40 dark:bg-white/10",
                      "backdrop-blur-md",
                      "border border-white/50 dark:border-white/20",
                      "shadow-[0_4px_24px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.6)]",
                      "dark:shadow-[0_4px_24px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]",
                    ]
                  : [
                      "bg-transparent",
                      "border border-transparent",
                    ]
              )}
            >
              {/* Shine gradient overlay - only when scrolled */}
              {isScrolled && (
                <div
                  className={cn(
                    "absolute inset-0 rounded-2xl overflow-hidden pointer-events-none",
                    "opacity-60 dark:opacity-30"
                  )}
                >
                  <div
                    className={cn(
                      "absolute inset-0",
                      "bg-linear-to-br from-white/60 via-transparent to-transparent",
                      "dark:from-white/20"
                    )}
                  />
                </div>
              )}

              <div className="relative flex items-center gap-1">
                {rightNavItems.map((item) => (
                  <NavLink key={item.href} href={item.href} isTransparent={isOnDarkSection}>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          </div>
          )}

          {/* Desktop: Language Switcher + Auth Buttons */}
          <div className="hidden md:flex items-center gap-2 z-10 ml-4">
            <LanguageSwitcher isTransparent={isOnDarkSection} />

            {/* Register Button */}
            <Link
              href="/register"
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-xl",
                "text-sm font-medium",
                "transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isOnDarkSection
                  ? [
                      "text-white/90 hover:text-white",
                      "bg-white/10 hover:bg-white/20",
                      "border border-white/20",
                    ]
                  : [
                      "text-gray-700 hover:text-gray-900",
                      "bg-gray-100 hover:bg-gray-200",
                      "border border-gray-200",
                    ]
              )}
            >
              <UserPlus className="h-4 w-4" />
              <span>Register</span>
            </Link>

            {/* Premium Login Button */}
            <Link
              href="/login"
              className={cn(
                "group relative flex items-center gap-1.5 px-4 py-2 rounded-xl overflow-hidden",
                "text-sm font-semibold",
                "transition-all duration-300",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "hover:-translate-y-0.5 active:translate-y-0",
                isOnDarkSection
                  ? [
                      "bg-white text-gray-900",
                      "hover:bg-gray-100",
                      "shadow-md shadow-white/20 hover:shadow-lg hover:shadow-white/30",
                    ]
                  : [
                      "text-white",
                      "gradient-primary shadow-brand",
                    ]
              )}
            >
              {/* Shimmer effect */}
              <span className={cn(
                "absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700",
                isOnDarkSection
                  ? "bg-gradient-to-r from-transparent via-gray-200/50 to-transparent"
                  : "bg-gradient-to-r from-transparent via-white/20 to-transparent"
              )} />

              <span className="relative flex items-center gap-1.5">
                Login
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </div>

          {/* Desktop Actions */}
          {actions && (
            <div className="hidden md:flex items-center gap-3 z-10 ml-2">
              {actions}
            </div>
          )}

          {/* Mobile: Auth Buttons + Language Switcher */}
          <div className="md:hidden flex items-center gap-2 z-10">
            {/* Login Button - Mobile */}
            <Link
              href="/login"
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-lg",
                "text-xs font-semibold",
                "transition-all duration-200",
                isOnDarkSection
                  ? [
                      "bg-white text-gray-900",
                      "shadow-sm shadow-white/20",
                    ]
                  : [
                      "text-white",
                      "gradient-primary shadow-brand",
                    ]
              )}
            >
              Login
            </Link>

            {/* Register Button - Mobile */}
            <Link
              href="/register"
              className={cn(
                "flex items-center px-3 py-1.5 rounded-lg",
                "text-xs font-medium",
                "transition-all duration-200",
                isOnDarkSection
                  ? [
                      "text-white/90 hover:text-white",
                      "bg-white/10 hover:bg-white/20",
                      "border border-white/20",
                    ]
                  : [
                      "text-gray-700 hover:text-gray-900",
                      "bg-gray-100 hover:bg-gray-200",
                      "border border-gray-200",
                    ]
              )}
            >
              Register
            </Link>

            <LanguageSwitcher isTransparent={isOnDarkSection} />
          </div>
        </nav>
      </header>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={closeMobileMenu}
        navItems={filteredNavItems}
        actions={
          <>
            {/* Premium Login Button - Mobile */}
            <Link
              href="/login"
              onClick={closeMobileMenu}
              className={cn(
                "group relative w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl overflow-hidden",
                "text-sm font-semibold text-white",
                "gradient-primary shadow-brand",
                "transition-all duration-300",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              )}
            >
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <span className="relative flex items-center gap-2">
                Login
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>

            {/* Register Button - Mobile (always white text for dark menu) */}
            <Link
              href="/register"
              onClick={closeMobileMenu}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl",
                "text-sm font-medium",
                "text-white",
                "bg-white/10 hover:bg-white/20",
                "border border-white/20",
                "transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              )}
            >
              <UserPlus className="h-4 w-4" />
              Register
            </Link>
          </>
        }
      />

      {/* Spacer to prevent content from going under fixed navbar */}
      {!hideSpacer && <div className="h-16" aria-hidden="true" />}
    </>
  );
}
