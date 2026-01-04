// Auth API Service - Cookie-based authentication

import { api } from './client';
import type { User } from '@/types/api';

// Security Alert Types
export interface SecurityAlert {
  type: 'impossible_travel' | 'ip_change' | 'new_device' | 'new_location';
  message: string;
  details?: Record<string, any>;
}

// Auth Response Types
export interface AuthResponse {
  user: User;
  tokenExpiresAt?: number; // Unix timestamp in ms when access token expires
  message?: string;
  securityAlert?: SecurityAlert;
}

export interface AvailableAuthMethods {
  password: boolean;
  google: boolean;
  facebook: boolean;
  wallet: string | null;  // wallet address if linked, null otherwise
}

export interface MeResponse {
  user: User;
  currentSession: {
    id: string;
    authMethod: string;  // password, google, facebook, wallet
    deviceType: string | null;
    browser: string | null;
    os: string | null;
    ipAddress: string | null;
    lastActivityAt: string;
    createdAt: string;
  };
  availableAuthMethods: AvailableAuthMethods;
  pendingActions: {
    emailVerification: boolean;
  };
}

// Browser Location (for accurate geolocation and VPN detection)
export interface LocationData {
  latitude?: number;
  longitude?: number;
  accuracy?: number;  // Accuracy in meters
  city?: string;
  country?: string;
}

// Referral source types for tracking
export type ReferralSource =
  | 'direct_link'
  | 'social_share'
  | 'qr_code'
  | 'email_campaign'
  | 'partner'
  | 'unknown';

// Login/Register Types
export interface LoginRequest {
  email: string;
  password: string;
  location?: LocationData;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  referralCode?: string;
  referralSource?: ReferralSource;
  referralCapturedAt?: number;  // Unix timestamp in ms
  location?: LocationData;
}

// Wallet Auth Types
export interface WalletNonceResponse {
  nonce: string;
  isRegistered: boolean;
  message: string;
}

export interface WalletLoginRequest {
  walletAddress: string;
  signature: string;
  message: string;
  location?: LocationData;
}

export interface WalletRegisterRequest {
  walletAddress: string;
  signature: string;
  message: string;
  firstName?: string;
  lastName?: string;
  referralCode?: string;
  referralSource?: ReferralSource;
  referralCapturedAt?: number;  // Unix timestamp in ms
  location?: LocationData;
}

export interface WalletLinkRequest {
  walletAddress: string;
  signature: string;
  message: string;
}

// Multi-Wallet Management Types
export interface LinkedWallet {
  id: string;
  walletAddress: string;
  label: string | null;
  isPrimary: boolean;
  verifiedAt: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface WalletsResponse {
  wallets: LinkedWallet[];
  remainingSlots: number;
  maxWallets: number;
}

export interface LinkingNonceResponse {
  nonce: string;
  message: string;
  expiresAt: string;
}

export interface LinkNewWalletRequest {
  walletAddress: string;
  signature: string;
  nonce: string;
  label?: string;
}

// Two-Factor Authentication Types
export interface TwoFactorChallengeResponse {
  requiresTwoFactor: true;
  twoFactorToken: string;
}

export interface TwoFactorStatus {
  isEnabled: boolean;
  isVerified: boolean;
  enabledAt: string | null;
  recoveryCodesRemaining: number;
}

export interface TwoFactorSetupResponse {
  secret: string;
  qrCodeDataUrl: string;
}

export interface TwoFactorVerifySetupResponse {
  success: boolean;
  recoveryCodes: string[];
}

export interface TwoFactorLoginRequest {
  twoFactorToken: string;
  code: string;
  location?: LocationData;
}

// Session Types
export interface Session {
  id: string;
  deviceType: string | null;
  deviceName: string | null;
  browser: string | null;
  os: string | null;
  ipAddress: string | null;
  // IP-based location
  country: string | null;
  city: string | null;
  // Browser GPS location
  browserCity: string | null;
  browserCountry: string | null;
  // VPN detection
  isVpnDetected: boolean;
  locationMismatch: boolean;
  // Session metadata
  lastActivityAt: string;
  createdAt: string;
  isCurrent: boolean;
  isTrusted: boolean;
  trustDeviceName: string | null;
}

// Session Activity Types
export interface SessionActivity {
  id: string;
  sessionId: string;
  action: string;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  device: string | null;
  city: string | null;
  country: string | null;
  createdAt: string;
}

export const authApi = {
  // ============================================
  // EMAIL/PASSWORD AUTHENTICATION
  // ============================================

  login: async (credentials: LoginRequest): Promise<AuthResponse | TwoFactorChallengeResponse> => {
    return api.post<AuthResponse | TwoFactorChallengeResponse>('/auth/login', credentials);
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    return api.post<AuthResponse>('/auth/register', data);
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore errors on logout
    }
  },

