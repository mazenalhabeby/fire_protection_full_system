"use client";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
}

export function PageHeader({
  title,
  subtitle,
  align = "left",
  className,
  titleClassName,
  subtitleClassName,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "mb-8",
        align === "center" && "text-center",
        className
      )}
    >
      <h1
        className={cn(
          "text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2",
          titleClassName
        )}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          className={cn(
            "text-gray-500 dark:text-gray-400",
            subtitleClassName
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
