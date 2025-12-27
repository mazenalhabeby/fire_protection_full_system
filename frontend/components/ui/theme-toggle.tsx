"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  showLabels?: boolean;
}

export function ThemeToggle({ className, showLabels = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <Button variant="ghost" size="icon-sm" disabled>
          <Sun className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (showLabels) {
    return (
      <div className={cn("flex flex-col gap-1", className)}>
        <button
          onClick={() => setTheme("light")}
          className={cn(
            "flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors",
            theme === "light"
              ? "bg-primary text-primary-foreground"
              : "hover:bg-secondary text-foreground"
          )}
        >
          <Sun className="h-4 w-4" />
          <span>Light</span>
        </button>
        <button
          onClick={() => setTheme("dark")}
          className={cn(
            "flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors",
            theme === "dark"
              ? "bg-primary text-primary-foreground"
              : "hover:bg-secondary text-foreground"
          )}
        >
          <Moon className="h-4 w-4" />
          <span>Dark</span>
        </button>
        <button
          onClick={() => setTheme("system")}
          className={cn(
            "flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors",
            theme === "system"
              ? "bg-primary text-primary-foreground"
              : "hover:bg-secondary text-foreground"
          )}
        >
          <Monitor className="h-4 w-4" />
          <span>System</span>
        </button>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        variant={theme === "light" ? "default" : "ghost"}
        size="icon-sm"
        onClick={() => setTheme("light")}
        title="Light mode"
      >
        <Sun className="h-4 w-4" />
      </Button>
      <Button
        variant={theme === "dark" ? "default" : "ghost"}
        size="icon-sm"
        onClick={() => setTheme("dark")}
        title="Dark mode"
      >
        <Moon className="h-4 w-4" />
      </Button>
      <Button
        variant={theme === "system" ? "default" : "ghost"}
        size="icon-sm"
        onClick={() => setTheme("system")}
        title="System preference"
      >
        <Monitor className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function ThemeToggleSimple({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon-sm" disabled className={className}>
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className={className}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}

// Modern animated theme toggle
export function ThemeToggleAnimated({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={cn("w-14 h-8 rounded-full bg-gray-200 animate-pulse", className)} />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative w-14 h-8 rounded-full p-1",
        "transition-colors duration-300 ease-in-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
        isDark
          ? "bg-gray-700"
          : "bg-brand-100",
        className
      )}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {/* Track background icons */}
      <div className="absolute inset-0 flex items-center justify-between px-1.5">
        <Sun className={cn(
          "w-4 h-4 transition-opacity duration-200",
          isDark ? "opacity-30 text-gray-500" : "opacity-0"
        )} />
        <Moon className={cn(
          "w-4 h-4 transition-opacity duration-200",
          isDark ? "opacity-0" : "opacity-30 text-brand-300"
        )} />
      </div>

      {/* Sliding thumb */}
      <div
        className={cn(
          "relative w-6 h-6 rounded-full",
          "flex items-center justify-center",
          "transition-all duration-300 ease-in-out",
          "shadow-md",
          isDark
            ? "translate-x-6 bg-gray-900"
            : "translate-x-0 bg-white"
        )}
      >
        {/* Sun icon in thumb */}
        <Sun className={cn(
          "absolute w-4 h-4 transition-all duration-300",
          isDark
            ? "opacity-0 rotate-90 scale-0"
            : "opacity-100 rotate-0 scale-100 text-brand-500"
        )} />

        {/* Moon icon in thumb */}
        <Moon className={cn(
          "absolute w-4 h-4 transition-all duration-300",
          isDark
            ? "opacity-100 rotate-0 scale-100 text-yellow-400"
            : "opacity-0 -rotate-90 scale-0"
        )} />
      </div>
    </button>
  );
}

// Premium modern toggle for navbar with 3 options
export function ThemeToggleCompact({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={cn("flex items-center gap-0.5 p-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse", className)}>
        <div className="w-7 h-7" />
        <div className="w-7 h-7" />
        <div className="w-7 h-7" />
      </div>
    );
  }

  const options = [
    { value: 'light', icon: Sun, label: 'Light', gradient: 'from-amber-400 to-orange-500', shadow: 'shadow-amber-500/30' },
    { value: 'dark', icon: Moon, label: 'Dark', gradient: 'from-indigo-500 to-purple-600', shadow: 'shadow-indigo-500/30' },
    { value: 'system', icon: Monitor, label: 'Auto', gradient: 'from-gray-500 to-gray-600', shadow: 'shadow-gray-500/30' },
  ];

  return (
    <div
      className={cn(
        "relative flex items-center gap-0.5 p-0.5 rounded-lg",
        "bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm",
        "border border-gray-200/50 dark:border-gray-700/50",
        className
      )}
    >
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = theme === option.value;

        return (
          <button
            key={option.value}
            onClick={() => setTheme(option.value)}
            className={cn(
              "relative flex items-center justify-center w-7 h-7 rounded-md",
              "transition-all duration-200 ease-out",
              "focus-visible:outline-none",
              isActive
                ? [
                    `bg-gradient-to-br ${option.gradient}`,
                    "shadow-sm",
                  ]
                : [
                    "hover:bg-white/80 dark:hover:bg-gray-700/80",
                    "text-gray-400 dark:text-gray-500",
                    "hover:text-gray-600 dark:hover:text-gray-300",
                  ]
            )}
            title={option.label}
            aria-label={`Switch to ${option.label} mode`}
          >
            <Icon
              className={cn(
                "w-3.5 h-3.5 transition-all duration-200",
                isActive && "text-white"
              )}
              strokeWidth={2}
            />
          </button>
        );
      })}
    </div>
  );
}
