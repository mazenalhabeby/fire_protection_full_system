/**
 * Browser Geolocation Utility
 * Gets the user's actual location using the browser's Geolocation API
 */

export interface BrowserLocation {
  latitude: number;
  longitude: number;
  accuracy: number; // in meters
  city?: string;
  country?: string;
}

/**
 * Get the user's current position using browser Geolocation API
 * Returns null if denied or unavailable
 */
export async function getBrowserLocation(): Promise<BrowserLocation | null> {
  // Check if geolocation is supported
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return null;
  }

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000, // 10 seconds
        maximumAge: 300000, // Cache for 5 minutes
      });
    });

    const { latitude, longitude, accuracy } = position.coords;

    // Try to reverse geocode to get city/country
    const locationDetails = await reverseGeocode(latitude, longitude);

    return {
      latitude,
      longitude,
      accuracy,
      ...locationDetails,
    };
  } catch {
    // User denied or other error
    return null;
  }
}

/**
 * Reverse geocode coordinates to get city and country
 * Uses free Nominatim API (OpenStreetMap)
 */
async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<{ city?: string; country?: string }> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`,
      {
        headers: {
          'User-Agent': 'HBCT-Platform/1.0',
        },
      }
    );

    if (!response.ok) {
      return {};
    }

    const data = await response.json();
    const address = data.address || {};

    // Get city - try different fields
    const city =
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.county ||
      null;

    const country = address.country || null;

    return { city, country };
  } catch {
    return {};
  }
}

/**
 * Request location permission and get location
 * Shows browser permission prompt
 */
export async function requestLocationPermission(): Promise<boolean> {
  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return result.state === 'granted' || result.state === 'prompt';
  } catch {
    // Permissions API not supported, try to get location directly
    return true;
  }
}

/**
 * Check if location permission is already granted
 */
export async function isLocationPermissionGranted(): Promise<boolean> {
  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return result.state === 'granted';
  } catch {
    return false;
  }
}
