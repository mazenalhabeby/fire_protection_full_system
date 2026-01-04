/**
 * Referral Tracking System - First-Touch Attribution with 30-day Expiration
 *
 * This module handles referral code persistence in localStorage with the following rules:
 * 1. First referral code is locked (first-touch attribution)
 * 2. Code expires after 30 days if user doesn't register
 * 3. Code is cleared after successful registration
 * 4. Validates code format before storing
 */

const REFERRAL_STORAGE_KEY = 'hbct_referral';
const REFERRAL_EXPIRY_DAYS = 30;

export interface StoredReferral {
  code: string;
  capturedAt: number; // Unix timestamp
  source: ReferralSource;
  landingPage?: string;
}

export type ReferralSource =
  | 'direct_link'      // ?ref=CODE in URL
  | 'social_share'     // From social media platforms
  | 'qr_code'          // Scanned QR code
  | 'email_campaign'   // From email links
  | 'partner'          // Partner website
  | 'unknown';

/**
 * Validate referral code format
 * Must be exactly 8 alphanumeric characters (case-insensitive)
 */
export function isValidReferralCodeFormat(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  const normalized = code.trim().toUpperCase();
  return /^[A-Z0-9]{8}$/.test(normalized);
}

/**
 * Normalize referral code to uppercase
 */
export function normalizeReferralCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Check if stored referral has expired
 */
function isReferralExpired(storedReferral: StoredReferral): boolean {
  const expiryTime = storedReferral.capturedAt + (REFERRAL_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  return Date.now() > expiryTime;
}

/**
 * Get stored referral from localStorage
 * Returns null if no referral stored or if expired
 */
export function getStoredReferral(): StoredReferral | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(REFERRAL_STORAGE_KEY);
    if (!stored) return null;

    const referral: StoredReferral = JSON.parse(stored);

    // Validate stored data
    if (!referral.code || !referral.capturedAt) {
      clearStoredReferral();
      return null;
    }

    // Check expiration
    if (isReferralExpired(referral)) {
      clearStoredReferral();
      return null;
    }

    return referral;
  } catch {
    clearStoredReferral();
    return null;
  }
}

/**
 * Get stored referral code (convenience function)
 */
export function getStoredReferralCode(): string | null {
  const referral = getStoredReferral();
  return referral?.code || null;
}

/**
 * Store referral code in localStorage (first-touch only)
 * Returns true if code was stored, false if existing code was kept
 */
export function storeReferralCode(
  code: string,
  source: ReferralSource = 'direct_link',
  landingPage?: string
): { stored: boolean; existingCode?: string } {
  if (typeof window === 'undefined') {
    return { stored: false };
  }

  // Validate code format
  if (!isValidReferralCodeFormat(code)) {
    return { stored: false };
  }

  const normalizedCode = normalizeReferralCode(code);

  // Check for existing valid referral (first-touch attribution)
  const existingReferral = getStoredReferral();
  if (existingReferral) {
    // Keep existing code - first-touch wins
    return { stored: false, existingCode: existingReferral.code };
  }

  // Store new referral
  const referral: StoredReferral = {
    code: normalizedCode,
    capturedAt: Date.now(),
    source,
    landingPage: landingPage || (typeof window !== 'undefined' ? window.location.pathname : undefined),
  };

  try {
    localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify(referral));
    return { stored: true };
  } catch {
    return { stored: false };
  }
}

/**
 * Clear stored referral (call after successful registration)
 */
export function clearStoredReferral(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get remaining days until referral expires
 */
export function getReferralExpiryDays(): number | null {
  const referral = getStoredReferral();
  if (!referral) return null;

  const expiryTime = referral.capturedAt + (REFERRAL_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  const remainingMs = expiryTime - Date.now();

  if (remainingMs <= 0) return 0;
  return Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
}

/**
 * Detect referral source from URL parameters
 */
export function detectReferralSource(searchParams: URLSearchParams): ReferralSource {
  // Check for source parameter
  const source = searchParams.get('source') || searchParams.get('utm_source');

  if (source) {
    const lowerSource = source.toLowerCase();
    if (lowerSource.includes('twitter') || lowerSource.includes('facebook') ||
        lowerSource.includes('instagram') || lowerSource.includes('linkedin') ||
        lowerSource.includes('telegram') || lowerSource.includes('discord')) {
      return 'social_share';
    }
    if (lowerSource.includes('email') || lowerSource.includes('newsletter')) {
      return 'email_campaign';
    }
    if (lowerSource.includes('qr')) {
      return 'qr_code';
    }
    if (lowerSource.includes('partner')) {
      return 'partner';
    }
  }

  // Check for medium parameter
  const medium = searchParams.get('utm_medium');
  if (medium) {
    const lowerMedium = medium.toLowerCase();
    if (lowerMedium === 'social') return 'social_share';
    if (lowerMedium === 'email') return 'email_campaign';
    if (lowerMedium === 'qr') return 'qr_code';
  }

  return 'direct_link';
}

/**
 * Extract and store referral code from URL
 * Call this on every page load to capture referral codes
 */
export function captureReferralFromUrl(): {
  captured: boolean;
  code?: string;
  isNew: boolean;
  existingCode?: string;
} {
  if (typeof window === 'undefined') {
    return { captured: false, isNew: false };
  }

  try {
    const url = new URL(window.location.href);
    const searchParams = url.searchParams;

    // Look for referral code in URL (supports multiple parameter names)
    const refCode = searchParams.get('ref') ||
                   searchParams.get('referral') ||
                   searchParams.get('affiliate') ||
                   searchParams.get('r');

    if (!refCode) {
      // No referral code in URL, return existing if any
      const existing = getStoredReferralCode();
      return {
        captured: !!existing,
        code: existing || undefined,
        isNew: false
      };
    }

    // Detect source and store referral
    const source = detectReferralSource(searchParams);
    const result = storeReferralCode(refCode, source, window.location.pathname);

    if (result.stored) {
      // New code was stored
      return {
        captured: true,
        code: normalizeReferralCode(refCode),
        isNew: true
      };
    } else if (result.existingCode) {
      // Existing code was preserved (first-touch)
      return {
        captured: true,
        code: result.existingCode,
        isNew: false,
        existingCode: result.existingCode
      };
    }

    return { captured: false, isNew: false };
  } catch {
    return { captured: false, isNew: false };
  }
}

/**
 * Get referral data for registration API call
 */
export function getReferralDataForRegistration(): {
  referralCode?: string;
  referralSource?: ReferralSource;
  referralCapturedAt?: number;
} {
  const referral = getStoredReferral();
  if (!referral) return {};

  return {
    referralCode: referral.code,
    referralSource: referral.source,
    referralCapturedAt: referral.capturedAt,
  };
}
