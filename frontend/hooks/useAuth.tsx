"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { authApi, type MeResponse, type Session, type SessionActivity, type LocationData, type TwoFactorChallengeResponse, type TwoFactorStatus, type SecurityAlert, type AuthResponse } from "@/lib/api/auth";
import { toast } from "sonner";
import { ApiError, setSessionMarker, clearSessionMarker, hasSessionMarker } from "@/lib/api/client";
import { getBrowserLocation } from "@/lib/geolocation";
import { disconnectWallet, clearDisconnectedFlag, forceDisconnectWallet } from "@/providers/Web3ModalProvider";
import { tokensApi } from "@/lib/api/tokens";
import { lockingApi } from "@/lib/api/locking";
import { affiliatesApi } from "@/lib/api/affiliates";
import { walletApi } from "@/lib/api/wallet";
import { queryKeys, createUserQueryKeys, globalQueryKeys } from "./useAppData";
import { walletQueryKeys, createWalletQueryKeys } from "./useWalletData";
import { SessionExpiredModal } from "@/components/SessionExpiredModal";
import type { User } from "@/types/api";
import type { AvailableAuthMethods } from "@/lib/api/auth";

// Session expired reason type
export type SessionExpiredReason = "expired" | "revoked" | "security";

// Referral source types for tracking
type ReferralSource =
  | 'direct_link'
  | 'social_share'
  | 'qr_code'
  | 'email_campaign'
  | 'partner'
  | 'unknown';

interface WalletAuthOptions {
  firstName?: string;
  lastName?: string;
  referralCode?: string;
  referralSource?: ReferralSource;
  referralCapturedAt?: number;
  location?: LocationData;
}

interface LoginRequest {
  email: string;
  password: string;
  location?: LocationData;
}

interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  referralCode?: string;
  referralSource?: ReferralSource;
  referralCapturedAt?: number;
  location?: LocationData;
}

// 2FA Challenge State
interface TwoFactorChallenge {
  token: string;
  authMethod: 'credentials' | 'wallet';
}

// Login result - either success or 2FA required
interface LoginResult {
  success: boolean;
  requiresTwoFactor?: boolean;
}

interface AuthContextType {
  // State
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  currentSession: MeResponse['currentSession'] | null;
  pendingActions: MeResponse['pendingActions'] | null;
  availableAuthMethods: AvailableAuthMethods | null;

  // Session Expired State (silent - for Binance-style re-auth)
  needsReAuth: boolean;
  setNeedsReAuth: (value: boolean) => void;

  // Legacy session expired (kept for backwards compat, but now triggers needsReAuth)
  sessionExpired: boolean;
  sessionExpiredReason: SessionExpiredReason | null;
  clearSessionExpired: () => void;

  // 2FA State
  twoFactorChallenge: TwoFactorChallenge | null;
  clearTwoFactorChallenge: () => void;

  // Auth Methods (login/walletAuth now return LoginResult indicating if 2FA is required)
  login: (credentials: LoginRequest) => Promise<LoginResult>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;

  // 2FA Methods
  verifyTwoFactorLogin: (code: string) => Promise<void>;
  getTwoFactorStatus: () => Promise<TwoFactorStatus>;

  // Wallet Auth
  walletAuth: (walletAddress: string, signMessage: (message: string) => Promise<string>, options?: WalletAuthOptions) => Promise<{ isNewUser: boolean; requiresTwoFactor?: boolean }>;
  walletLogin: (walletAddress: string, signMessage: (message: string) => Promise<string>) => Promise<LoginResult>;
  walletRegister: (walletAddress: string, signMessage: (message: string) => Promise<string>, options?: WalletAuthOptions) => Promise<void>;
  linkWallet: (walletAddress: string, signMessage: (message: string) => Promise<string>) => Promise<void>;

  // Session Management
  getSessions: () => Promise<Session[]>;
  revokeSession: (sessionId: string) => Promise<void>;
  logoutAllOtherSessions: () => Promise<number>;
  trustDevice: (sessionId: string, deviceName?: string) => Promise<void>;
  untrustDevice: (sessionId: string) => Promise<void>;
  getSessionActivities: (limit?: number) => Promise<SessionActivity[]>;

