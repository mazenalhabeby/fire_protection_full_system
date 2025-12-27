import { CookieOptions } from 'express';

// Cookie names
export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

// Token expiration times
export const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
export const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

// Cookie max ages in milliseconds
export const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000; // 15 minutes
export const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// Session expiry for database
export const SESSION_EXPIRY_DAYS = 7;

// Password reset token expiry
export const PASSWORD_RESET_EXPIRY_MINUTES = 15;

// Email verification token expiry
export const EMAIL_VERIFICATION_EXPIRY_HOURS = 24;

// Rate limiting
export const LOGIN_RATE_LIMIT = 5; // attempts
export const LOGIN_RATE_WINDOW = 15 * 60 * 1000; // 15 minutes

// Account lockout
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MINUTES = 30;

// Nonce expiry for wallet auth
export const WALLET_NONCE_EXPIRY_MINUTES = 10;

/**
 * Get cookie configuration based on environment
 */
export const getCookieConfig = (isProduction: boolean): CookieOptions => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'strict' : 'lax',
  path: '/',
  // In production, set domain for cross-subdomain cookies if needed
  // domain: isProduction ? '.yourdomain.com' : undefined,
});

/**
 * Get access token cookie options
 */
export const getAccessTokenCookieOptions = (isProduction: boolean): CookieOptions => ({
  ...getCookieConfig(isProduction),
  maxAge: ACCESS_TOKEN_MAX_AGE,
});

/**
 * Get refresh token cookie options
 */
export const getRefreshTokenCookieOptions = (isProduction: boolean): CookieOptions => ({
  ...getCookieConfig(isProduction),
  maxAge: REFRESH_TOKEN_MAX_AGE,
});

/**
 * Cookie options for clearing (logout)
 */
export const getClearCookieOptions = (isProduction: boolean): CookieOptions => ({
  ...getCookieConfig(isProduction),
  maxAge: 0,
});
