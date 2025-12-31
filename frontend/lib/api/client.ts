// API Client for HBCT Backend - Cookie-based authentication
// Enhanced with robust token refresh, retry logic, and multi-tab coordination

import { getDeviceFingerprint } from '@/lib/utils/deviceFingerprint';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Token expiry buffer (refresh 30 seconds before expiry)
const TOKEN_EXPIRY_BUFFER_MS = 30 * 1000;
// Default token lifetime (15 minutes) - should match backend config
const DEFAULT_TOKEN_LIFETIME_MS = 15 * 60 * 1000;
// Max retry attempts for network errors
const MAX_REFRESH_RETRIES = 3;
// Base delay for exponential backoff (ms)
const BASE_RETRY_DELAY_MS = 1000;
// Multi-tab refresh lock timeout (ms)
const REFRESH_LOCK_TIMEOUT_MS = 10000;

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  skipAuth?: boolean;
}

class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

function buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
  let baseUrl = `${API_BASE_URL}${endpoint}`;

  // Handle query parameters
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      baseUrl += `?${queryString}`;
    }
  }

  return baseUrl;
}

// Token management state
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;
let tokenExpiresAt: number | null = null;

// Session marker key for localStorage (with TTL)
const SESSION_MARKER_KEY = 'session_marker';
const REFRESH_LOCK_KEY = 'token_refresh_lock';
const REFRESH_TIMESTAMP_KEY = 'token_refresh_timestamp';

interface SessionMarker {
  expiresAt: number;
  createdAt: number;
}

// Check if there might be an active session (with TTL validation)
export function hasSessionMarker(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const markerJson = localStorage.getItem(SESSION_MARKER_KEY);
    if (!markerJson) return false;

    const marker: SessionMarker = JSON.parse(markerJson);

    // Check if marker has expired
    if (Date.now() > marker.expiresAt) {
      // Marker expired, clean up
      localStorage.removeItem(SESSION_MARKER_KEY);
      return false;
    }

    return true;
  } catch {
    // Invalid marker, clean up
    localStorage.removeItem(SESSION_MARKER_KEY);
    return false;
  }
}

// Set session marker with TTL (called after login)
export function setSessionMarker(expiresAt?: number): void {
  if (typeof window === 'undefined') return;

  const marker: SessionMarker = {
    expiresAt: expiresAt || Date.now() + DEFAULT_TOKEN_LIFETIME_MS,
    createdAt: Date.now(),
  };

  localStorage.setItem(SESSION_MARKER_KEY, JSON.stringify(marker));
}

// Clear session marker (called on logout or auth failure)
export function clearSessionMarker(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_MARKER_KEY);
  localStorage.removeItem(REFRESH_LOCK_KEY);
  localStorage.removeItem(REFRESH_TIMESTAMP_KEY);
}

// Track when token will expire (called after login/refresh)
// Now accepts actual expiry from server
export function setTokenExpiry(expiresAtTimestamp?: number): void {
  if (expiresAtTimestamp) {
    // Use server-provided expiry time
    tokenExpiresAt = expiresAtTimestamp;
  } else {
    // Fall back to default calculation
    tokenExpiresAt = Date.now() + DEFAULT_TOKEN_LIFETIME_MS;
  }

  // Update session marker with new expiry
  setSessionMarker(tokenExpiresAt);
}

// Clear token expiry (called on logout)
export function clearTokenExpiry(): void {
  tokenExpiresAt = null;
  clearSessionMarker();
}

// Check if token needs refresh (proactive check)
function shouldRefreshToken(): boolean {
  if (!tokenExpiresAt) return false;
  return Date.now() >= tokenExpiresAt - TOKEN_EXPIRY_BUFFER_MS;
}

// Multi-tab coordination: Check if another tab is refreshing
function isAnotherTabRefreshing(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const lockStr = localStorage.getItem(REFRESH_LOCK_KEY);
    if (!lockStr) return false;

    const lockExpiry = parseInt(lockStr, 10);

    // Lock is valid if it hasn't expired
    if (Date.now() < lockExpiry) {
      return true;
    }

    // Lock expired, clean up
    localStorage.removeItem(REFRESH_LOCK_KEY);
    return false;
  } catch {
    return false;
  }
}

