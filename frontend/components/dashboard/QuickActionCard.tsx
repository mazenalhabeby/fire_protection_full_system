"use client";

import React from "react";
import { LucideIcon, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export interface QuickAction {
  href: string;
  icon: LucideIcon;
  label: string;
  description: string;
  gradient: string;
  shadowColor: string;
  comingSoon?: boolean;
}

export interface QuickActionCardProps {
  action: QuickAction;
  locale: string;
  variant?: "desktop" | "mobile";
}

export const QuickActionCard = React.memo(function QuickActionCard({
  action,
  locale,
  variant = "desktop",
}: QuickActionCardProps) {
  const href = action.comingSoon ? "#" : `/${locale}${action.href}`;

  if (variant === "mobile") {
    return (
      <a
        href={href}
        className={cn(
          "flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all",
          action.comingSoon
            ? "cursor-not-allowed opacity-50"
            : "hover:bg-gray-50 dark:hover:bg-gray-800/50 active:scale-95"
        )}
        onClick={action.comingSoon ? (e) => e.preventDefault() : undefined}
      >
        <div
          className={cn(
            "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg",
            action.gradient,
            action.shadowColor
          )}
        >
          <action.icon className="h-5 w-5 text-white" />
        </div>
        <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400 text-center leading-tight">
          {action.label.split(" ")[0]}
        </span>
      </a>
    );
  }

  return (
    <a
      href={href}
      className={cn(
        "group flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-transparent transition-all duration-200",
        action.comingSoon
          ? "cursor-not-allowed opacity-60"
          : "hover:bg-white dark:hover:bg-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-md"
      )}
      onClick={action.comingSoon ? (e) => e.preventDefault() : undefined}
    >
      <div
        className={cn(
          "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center transition-transform duration-300",
          action.gradient,
          action.shadowColor,
          !action.comingSoon && "group-hover:scale-110 shadow-lg"
        )}
      >
        <action.icon className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {action.label}
          </p>
          {action.comingSoon && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full">
              Soon
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {action.description}
        </p>
      </div>
      {!action.comingSoon && (
        <ExternalLink className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </a>
  );
});

// Quick Actions Panel component for reusability
export interface QuickActionsPanelProps {
  actions: QuickAction[];
  locale: string;
  title: string;
  variant?: "desktop" | "mobile";
  className?: string;
}

export const QuickActionsPanel = React.memo(function QuickActionsPanel({
  actions,
  locale,
  title,
  variant = "desktop",
  className,
}: QuickActionsPanelProps) {
  if (variant === "mobile") {
    return (
      <div
        className={cn(
          "p-4 rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-800/50",
          className
        )}
      >
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          {title}
        </h3>
        <div className="grid grid-cols-4 gap-2">
          {actions.map((action) => (
            <QuickActionCard
              key={action.href}
              action={action}
              locale={locale}
              variant="mobile"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "p-5 rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-800/50 shadow-lg shadow-gray-200/50 dark:shadow-black/20",
        className
      )}
    >
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <QuickActionCard
            key={action.href}
            action={action}
            locale={locale}
            variant="desktop"
          />
        ))}
      </div>
    </div>
  );
});

export default QuickActionCard;
