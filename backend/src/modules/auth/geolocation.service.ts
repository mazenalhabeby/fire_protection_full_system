import { Injectable, Logger } from '@nestjs/common';

export interface GeoLocation {
  country: string | null;
  city: string | null;
  region: string | null;
}

@Injectable()
export class GeolocationService {
  private readonly logger = new Logger(GeolocationService.name);

  // Cache to avoid repeated lookups for the same IP
  private cache = new Map<string, { data: GeoLocation; timestamp: number }>();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Get geolocation data from IP address using ip-api.com (free, no API key needed)
   * Rate limit: 45 requests per minute
   */
  async getLocation(ipAddress: string): Promise<GeoLocation> {
    // For localhost/private IPs, get location based on server's public IP
    const ipToLookup = this.isPrivateIP(ipAddress) ? '' : ipAddress;

    // Check cache first (use 'self' as key for auto-detect)
    const cacheKey = ipToLookup || 'self';
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      // If ipToLookup is empty, ip-api.com will use the requester's IP (server's public IP)
      const url = ipToLookup
        ? `http://ip-api.com/json/${ipToLookup}?fields=status,country,regionName,city`
        : `http://ip-api.com/json?fields=status,country,regionName,city`;

      const response = await fetch(url, { signal: AbortSignal.timeout(3000) });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'success') {
        const location: GeoLocation = {
          country: data.country || null,
          city: data.city || null,
          region: data.regionName || null,
        };

        // Cache the result
        this.cache.set(cacheKey, { data: location, timestamp: Date.now() });

        return location;
      }

      this.logger.warn(`Geolocation failed for IP ${ipAddress}: ${data.message || 'Unknown error'}`);
      return { country: null, city: null, region: null };

    } catch (error) {
      this.logger.warn(`Geolocation error for IP ${ipAddress}: ${error.message}`);
      return { country: null, city: null, region: null };
    }
  }

  /**
   * Check if IP is private/local
   */
  private isPrivateIP(ip: string): boolean {
    if (!ip || ip === 'unknown') return true;

    // Localhost
    if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true;

    // Private IPv4 ranges
    const privateRanges = [
      /^10\./,                    // 10.0.0.0/8
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
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
}
