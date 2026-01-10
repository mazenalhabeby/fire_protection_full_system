"use client";

import { useTranslations } from "next-intl";
import { useCookieConsent } from "@/providers/CookieConsentProvider";
import { Cookie, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function CookieBanner() {
  const t = useTranslations("cookies");
  const { showBanner, acceptAll, rejectAll, openSettings } = useCookieConsent();

  if (!showBanner) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "animate-in slide-in-from-bottom-full duration-500 ease-out"
      )}
    >
      {/* Floating container */}
      <div className="mx-3 mb-3 sm:mx-4 sm:mb-4 md:mx-6 md:mb-6 lg:mx-auto lg:max-w-4xl">
        {/* Main card with premium glass effect */}
        <div className={cn(
          "relative overflow-hidden rounded-[20px] sm:rounded-[24px]",
          "bg-gradient-to-b from-white to-gray-50/95",
          "dark:from-[#1a1a2e] dark:to-[#16162a]/95",
          "backdrop-blur-xl",
          "shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_20px_50px_-12px_rgba(0,0,0,0.2)]",
          "dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_20px_50px_-12px_rgba(0,0,0,0.5)]"
        )}>
          {/* Glow effects */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-20 -left-20 w-40 h-40 bg-brand-500/20 rounded-full blur-[60px]" />
            <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-purple-500/15 rounded-full blur-[60px]" />
          </div>

          {/* Animated gradient border top */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-brand-500 via-purple-500 to-pink-500 animate-gradient-x" />

          <div className="relative p-4 sm:p-5 md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
              {/* Icon + Content */}
              <div className="flex items-start gap-3 sm:gap-4 flex-1">
                {/* Premium Icon Container */}
                <div className="relative shrink-0">
                  <div className={cn(
                    "w-11 h-11 sm:w-12 sm:h-12 rounded-2xl",
                    "bg-gradient-to-br from-brand-500/20 to-brand-600/10",
                    "dark:from-brand-500/30 dark:to-brand-600/20",
                    "flex items-center justify-center",
                    "border border-brand-500/20 dark:border-brand-400/30"
                  )}>
                    <Cookie className="h-5 w-5 sm:h-6 sm:w-6 text-brand-500" />
                  </div>
                  {/* Sparkle accent */}
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-amber-400 to-brand-500 rounded-full flex items-center justify-center shadow-lg shadow-brand-500/30">
                    <Sparkles className="w-2.5 h-2.5 text-white" />
                  </div>
                </div>

                {/* Text */}
                <div className="space-y-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                    {t("title")}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    {t("description")}{" "}
                    <button
                      onClick={openSettings}
                      className="text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 font-medium transition-colors inline-flex items-center gap-0.5 group"
                    >
                      {t("learnMore")}
                      <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                    </button>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5 shrink-0">
                {/* Settings Button */}
                <button
                  onClick={openSettings}
                  className={cn(
                    "group relative px-4 py-2.5 rounded-xl text-sm font-medium",
                    "flex items-center justify-center gap-2",
                    "bg-gray-100 hover:bg-gray-200",
                    "dark:bg-white/5 dark:hover:bg-white/10",
                    "border border-gray-200 dark:border-white/10",
                    "text-gray-700 dark:text-white/80",
                    "transition-all duration-200"
                  )}
                >
                  <Settings className="h-4 w-4 group-hover:rotate-45 transition-transform duration-300" />
                  {t("customize")}
                </button>

                {/* Reject Button */}
                <button
                  onClick={rejectAll}
                  className={cn(
                    "px-4 py-2.5 rounded-xl text-sm font-medium",
                    "bg-gray-100 hover:bg-gray-200",
                    "dark:bg-white/5 dark:hover:bg-white/10",
                    "border border-gray-200 dark:border-white/10",
                    "text-gray-700 dark:text-white/80",
                    "transition-all duration-200"
                  )}
                >
                  {t("rejectAll")}
                </button>

                {/* Accept Button - Premium */}
                <button
                  onClick={acceptAll}
                  className={cn(
                    "group relative px-5 py-2.5 rounded-xl text-sm font-semibold text-white",
                    "bg-gradient-to-r from-brand-500 to-brand-600",
                    "hover:from-brand-600 hover:to-brand-700",
                    "shadow-lg shadow-brand-500/25 hover:shadow-xl hover:shadow-brand-500/30",
                    "hover:-translate-y-0.5 active:translate-y-0",
                    "transition-all duration-200",
                    "overflow-hidden"
                  )}
                >
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <span className="relative">{t("acceptAll")}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
