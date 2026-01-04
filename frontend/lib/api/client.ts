// API Client for HBCT Backend - Cookie-based authentication
// Uses reactive token refresh (refresh on 401) - industry standard approach

import { getDeviceFingerprint } from '@/lib/utils/deviceFingerprint';
import { setSessionHintCookie, clearSessionHintCookie } from '@/lib/cookies';

// Backend API URL - direct connection
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// =============================================================================
// ERROR HANDLING
// =============================================================================

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

// =============================================================================
// SESSION STATE MANAGEMENT
// =============================================================================

// LocalStorage keys
const SESSION_ACTIVE_KEY = 'hbct_session_active';
const ACCESS_TOKEN_EXPIRY_KEY = 'hbct_access_token_expiry';
const REFRESH_TOKEN_EXPIRY_KEY = 'hbct_refresh_token_expiry';

// Token lifetimes (must match backend)
const ACCESS_TOKEN_LIFETIME_MS = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Track if we're currently refreshing (prevents multiple simultaneous refreshes)
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

// Flag to prevent session-expired event during voluntary logout
let isVoluntaryLogout = false;

/**
 * Check if user has an active session (persists across page reloads)
 */
export function hasSessionMarker(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SESSION_ACTIVE_KEY) === 'true';
}

/**
 * Set session marker on login/register (also sets token expiry for debug display)
 */
export function setSessionMarker(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_ACTIVE_KEY, 'true');
  // Set expiry times for debug display
  const now = Date.now();
  localStorage.setItem(ACCESS_TOKEN_EXPIRY_KEY, (now + ACCESS_TOKEN_LIFETIME_MS).toString());
  localStorage.setItem(REFRESH_TOKEN_EXPIRY_KEY, (now + REFRESH_TOKEN_LIFETIME_MS).toString());
  // Also set cookie for cross-port sharing and server-side hints
  setSessionHintCookie();
}

/**
 * Update access token expiry after refresh (for debug display)
 */
function updateAccessTokenExpiry(): void {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  localStorage.setItem(ACCESS_TOKEN_EXPIRY_KEY, (now + ACCESS_TOKEN_LIFETIME_MS).toString());
}

/**
 * Clear session marker on logout or session expiry
 * @param voluntary - If true, indicates user-initiated logout (prevents expired redirect)
 */
export function clearSessionMarker(voluntary = false): void {
  if (typeof window === 'undefined') return;

  // Set flag to prevent session-expired event for voluntary logout
  if (voluntary) {
    isVoluntaryLogout = true;
    // Reset flag after a short delay (for cross-tab sync)
    setTimeout(() => { isVoluntaryLogout = false; }, 100);
  }

  localStorage.removeItem(SESSION_ACTIVE_KEY);
  localStorage.removeItem(ACCESS_TOKEN_EXPIRY_KEY);
  localStorage.removeItem(REFRESH_TOKEN_EXPIRY_KEY);
  // Also clear cookie
  clearSessionHintCookie();
}

/**
 * Get access token expiry (for debug display)
 */
export function getAccessTokenExpiry(): number | null {
  if (typeof window === 'undefined') return null;
  const expiry = localStorage.getItem(ACCESS_TOKEN_EXPIRY_KEY);
  return expiry ? parseInt(expiry, 10) : null;
}

/**
 * Get refresh token expiry (for debug display)
 */
export function getRefreshTokenExpiry(): number | null {
  if (typeof window === 'undefined') return null;
  const expiry = localStorage.getItem(REFRESH_TOKEN_EXPIRY_KEY);
  return expiry ? parseInt(expiry, 10) : null;
}

// =============================================================================
// TOKEN REFRESH LOGIC (REACTIVE ONLY)
// =============================================================================

/**
 * Attempt to refresh the access token using the refresh token cookie
 */
async function doRefreshToken(): Promise<boolean> {
  const deviceFingerprint = getDeviceFingerprint();

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

      // Update access token expiry
      updateAccessTokenExpiry();

      // Handle security alerts if any
      if (data.securityAlert && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('security-alert', { detail: data.securityAlert }));
      }

      return true;
    }

    // 401/403 means refresh token is invalid/expired
    if (response.status === 401 || response.status === 403) {
      handleSessionExpired('expired');
      return false;
    }

    // Other errors - session might still be valid, don't logout
    return false;

  } catch {
    // Network error - don't logout, let the app handle it
    return false;
  }
}

/**
 * Refresh tokens with deduplication (prevents multiple simultaneous refreshes)
 */
async function refreshTokens(): Promise<boolean> {
  // If already refreshing, wait for that to complete
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = doRefreshToken();

  try {
    return await refreshPromise;
  } finally {
    isRefreshing = false;
    refreshPromise = null;
  }
}

/**
 * Handle session expiration - notify the app
 */
function handleSessionExpired(reason: 'expired' | 'revoked' | 'security'): void {
  clearSessionMarker();

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('session-expired', {
      detail: { reason }
    }));
  }
}

// =============================================================================
// API REQUEST HANDLING
// =============================================================================

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  skipAuth?: boolean;
}

function buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
  let url = `${API_BASE_URL}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  return url;
}

/**
 * Make an API request with automatic token refresh on 401
 */
async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, skipAuth, ...fetchOptions } = options;
  const url = buildUrl(endpoint, params);

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Auth endpoints that should NOT trigger refresh (they handle auth themselves)
  const noRefreshEndpoints = [
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
    '/auth/wallet/nonce',
    '/auth/wallet/login',
    '/auth/wallet/register',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/2fa/verify-login',
  ];
  const shouldSkipRefresh = noRefreshEndpoints.some(ep => endpoint.startsWith(ep));

  // Make the request
  const response = await fetch(url, {
    ...fetchOptions,
    headers,
    credentials: 'include',
  });

  // REACTIVE REFRESH: Handle 401 by trying to refresh
  // This applies to ALL endpoints EXCEPT login/register/refresh endpoints
  if (response.status === 401 && !skipAuth && !shouldSkipRefresh) {
    const refreshed = await refreshTokens();

    if (refreshed) {
      // Retry the original request with new access token
      const retryResponse = await fetch(url, {
        ...fetchOptions,
        headers,
        credentials: 'include',
      });

      return handleResponse<T>(retryResponse);
    }

    // Refresh failed - throw the original 401
    throw new ApiError('Session expired', 401);
  }

  return handleResponse<T>(response);
}

/**
 * Handle API response
 */
async function handleResponse<T>(response: Response): Promise<T> {
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

// =============================================================================
// HTTP METHOD HELPERS
// =============================================================================

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

// =============================================================================
// CROSS-TAB LOGOUT SYNC
// =============================================================================

if (typeof window !== 'undefined') {
  // Listen for logout from other tabs
  // Note: storage event only fires for OTHER tabs, not the current tab
  window.addEventListener('storage', (event) => {
    if (event.key === SESSION_ACTIVE_KEY && event.newValue === null) {
      // Skip if this was a voluntary logout (user clicked logout)
      if (isVoluntaryLogout) {
        return;
      }
      window.dispatchEvent(new CustomEvent('session-expired', {
        detail: { reason: 'revoked' }
      }));
    }
  });
}

export { ApiError, API_BASE_URL };