  // Email Verification
  verifyEmailCode: (code: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;

  // Password
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  setPassword: (password: string, confirmPassword: string) => Promise<void>;

  // Profile
  updateUser: (data: { firstName?: string; lastName?: string; phoneNumber?: string }) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [currentSession, setCurrentSession] = useState<MeResponse['currentSession'] | null>(null);
  const [pendingActions, setPendingActions] = useState<MeResponse['pendingActions'] | null>(null);
  const [availableAuthMethods, setAvailableAuthMethods] = useState<AvailableAuthMethods | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [twoFactorChallenge, setTwoFactorChallenge] = useState<TwoFactorChallenge | null>(null);

  // Binance-style silent re-auth state
  const [needsReAuth, setNeedsReAuth] = useState(false);

  // Legacy session expired state (now triggers needsReAuth instead of modal)
  const [sessionExpired, setSessionExpired] = useState(false);
  const [sessionExpiredReason, setSessionExpiredReason] = useState<SessionExpiredReason | null>(null);

  // Clear session expired state (called when user dismisses modal or logs in)
  const clearSessionExpired = useCallback(() => {
    setSessionExpired(false);
    setSessionExpiredReason(null);
    setNeedsReAuth(false);
  }, []);

  // Clear 2FA challenge state
  const clearTwoFactorChallenge = useCallback(() => {
    setTwoFactorChallenge(null);
  }, []);

  // Prefetch all user data after login - runs in parallel for speed
  // Uses staleTime to skip fetching if data is already fresh in cache
  // IMPORTANT: userId is required to create user-scoped cache entries
  const prefetchUserData = useCallback(async (userId: string) => {
    const staleTime = 5 * 60 * 1000; // 5 minutes - matches QueryProvider default
    const userKeys = createUserQueryKeys(userId);
    const walletKeys = createWalletQueryKeys(userId);

    await Promise.all([
      // Dashboard data (user-scoped)
      queryClient.prefetchQuery({
        queryKey: userKeys.balance,
        queryFn: async () => {
          const walletBalance = await walletApi.getBalance('HBCT');
          return {
            availableBalance: walletBalance.availableBalance,
            lockedBalance: walletBalance.lockedBalance,
            totalBalance: walletBalance.totalBalance,
          };
        },
        staleTime,
      }),
      queryClient.prefetchQuery({
        queryKey: userKeys.transactions(1, 10),
        queryFn: async () => {
          const result = await walletApi.getTransactions({ currency: 'HBCT', page: 1, limit: 10 });
          return {
            transactions: result.transactions.map((tx) => ({
              id: tx.id,
              type: tx.type,
              amount: tx.amount,
              status: tx.status,
              txHash: tx.txHash || tx.metadata?.txHash,
              createdAt: tx.createdAt,
              completedAt: tx.completedAt,
            })),
            pagination: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages },
          };
        },
        staleTime,
      }),

      // Wallet balances (for navbar and wallet page) - user-scoped
      queryClient.prefetchQuery({
        queryKey: walletKeys.balances,
        queryFn: () => walletApi.getBalances(),
        staleTime: 30 * 1000, // 30 seconds - matches useWalletBalances
      }),

      // Locking data - tiers are global, user locks are user-scoped
      queryClient.prefetchQuery({
        queryKey: globalQueryKeys.lockTiers,
        queryFn: () => lockingApi.getTiers(),
        staleTime: 30 * 60 * 1000, // 30 minutes - tiers rarely change
      }),
      queryClient.prefetchQuery({
        queryKey: userKeys.userLocks,
        queryFn: () => lockingApi.getUserLocks(),
        staleTime,
      }),

      // Affiliate data (user-scoped)
      queryClient.prefetchQuery({
        queryKey: userKeys.affiliate,
        queryFn: async () => {
          try {
            return await affiliatesApi.getMyAffiliate();
          } catch {
            return null;
          }
        },
        staleTime,
      }),
      queryClient.prefetchQuery({
        queryKey: userKeys.affiliateStats,
        queryFn: async () => {
          try {
            return await affiliatesApi.getStats();
          } catch {
            return null;
          }
        },
        staleTime,
      }),
      // Leaderboard is global
      queryClient.prefetchQuery({
        queryKey: globalQueryKeys.leaderboard,
        queryFn: async () => {
          const response = await affiliatesApi.getLeaderboard({ limit: 10 });
          return response.leaderboard;
        },
        staleTime,
      }),

      // Token price is global
      queryClient.prefetchQuery({
        queryKey: globalQueryKeys.tokenPrice,
        queryFn: async () => {
          const response = await tokensApi.getPrice();
          return parseFloat(response.price);
        },
        staleTime: 1 * 60 * 1000, // 1 minute - price can change
      }),
    ]);
  }, [queryClient]);

