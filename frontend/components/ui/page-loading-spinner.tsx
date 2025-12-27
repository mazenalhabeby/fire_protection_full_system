"use client";

import { Flame, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageLoadingSpinnerProps {
  variant?: "flame" | "simple";
  message?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeConfig = {
  sm: {
    container: "w-12 h-12",
    border: "border-[3px]",
    icon: "h-4 w-4",
    loader: "h-6 w-6",
    text: "text-sm",
  },
  md: {
    container: "w-16 h-16",
    border: "border-4",
    icon: "h-6 w-6",
    loader: "h-8 w-8",
    text: "text-base",
  },
  lg: {
    container: "w-20 h-20",
    border: "border-4",
    icon: "h-8 w-8",
    loader: "h-10 w-10",
    text: "text-lg",
  },
};

export function PageLoadingSpinner({
  variant = "flame",
  message = "Loading...",
  className,
  size = "md",
}: PageLoadingSpinnerProps) {
  const config = sizeConfig[size];

  if (variant === "simple") {
    return (
      <div className={cn("flex-1 flex items-center justify-center min-h-[60vh]", className)}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className={cn(config.loader, "animate-spin text-brand-500")} />
          {message && (
            <p className={cn("text-gray-500 dark:text-gray-400", config.text)}>{message}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex-1 flex items-center justify-center min-h-[60vh]", className)}>
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div
            className={cn(
              config.container,
              config.border,
              "rounded-full border-brand-500/20 border-t-brand-500 animate-spin"
            )}
          />
          <Flame
            className={cn(
              config.icon,
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand-500"
            )}
          />
        </div>
        {message && (
          <p className={cn("text-gray-500 dark:text-gray-400 animate-pulse", config.text)}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
