"use client";

import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  iconClassName?: string;
  size?: "sm" | "md" | "lg";
}

const sizeConfig = {
  sm: {
    container: "py-8",
    iconWrapper: "w-12 h-12",
    icon: "h-6 w-6",
    message: "text-sm",
    description: "text-xs",
  },
  md: {
    container: "py-12",
    iconWrapper: "w-16 h-16",
    icon: "h-8 w-8",
    message: "text-sm",
    description: "text-xs",
  },
  lg: {
    container: "py-16",
    iconWrapper: "w-20 h-20",
    icon: "h-10 w-10",
    message: "text-base",
    description: "text-sm",
  },
};

export function EmptyState({
  icon: Icon,
  message,
  description,
  action,
  className,
  iconClassName,
  size = "md",
}: EmptyStateProps) {
  const config = sizeConfig[size];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4",
        config.container,
        className
      )}
    >
      <div
        className={cn(
          config.iconWrapper,
          "rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4"
        )}
      >
        <Icon
          className={cn(
            config.icon,
            "text-gray-400 dark:text-gray-500",
            iconClassName
          )}
        />
      </div>
      <p
        className={cn(
          "text-gray-500 dark:text-gray-400 text-center font-medium",
          config.message
        )}
      >
        {message}
      </p>
      {description && (
        <p
          className={cn(
            "text-gray-400 dark:text-gray-500 text-center mt-1",
            config.description
          )}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