  // Clear all cached data on logout or user switch
  const clearCache = useCallback(() => {
    // Remove all queries from the cache
    queryClient.clear();
    // Also remove all query data and cancel any in-flight queries
    queryClient.removeQueries();
    // Reset query defaults
    queryClient.resetQueries();
  }, [queryClient]);

  // Fetch current user from /auth/me
  const refreshUser = useCallback(async () => {
    try {
      const response = await authApi.getMe();
      setUser(response.user);
      setCurrentSession(response.currentSession);
      setPendingActions(response.pendingActions);
      setAvailableAuthMethods(response.availableAuthMethods || null);
      // Clear needsReAuth flag on successful refresh
      setNeedsReAuth(false);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
        setCurrentSession(null);
        setPendingActions(null);
        setAvailableAuthMethods(null);
      }
    }
  }, []);

  // Track the last known user ID to detect user changes
  const lastKnownUserIdRef = useRef<string | null>(null);

  // Check auth on mount - always verify with backend
  // This handles OAuth logins, cross-app sessions (admin/frontend), and session validation
  useEffect(() => {
    const initAuth = async () => {
      // Always verify with backend - handles cross-app sessions (admin panel <-> frontend)
      // The backend will validate cookies and return user if session exists
      try {
        const response = await authApi.getMe();

        // Session is valid - ensure session marker is set (for cross-app compatibility)
        setSessionMarker();

        // IMPORTANT: Clear cache if user changed (handles OAuth logins and account switches)
        // This ensures we don't show cached data from a different user
        const previousUserId = lastKnownUserIdRef.current;
        const newUserId = response.user?.id || null;

        if (previousUserId && previousUserId !== newUserId) {
          clearCache();
        } else if (!previousUserId && newUserId) {
          // Fresh login (including OAuth) - clear any stale cache
          clearCache();
        }

        // Update the ref with current user ID
        lastKnownUserIdRef.current = newUserId;

        setUser(response.user);
        setCurrentSession(response.currentSession);
        setPendingActions(response.pendingActions);
        setAvailableAuthMethods(response.availableAuthMethods || null);

        // Only prefetch if user is authenticated
        if (response.user) {
          setSessionMarker();
          prefetchUserData(response.user.id);
        }
      } catch {
        // Not authenticated - clear marker and state
        setUser(null);
        setCurrentSession(null);
        setPendingActions(null);
        setAvailableAuthMethods(null);
        clearSessionMarker();
        // Clear cache when auth fails
        clearCache();
        lastKnownUserIdRef.current = null;
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [prefetchUserData, clearCache]);

  // Display security alert to user (defined before useEffect that needs it)
  const showSecurityAlert = useCallback((alert: SecurityAlert) => {
    const messages: Record<string, { title: string; description: string }> = {
      impossible_travel: {
        title: "🚨 Suspicious Login Detected",
        description: alert.message || "We detected a login from an unusual location. If this wasn't you, please secure your account.",
      },
      new_location: {
        title: "📍 New Login Location",
        description: alert.message || "We noticed a login from a new location. If this wasn't you, please review your sessions.",
      },
      ip_change: {
        title: "🌍 IP Address Changed",
        description: alert.message || "Your IP address changed during this session.",
      },
      new_device: {
        title: "📱 New Device",
        description: alert.message || "We noticed a login from a new device.",
      },
    };

    const info = messages[alert.type] || {
      title: "⚠️ Security Alert",
      description: alert.message,
    };

    // Show warning toast that stays longer
    toast.warning(info.title, {
      description: info.description,
      duration: 10000, // 10 seconds
      action: {
        label: "Review Sessions",
        onClick: () => router.push("/settings?tab=security"),
      },
    });
  }, [router]);

  // Listen for session expiration events
  useEffect(() => {
    const handleSessionExpired = async (event?: Event) => {
      // Determine reason from event detail or default to 'expired'
      const customEvent = event as CustomEvent<{ reason?: SessionExpiredReason }>;
      const reason = customEvent?.detail?.reason || 'expired';

      // Check if there was actually a user logged in (not just a fresh page load)
      const hadActiveSession = user !== null || hasSessionMarker();

      // Clear user state
      setUser(null);
      setCurrentSession(null);
      setPendingActions(null);
      clearSessionMarker(false); // Not voluntary - session expired/revoked
      clearCache();

      // Force disconnect wallet to clear all cached connector state
      // This ensures user gets wallet selection modal on next login
      await forceDisconnectWallet();

      // Only redirect with "expired=true" if there was an active session
      // Don't show expired message for fresh visits with no session
      if (typeof window !== 'undefined' && hadActiveSession) {
        const currentPath = window.location.pathname;
        // Don't redirect if already on login/register page
        if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
          router.push('/login?expired=true');
        }
      }
    };

    // Handle security alerts from token refresh
    const handleSecurityAlert = (event: CustomEvent) => {
      const alert = event.detail as SecurityAlert;
      if (alert) {
        showSecurityAlert(alert);
      }
    };

    // Listen for both old and new event names for compatibility
    window.addEventListener('session-expired', handleSessionExpired);
    window.addEventListener('session-revoked', handleSessionExpired);
    window.addEventListener('security-alert', handleSecurityAlert as EventListener);
    return () => {
      window.removeEventListener('session-expired', handleSessionExpired);
      window.removeEventListener('session-revoked', handleSessionExpired);
      window.removeEventListener('security-alert', handleSecurityAlert as EventListener);
    };
  }, [showSecurityAlert, clearCache]);

  // Proactive session check when user returns to tab after being away
  useEffect(() => {
    let lastVisibilityChange = Date.now();

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const timeAway = Date.now() - lastVisibilityChange;

        // Only check if user was away for more than 1 minute and has session marker
        if (timeAway > 60 * 1000 && hasSessionMarker() && user) {
          try {
            // Quick session check via /auth/me
            const response = await authApi.getMe();
            if (response.user) {
              // Session is still valid - update user data
              setUser(response.user);
              setCurrentSession(response.currentSession);
              setPendingActions(response.pendingActions);
              setAvailableAuthMethods(response.availableAuthMethods);
            }
          } catch (error) {
            if (error instanceof ApiError && error.status === 401) {
              // Session expired while away - trigger re-auth
              setUser(null);
              setCurrentSession(null);
              setPendingActions(null);
              clearSessionMarker();
              clearCache();
              setNeedsReAuth(true);
            }
          }
        }
      } else {
        lastVisibilityChange = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, clearCache]);

  // ============================================
  // EMAIL/PASSWORD AUTH
  // ============================================

  // Helper to check if response is a 2FA challenge
  const isTwoFactorChallenge = (response: unknown): response is TwoFactorChallengeResponse => {
    return typeof response === 'object' && response !== null && 'requiresTwoFactor' in response && (response as TwoFactorChallengeResponse).requiresTwoFactor === true;
  };

  const login = useCallback(async (credentials: LoginRequest): Promise<LoginResult> => {
    // Clear session expired state if showing
    clearSessionExpired();

    // IMPORTANT: Clear all cached data from previous user before new login
    // This prevents showing stale data from a different account
    clearCache();

    // Try to get browser location for accurate geolocation (non-blocking)
    let location: LocationData | undefined;
    try {
      const browserLocation = await getBrowserLocation();
      if (browserLocation) {
        location = {
          ...(browserLocation.latitude !== undefined && { latitude: browserLocation.latitude }),
          ...(browserLocation.longitude !== undefined && { longitude: browserLocation.longitude }),
          ...(browserLocation.city && { city: browserLocation.city }),
          ...(browserLocation.country && { country: browserLocation.country }),
        };
      }
    } catch {
      // Silently fail - IP-based location will be used as fallback
    }

    const response = await authApi.login({ ...credentials, location });

    // Check if 2FA is required
    if (isTwoFactorChallenge(response)) {
      setTwoFactorChallenge({
        token: response.twoFactorToken,
        authMethod: 'credentials',
      });
      return { success: false, requiresTwoFactor: true };
    }

    setUser(response.user);
    setSessionMarker();
    // Fetch full user data including session
    await refreshUser();
    // Prefetch all app data in background (non-blocking) with user-scoped keys
    prefetchUserData(response.user.id);

    // Show security alert if present
    if (response.securityAlert) {
      showSecurityAlert(response.securityAlert);
    }

    return { success: true };
  }, [clearCache, clearSessionExpired, refreshUser, prefetchUserData, showSecurityAlert]);

  const register = useCallback(async (data: RegisterRequest) => {
    // Clear session expired state if showing
    clearSessionExpired();

    // IMPORTANT: Clear all cached data before registration
    clearCache();

    // Try to get browser location for accurate geolocation (non-blocking)
    let location: LocationData | undefined;
    try {
      const browserLocation = await getBrowserLocation();
      if (browserLocation) {
        // Explicitly pick only the allowed properties to avoid validation errors
        location = {
          ...(browserLocation.latitude !== undefined && { latitude: browserLocation.latitude }),
          ...(browserLocation.longitude !== undefined && { longitude: browserLocation.longitude }),
          ...(browserLocation.city && { city: browserLocation.city }),
          ...(browserLocation.country && { country: browserLocation.country }),
        };
      }
    } catch {
      // Silently fail - IP-based location will be used as fallback
    }

    const response = await authApi.register({ ...data, location });
    setUser(response.user);
    setSessionMarker();
    // Fetch full user data including session
    await refreshUser();
    // Prefetch all app data in background (non-blocking) with user-scoped keys
    prefetchUserData(response.user.id);
  }, [clearCache, clearSessionExpired, refreshUser, prefetchUserData]);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setCurrentSession(null);
    setPendingActions(null);
    setTwoFactorChallenge(null);
    // Clear token expiry - mark as voluntary to prevent "expired" redirect
    clearSessionMarker(true);
    // Clear all cached data
    clearCache();
    // Reset user tracking ref
    lastKnownUserIdRef.current = null;
    // Disconnect wallet completely and prevent auto-reconnection
    await disconnectWallet();
  }, [clearCache]);

  // ============================================
  // TWO-FACTOR AUTHENTICATION
  // ============================================

  /**
   * Complete login with 2FA verification code
   */
  const verifyTwoFactorLogin = useCallback(async (code: string) => {
    if (!twoFactorChallenge) {
      throw new Error('No 2FA challenge active');
    }

    // IMPORTANT: Clear cache before completing 2FA login (in case of stale data)
    clearCache();

    // Get browser location for the 2FA verification
    let location: LocationData | undefined;
    try {
      const browserLocation = await getBrowserLocation();
      if (browserLocation) {
        // Explicitly pick only the allowed properties to avoid validation errors
        location = {
          ...(browserLocation.latitude !== undefined && { latitude: browserLocation.latitude }),
          ...(browserLocation.longitude !== undefined && { longitude: browserLocation.longitude }),
          ...(browserLocation.city && { city: browserLocation.city }),
          ...(browserLocation.country && { country: browserLocation.country }),
        };
      }
    } catch {
      // Silently fail - IP-based location will be used as fallback
    }

    const response = await authApi.verifyTwoFactorLogin({
      twoFactorToken: twoFactorChallenge.token,
      code,
      location,
    });

    // Complete login - set user FIRST to prevent flash of login form
    setUser(response.user);
    setSessionMarker();

    // Clear the challenge AFTER setting user
    setTwoFactorChallenge(null);

    await refreshUser();
    // Prefetch all app data in background with user-scoped keys
    prefetchUserData(response.user.id);

    // Show security alert if present
    if (response.securityAlert) {
      showSecurityAlert(response.securityAlert);
    }
  }, [clearCache, twoFactorChallenge, refreshUser, prefetchUserData, showSecurityAlert]);

  /**
   * Get 2FA status for current user
   */
  const getTwoFactorStatus = useCallback(async () => {
    return authApi.getTwoFactorStatus();
  }, []);

  // ============================================
  // WALLET AUTH
  // ============================================

  /**
   * Combined wallet auth - automatically registers or logs in based on wallet status
   */
  const walletAuth = useCallback(async (
    walletAddress: string,
    signMessage: (message: string) => Promise<string>,
    options?: WalletAuthOptions
  ): Promise<{ isNewUser: boolean; requiresTwoFactor?: boolean }> => {
    // Clear session expired state if showing
    clearSessionExpired();

    // IMPORTANT: Clear all cached data from previous user before new login
    clearCache();

    // Step 1: Get nonce from backend
    const { message, isRegistered } = await authApi.getWalletNonce(walletAddress);

    // Step 2: Sign the message with the wallet
    const signature = await signMessage(message);

    // Step 3: Either login or register based on wallet status
    if (isRegistered) {
      const response = await authApi.walletLogin({
        walletAddress,
        signature,
        message,
        location: options?.location,
      });

      // Check if 2FA is required
      if (isTwoFactorChallenge(response)) {
        setTwoFactorChallenge({
          token: response.twoFactorToken,
          authMethod: 'wallet',
        });
        return { isNewUser: false, requiresTwoFactor: true };
      }

      setUser(response.user);
      // Set token expiries for proactive refresh
      setSessionMarker();
      await refreshUser();
      // Clear disconnected flag so wallet can auto-reconnect
      clearDisconnectedFlag();
      // Prefetch all app data in background with user-scoped keys
      prefetchUserData(response.user.id);
      return { isNewUser: false };
    } else {
      const response = await authApi.walletRegister({
        walletAddress,
        signature,
        message,
        firstName: options?.firstName,
        lastName: options?.lastName,
        referralCode: options?.referralCode,
        referralSource: options?.referralSource,
        referralCapturedAt: options?.referralCapturedAt,
        location: options?.location,
      });
      setUser(response.user);
      // Set token expiries for proactive refresh
      setSessionMarker();
      await refreshUser();
      // Clear disconnected flag so wallet can auto-reconnect
      clearDisconnectedFlag();
      // Prefetch all app data in background with user-scoped keys
      prefetchUserData(response.user.id);
      return { isNewUser: true };
    }
  }, [clearCache, clearSessionExpired, refreshUser, prefetchUserData]);

  const walletLogin = useCallback(async (
    walletAddress: string,
    signMessage: (message: string) => Promise<string>
  ): Promise<LoginResult> => {
    // Clear session expired state if showing
    clearSessionExpired();

    // IMPORTANT: Clear all cached data from previous user before new login
    clearCache();

    // Step 1: Get nonce from backend
    const { message, isRegistered } = await authApi.getWalletNonce(walletAddress);

    if (!isRegistered) {
      throw new Error('Wallet not registered. Please sign up first.');
    }

    // Step 2: Sign the message with the wallet
    const signature = await signMessage(message);

    // Step 3: Send signature to backend for verification
    const response = await authApi.walletLogin({
      walletAddress,
      signature,
      message,
    });

    // Check if 2FA is required
    if (isTwoFactorChallenge(response)) {
      setTwoFactorChallenge({
        token: response.twoFactorToken,
        authMethod: 'wallet',
      });
      return { success: false, requiresTwoFactor: true };
    }

    setUser(response.user);
    setSessionMarker();
    await refreshUser();
    // Clear disconnected flag so wallet can auto-reconnect
    clearDisconnectedFlag();
    // Prefetch all app data in background with user-scoped keys
    prefetchUserData(response.user.id);

    // Show security alert if present
    if (response.securityAlert) {
      showSecurityAlert(response.securityAlert);
    }

    return { success: true };
  }, [clearCache, clearSessionExpired, refreshUser, prefetchUserData, showSecurityAlert]);

  const walletRegister = useCallback(async (
    walletAddress: string,
    signMessage: (message: string) => Promise<string>,
    options?: WalletAuthOptions
  ) => {
    // Clear session expired state if showing
    clearSessionExpired();

    // IMPORTANT: Clear all cached data before registration
    clearCache();

    // Step 1: Get nonce from backend
    const { message, isRegistered } = await authApi.getWalletNonce(walletAddress);

    if (isRegistered) {
      throw new Error('Wallet already registered. Please login instead.');
    }

    // Step 2: Sign the message with the wallet
    const signature = await signMessage(message);

    // Step 3: Send signature to backend for verification and registration
    const response = await authApi.walletRegister({
      walletAddress,
      signature,
      message,
      firstName: options?.firstName,
      lastName: options?.lastName,
      referralCode: options?.referralCode,
      referralSource: options?.referralSource,
      referralCapturedAt: options?.referralCapturedAt,
      location: options?.location,
    });

    setUser(response.user);
    setSessionMarker();
    await refreshUser();
    // Clear disconnected flag so wallet can auto-reconnect
    clearDisconnectedFlag();
    // Prefetch all app data in background with user-scoped keys
    prefetchUserData(response.user.id);
  }, [clearCache, clearSessionExpired, refreshUser, prefetchUserData]);

  const linkWallet = useCallback(async (
    walletAddress: string,
    signMessage: (message: string) => Promise<string>
  ) => {
    // Step 1: Get nonce from backend
    const { message } = await authApi.getWalletNonce(walletAddress);

    // Step 2: Sign the message with the wallet
    const signature = await signMessage(message);

    // Step 3: Link wallet to account
    await authApi.linkWallet({
      walletAddress,
      signature,
      message,
    });

    // Clear disconnected flag so wallet can auto-reconnect
    clearDisconnectedFlag();
    // Refresh to get updated user with wallet
    await refreshUser();
  }, [refreshUser]);

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  const getSessions = useCallback(async (): Promise<Session[]> => {
    const response = await authApi.getSessions();
    return response.sessions;
  }, []);

  const revokeSession = useCallback(async (sessionId: string) => {
    await authApi.revokeSession(sessionId);
  }, []);

  const logoutAllOtherSessions = useCallback(async (): Promise<number> => {
    const response = await authApi.logoutAll();
    return response.revokedSessions;
  }, []);

  const trustDevice = useCallback(async (sessionId: string, deviceName?: string) => {
    await authApi.trustDevice(sessionId, deviceName);
  }, []);

  const untrustDevice = useCallback(async (sessionId: string) => {
    await authApi.untrustDevice(sessionId);
  }, []);

  const getSessionActivities = useCallback(async (limit?: number): Promise<SessionActivity[]> => {
    const response = await authApi.getSessionActivities(limit);
    return response.activities;
  }, []);

  // ============================================
  // EMAIL VERIFICATION
  // ============================================

  const verifyEmailCode = useCallback(async (code: string) => {
    await authApi.verifyEmailCode(code);
    await refreshUser();
  }, [refreshUser]);

  const resendVerificationEmail = useCallback(async () => {
    await authApi.resendVerification();
  }, []);

  // ============================================
  // PASSWORD MANAGEMENT
  // ============================================

  const forgotPassword = useCallback(async (email: string) => {
    await authApi.forgotPassword(email);
  }, []);

  const resetPassword = useCallback(async (token: string, password: string) => {
    await authApi.resetPassword(token, password);
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await authApi.changePassword(currentPassword, newPassword);
  }, []);

  const setPassword = useCallback(async (password: string, confirmPassword: string) => {
    await authApi.setPassword(password, confirmPassword);
    // Refresh user data to update hasPassword
    await refreshUser();
  }, [refreshUser]);

  // ============================================
  // PROFILE UPDATE
  // ============================================

  const updateUser = useCallback(async (data: { firstName?: string; lastName?: string; phoneNumber?: string }): Promise<User> => {
    const updatedUser = await authApi.updateProfile(data);
    // Update local state with the response - no need for extra API call
    setUser(updatedUser);
    return updatedUser;
  }, []);

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    currentSession,
    pendingActions,
    availableAuthMethods,
    // Binance-style silent re-auth
    needsReAuth,
    setNeedsReAuth,
    // Session Expired State (legacy - now only used for security alerts)
    sessionExpired,
    sessionExpiredReason,
    clearSessionExpired,
    // 2FA State
    twoFactorChallenge,
    clearTwoFactorChallenge,
    // Auth Methods
    login,
    register,
    logout,
    refreshUser,
    // 2FA Methods
    verifyTwoFactorLogin,
    getTwoFactorStatus,
    // Wallet Auth
    walletAuth,
    walletLogin,
    walletRegister,
    linkWallet,
    // Session Management
    getSessions,
    revokeSession,
    logoutAllOtherSessions,
    trustDevice,
    untrustDevice,
    getSessionActivities,
    // Email Verification
    verifyEmailCode,
    resendVerificationEmail,
    // Password
    forgotPassword,
    resetPassword,
    changePassword,
    setPassword,
    // Profile
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <SessionExpiredModal
        isOpen={sessionExpired}
        onClose={clearSessionExpired}
        reason={sessionExpiredReason || "expired"}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

// Hook for requiring authentication
export function useRequireAuth(redirectTo = "/login") {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, isLoading, redirectTo, router]);

  return { isAuthenticated, isLoading };
}

// Hook for admin-only access
export function useRequireAdmin(redirectTo = "/dashboard") {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "ADMIN")) {
      router.push(redirectTo);
    }
  }, [user, isLoading, redirectTo, router]);

  return { isAdmin: user?.role === "ADMIN", isLoading };
}
