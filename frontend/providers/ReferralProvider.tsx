"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import {
  captureReferralFromUrl,
  getStoredReferral,
  clearStoredReferral,
  getReferralExpiryDays,
  type StoredReferral,
  type ReferralSource,
} from "@/lib/referral";

interface ReferralContextValue {
  /** Current stored referral data */
  referral: StoredReferral | null;
  /** The referral code if any */
  referralCode: string | null;
  /** Whether a referral code exists */
  hasReferral: boolean;
  /** Days until referral expires */
  expiryDays: number | null;
  /** Source of the referral */
  referralSource: ReferralSource | null;
  /** Clear the stored referral (call after successful registration) */
  clearReferral: () => void;
  /** Refresh referral data */
  refresh: () => void;
}

const ReferralContext = createContext<ReferralContextValue | null>(null);

/**
 * Provider that captures referral codes from URLs across the entire application.
 * Uses first-touch attribution - the first referral code is preserved for 30 days.
 *
 * Place this provider high in your component tree to ensure referrals are captured
 * regardless of which page the user lands on.
 */
export function ReferralProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [referral, setReferral] = useState<StoredReferral | null>(null);
  const [mounted, setMounted] = useState(false);

  // Capture referral on mount and when URL changes
  useEffect(() => {
    setMounted(true);
    captureReferralFromUrl();
    setReferral(getStoredReferral());
  }, []);

  // Re-check when URL changes (in case user navigates with new ref param)
  useEffect(() => {
    if (!mounted) return;
    captureReferralFromUrl();
    setReferral(getStoredReferral());
  }, [searchParams, pathname, mounted]);

  const clearReferral = useCallback(() => {
    clearStoredReferral();
    setReferral(null);
  }, []);

  const refresh = useCallback(() => {
    setReferral(getStoredReferral());
  }, []);

  const value: ReferralContextValue = {
    referral,
    referralCode: referral?.code || null,
    hasReferral: !!referral?.code,
    expiryDays: getReferralExpiryDays(),
    referralSource: referral?.source || null,
    clearReferral,
    refresh,
  };

  return (
    <ReferralContext.Provider value={value}>
      {children}
    </ReferralContext.Provider>
  );
}

/**
 * Hook to access referral context
 * Must be used within ReferralProvider
 */
export function useReferral(): ReferralContextValue {
  const context = useContext(ReferralContext);
  if (!context) {
    throw new Error("useReferral must be used within a ReferralProvider");
  }
  return context;
}

export default ReferralProvider;
