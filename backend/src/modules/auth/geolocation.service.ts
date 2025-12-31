import { Injectable, Logger } from '@nestjs/common';

export interface GeoLocation {
  country: string | null;
  city: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface BrowserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface VpnDetectionResult {
  isVpnDetected: boolean;
  locationMismatch: boolean;
  ipLocation: GeoLocation;
  browserLocation: {
    city: string | null;
    country: string | null;
    latitude: number;
    longitude: number;
  } | null;
  distanceKm: number | null;
  reason?: string;
}

@Injectable()
export class GeolocationService {
  private readonly logger = new Logger(GeolocationService.name);

  // Cache to avoid repeated lookups for the same IP
  private cache = new Map<string, { data: GeoLocation; timestamp: number }>();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Get geolocation data from IP address
   * Tries multiple services for better accuracy
   */
  async getLocation(ipAddress: string): Promise<GeoLocation> {
    // Check if this is a private/local network IP
    if (this.isPrivateIP(ipAddress)) {
      // For localhost, try to get location based on server's public IP
      if (this.isLocalhostIP(ipAddress)) {
        return this.getLocationFromPublicIP();
      }
      this.logger.log(`Private IP detected (${ipAddress}), cannot determine location`);
      return { country: null, city: null, region: null, latitude: null, longitude: null };
    }

    // Check cache first
    const cached = this.cache.get(ipAddress);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    // Try ipinfo.io first (more accurate), then ip-api.com as fallback
    let location = await this.getLocationFromIpInfo(ipAddress);
    if (!location.city) {
      location = await this.getLocationFromIpApi(ipAddress);
    }

    if (location.city) {
      this.cache.set(ipAddress, { data: location, timestamp: Date.now() });
    }

    return location;
  }

  /**
   * Get location for server's public IP (for localhost development)
   */
  private async getLocationFromPublicIP(): Promise<GeoLocation> {
    const cacheKey = 'server-public-ip';
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      // First get our public IP
      const ipResponse = await fetch('https://api.ipify.org?format=json', {
        signal: AbortSignal.timeout(3000),
      });
      const ipData = await ipResponse.json();
      const publicIP = ipData.ip;

      this.logger.log(`Localhost detected, using public IP: ${publicIP}`);

      // Then get location for that IP
      const location = await this.getLocationFromIpInfo(publicIP);
      if (location.city) {
        this.cache.set(cacheKey, { data: location, timestamp: Date.now() });
        this.logger.log(`Server location: ${location.city}, ${location.country}`);
      }
      return location;
    } catch (error) {
      this.logger.warn(`Failed to get public IP location: ${error.message}`);
      return { country: null, city: null, region: null, latitude: null, longitude: null };
    }
  }

