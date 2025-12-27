"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  User,
  Shield,
  Bell,
  Wallet,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export type SettingsSection =
  | "profile"
  | "security"
  | "notifications"
  | "wallets"
  | "delete";

interface SettingsSidebarProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}

const sections: { id: SettingsSection; label: string; icon: React.ElementType; danger?: boolean }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "wallets", label: "Connected Wallets", icon: Wallet },
  { id: "delete", label: "Delete Account", icon: Trash2, danger: true },
];

export function SettingsSidebar({ activeSection, onSectionChange }: SettingsSidebarProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollability = useCallback(() => {
    const container = scrollContainerRef.current;
    if (container) {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      checkScrollability();
      container.addEventListener("scroll", checkScrollability);
      window.addEventListener("resize", checkScrollability);

      const timer = setTimeout(checkScrollability, 100);

      return () => {
        container.removeEventListener("scroll", checkScrollability);
        window.removeEventListener("resize", checkScrollability);
        clearTimeout(timer);
      };
    }
  }, [checkScrollability]);

  const scrollTo = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = 200;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 shrink-0">
        <nav className="sticky top-24 space-y-1">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            const isDanger = section.danger;

            return (
              <div key={section.id}>
                {isDanger && (
                  <div className="my-3 border-t border-gray-200 dark:border-gray-800" />
                )}
                <button
                  onClick={() => onSectionChange(section.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200",
                    isActive && !isDanger && "bg-brand-500/10 text-brand-600 dark:text-brand-400",
                    isActive && isDanger && "bg-red-500/10 text-red-600 dark:text-red-400",
                    !isActive && !isDanger && "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50",
                    !isActive && isDanger && "text-red-500/70 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 dark:hover:text-red-400"
                  )}
                >
                  <Icon className={cn(
                    "h-5 w-5",
                    isActive && !isDanger && "text-brand-500",
                    isActive && isDanger && "text-red-500",
                    !isActive && isDanger && "text-red-400"
                  )} />
                  <span className="font-medium">{section.label}</span>
                </button>
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Tabs with Scroll Indicators */}
      <div className="md:hidden relative mb-6 -mx-4 px-4">
        {/* Left Scroll Indicator */}
        <button
          onClick={() => scrollTo('left')}
          className={cn(
            "absolute left-0 top-0 bottom-2 w-12 z-10",
            "bg-gradient-to-r from-white via-white/90 to-transparent",
            "dark:from-gray-950 dark:via-gray-950/90 dark:to-transparent",
            "flex items-center justify-start pl-1",
            "transition-all duration-300 ease-out",
            canScrollLeft
              ? "opacity-100 translate-x-0"
              : "opacity-0 -translate-x-4 pointer-events-none"
          )}
        >
          <ChevronLeft className={cn(
            "h-5 w-5 text-gray-400 dark:text-gray-500",
            "transition-transform duration-300",
            "hover:text-gray-600 dark:hover:text-gray-300",
            "hover:-translate-x-0.5",
            // Subtle bounce animation
            canScrollLeft && "animate-[bounce-left_1.5s_ease-in-out_infinite]"
          )} />
        </button>

        {/* Scrollable Container */}
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto scrollbar-none"
        >
          <div className="flex gap-2 min-w-max pb-2">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              const isDanger = section.danger;

              return (
                <button
                  key={section.id}
                  onClick={() => onSectionChange(section.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                    isActive && !isDanger && "bg-brand-500 text-white shadow-lg shadow-brand-500/25",
                    isActive && isDanger && "bg-red-500 text-white shadow-lg shadow-red-500/25",
                    !isActive && !isDanger && "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800",
                    !isActive && isDanger && "bg-white dark:bg-gray-900 text-red-500 border border-red-200 dark:border-red-800/50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {section.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Scroll Indicator */}
        <button
          onClick={() => scrollTo('right')}
          className={cn(
            "absolute right-0 top-0 bottom-2 w-12 z-10",
            "bg-gradient-to-l from-white via-white/90 to-transparent",
            "dark:from-gray-950 dark:via-gray-950/90 dark:to-transparent",
            "flex items-center justify-end pr-1",
            "transition-all duration-300 ease-out",
            canScrollRight
              ? "opacity-100 translate-x-0"
              : "opacity-0 translate-x-4 pointer-events-none"
          )}
        >
          <ChevronRight className={cn(
            "h-5 w-5 text-gray-400 dark:text-gray-500",
            "transition-transform duration-300",
            "hover:text-gray-600 dark:hover:text-gray-300",
            "hover:translate-x-0.5",
            // Subtle bounce animation
            canScrollRight && "animate-[bounce-right_1.5s_ease-in-out_infinite]"
          )} />
        </button>
      </div>

      {/* Custom keyframes for subtle bounce */}
      <style jsx>{`
        @keyframes bounce-left {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(-3px); }
        }
        @keyframes bounce-right {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(3px); }
        }
      `}</style>
    </>
  );
}
