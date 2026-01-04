"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { authApi } from "@/lib/api/auth";
import { cn } from "@/lib/utils";
import {
  Shield,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Lock,
} from "lucide-react";

interface TwoFactorPromptProps {
  className?: string;
}

export function TwoFactorPrompt({ className }: TwoFactorPromptProps) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkTwoFactorStatus();
  }, []);

  const checkTwoFactorStatus = async () => {
    try {
      const status = await authApi.getTwoFactorStatus();
      setIsVisible(!status.isEnabled);
    } catch (error) {
      // If we can't check, don't show the prompt
      setIsVisible(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnableClick = () => {
    router.push('/settings?tab=security');
  };

  if (isLoading || !isVisible) {
    return null;
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl",
        "bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10",
        "dark:from-emerald-500/20 dark:via-teal-500/15 dark:to-cyan-500/20",
        "border border-emerald-200/50 dark:border-emerald-500/30",
        "shadow-lg shadow-emerald-500/5 dark:shadow-emerald-500/10",
        "transition-all duration-500 animate-in fade-in slide-in-from-top-4",
        className
      )}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating orbs */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-emerald-400/20 to-teal-400/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-gradient-to-br from-cyan-400/20 to-emerald-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />

        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(16,185,129,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.3) 1px, transparent 1px)`,
            backgroundSize: "30px 30px",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 p-4 md:p-5">
        <div className="flex items-start gap-4">
          {/* Icon with glow */}
          <div className="relative shrink-0">
            <div className="absolute inset-0 bg-emerald-500/30 rounded-2xl blur-xl animate-pulse" />
            <div className="relative w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Shield className="h-6 w-6 md:h-7 md:w-7 text-white" />
              {/* Sparkle accent */}
              <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-yellow-400 animate-pulse" />
            </div>
          </div>

          {/* Text content */}
          <div className="flex-1 min-w-0">
            <div>
              <h3 className="text-sm md:text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                Secure Your Account
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full">
                  <Lock className="h-2.5 w-2.5" />
                  Recommended
                </span>
              </h3>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                Enable two-factor authentication to add an extra layer of security to your account and protect your HBCT tokens.
              </p>
            </div>

            {/* CTA Button */}
            <div className="mt-3">
              <button
                onClick={handleEnableClick}
                className={cn(
                  "group inline-flex items-center gap-2 px-4 py-2 rounded-xl",
                  "bg-gradient-to-r from-emerald-500 to-teal-600",
                  "text-white text-sm font-semibold",
                  "shadow-lg shadow-emerald-500/25",
                  "hover:shadow-xl hover:shadow-emerald-500/30",
                  "hover:-translate-y-0.5 active:translate-y-0",
                  "transition-all duration-200"
                )}
              >
                <ShieldCheck className="h-4 w-4" />
                Enable 2FA Now
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 opacity-60" />
    </div>
  );
}
