"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

// Cookie categories
export interface CookiePreferences {
  essential: boolean; // Always true, cannot be disabled
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}

export interface CookieConsentState {
  hasConsented: boolean;
  preferences: CookiePreferences;
  showBanner: boolean;
  showSettings: boolean;
}

export interface CookieConsentContextType extends CookieConsentState {
  acceptAll: () => void;
  rejectAll: () => void;
  savePreferences: (preferences: Partial<CookiePreferences>) => void;
  openSettings: () => void;
  closeSettings: () => void;
  resetConsent: () => void;
}

const COOKIE_CONSENT_KEY = "hbct_cookie_consent";
const COOKIE_PREFERENCES_KEY = "hbct_cookie_preferences";

const defaultPreferences: CookiePreferences = {
  essential: true,
  analytics: false,
  marketing: false,
  preferences: false,
};

const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined);

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [hasConsented, setHasConsented] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(defaultPreferences);
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load consent state from localStorage on mount
  useEffect(() => {
    const storedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
    const storedPreferences = localStorage.getItem(COOKIE_PREFERENCES_KEY);

    if (storedConsent === "true" && storedPreferences) {
      try {
        const parsedPreferences = JSON.parse(storedPreferences) as CookiePreferences;
        setPreferences({ ...parsedPreferences, essential: true });
        setHasConsented(true);
        setShowBanner(false);
      } catch {
        // Invalid stored data, show banner
        setShowBanner(true);
      }
    } else {
      // No consent stored, show banner
      setShowBanner(true);
    }
    setIsInitialized(true);
  }, []);

  // Save consent and preferences to localStorage
  const saveToStorage = useCallback((newPreferences: CookiePreferences) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "true");
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(newPreferences));
  }, []);

  const acceptAll = useCallback(() => {
    const allAccepted: CookiePreferences = {
      essential: true,
      analytics: true,
      marketing: true,
      preferences: true,
    };
    setPreferences(allAccepted);
    setHasConsented(true);
    setShowBanner(false);
    setShowSettings(false);
    saveToStorage(allAccepted);
  }, [saveToStorage]);

  const rejectAll = useCallback(() => {
    const essentialOnly: CookiePreferences = {
      essential: true,
      analytics: false,
      marketing: false,
      preferences: false,
    };
    setPreferences(essentialOnly);
    setHasConsented(true);
    setShowBanner(false);
    setShowSettings(false);
    saveToStorage(essentialOnly);
  }, [saveToStorage]);

  const savePreferences = useCallback((newPreferences: Partial<CookiePreferences>) => {
    const updated: CookiePreferences = {
      ...preferences,
      ...newPreferences,
      essential: true, // Always keep essential enabled
    };
    setPreferences(updated);
    setHasConsented(true);
    setShowBanner(false);
    setShowSettings(false);
    saveToStorage(updated);
  }, [preferences, saveToStorage]);

  const openSettings = useCallback(() => {
    setShowSettings(true);
  }, []);

  const closeSettings = useCallback(() => {
    setShowSettings(false);
  }, []);

  const resetConsent = useCallback(() => {
    localStorage.removeItem(COOKIE_CONSENT_KEY);
    localStorage.removeItem(COOKIE_PREFERENCES_KEY);
    setPreferences(defaultPreferences);
    setHasConsented(false);
    setShowBanner(true);
    setShowSettings(false);
  }, []);

  return (
    <CookieConsentContext.Provider
      value={{
        hasConsented,
        preferences,
        showBanner: isInitialized && showBanner,
        showSettings,
        acceptAll,
        rejectAll,
        savePreferences,
        openSettings,
        closeSettings,
        resetConsent,
      }}
    >
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  const context = useContext(CookieConsentContext);
  if (context === undefined) {
    throw new Error("useCookieConsent must be used within a CookieConsentProvider");
  }
  return context;
}
