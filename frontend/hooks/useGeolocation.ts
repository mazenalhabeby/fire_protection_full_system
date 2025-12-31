"use client";

import { useState, useCallback, useEffect } from "react";

export interface BrowserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface GeolocationState {
  location: BrowserLocation | null;
  error: string | null;
  isLoading: boolean;
  isSupported: boolean;
  permissionState: PermissionState | null;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  requestOnMount?: boolean;
}

const defaultOptions: UseGeolocationOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 5 * 60 * 1000, // 5 minutes cache
  requestOnMount: false,
};

/**
 * Hook for accessing browser geolocation API
 * Returns user's GPS location for accurate location tracking and VPN detection
 */
export function useGeolocation(options: UseGeolocationOptions = {}) {
  const opts = { ...defaultOptions, ...options };

  const [state, setState] = useState<GeolocationState>({
    location: null,
    error: null,
    isLoading: false,
    isSupported: typeof navigator !== "undefined" && "geolocation" in navigator,
    permissionState: null,
  });

  // Check permission state
  const checkPermission = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.permissions) {
      return null;
    }

    try {
      const result = await navigator.permissions.query({ name: "geolocation" });
      setState((prev) => ({ ...prev, permissionState: result.state }));

      // Listen for permission changes
      result.addEventListener("change", () => {
        setState((prev) => ({ ...prev, permissionState: result.state }));
      });

      return result.state;
    } catch {
      return null;
    }
  }, []);

  // Request location
  const requestLocation = useCallback((): Promise<BrowserLocation | null> => {
    return new Promise((resolve) => {
      if (!state.isSupported) {
        setState((prev) => ({
          ...prev,
          error: "Geolocation is not supported by your browser",
        }));
        resolve(null);
        return;
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: BrowserLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };

          setState((prev) => ({
            ...prev,
            location,
            isLoading: false,
            error: null,
          }));

          resolve(location);
        },
        (error) => {
          let errorMessage = "Failed to get location";

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Location permission denied";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location information unavailable";
              break;
            case error.TIMEOUT:
              errorMessage = "Location request timed out";
              break;
          }

          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: errorMessage,
          }));

          resolve(null);
        },
        {
          enableHighAccuracy: opts.enableHighAccuracy,
          timeout: opts.timeout,
          maximumAge: opts.maximumAge,
        }
      );
    });
  }, [state.isSupported, opts.enableHighAccuracy, opts.timeout, opts.maximumAge]);

  // Clear location
  const clearLocation = useCallback(() => {
    setState((prev) => ({
      ...prev,
      location: null,
      error: null,
    }));
  }, []);

  // Check permission on mount
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  // Request location on mount if option is set
  useEffect(() => {
    if (opts.requestOnMount) {
      requestLocation();
    }
  }, [opts.requestOnMount, requestLocation]);

  return {
    ...state,
    requestLocation,
    clearLocation,
    checkPermission,
  };
}

/**
 * Get location with a simple promise-based API
 * Useful for one-time location requests (e.g., on login)
 */
export async function getLocation(
  options: UseGeolocationOptions = {}
): Promise<BrowserLocation | null> {
  const opts = { ...defaultOptions, ...options };

  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    console.warn("[Geolocation] Not supported by browser");
    return null;
  }

  // Check if we're in a secure context (HTTPS or localhost)
  if (typeof window !== "undefined" && !window.isSecureContext) {
    console.warn("[Geolocation] Requires secure context (HTTPS)");
    return null;
  }

  console.log("[Geolocation] Requesting location...");

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log("[Geolocation] Success:", {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        let errorType = "Unknown";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorType = "Permission denied";
            break;
          case error.POSITION_UNAVAILABLE:
            errorType = "Position unavailable";
            break;
          case error.TIMEOUT:
            errorType = "Timeout";
            break;
        }
        console.warn(`[Geolocation] Error: ${errorType} - ${error.message}`);
        resolve(null);
      },
      {
        enableHighAccuracy: opts.enableHighAccuracy,
        timeout: opts.timeout,
        maximumAge: opts.maximumAge,
      }
    );
  });
}

/**
 * Request location permission without getting the actual location
 * Useful for prompting permission before login
 */
export async function requestLocationPermission(): Promise<boolean> {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    return false;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve(true),
      () => resolve(false),
      { timeout: 5000 }
    );
  });
}
