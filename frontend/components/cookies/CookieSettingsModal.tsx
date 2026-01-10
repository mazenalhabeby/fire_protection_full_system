"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { useCookieConsent, CookiePreferences } from "@/providers/CookieConsentProvider";
import { Switch } from "@/components/ui/switch";
import { Shield, BarChart3, Megaphone, SlidersHorizontal, Lock, Cookie, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CookieCategory {
  key: keyof CookiePreferences;
  icon: React.ReactNode;
  gradient: string;
  shadowColor: string;
  required?: boolean;
}

const cookieCategories: CookieCategory[] = [
  {
    key: "essential",
    icon: <Shield className="h-5 w-5" />,
    gradient: "from-emerald-500 to-emerald-600",
    shadowColor: "shadow-emerald-500/20",
    required: true
  },
  {
    key: "analytics",
    icon: <BarChart3 className="h-5 w-5" />,
    gradient: "from-blue-500 to-blue-600",
    shadowColor: "shadow-blue-500/20"
  },
  {
    key: "marketing",
    icon: <Megaphone className="h-5 w-5" />,
    gradient: "from-purple-500 to-purple-600",
    shadowColor: "shadow-purple-500/20"
  },
  {
    key: "preferences",
    icon: <SlidersHorizontal className="h-5 w-5" />,
    gradient: "from-amber-500 to-orange-500",
    shadowColor: "shadow-amber-500/20"
  },
];

export function CookieSettingsModal() {
  const t = useTranslations("cookies");
  const { showSettings, closeSettings, preferences, savePreferences, acceptAll, rejectAll } = useCookieConsent();
  const [localPreferences, setLocalPreferences] = useState<CookiePreferences>(preferences);
  const [isClosing, setIsClosing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Drag state for mobile
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    }
  }, []);

  useEffect(() => {
    if (showSettings) {
      setLocalPreferences(preferences);
      setIsClosing(false);
      setDragY(0);
    }
  }, [showSettings, preferences]);

  const handleToggle = (key: keyof CookiePreferences) => {
    if (key === "essential") return;
    setLocalPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleAnimatedClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      closeSettings();
      setIsClosing(false);
      setDragY(0);
    }, 200);
  }, [closeSettings]);

  const handleSave = () => {
    savePreferences(localPreferences);
  };

  // Touch handlers for mobile drag-to-close
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientY - dragStartY.current;
    if (diff > 0) {
      e.preventDefault();
      setDragY(diff);
    }
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    if (dragY > 100) {
      handleAnimatedClose();
    } else {
      setDragY(0);
    }
  }, [dragY, handleAnimatedClose]);

  if (!showSettings) return null;

  // Mobile Bottom Sheet View
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        <div
          className={cn(
            "fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm",
            !isClosing && "animate-in fade-in-0 duration-300",
            isClosing && "opacity-0 transition-opacity duration-200"
          )}
          style={{ opacity: isClosing ? 0 : Math.max(0, 1 - dragY / 300) }}
          onClick={handleAnimatedClose}
        />

        {/* Bottom Sheet */}
        <div
          className={cn(
            "fixed inset-x-0 bottom-0 z-[100]",
            !isClosing && "animate-in slide-in-from-bottom duration-300 ease-out",
            isDragging && "transition-none",
            isClosing && "transition-transform duration-200 ease-in"
          )}
          style={{ transform: isClosing ? "translateY(100%)" : `translateY(${dragY}px)` }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className={cn(
            "relative overflow-hidden rounded-t-[28px]",
            "bg-gradient-to-b from-white to-gray-50",
            "dark:from-[#1a1a2e] dark:to-[#16162a]",
            "shadow-[0_-10px_40px_rgba(0,0,0,0.2)]"
          )}>
            {/* Gradient top border */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-brand-500 via-purple-500 to-pink-500" />

            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-600/10 flex items-center justify-center border border-brand-500/20">
                  <Cookie className="h-5 w-5 text-brand-500" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t("settings.title")}
                </h2>
              </div>
              <button
                onClick={handleAnimatedClose}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500 dark:text-white/60" />
              </button>
            </div>

            {/* Categories */}
            <div className="px-4 pb-4 space-y-2 max-h-[50vh] overflow-y-auto">
              {cookieCategories.map((category) => (
                <div
                  key={category.key}
                  className={cn(
                    "flex items-center gap-3 p-3.5 rounded-2xl",
                    "bg-gray-50 dark:bg-white/5",
                    "border border-gray-100 dark:border-white/5",
                    "transition-all duration-200"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center text-white",
                    "bg-gradient-to-br",
                    category.gradient,
                    "shadow-lg",
                    category.shadowColor
                  )}>
                    {category.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                        {t(`categories.${category.key}.title`)}
                      </h4>
                      {category.required && (
                        <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                          <Lock className="h-2.5 w-2.5" />
                          {t("required")}
                        </span>
                      )}
                    </div>
                  </div>
                  <Switch
                    checked={localPreferences[category.key]}
                    onCheckedChange={() => handleToggle(category.key)}
                    disabled={category.required}
                    className="data-[state=checked]:bg-brand-500"
                  />
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="p-4 pt-2 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-black/20">
              <div className="flex gap-2">
                <button
                  onClick={rejectAll}
                  className="flex-1 py-3 rounded-xl text-sm font-medium bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-white/80 border border-gray-200 dark:border-white/10"
                >
                  {t("rejectAll")}
                </button>
                <button
                  onClick={acceptAll}
                  className="flex-1 py-3 rounded-xl text-sm font-medium bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-white/80 border border-gray-200 dark:border-white/10"
                >
                  {t("acceptAll")}
                </button>
              </div>
              <button
                onClick={handleSave}
                className={cn(
                  "w-full mt-2 py-3.5 rounded-xl text-sm font-semibold text-white",
                  "bg-gradient-to-r from-brand-500 to-brand-600",
                  "shadow-lg shadow-brand-500/25",
                  "flex items-center justify-center gap-2"
                )}
              >
                <Check className="w-4 h-4" />
                {t("savePreferences")}
              </button>
            </div>

            {/* Safe area padding */}
            <div className="h-6" />
          </div>
        </div>
      </>
    );
  }

  // Desktop Modal View
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-sm",
          !isClosing && "animate-in fade-in-0 duration-300",
          isClosing && "opacity-0 transition-opacity duration-200"
        )}
        onClick={handleAnimatedClose}
      />

      {/* Modal */}
      <div className={cn(
        "relative w-full max-w-md",
        !isClosing && "animate-in zoom-in-95 fade-in-0 duration-300",
        isClosing && "opacity-0 scale-95 transition-all duration-200"
      )}>
        <div className={cn(
          "relative overflow-hidden rounded-[28px]",
          "bg-gradient-to-b from-white to-gray-50",
          "dark:from-[#1a1a2e] dark:to-[#16162a]",
          "shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_30px_60px_-12px_rgba(0,0,0,0.25)]",
          "dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_30px_60px_-12px_rgba(0,0,0,0.5)]"
        )}>
          {/* Glow effects */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-60 h-60 bg-brand-500/15 rounded-full blur-[80px]" />
            <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-60 h-60 bg-purple-500/10 rounded-full blur-[80px]" />
          </div>

          {/* Gradient top border */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-brand-500 via-purple-500 to-pink-500" />

          {/* Close button */}
          <button
            onClick={handleAnimatedClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 transition-all z-10"
          >
            <X className="w-4 h-4 text-gray-500 dark:text-white/60" />
          </button>

          {/* Header */}
          <div className="relative px-6 pt-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500/20 to-brand-600/10 dark:from-brand-500/30 dark:to-brand-600/20 flex items-center justify-center border border-brand-500/20 dark:border-brand-400/30">
                  <Cookie className="h-6 w-6 text-brand-500" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {t("settings.title")}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("settings.description")}
                </p>
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="relative px-5 pb-4 space-y-3 max-h-[45vh] overflow-y-auto">
            {cookieCategories.map((category, index) => (
              <div
                key={category.key}
                className={cn(
                  "group flex items-start gap-4 p-4 rounded-2xl",
                  "bg-gray-50/80 hover:bg-gray-100/80",
                  "dark:bg-white/[0.03] dark:hover:bg-white/[0.06]",
                  "border border-gray-100 dark:border-white/5",
                  "transition-all duration-300",
                  "hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-none"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Icon with gradient */}
                <div className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0",
                  "bg-gradient-to-br",
                  category.gradient,
                  "shadow-lg",
                  category.shadowColor,
                  "group-hover:scale-105 transition-transform duration-300"
                )}>
                  {category.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {t(`categories.${category.key}.title`)}
                      </h4>
                      {category.required && (
                        <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                          <Lock className="h-2.5 w-2.5" />
                          {t("required")}
                        </span>
                      )}
                    </div>
                    <Switch
                      checked={localPreferences[category.key]}
                      onCheckedChange={() => handleToggle(category.key)}
                      disabled={category.required}
                      className={cn(
                        "data-[state=checked]:bg-brand-500",
                        category.required && "opacity-70"
                      )}
                    />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    {t(`categories.${category.key}.description`)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer Actions */}
          <div className="relative p-5 pt-4 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-black/20">
            <div className="flex gap-2.5">
              <button
                onClick={rejectAll}
                className={cn(
                  "flex-1 py-3 rounded-xl text-sm font-medium",
                  "bg-gray-100 hover:bg-gray-200",
                  "dark:bg-white/5 dark:hover:bg-white/10",
                  "border border-gray-200 dark:border-white/10",
                  "text-gray-700 dark:text-white/80",
                  "transition-all duration-200"
                )}
              >
                {t("rejectAll")}
              </button>
              <button
                onClick={acceptAll}
                className={cn(
                  "flex-1 py-3 rounded-xl text-sm font-medium",
                  "bg-gray-100 hover:bg-gray-200",
                  "dark:bg-white/5 dark:hover:bg-white/10",
                  "border border-gray-200 dark:border-white/10",
                  "text-gray-700 dark:text-white/80",
                  "transition-all duration-200"
                )}
              >
                {t("acceptAll")}
              </button>
            </div>
            <button
              onClick={handleSave}
              className={cn(
                "group relative w-full mt-2.5 py-3.5 rounded-xl text-sm font-semibold text-white",
                "bg-gradient-to-r from-brand-500 to-brand-600",
                "hover:from-brand-600 hover:to-brand-700",
                "shadow-lg shadow-brand-500/25 hover:shadow-xl hover:shadow-brand-500/30",
                "hover:-translate-y-0.5 active:translate-y-0",
                "transition-all duration-200",
                "overflow-hidden",
                "flex items-center justify-center gap-2"
              )}
            >
              {/* Shimmer */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <Check className="w-4 h-4 relative" />
              <span className="relative">{t("savePreferences")}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
