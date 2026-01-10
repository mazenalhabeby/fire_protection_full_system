"use client";

import { useEffect } from "react";
import Script from "next/script";
import { useCookieConsent, CookiePreferences } from "@/providers/CookieConsentProvider";

interface CookieScriptProps {
  /** Which cookie category this script belongs to */
  category: keyof Omit<CookiePreferences, "essential">;
  /** Script source URL */
  src?: string;
  /** Inline script content */
  children?: string;
  /** Script ID for Next.js Script component */
  id: string;
  /** Loading strategy */
  strategy?: "afterInteractive" | "lazyOnload" | "worker";
  /** Callback when script loads */
  onLoad?: () => void;
}

/**
 * CookieScript - Conditionally loads scripts based on user's cookie consent.
 *
 * Usage:
 * ```tsx
 * // Google Analytics - only loads if user accepted analytics cookies
 * <CookieScript
 *   category="analytics"
 *   id="google-analytics"
 *   src="https://www.googletagmanager.com/gtag/js?id=GA_TRACKING_ID"
 *   strategy="afterInteractive"
 * />
 *
 * // Inline script for marketing
 * <CookieScript category="marketing" id="facebook-pixel">
 *   {`fbq('init', 'YOUR_PIXEL_ID');`}
 * </CookieScript>
 * ```
 */
export function CookieScript({
  category,
  src,
  children,
  id,
  strategy = "afterInteractive",
  onLoad,
}: CookieScriptProps) {
  const { preferences, hasConsented } = useCookieConsent();

  // Don't render anything if user hasn't consented or rejected this category
  if (!hasConsented || !preferences[category]) {
    return null;
  }

  // External script
  if (src) {
    return (
      <Script
        id={id}
        src={src}
        strategy={strategy}
        onLoad={onLoad}
      />
    );
  }

  // Inline script
  if (children) {
    return (
      <Script
        id={id}
        strategy={strategy}
        onLoad={onLoad}
        dangerouslySetInnerHTML={{ __html: children }}
      />
    );
  }

  return null;
}

/**
 * Hook to check if a specific cookie category is allowed.
 * Use this to conditionally run code based on consent.
 *
 * Usage:
 * ```tsx
 * const { isAllowed } = useCookieCategory("analytics");
 *
 * useEffect(() => {
 *   if (isAllowed) {
 *     // Initialize analytics
 *   }
 * }, [isAllowed]);
 * ```
 */
export function useCookieCategory(category: keyof CookiePreferences) {
  const { preferences, hasConsented } = useCookieConsent();

  return {
    isAllowed: hasConsented && preferences[category],
    hasConsented,
  };
}

/**
 * Hook to run an effect only when a cookie category is allowed.
 *
 * Usage:
 * ```tsx
 * useCookieEffect("analytics", () => {
 *   // This only runs if user accepted analytics cookies
 *   initializeAnalytics();
 * }, []);
 * ```
 */
export function useCookieEffect(
  category: keyof CookiePreferences,
  effect: () => void | (() => void),
  deps: React.DependencyList = []
) {
  const { isAllowed } = useCookieCategory(category);

  useEffect(() => {
    if (isAllowed) {
      return effect();
    }
  }, [isAllowed, ...deps]);
}
