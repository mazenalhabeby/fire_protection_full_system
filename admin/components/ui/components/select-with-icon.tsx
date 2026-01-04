"use client";

import * as React from "react";
import { cn } from "../lib/utils";
import { ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectWithIconProps {
  icon?: LucideIcon;
  value: string | number;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function SelectWithIcon({
  icon: Icon,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  className,
}: SelectWithIconProps) {
  return (
    <div className={cn("relative", className)}>
      {Icon && (
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          "w-full py-2.5 rounded-lg border border-gray-200 dark:border-gray-700",
          "bg-white dark:bg-gray-900 text-gray-900 dark:text-white",
          "appearance-none cursor-pointer",
          "focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500",
          "disabled:cursor-not-allowed disabled:opacity-50",
          Icon ? "pl-10 pr-10" : "pl-4 pr-10"
        )}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
    </div>
  );
}

interface FormSelectProps extends SelectWithIconProps {
  label: string;
  error?: string;
}

export function FormSelect({
  label,
  error,
  className,
  ...props
}: FormSelectProps) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>
      <SelectWithIcon {...props} />
      {error && (
        <p className="mt-1 text-sm text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
