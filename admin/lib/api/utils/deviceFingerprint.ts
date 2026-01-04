// Device Fingerprint Utility
// Generates a stable device ID for binding refresh tokens to devices
// This is NOT browser fingerprinting for tracking - it's for security/fraud prevention

const DEVICE_ID_KEY = 'device_fingerprint_id';
const DEVICE_ID_VERSION = 'v1'; // Increment if algorithm changes

/**
 * Generate a stable device ID based on available browser properties
 * This is designed to be stable across sessions but unique per device/browser
 */
function generateDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'server';
  }

  const components: string[] = [];

  // Screen properties (stable across sessions)
  components.push(`screen:${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`);

  // Timezone (stable for device location)
  components.push(`tz:${Intl.DateTimeFormat().resolvedOptions().timeZone}`);

  // Language preferences (usually stable)
  components.push(`lang:${navigator.language}`);

  // Platform (OS)
  components.push(`platform:${navigator.platform || 'unknown'}`);

  // Hardware concurrency (CPU cores - stable)
  if (navigator.hardwareConcurrency) {
    components.push(`cores:${navigator.hardwareConcurrency}`);
  }

  // Device memory (if available - stable)
  if ((navigator as any).deviceMemory) {
    components.push(`mem:${(navigator as any).deviceMemory}`);
  }

  // Touch support (stable)
  const touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  components.push(`touch:${touchSupport ? navigator.maxTouchPoints : 0}`);

  // Canvas fingerprint (optional, more unique but can vary)
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('device-fp', 2, 2);
      const canvasData = canvas.toDataURL().slice(-50); // Just use last 50 chars
      components.push(`canvas:${hashString(canvasData)}`);
    }
  } catch {
    // Canvas not available
  }

  // Combine all components and hash
  const fingerprint = components.join('|');
  return `${DEVICE_ID_VERSION}_${hashString(fingerprint)}`;
}

/**
 * Simple hash function for strings (djb2 algorithm)
 */
function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  // Convert to hex and ensure positive
  return Math.abs(hash).toString(16);
}

/**
 * Get or create a stable device fingerprint
 * Stored in localStorage for persistence across sessions
 */
export function getDeviceFingerprint(): string {
  if (typeof window === 'undefined') {
    return 'server';
  }

  try {
    // Check if we already have a stored fingerprint
    const stored = localStorage.getItem(DEVICE_ID_KEY);

    if (stored) {
      // Validate it's from current version
      if (stored.startsWith(DEVICE_ID_VERSION)) {
        return stored;
      }
      // Old version, regenerate
    }

    // Generate new fingerprint
    const fingerprint = generateDeviceId();

    // Store for future use
    localStorage.setItem(DEVICE_ID_KEY, fingerprint);

    return fingerprint;
  } catch {
    // localStorage not available, generate ephemeral
    return generateDeviceId();
  }
}

/**
 * Get device info for display purposes (human readable)
 */
export function getDeviceInfo(): { browser: string; os: string; device: string } {
  if (typeof window === 'undefined') {
    return { browser: 'Unknown', os: 'Unknown', device: 'Server' };
  }

  const ua = navigator.userAgent;

  // Detect browser
  let browser = 'Unknown';
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Opera')) browser = 'Opera';

  // Detect OS
  let os = 'Unknown';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  // Detect device type
  let device = 'Desktop';
  if (ua.includes('Mobile')) device = 'Mobile';
  else if (ua.includes('Tablet') || ua.includes('iPad')) device = 'Tablet';

  return { browser, os, device };
}

/**
 * Clear the stored device fingerprint (useful for testing)
 */
export function clearDeviceFingerprint(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DEVICE_ID_KEY);
}
