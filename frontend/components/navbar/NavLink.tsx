"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useCallback } from "react";

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  isTransparent?: boolean;
}

export function NavLink({ href, children, className, onClick, isTransparent }: NavLinkProps) {
  const pathname = usePathname();
  const isAnchorLink = href.startsWith("#");

  // Handle locale prefix in pathname
  const isActive = !isAnchorLink && (pathname === href || pathname.endsWith(href));

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (isAnchorLink) {
        e.preventDefault();
        const targetId = href.slice(1);
        const element = document.getElementById(targetId);
        if (element) {
          const navbarHeight = 64; // h-16 = 64px
          const extraPadding = 20; // Extra space to show section content
          const elementPosition = element.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({
            top: elementPosition - navbarHeight - extraPadding,
            behavior: "smooth",
          });
        }
      }
      onClick?.();
    },
    [href, isAnchorLink, onClick]
  );

  // For anchor links, use a regular anchor tag instead of Next.js Link
  if (isAnchorLink) {
    return (
      <a
        href={href}
        onClick={handleClick}
        className={cn(
          "relative px-3 py-2 text-sm font-medium transition-all duration-300",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-md",
          "group cursor-pointer",
          // Text colors based on section background (not system theme)
          isTransparent
            ? "text-white/90 hover:text-white"
            : "text-gray-800 hover:text-black",
          className
        )}
      >
        <span className="relative z-10">{children}</span>

        {/* Animated underline */}
        <span
          className={cn(
            "absolute bottom-1 left-3 right-3 h-0.5 rounded-full",
            "transition-all duration-300 ease-out",
            "motion-reduce:transition-none",
            // Underline color based on section background
            isTransparent ? "bg-white" : "bg-brand-500",
            "opacity-0 scale-x-0 group-hover:opacity-70 group-hover:scale-x-100"
          )}
          style={{ transformOrigin: "center" }}
        />

        {/* Hover background glow */}
        <span
          className={cn(
            "absolute inset-0 rounded-md",
            "opacity-0 group-hover:opacity-100",
            "transition-opacity duration-200",
            "motion-reduce:transition-none",
            // Hover background based on section background
            isTransparent ? "bg-white/10" : "bg-black/5"
          )}
        />
      </a>
    );
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={cn(
        "relative px-3 py-2 text-sm font-medium transition-all duration-300",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-md",
        "group",
        // Text colors based on section background (not system theme)
        isTransparent
          ? [
              "text-white/90 hover:text-white",
              isActive && "text-white",
            ]
          : [
              "text-gray-800 hover:text-black",
              isActive && "text-black",
            ],
        className
      )}
      aria-current={isActive ? "page" : undefined}
    >
      <span className="relative z-10">{children}</span>

      {/* Animated underline */}
      <span
        className={cn(
          "absolute bottom-1 left-3 right-3 h-0.5 rounded-full",
          "transition-all duration-300 ease-out",
          "motion-reduce:transition-none",
          // Underline color based on section background
          isTransparent ? "bg-white" : "bg-brand-500",
          isActive
            ? "opacity-100 scale-x-100"
            : "opacity-0 scale-x-0 group-hover:opacity-70 group-hover:scale-x-100"
        )}
        style={{ transformOrigin: "center" }}
      />

      {/* Hover background glow */}
      <span
        className={cn(
          "absolute inset-0 rounded-md",
          "opacity-0 group-hover:opacity-100",
          "transition-opacity duration-200",
          "motion-reduce:transition-none",
          // Hover background based on section background
          isTransparent ? "bg-white/10" : "bg-black/5"
        )}
      />
    </Link>
  );
}