  // ============================================
  // CURRENT USER & SESSION
  // ============================================

  /**
   * Get current user, session, and pending actions (single API call)
   */
  getMe: async (): Promise<MeResponse> => {
    return api.get<MeResponse>('/auth/me');
  },

  /**
   * Check if user is authenticated by trying to get current user
   */
  checkAuth: async (): Promise<User | null> => {
    try {
      const response = await api.get<MeResponse>('/auth/me');
      return response.user;
    } catch {
      return null;
    }
  },

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  getSessions: async (): Promise<{ sessions: Session[] }> => {
    return api.get<{ sessions: Session[] }>('/auth/sessions');
  },

  revokeSession: async (sessionId: string): Promise<void> => {
    await api.delete(`/auth/sessions/${sessionId}`);
  },

  logoutAll: async (): Promise<{ revokedSessions: number }> => {
    return api.post<{ revokedSessions: number }>('/auth/logout-all');
  },

  trustDevice: async (sessionId: string, deviceName?: string): Promise<void> => {
    await api.post(`/auth/sessions/${sessionId}/trust`, { deviceName });
  },

  untrustDevice: async (sessionId: string): Promise<void> => {
    await api.delete(`/auth/sessions/${sessionId}/trust`);
  },

  getSessionActivities: async (limit?: number): Promise<{ activities: SessionActivity[] }> => {
    const params = limit ? `?limit=${limit}` : '';
    return api.get<{ activities: SessionActivity[] }>(`/auth/sessions/activities${params}`);
  },

  // ============================================
  // EMAIL VERIFICATION
  // ============================================

  verifyEmail: async (token: string): Promise<{ success: boolean; message: string }> => {
    return api.post<{ success: boolean; message: string }>('/auth/verify-email', { token });
  },

  verifyEmailCode: async (code: string): Promise<{ success: boolean; message: string }> => {
    return api.post<{ success: boolean; message: string }>('/auth/verify-email-code', { code });
  },

  resendVerification: async (): Promise<{ success: boolean; message: string }> => {
    return api.post<{ success: boolean; message: string }>('/auth/resend-verification');
  },

  // ============================================
  // PASSWORD MANAGEMENT
  // ============================================

  forgotPassword: async (email: string): Promise<{ success: boolean; message: string }> => {
    return api.post<{ success: boolean; message: string }>('/auth/forgot-password', { email });
  },

  resetPassword: async (token: string, password: string): Promise<{ success: boolean; message: string }> => {
    return api.post<{ success: boolean; message: string }>('/auth/reset-password', { token, password });
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    return api.post<{ success: boolean; message: string }>('/auth/change-password', { currentPassword, newPassword });
  },

  /**
   * Set password for users who don't have one (OAuth/Wallet users)
   */
  setPassword: async (password: string, confirmPassword: string): Promise<{ success: boolean; message: string }> => {
    return api.post<{ success: boolean; message: string }>('/auth/set-password', { password, confirmPassword });
  },

  // ============================================
  // WALLET AUTHENTICATION
  // ============================================

  /**
   * Get nonce for wallet signature
   */
  getWalletNonce: async (walletAddress: string): Promise<WalletNonceResponse> => {
    return api.post<WalletNonceResponse>('/auth/wallet/nonce', { walletAddress });
  },

  /**
   * Login with wallet signature
   */
  walletLogin: async (data: WalletLoginRequest): Promise<AuthResponse | TwoFactorChallengeResponse> => {
    return api.post<AuthResponse | TwoFactorChallengeResponse>('/auth/wallet/login', data);
  },

  /**
   * Register with wallet signature
   */
  walletRegister: async (data: WalletRegisterRequest): Promise<AuthResponse> => {
    return api.post<AuthResponse>('/auth/wallet/register', data);
  },

