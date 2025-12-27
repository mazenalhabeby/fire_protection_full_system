import * as React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  variant?: "default" | "success" | "danger" | "warning";
  className?: string;
}

export function StatCard({
  label,
  value,
  change,
  changeLabel,
  icon,
  variant = "default",
  className,
}: StatCardProps) {
  const isPositive = change !== undefined && change >= 0;
  const showChange = change !== undefined;

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-4 transition-colors",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p
            className={cn(
              "text-2xl font-bold tracking-tight",
              variant === "success" && "text-success",
              variant === "danger" && "text-danger",
              variant === "warning" && "text-amber-500",
              variant === "default" && "text-foreground"
            )}
          >
            {value}
          </p>
        </div>
        {icon && (
          <div className="text-muted-foreground">{icon}</div>
        )}
      </div>
      {showChange && (
        <div className="mt-2 flex items-center gap-1">
          {isPositive ? (
            <TrendingUp className="h-3 w-3 text-success" />
          ) : (
            <TrendingDown className="h-3 w-3 text-danger" />
          )}
          <span
            className={cn(
              "text-xs font-medium",
              isPositive ? "text-success" : "text-danger"
            )}
          >
            {isPositive ? "+" : ""}
            {change}%
          </span>
          {changeLabel && (
            <span className="text-xs text-muted-foreground">
              {changeLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface StatCardCompactProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function StatCardCompact({
  label,
  value,
  subValue,
  icon,
  className,
}: StatCardCompactProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card p-3",
        className
      )}
    >
      {icon && (
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-lg font-semibold text-foreground truncate">
          {value}
        </p>
        {subValue && (
          <p className="text-xs text-muted-foreground truncate">{subValue}</p>
        )}
      </div>
    </div>
  );
}
