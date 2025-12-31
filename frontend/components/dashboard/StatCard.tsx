"use client";

import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  color: "brand" | "purple" | "emerald" | "blue" | "amber" | "rose";
  href?: string;
}

const colorVariants = {
  brand: {
    bg: "from-brand-500/10 via-brand-500/5 to-transparent dark:from-brand-500/20 dark:via-brand-500/10 dark:to-transparent",
    border: "border-brand-200/50 dark:border-brand-500/20",
    hoverBorder: "hover:border-brand-300 dark:hover:border-brand-500/40",
    hoverShadow: "hover:shadow-brand-500/10",
    accent: "from-brand-500/10",
    gradient: "from-brand-500 to-brand-600",
    shadow: "shadow-brand-500/30",
    text: "text-brand-500",
  },
  purple: {
    bg: "from-purple-500/10 via-purple-500/5 to-transparent dark:from-purple-500/20 dark:via-purple-500/10 dark:to-transparent",
    border: "border-purple-200/50 dark:border-purple-500/20",
    hoverBorder: "hover:border-purple-300 dark:hover:border-purple-500/40",
    hoverShadow: "hover:shadow-purple-500/10",
    accent: "from-purple-500/10",
    gradient: "from-purple-500 to-purple-600",
    shadow: "shadow-purple-500/30",
    text: "text-purple-500",
  },
  emerald: {
    bg: "from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-500/20 dark:via-emerald-500/10 dark:to-transparent",
    border: "border-emerald-200/50 dark:border-emerald-500/20",
    hoverBorder: "hover:border-emerald-300 dark:hover:border-emerald-500/40",
    hoverShadow: "hover:shadow-emerald-500/10",
    accent: "from-emerald-500/10",
    gradient: "from-emerald-500 to-emerald-600",
    shadow: "shadow-emerald-500/30",
    text: "text-emerald-500",
  },
  blue: {
    bg: "from-blue-500/10 via-blue-500/5 to-transparent dark:from-blue-500/20 dark:via-blue-500/10 dark:to-transparent",
    border: "border-blue-200/50 dark:border-blue-500/20",
    hoverBorder: "hover:border-blue-300 dark:hover:border-blue-500/40",
    hoverShadow: "hover:shadow-blue-500/10",
    accent: "from-blue-500/10",
    gradient: "from-blue-500 to-blue-600",
    shadow: "shadow-blue-500/30",
    text: "text-blue-500",
  },
  amber: {
    bg: "from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-500/20 dark:via-amber-500/10 dark:to-transparent",
    border: "border-amber-200/50 dark:border-amber-500/20",
    hoverBorder: "hover:border-amber-300 dark:hover:border-amber-500/40",
    hoverShadow: "hover:shadow-amber-500/10",
    accent: "from-amber-500/10",
    gradient: "from-amber-500 to-amber-600",
    shadow: "shadow-amber-500/30",
    text: "text-amber-500",
  },
  rose: {
    bg: "from-rose-500/10 via-rose-500/5 to-transparent dark:from-rose-500/20 dark:via-rose-500/10 dark:to-transparent",
    border: "border-rose-200/50 dark:border-rose-500/20",
    hoverBorder: "hover:border-rose-300 dark:hover:border-rose-500/40",
    hoverShadow: "hover:shadow-rose-500/10",
    accent: "from-rose-500/10",
    gradient: "from-rose-500 to-rose-600",
    shadow: "shadow-rose-500/30",
    text: "text-rose-500",
  },
};

export const StatCard = React.memo(function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  color,
  href,
}: StatCardProps) {
  const variant = colorVariants[color];

  const content = (
    <>
      <div className={cn(
        "absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl to-transparent rounded-full -translate-y-1/2 translate-x-1/2",
        variant.accent
      )} />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">
            {label}
          </p>
          <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          <p className={cn("text-[10px] md:text-xs font-medium mt-1", variant.text)}>
            {subtitle}
          </p>
        </div>
        <div className={cn(
          "w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300",
          variant.gradient,
          variant.shadow
        )}>
          <Icon className="h-5 w-5 md:h-6 md:w-6 text-white" />
        </div>
      </div>
    </>
  );

  const baseClasses = cn(
    "group relative overflow-hidden rounded-2xl bg-gradient-to-br p-4 md:p-5 transition-all duration-300 hover:shadow-lg border",
    variant.bg,
    variant.border,
    variant.hoverBorder,
    variant.hoverShadow
  );

  if (href) {
    return (
      <a href={href} className={baseClasses}>
        {content}
      </a>
    );
  }

  return (
    <div className={baseClasses}>
      {content}
    </div>
  );
});

export default StatCard;
