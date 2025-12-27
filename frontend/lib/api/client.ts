// API Client for HBCT Backend - Cookie-based authentication

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Token expiry buffer (refresh 30 seconds before expiry)
const TOKEN_EXPIRY_BUFFER_MS = 30 * 1000;
// Default token lifetime (15 minutes) - should match backend config
const DEFAULT_TOKEN_LIFETIME_MS = 15 * 60 * 1000;

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
  const url = new URL(`${API_BASE_URL}${endpoint}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  return url.toString();
}

// Token management state
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;
let tokenExpiresAt: number | null = null;

// Session marker key for localStorage
const SESSION_MARKER_KEY = 'hasSession';

// Check if there might be an active session (for optimization)
export function hasSessionMarker(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SESSION_MARKER_KEY) === 'true';
}

// Set session marker (called after login)
export function setSessionMarker(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_MARKER_KEY, 'true');
}

// Clear session marker (called on logout or auth failure)
export function clearSessionMarker(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_MARKER_KEY);
}

// Track when token will expire (called after login/refresh)
export function setTokenExpiry(expiresInMs: number = DEFAULT_TOKEN_LIFETIME_MS): void {
  tokenExpiresAt = Date.now() + expiresInMs;
  setSessionMarker(); // Also set session marker
}

// Clear token expiry (called on logout)
export function clearTokenExpiry(): void {
  tokenExpiresAt = null;
  clearSessionMarker(); // Also clear session marker
}

// Check if token needs refresh (proactive check)
function shouldRefreshToken(): boolean {
  if (!tokenExpiresAt) return false;
  return Date.now() >= tokenExpiresAt - TOKEN_EXPIRY_BUFFER_MS;
}

async function refreshTokens(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      // Reset token expiry after successful refresh
      setTokenExpiry();
      return true;
    }

    // Refresh failed - session is invalid/revoked
    // Clear local session state and trigger logout event
    clearTokenExpiry();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('session-revoked'));
    }
    return false;
  } catch {
    // Network error - don't clear session, might be temporary
    return false;
  }
}

// Ensure token is valid before making request (proactive refresh)
async function ensureValidToken(): Promise<boolean> {
  if (!shouldRefreshToken()) return true;

  // If already refreshing, wait for it
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
