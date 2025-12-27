"use client";

import { useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
}

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  navItems: NavItem[];
  actions?: React.ReactNode;
}

export function MobileMenu({
  isOpen,
  onClose,
  navItems,
  actions,
}: MobileMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  // Focus trap and body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      // Prevent all scrolling when menu is open
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";

      // Focus the close button when menu opens
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 100);
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  // Close menu when screen resizes to desktop (md breakpoint = 768px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && isOpen) {
        onClose();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen, onClose]);

  // Handle click outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop - darker for better contrast */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm",
          "transition-opacity duration-300",
          "motion-reduce:transition-none",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Mobile Menu Panel - contained in overflow wrapper */}
      <div
        className={cn(
          "fixed inset-0 z-50 overflow-hidden",
          isOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
      >
        <div
          ref={menuRef}
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation menu"
          className={cn(
            "absolute top-0 right-0 h-full w-[min(85vw,320px)]",
            "transition-transform duration-300 ease-out",
            "motion-reduce:transition-none",
            isOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
        {/* Dark panel - always dark regardless of theme */}
        <div
          className={cn(
            "h-full flex flex-col",
            // Always dark background
            "bg-gray-900/95",
            "backdrop-blur-xl backdrop-saturate-150",
            // Border
            "border-l border-white/10",
            // Shadow
            "shadow-[-10px_0_40px_rgba(0,0,0,0.4)]"
          )}
        >
          {/* Header with welcome message and close button */}
          <div className="flex items-start justify-between px-5 py-5 border-b border-white/10">
            <div className="flex-1 pr-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                <p className="text-brand-400 text-xs font-medium uppercase tracking-wider">Welcome to HBCT</p>
              </div>
              <h2 className="text-white font-bold text-lg mb-1">Fire Protection</h2>
              <p className="text-white/50 text-xs leading-relaxed">
                Revolutionary blockchain technology for fire safety innovation
              </p>
            </div>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              className={cn(
                "p-2 rounded-full shrink-0",
                "text-white/70 hover:text-white",
                "bg-white/10 hover:bg-white/20",
                "transition-colors duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              )}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation links - always white */}
          <nav className="flex-1 overflow-y-auto px-4 py-6">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "block w-full text-base py-3 px-4 rounded-xl",
                      "text-white/90 hover:text-white",
                      "hover:bg-white/10",
                      "transition-colors duration-200"
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Actions area */}
          {actions && (
            <div className="px-4 py-6 border-t border-white/10">
              <div className="flex flex-col gap-3">{actions}</div>
            </div>
          )}

          {/* Decorative shine gradient at top */}
          <div
            className={cn(
              "absolute top-0 left-0 right-0 h-32 pointer-events-none",
              "bg-linear-to-b from-white/5 via-transparent to-transparent"
            )}
          />
        </div>
        </div>
      </div>
    </>
  );
}