// Multi-tab coordination: Acquire refresh lock
function acquireRefreshLock(): boolean {
  if (typeof window === 'undefined') return true;

  // Check if another tab has the lock
  if (isAnotherTabRefreshing()) {
    return false;
  }

  // Set our lock
  const lockExpiry = Date.now() + REFRESH_LOCK_TIMEOUT_MS;
  localStorage.setItem(REFRESH_LOCK_KEY, lockExpiry.toString());
  return true;
}

// Multi-tab coordination: Release refresh lock
function releaseRefreshLock(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(REFRESH_LOCK_KEY);
}

// Multi-tab coordination: Notify other tabs of successful refresh
function notifyRefreshComplete(tokenExpiresAt: number): void {
  if (typeof window === 'undefined') return;

  // Store the refresh timestamp so other tabs know tokens were updated
  localStorage.setItem(REFRESH_TIMESTAMP_KEY, Date.now().toString());

  // Update session marker for other tabs
  setSessionMarker(tokenExpiresAt);
}

// Delay helper for exponential backoff
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Refresh tokens with retry logic and exponential backoff
async function refreshTokensWithRetry(): Promise<boolean> {
  let lastError: Error | null = null;

  // Get device fingerprint for token binding
  const deviceFingerprint = getDeviceFingerprint();

  for (let attempt = 0; attempt < MAX_REFRESH_RETRIES; attempt++) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Fingerprint': deviceFingerprint,
        },
      });

      if (response.ok) {
        const data = await response.json();

        // Use server-provided expiry time if available
        const expiresAt = data.tokenExpiresAt || Date.now() + DEFAULT_TOKEN_LIFETIME_MS;
        setTokenExpiry(expiresAt);

        // Notify other tabs
        notifyRefreshComplete(expiresAt);

        // Dispatch security alert event if present
        if (data.securityAlert && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('security-alert', {
            detail: data.securityAlert,
          }));
        }

        return true;
      }

      // Server rejected the refresh (401, 403, etc.) - don't retry
      if (response.status === 401 || response.status === 403) {
        // Check if this is a race condition error (concurrent refresh)
        const data = await response.json().catch(() => ({}));
        const message = data.message || '';

        // If it's a concurrent refresh issue, wait briefly and check if another tab succeeded
        if (message.includes('recently updated') || message.includes('Concurrent')) {
          await delay(500);

          // Check if another tab refreshed successfully
          const refreshTimestamp = localStorage.getItem(REFRESH_TIMESTAMP_KEY);
          if (refreshTimestamp) {
            const lastRefresh = parseInt(refreshTimestamp, 10);
            if (Date.now() - lastRefresh < 5000) {
              // Another tab refreshed recently, we're good
              // Sync our token expiry from session marker
              const markerJson = localStorage.getItem(SESSION_MARKER_KEY);
              if (markerJson) {
                const marker: SessionMarker = JSON.parse(markerJson);
                tokenExpiresAt = marker.expiresAt;
              }
              return true;
            }
          }

          // Retry once more
          continue;
        }

        // Session is truly invalid/revoked
        clearTokenExpiry();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('session-revoked'));
        }
        return false;
      }

      // Other server errors - might be temporary, retry
      lastError = new Error(`Server returned ${response.status}`);

    } catch (error) {
      // Network error - retry with backoff
      lastError = error as Error;
    }

    // Calculate delay with exponential backoff: 1s, 2s, 4s
    if (attempt < MAX_REFRESH_RETRIES - 1) {
      const delayMs = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
      console.warn(`Token refresh attempt ${attempt + 1} failed, retrying in ${delayMs}ms...`);
      await delay(delayMs);
    }
  }

  // All retries exhausted
  console.error('Token refresh failed after all retries:', lastError);

  // Don't clear session for network errors - might be temporary
  // User can retry when network is back
  return false;
}

