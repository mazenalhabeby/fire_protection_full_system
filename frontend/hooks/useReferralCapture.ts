"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import {
  captureReferralFromUrl,
  getStoredReferral,
  clearStoredReferral,
  getReferralExpiryDays,
  type StoredReferral,
} from "@/lib/referral";

interface ReferralCaptureResult {
  /** Current stored referral data */
  referral: StoredReferral | null;
  /** The referral code if any */
  referralCode: string | null;
  /** Whether a referral code exists */
  hasReferral: boolean;
  /** Days until referral expires */
  expiryDays: number | null;
  /** Whether the referral was just captured (new) */
  isNewCapture: boolean;
  /** Clear the stored referral (call after successful registration) */
  clearReferral: () => void;
  /** Refresh referral data */
  refresh: () => void;
}

/**
 * Hook to capture and track referral codes across the application.
 * Automatically captures referral codes from URL parameters on mount.
 * Uses first-touch attribution - first referral code is preserved.
 *
 * @example
 * ```tsx
 * // In your registration page
 * const { referralCode, hasReferral, clearReferral } = useReferralCapture();
 *
 * const handleRegister = async () => {
 *   await register({ email, password, referralCode });
 *   clearReferral(); // Clear after successful registration
 * };
 * ```
 */
export function useReferralCapture(): ReferralCaptureResult {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [referral, setReferral] = useState<StoredReferral | null>(null);
  const [isNewCapture, setIsNewCapture] = useState(false);

  // Capture referral on mount and when URL changes
  useEffect(() => {
    const result = captureReferralFromUrl();
    setIsNewCapture(result.isNew);

    // Get the current stored referral
    const stored = getStoredReferral();
    setReferral(stored);
  }, [searchParams, pathname]);

  const clearReferral = useCallback(() => {
    clearStoredReferral();
    setReferral(null);
    setIsNewCapture(false);
  }, []);

  const refresh = useCallback(() => {
    const stored = getStoredReferral();
    setReferral(stored);
  }, []);

  return {
    referral,
    referralCode: referral?.code || null,
    hasReferral: !!referral?.code,
    expiryDays: getReferralExpiryDays(),
    isNewCapture,
    clearReferral,
    refresh,
  };
}

export default useReferralCapture;
