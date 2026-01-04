// Cookie utilities for session and theme hints
// These cookies are shared across ports (frontend & admin) on the same domain

const COOKIE_DOMAIN = process.env.NODE_ENV === 'production'
  ? process.env.NEXT_PUBLIC_COOKIE_DOMAIN
  : undefined; // localhost doesn't need domain

// Cookie names
export const SESSION_HINT_COOKIE = 'hbct_session_hint';
export const THEME_COOKIE = 'hbct_theme';

// Cookie max age (7 days - matches refresh token)
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

/**
 * Set a cookie with proper settings for cross-port sharing
 */
function setCookie(name: string, value: string, maxAge: number = COOKIE_MAX_AGE): void {
  if (typeof document === 'undefined') return;

  let cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;

  if (COOKIE_DOMAIN) {
    cookie += `; domain=${COOKIE_DOMAIN}`;
  }

  document.cookie = cookie;
}

/**
 * Get a cookie value
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.trim().split('=');
    if (cookieName === name) {
      return cookieValue;
    }
  }
  return null;
}

/**
 * Delete a cookie
 */
function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;

  let cookie = `${name}=; path=/; max-age=0`;

  if (COOKIE_DOMAIN) {
    cookie += `; domain=${COOKIE_DOMAIN}`;
  }

  document.cookie = cookie;
}

// =============================================================================
// SESSION HINT COOKIE
// =============================================================================

/**
 * Set session hint cookie (indicates user has an active session)
 * This is NOT the auth token - just a hint for UI rendering
 */
export function setSessionHintCookie(): void {
  setCookie(SESSION_HINT_COOKIE, 'true');
}

/**
 * Clear session hint cookie
 */
export function clearSessionHintCookie(): void {
  deleteCookie(SESSION_HINT_COOKIE);
}

/**
 * Check if session hint cookie exists
 */
export function hasSessionHintCookie(): boolean {
  return getCookie(SESSION_HINT_COOKIE) === 'true';
}

// =============================================================================
// THEME COOKIE
// =============================================================================

export type ThemeValue = 'light' | 'dark' | 'system';

/**
 * Set theme cookie
 */
export function setThemeCookie(theme: ThemeValue): void {
  setCookie(THEME_COOKIE, theme);
}

/**
 * Get theme from cookie
 */
export function getThemeCookie(): ThemeValue | null {
  const theme = getCookie(THEME_COOKIE);
  if (theme === 'light' || theme === 'dark' || theme === 'system') {
    return theme;
  }
  return null;
}

/**
 * Clear theme cookie
 */
export function clearThemeCookie(): void {
  deleteCookie(THEME_COOKIE);
}