// Main refresh function with multi-tab coordination
async function refreshTokens(): Promise<boolean> {
  // Check if another tab is already refreshing
  if (isAnotherTabRefreshing()) {
    // Wait for the other tab to finish
    await delay(1000);

    // Check if they succeeded by looking at the refresh timestamp
    const refreshTimestamp = localStorage.getItem(REFRESH_TIMESTAMP_KEY);
    if (refreshTimestamp) {
      const lastRefresh = parseInt(refreshTimestamp, 10);
      if (Date.now() - lastRefresh < 5000) {
        // Another tab refreshed recently, sync our state
        const markerJson = localStorage.getItem(SESSION_MARKER_KEY);
        if (markerJson) {
          try {
            const marker: SessionMarker = JSON.parse(markerJson);
            tokenExpiresAt = marker.expiresAt;
            return true;
          } catch {
            // Fall through to do our own refresh
          }
        }
      }
    }

    // Other tab didn't succeed or took too long, try ourselves
  }

  // Try to acquire the lock
  if (!acquireRefreshLock()) {
    // Another tab grabbed it first, wait and check again
    await delay(1500);

    const refreshTimestamp = localStorage.getItem(REFRESH_TIMESTAMP_KEY);
    if (refreshTimestamp) {
      const lastRefresh = parseInt(refreshTimestamp, 10);
      if (Date.now() - lastRefresh < 5000) {
        const markerJson = localStorage.getItem(SESSION_MARKER_KEY);
        if (markerJson) {
          try {
            const marker: SessionMarker = JSON.parse(markerJson);
            tokenExpiresAt = marker.expiresAt;
            return true;
          } catch {
            // Fall through
          }
        }
      }
    }
  }

  try {
    return await refreshTokensWithRetry();
  } finally {
    releaseRefreshLock();
  }
}

// Ensure token is valid before making request (proactive refresh)
async function ensureValidToken(): Promise<boolean> {
  if (!shouldRefreshToken()) return true;

  // If already refreshing in this tab, wait for it
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  // Start refreshing
  isRefreshing = true;
  refreshPromise = refreshTokens();
  const result = await refreshPromise;
  isRefreshing = false;
  refreshPromise = null;

  return result;
}

// Listen for storage events from other tabs
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === REFRESH_TIMESTAMP_KEY && event.newValue) {
      // Another tab refreshed tokens, sync our state
      const markerJson = localStorage.getItem(SESSION_MARKER_KEY);
      if (markerJson) {
        try {
          const marker: SessionMarker = JSON.parse(markerJson);
          tokenExpiresAt = marker.expiresAt;
        } catch {
          // Ignore invalid marker
        }
      }
    }

    if (event.key === SESSION_MARKER_KEY && !event.newValue) {
      // Session was cleared (logout from another tab)
      tokenExpiresAt = null;
      window.dispatchEvent(new CustomEvent('session-revoked'));
    }
  });
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, skipAuth, ...fetchOptions } = options;
  const url = buildUrl(endpoint, params);

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Proactive refresh: check token before request (avoids 401)
  if (!skipAuth && !endpoint.includes('/auth/')) {
    await ensureValidToken();
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
    credentials: 'include',
  });

  // Fallback: Handle 401 if proactive refresh missed (e.g., token revoked server-side)
  // Skip for all /auth/ endpoints (login, register, etc.) - they should just return the error
  if (response.status === 401 && !skipAuth && !endpoint.includes('/auth/')) {
    // Clear stale expiry
    tokenExpiresAt = null;

    // If already refreshing, wait for it
    if (isRefreshing && refreshPromise) {
      const refreshed = await refreshPromise;
      if (refreshed) {
        return request<T>(endpoint, options);
      }
    } else {
      // Start refreshing
      isRefreshing = true;
      refreshPromise = refreshTokens();
      const refreshed = await refreshPromise;
      isRefreshing = false;
      refreshPromise = null;

      if (refreshed) {
        return request<T>(endpoint, options);
      }
    }
  }

  let data: unknown;
  const contentType = response.headers.get('content-type');

  if (contentType?.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const message = typeof data === 'object' && data !== null && 'message' in data
      ? String((data as { message: string }).message)
      : `Request failed with status ${response.status}`;

    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

// HTTP method helpers
export const api = {
  get: <T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>) =>
    request<T>(endpoint, { method: 'GET', params }),

  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>) =>
    request<T>(endpoint, { method: 'DELETE', params }),
};

export { ApiError, API_BASE_URL };
