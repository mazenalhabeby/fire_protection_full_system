"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  isTransparent?: boolean;
}

export function NavLink({ href, children, className, onClick, isTransparent }: NavLinkProps) {
  const pathname = usePathname();

  // Handle locale prefix in pathname
  const isActive = pathname === href || pathname.endsWith(href);

  return (
    <Link
      href={href}
      onClick={onClick}
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
