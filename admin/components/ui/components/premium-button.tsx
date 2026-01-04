"use client";

import { forwardRef } from "react";
import { Loader2, type LucideIcon } from "lucide-react";
import { cn } from "../lib/utils";

type GradientVariant = "brand" | "purple" | "emerald" | "blue" | "red";

interface PremiumButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: GradientVariant;
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  loadingText?: string;
  icon?: LucideIcon;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
  shimmer?: boolean;
}

const gradientConfig: Record<GradientVariant, { gradient: string; shadow: string }> = {
  brand: {
    gradient: "bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700",
    shadow: "shadow-brand-500/25 hover:shadow-brand-500/30",
  },
  purple: {
    gradient: "bg-gradient-to-r from-purple-500 via-purple-600 to-purple-500 bg-[length:200%_100%] hover:bg-right",
    shadow: "shadow-purple-500/25 hover:shadow-purple-500/35",
  },
  emerald: {
    gradient: "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700",
    shadow: "shadow-emerald-500/25 hover:shadow-emerald-500/30",
  },
  blue: {
    gradient: "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
    shadow: "shadow-blue-500/25 hover:shadow-blue-500/30",
  },
  red: {
    gradient: "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700",
    shadow: "shadow-red-500/25 hover:shadow-red-500/30",
  },
};

const sizeConfig = {
  sm: {
    height: "h-10",
    text: "text-sm",
    icon: "h-4 w-4",
    rounded: "rounded-xl",
  },
  md: {
    height: "h-12",
    text: "text-base",
    icon: "h-5 w-5",
    rounded: "rounded-xl",
  },
  lg: {
    height: "h-14",
    text: "text-lg",
    icon: "h-5 w-5",
    rounded: "rounded-2xl",
  },
};

export const PremiumButton = forwardRef<HTMLButtonElement, PremiumButtonProps>(
  (
    {
      variant = "brand",
      size = "md",
      isLoading = false,
      loadingText,
      icon: Icon,
      iconPosition = "left",
      fullWidth = false,
      shimmer = true,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const { gradient, shadow } = gradientConfig[variant];
    const { height, text, icon, rounded } = sizeConfig[size];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "group relative font-semibold text-white overflow-hidden",
          "transition-all duration-300",
          "hover:-translate-y-0.5 active:translate-y-0",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg",
          height,
          text,
          rounded,
          gradient,
          "shadow-lg",
          shadow,
          "hover:shadow-xl",
          fullWidth ? "w-full" : "px-6",
          className
        )}
        {...props}
      >
        {/* Shimmer effect */}
        {shimmer && (
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        )}

        <span className="relative flex items-center justify-center gap-2">
          {isLoading ? (
            <>
              <Loader2 className={cn(icon, "animate-spin")} />
              {loadingText || children}
            </>
          ) : (
            <>
              {Icon && iconPosition === "left" && <Icon className={icon} />}
              {children}
              {Icon && iconPosition === "right" && <Icon className={icon} />}
            </>
          )}
        </span>
      </button>
    );
  }
);

PremiumButton.displayName = "PremiumButton";