  /**
   * Get location from ipinfo.io (often more accurate)
   */
  private async getLocationFromIpInfo(ip: string): Promise<GeoLocation> {
    try {
      const response = await fetch(`https://ipinfo.io/${ip}/json`, {
        signal: AbortSignal.timeout(3000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.city) {
        const [lat, lon] = (data.loc || ',').split(',').map(Number);
        return {
          country: data.country || null,
          city: data.city || null,
          region: data.region || null,
          latitude: lat || null,
          longitude: lon || null,
        };
      }

      return { country: null, city: null, region: null, latitude: null, longitude: null };
    } catch (error) {
      this.logger.warn(`ipinfo.io lookup failed for ${ip}: ${error.message}`);
      return { country: null, city: null, region: null, latitude: null, longitude: null };
    }
  }

  /**
   * Get location from ip-api.com (fallback)
   */
  private async getLocationFromIpApi(ip: string): Promise<GeoLocation> {
    try {
      const response = await fetch(
        `http://ip-api.com/json/${ip}?fields=status,country,regionName,city,lat,lon`,
        { signal: AbortSignal.timeout(3000) }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'success') {
        return {
          country: data.country || null,
          city: data.city || null,
          region: data.regionName || null,
          latitude: data.lat || null,
          longitude: data.lon || null,
        };
      }

      return { country: null, city: null, region: null, latitude: null, longitude: null };
    } catch (error) {
      this.logger.warn(`ip-api.com lookup failed for ${ip}: ${error.message}`);
      return { country: null, city: null, region: null, latitude: null, longitude: null };
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * Returns distance in kilometers
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Check if travel between two locations is physically possible given the time difference
   * Returns true if the travel is suspicious (impossible)
   */
  isImpossibleTravel(
    lat1: number | null,
    lon1: number | null,
    lat2: number | null,
    lon2: number | null,
    timeDifferenceMs: number,
  ): boolean {
    // If we don't have coordinates, we can't determine impossible travel
    if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) {
      return false;
    }

    const distanceKm = this.calculateDistance(lat1, lon1, lat2, lon2);
    const timeHours = timeDifferenceMs / (1000 * 60 * 60);

    // Maximum reasonable travel speed (900 km/h for commercial flights + buffer)
    const maxSpeedKmH = 1000;

    // If they would need to travel faster than max speed, it's suspicious
    // Add a minimum distance threshold (50km) to avoid false positives from IP geolocation inaccuracy
    if (distanceKm > 50 && timeHours > 0) {
      const requiredSpeed = distanceKm / timeHours;
      return requiredSpeed > maxSpeedKmH;
    }

    return false;
  }

  /**
   * Check if IP is localhost (same machine)
   */
  private isLocalhostIP(ip: string): boolean {
    if (!ip || ip === 'unknown') return true;
    return ip === '127.0.0.1' || ip === '::1' || ip === 'localhost';
  }

  /**
   * Check if IP is from Docker bridge network (172.16.0.0/12)
   * These IPs indicate the request came through Docker's NAT
   * and we can't determine the real client IP
   */
  private isDockerNetworkIP(ip: string): boolean {
    if (!ip) return false;
    // Docker bridge networks use 172.16.0.0/12 range
    return /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip);
  }

  /**
   * Check if IP is private/local (for general use)
   */
  private isPrivateIP(ip: string): boolean {
    if (!ip || ip === 'unknown') return true;

    // Localhost
    if (this.isLocalhostIP(ip)) return true;

    // Private IPv4 ranges
    const privateRanges = [
      /^10\./,                    // 10.0.0.0/8
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12 (includes Docker)
      /^192\.168\./,              // 192.168.0.0/16
      /^169\.254\./,              // Link-local
    ];

    return privateRanges.some(range => range.test(ip));
  }

  /**
   * Clear old cache entries periodically
   */
  cleanupCache() {
    const now = Date.now();
    for (const [ip, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.cache.delete(ip);
      }
    }
  }

  /**
   * Reverse geocode coordinates to get city/country
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<{ city: string | null; country: string | null }> {
    const cacheKey = `reverse:${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return { city: cached.data.city, country: cached.data.country };
    }

    try {
      // Use OpenStreetMap Nominatim for reverse geocoding (free, no API key)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`,
        {
          signal: AbortSignal.timeout(5000),
          headers: {
            'User-Agent': 'HBCT-Security/1.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const result = {
        city: data.address?.city || data.address?.town || data.address?.village || null,
        country: data.address?.country_code?.toUpperCase() || null,
        region: data.address?.state || null,
        latitude,
        longitude,
      };

      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return { city: result.city, country: result.country };
    } catch (error) {
      this.logger.warn(`Reverse geocoding failed: ${error.message}`);
      return { city: null, country: null };
    }
  }

  /**
   * Detect VPN/Proxy by comparing IP location with browser GPS location
   * Returns detection result with details
   */
  async detectVpn(
    ipAddress: string,
    browserLocation: BrowserLocation | null,
  ): Promise<VpnDetectionResult> {
    // Skip VPN detection for localhost/development
    if (this.isPrivateIP(ipAddress)) {
      this.logger.log(`Skipping VPN detection for private/localhost IP: ${ipAddress}`);

      // Still reverse geocode browser location if available
      if (browserLocation) {
        const browserGeo = await this.reverseGeocode(
          browserLocation.latitude,
          browserLocation.longitude,
        );
        return {
          isVpnDetected: false,
          locationMismatch: false,
          ipLocation: { country: null, city: null, region: null, latitude: null, longitude: null },
          browserLocation: {
            city: browserGeo.city,
            country: browserGeo.country,
            latitude: browserLocation.latitude,
            longitude: browserLocation.longitude,
          },
          distanceKm: null,
          reason: 'Development mode - VPN detection skipped',
        };
      }

      return {
        isVpnDetected: false,
        locationMismatch: false,
        ipLocation: { country: null, city: null, region: null, latitude: null, longitude: null },
        browserLocation: null,
        distanceKm: null,
        reason: 'Development mode - VPN detection skipped',
      };
    }

    // Get IP-based location
    const ipLocation = await this.getLocation(ipAddress);

    // If no browser location provided, we can't detect VPN this way
    if (!browserLocation) {
      return {
        isVpnDetected: false,
        locationMismatch: false,
        ipLocation,
        browserLocation: null,
        distanceKm: null,
        reason: 'No browser location available',
      };
    }

    // Reverse geocode browser location to get city/country
    const browserGeo = await this.reverseGeocode(
      browserLocation.latitude,
      browserLocation.longitude,
    );

    const browserLocationData = {
      city: browserGeo.city,
      country: browserGeo.country,
      latitude: browserLocation.latitude,
      longitude: browserLocation.longitude,
    };

    // If IP location couldn't be determined, can't compare
    if (!ipLocation.latitude || !ipLocation.longitude) {
      return {
        isVpnDetected: false,
        locationMismatch: false,
        ipLocation,
        browserLocation: browserLocationData,
        distanceKm: null,
        reason: 'IP location unavailable',
      };
    }

    // Calculate distance between IP location and browser GPS location
    const distanceKm = this.calculateDistance(
      ipLocation.latitude,
      ipLocation.longitude,
      browserLocation.latitude,
      browserLocation.longitude,
    );

    // VPN detection thresholds
    const VPN_DISTANCE_THRESHOLD_KM = 100; // If locations differ by more than 100km
    const COUNTRY_MISMATCH_THRESHOLD_KM = 50; // Lower threshold for country mismatch

    let isVpnDetected = false;
    let locationMismatch = false;
    let reason = '';

    // Check for country mismatch (strong VPN indicator)
    if (browserGeo.country && ipLocation.country &&
        browserGeo.country !== ipLocation.country) {
      isVpnDetected = true;
      locationMismatch = true;
      reason = `Country mismatch: IP shows ${ipLocation.country}, GPS shows ${browserGeo.country}`;
    }
    // Check for significant distance mismatch
    else if (distanceKm > VPN_DISTANCE_THRESHOLD_KM) {
      isVpnDetected = true;
      locationMismatch = true;
      reason = `Location mismatch: ${Math.round(distanceKm)}km between IP and GPS location`;
    }
    // Minor mismatch (could be IP geolocation inaccuracy)
    else if (distanceKm > COUNTRY_MISMATCH_THRESHOLD_KM) {
      locationMismatch = true;
      reason = `Minor location difference: ${Math.round(distanceKm)}km`;
    }

    this.logger.log(
      `VPN Detection for IP ${ipAddress}: distance=${Math.round(distanceKm)}km, ` +
      `vpn=${isVpnDetected}, mismatch=${locationMismatch}`,
    );

    return {
      isVpnDetected,
      locationMismatch,
      ipLocation,
      browserLocation: browserLocationData,
      distanceKm,
      reason,
    };
  }

  /**
   * Get continent from country code
   */
  getContinent(countryCode: string | null): string | null {
    if (!countryCode) return null;

    const continentMap: Record<string, string> = {
      // Europe
      AT: 'EU', BE: 'EU', BG: 'EU', HR: 'EU', CY: 'EU', CZ: 'EU', DK: 'EU',
      EE: 'EU', FI: 'EU', FR: 'EU', DE: 'EU', GR: 'EU', HU: 'EU', IE: 'EU',
      IT: 'EU', LV: 'EU', LT: 'EU', LU: 'EU', MT: 'EU', NL: 'EU', PL: 'EU',
      PT: 'EU', RO: 'EU', SK: 'EU', SI: 'EU', ES: 'EU', SE: 'EU', GB: 'EU',
      CH: 'EU', NO: 'EU', UA: 'EU', BY: 'EU', RS: 'EU', AL: 'EU', MK: 'EU',
      BA: 'EU', ME: 'EU', XK: 'EU', MD: 'EU', IS: 'EU',
      // North America
      US: 'NA', CA: 'NA', MX: 'NA',
      // South America
      BR: 'SA', AR: 'SA', CL: 'SA', CO: 'SA', PE: 'SA', VE: 'SA', EC: 'SA',
      BO: 'SA', PY: 'SA', UY: 'SA', GY: 'SA', SR: 'SA',
      // Asia
      CN: 'AS', JP: 'AS', KR: 'AS', IN: 'AS', ID: 'AS', TH: 'AS', VN: 'AS',
      PH: 'AS', MY: 'AS', SG: 'AS', TW: 'AS', HK: 'AS', BD: 'AS', PK: 'AS',
      AE: 'AS', SA: 'AS', IL: 'AS', TR: 'AS', IR: 'AS', IQ: 'AS', KZ: 'AS',
      // Africa
      ZA: 'AF', EG: 'AF', NG: 'AF', KE: 'AF', MA: 'AF', DZ: 'AF', TN: 'AF',
      GH: 'AF', ET: 'AF', TZ: 'AF', UG: 'AF', CI: 'AF', SN: 'AF', CM: 'AF',
      // Oceania
      AU: 'OC', NZ: 'OC', FJ: 'OC', PG: 'OC',
    };

    return continentMap[countryCode.toUpperCase()] || null;
  }
}
