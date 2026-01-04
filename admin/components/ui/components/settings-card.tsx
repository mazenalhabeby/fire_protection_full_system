"use client";

import * as React from "react";
import { cn } from "../lib/utils";
import type { LucideIcon } from "lucide-react";

interface SettingsCardProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  noPadding?: boolean;
}

export function SettingsCard({
  icon: Icon,
  title,
  description,
  children,
  className,
  contentClassName,
  noPadding = false,
}: SettingsCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden",
        className
      )}
    >
      <div className="p-6 border-b border-gray-100 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 text-brand-500" />}
          {title}
        </h2>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {description}
          </p>
        )}
      </div>
      <div className={cn(!noPadding && "p-6", contentClassName)}>
        {children}
      </div>
    </div>
  );
}

interface SettingsRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function SettingsRow({
  label,
  description,
  children,
  className,
}: SettingsRowProps) {
  return (
    <div className={cn("flex items-center justify-between py-4", className)}>
      <div className="flex-1 pr-4">
        <p className="font-medium text-gray-900 dark:text-white text-sm">
          {label}
        </p>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

interface SettingsDividerProps {
  className?: string;
}

export function SettingsDivider({ className }: SettingsDividerProps) {
  return (
    <div
      className={cn("border-t border-gray-100 dark:border-gray-800", className)}
    />
  );
}
