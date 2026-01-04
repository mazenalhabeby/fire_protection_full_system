import { cn } from "@/components/ui";
import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
}

const variantStyles = {
  default: {
    bg: "from-gray-500/10 via-gray-500/5 to-transparent dark:from-gray-500/20 dark:via-gray-500/10 dark:to-transparent",
    border: "border-gray-200/50 dark:border-gray-500/20",
    iconBg: "from-gray-500 to-gray-600",
    shadow: "shadow-gray-500/30",
    text: "text-gray-500",
  },
  success: {
    bg: "from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-500/20 dark:via-emerald-500/10 dark:to-transparent",
    border: "border-emerald-200/50 dark:border-emerald-500/20",
    iconBg: "from-emerald-500 to-emerald-600",
    shadow: "shadow-emerald-500/30",
    text: "text-emerald-500",
  },
  warning: {
    bg: "from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-500/20 dark:via-amber-500/10 dark:to-transparent",
    border: "border-amber-200/50 dark:border-amber-500/20",
    iconBg: "from-amber-500 to-amber-600",
    shadow: "shadow-amber-500/30",
    text: "text-amber-500",
  },
  danger: {
    bg: "from-red-500/10 via-red-500/5 to-transparent dark:from-red-500/20 dark:via-red-500/10 dark:to-transparent",
    border: "border-red-200/50 dark:border-red-500/20",
    iconBg: "from-red-500 to-red-600",
    shadow: "shadow-red-500/30",
    text: "text-red-500",
  },
};

export function StatCard({ label, value, icon, variant = "default" }: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl bg-gradient-to-br p-4 md:p-5 transition-all duration-300 hover:shadow-lg border",
        styles.bg,
        styles.border
      )}
    >
      <div
        className={cn(
          "absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl to-transparent rounded-full -translate-y-1/2 translate-x-1/2",
          styles.bg.split(" ")[0]
        )}
      />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">
            {label}
          </p>
          <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
        </div>
        <div
          className={cn(
            "w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300",
            styles.iconBg,
            styles.shadow
          )}
        >
          <div className="text-white">{icon}</div>
        </div>
      </div>
    </div>
  );
}