  /**
   * Link wallet to existing account
   */
  linkWallet: async (data: WalletLinkRequest): Promise<{ success: boolean; walletAddress: string }> => {
    return api.post<{ success: boolean; walletAddress: string }>('/auth/wallet/link', data);
  },

  // ============================================
  // MULTI-WALLET MANAGEMENT
  // ============================================

  /**
   * Get all wallets linked to current user
   */
  getWallets: async (): Promise<WalletsResponse> => {
    return api.get<WalletsResponse>('/auth/wallets');
  },

  /**
   * Generate nonce for linking a new wallet
   */
  generateLinkingNonce: async (walletAddress: string): Promise<LinkingNonceResponse> => {
    return api.post<LinkingNonceResponse>('/auth/wallets/nonce', { walletAddress });
  },

  /**
   * Link a new wallet after signature verification
   */
  linkNewWallet: async (data: LinkNewWalletRequest): Promise<{ wallet: LinkedWallet; message: string }> => {
    return api.post<{ wallet: LinkedWallet; message: string }>('/auth/wallets/link', data);
  },

  /**
   * Set a wallet as primary
   */
  setPrimaryWallet: async (walletId: string): Promise<{ wallet: LinkedWallet; message: string }> => {
    return api.patch<{ wallet: LinkedWallet; message: string }>(`/auth/wallets/${walletId}/primary`);
  },

  /**
   * Update wallet label
   */
  updateWalletLabel: async (walletId: string, label: string): Promise<{ wallet: LinkedWallet }> => {
    return api.patch<{ wallet: LinkedWallet }>(`/auth/wallets/${walletId}/label`, { label });
  },

  /**
   * Remove a linked wallet
   */
  removeWallet: async (walletId: string): Promise<{ success: boolean; message: string }> => {
    return api.delete<{ success: boolean; message: string }>(`/auth/wallets/${walletId}`);
  },

  /**
   * Check if user can switch to a connected wallet
   */
  checkWalletSwitch: async (walletAddress: string): Promise<{ canSwitch: boolean; reason?: string }> => {
    return api.post<{ canSwitch: boolean; reason?: string }>('/auth/wallets/check-switch', { walletAddress });
  },

  /**
   * Check if a wallet address is available (not linked to any account)
   * This is a public endpoint - no authentication required
   */
  checkWalletAvailability: async (walletAddress: string): Promise<{
    available: boolean;
    linkedToCurrentUser: boolean;
    message?: string;
  }> => {
    return api.get<{
      available: boolean;
      linkedToCurrentUser: boolean;
      message?: string;
    }>(`/auth/wallet/check/${encodeURIComponent(walletAddress)}`);
  },

  /**
   * Check wallet availability for authenticated user (includes ownership check)
   */
  checkWalletAvailabilityAuthenticated: async (walletAddress: string): Promise<{
    available: boolean;
    linkedToCurrentUser: boolean;
    message?: string;
  }> => {
    return api.get<{
      available: boolean;
      linkedToCurrentUser: boolean;
      message?: string;
    }>(`/auth/wallet/check-authenticated/${encodeURIComponent(walletAddress)}`);
  },

  // ============================================
  // USERNAME MANAGEMENT
  // ============================================

  /**
   * Check if a username is available
   */
  checkUsername: async (username: string): Promise<{ available: boolean; reason?: string | null }> => {
    return api.get<{ available: boolean; reason?: string | null }>(`/users/username/check/${encodeURIComponent(username)}`);
  },

  /**
   * Set or update username
   */
  updateUsername: async (username: string): Promise<User> => {
    return api.patch<User>('/users/username', { username });
  },

  /**
   * Lookup user by username (for transfers)
   */
  lookupByUsername: async (username: string): Promise<{ found: boolean; user: { id: string; username: string; displayName: string } | null }> => {
    return api.get<{ found: boolean; user: { id: string; username: string; displayName: string } | null }>(`/users/lookup/username/${encodeURIComponent(username)}`);
  },

  /**
   * Lookup user by ID (for transfers)
   */
  lookupByUserId: async (userId: string): Promise<{ found: boolean; user: { id: string; username: string; displayName: string } | null }> => {
    return api.get<{ found: boolean; user: { id: string; username: string; displayName: string } | null }>(`/users/lookup/id/${encodeURIComponent(userId)}`);
  },

  /**
   * Get user profile
   */
  getProfile: async (): Promise<User> => {
    return api.get<User>('/users/profile');
  },

  /**
   * Update user profile
   */
  updateProfile: async (data: { firstName?: string; lastName?: string; email?: string; phoneNumber?: string }): Promise<User> => {
    return api.patch<User>('/users/profile', data);
  },

  // ============================================
  // TWO-FACTOR AUTHENTICATION
  // ============================================

  /**
   * Get 2FA status for current user
   */
  getTwoFactorStatus: async (): Promise<TwoFactorStatus> => {
    return api.get<TwoFactorStatus>('/auth/2fa/status');
  },

  /**
   * Initiate 2FA setup - returns QR code and secret
   */
  setupTwoFactor: async (): Promise<TwoFactorSetupResponse> => {
    return api.post<TwoFactorSetupResponse>('/auth/2fa/setup');
  },

  /**
   * Verify TOTP code and enable 2FA - returns recovery codes
   */
  verifyTwoFactorSetup: async (token: string): Promise<TwoFactorVerifySetupResponse> => {
    return api.post<TwoFactorVerifySetupResponse>('/auth/2fa/verify-setup', { token });
  },

  /**
   * Disable 2FA (requires current TOTP code)
   */
  disableTwoFactor: async (token: string): Promise<{ success: boolean }> => {
    return api.post<{ success: boolean }>('/auth/2fa/disable', { token });
  },

  /**
   * Regenerate recovery codes (requires TOTP code)
   */
  regenerateRecoveryCodes: async (token: string): Promise<{ recoveryCodes: string[] }> => {
    return api.post<{ recoveryCodes: string[] }>('/auth/2fa/recovery-codes', { token });
  },

  /**
   * Complete login with 2FA verification (public endpoint)
   */
  verifyTwoFactorLogin: async (data: TwoFactorLoginRequest): Promise<AuthResponse> => {
    return api.post<AuthResponse>('/auth/2fa/verify', data);
  },

  // ============================================
  // ADMIN STEP-UP AUTHENTICATION
  // ============================================

  /**
   * Get admin access status
   */
  getAdminStatus: async (): Promise<AdminStatusResponse> => {
    return api.get<AdminStatusResponse>('/auth/admin/status');
  },

  /**
   * Verify admin access with 2FA code (step-up authentication)
   */
  verifyAdminAccess: async (code: string): Promise<AdminVerifyResponse> => {
    return api.post<AdminVerifyResponse>('/auth/admin/verify', { code });
  },

  /**
   * Revoke admin verification (logout from admin)
   */
  revokeAdminAccess: async (): Promise<{ success: boolean }> => {
    return api.post<{ success: boolean }>('/auth/admin/revoke');
  },

  // ============================================
  // ACCOUNT DELETION (SELF-SERVICE)
  // ============================================

  /**
   * Check if account can be deleted (pre-deletion validation)
   * Returns blockers if any exist (balance, locks, pending withdrawals)
   */
  checkDeletionEligibility: async (): Promise<DeletionEligibilityResponse> => {
    return api.get<DeletionEligibilityResponse>('/auth/account/deletion-eligibility');
  },

  /**
   * Delete own account (soft delete with 30-day grace period)
   * User can recover within 30 days, data retained for 1 year
   */
  deleteMyAccount: async (): Promise<DeleteAccountResponse> => {
    return api.delete<DeleteAccountResponse>('/auth/account');
  },
};

// Admin Step-Up Authentication Types
export interface AdminStatusResponse {
  isAdmin: boolean;
  isVerified: boolean;
  has2FAEnabled: boolean;
  expiresAt: string | null;
}

export interface AdminVerifyResponse {
  success: boolean;
  expiresAt: string;
  redirectUrl: string;
}

// Account Deletion Types
export interface DeletionEligibilityResponse {
  canDelete: boolean;
  blockers: Array<{
    type: 'balance' | 'locks' | 'withdrawals';
    message: string;
    count?: number;
    amount?: string;
  }>;
  gracePeriodDays: number;
  retentionDays: number;
}

export interface DeleteAccountResponse {
  message: string;
  gracePeriodEndsAt: string;
  retentionExpiresAt: string;
}
