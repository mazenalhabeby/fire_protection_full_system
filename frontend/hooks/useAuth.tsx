"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authApi, type MeResponse, type Session, type LocationData, type TwoFactorChallengeResponse, type TwoFactorStatus } from "@/lib/api/auth";
import { ApiError, setTokenExpiry, clearTokenExpiry, hasSessionMarker, clearSessionMarker } from "@/lib/api/client";
import { getBrowserLocation } from "@/lib/geolocation";
import { disconnectWallet, clearDisconnectedFlag } from "@/providers/Web3ModalProvider";
import { tokensApi } from "@/lib/api/tokens";
import { lockingApi } from "@/lib/api/locking";
import { affiliatesApi } from "@/lib/api/affiliates";
import { queryKeys } from "./useAppData";
import type { User } from "@/types/api";

interface WalletAuthOptions {
  firstName?: string;
  lastName?: string;
  referralCode?: string;
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
  const [user, setUser] = useState<User | null>(null);
  const [currentSession, setCurrentSession] = useState<MeResponse['currentSession'] | null>(null);
  const [pendingActions, setPendingActions] = useState<MeResponse['pendingActions'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [twoFactorChallenge, setTwoFactorChallenge] = useState<TwoFactorChallenge | null>(null);

  // Clear 2FA challenge state
  const clearTwoFactorChallenge = useCallback(() => {
    setTwoFactorChallenge(null);
  }, []);

  // Prefetch all user data after login - runs in parallel for speed
  // Uses staleTime to skip fetching if data is already fresh in cache
  const prefetchUserData = useCallback(async () => {
    const staleTime = 5 * 60 * 1000; // 5 minutes - matches QueryProvider default

    await Promise.all([
      // Dashboard data
      queryClient.prefetchQuery({
        queryKey: queryKeys.balance,
        queryFn: () => tokensApi.getBalance(),
        staleTime,
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.transactions(1, 10),
        queryFn: () => tokensApi.getTransactions(1, 10),
        staleTime,
      }),

      // Locking data
      queryClient.prefetchQuery({
        queryKey: queryKeys.lockTiers,
        queryFn: () => lockingApi.getTiers(),
        staleTime: 30 * 60 * 1000, // 30 minutes - tiers rarely change
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.userLocks,
        queryFn: () => lockingApi.getUserLocks(),
        staleTime,
      }),

      // Affiliate data
      queryClient.prefetchQuery({
        queryKey: queryKeys.affiliate,
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
        queryKey: queryKeys.affiliateStats,
        queryFn: async () => {
          try {
            return await affiliatesApi.getStats();
          } catch {
            return null;
          }
        },
        staleTime,
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.leaderboard,
        queryFn: async () => {
          const response = await affiliatesApi.getLeaderboard({ limit: 10 });
          return response.leaderboard;
        },
        staleTime,
      }),

      // Token price
      queryClient.prefetchQuery({
        queryKey: queryKeys.tokenPrice,
        queryFn: async () => {
          const response = await tokensApi.getPrice();
          return parseFloat(response.price);
        },
        staleTime: 1 * 60 * 1000, // 1 minute - price can change
      }),
    ]);
  }, [queryClient]);

  // Clear all cached data on logout
  const clearCache = useCallback(() => {
    queryClient.clear();
  }, [queryClient]);

  // Fetch current user from /auth/me
  const refreshUser = useCallback(async () => {
    try {
      const response = await authApi.getMe();
      setUser(response.user);
      setCurrentSession(response.currentSession);
      setPendingActions(response.pendingActions);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
        setCurrentSession(null);
        setPendingActions(null);
      }
    }
  }, []);

  // Check auth on mount - only if session marker exists (optimization)
  useEffect(() => {
    const initAuth = async () => {
      // Skip API call if no session marker exists (guest user)
      if (!hasSessionMarker()) {
        setUser(null);
        setCurrentSession(null);
        setPendingActions(null);
        setIsLoading(false);
        return;
      }

      // Session marker exists - verify with backend
      try {
        const response = await authApi.getMe();
        setUser(response.user);
        setCurrentSession(response.currentSession);
        setPendingActions(response.pendingActions);

        // Only prefetch if user is authenticated
        if (response.user) {
          // Set token expiry for proactive refresh
          setTokenExpiry();
          prefetchUserData();
        }
      } catch {
        // Not authenticated - clear marker and state
        setUser(null);
        setCurrentSession(null);
        setPendingActions(null);
        clearTokenExpiry();
        clearSessionMarker(); // Clear stale marker
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [prefetchUserData]);

  // Listen for session-revoked events (when token refresh fails due to revoked session)
  useEffect(() => {
    const handleSessionRevoked = () => {
      console.log('[Auth] Session revoked - logging out');
      setUser(null);
      setCurrentSession(null);
      setPendingActions(null);
      // Redirect to login with locale
      if (typeof window !== 'undefined') {
        // Extract locale from current pathname (e.g., /en/dashboard -> en)
        const pathParts = window.location.pathname.split('/');
        const locale = pathParts[1] || 'en';
        window.location.href = `/${locale}/login?reason=session_revoked`;
      }
    };

    window.addEventListener('session-revoked', handleSessionRevoked);
    return () => {
      window.removeEventListener('session-revoked', handleSessionRevoked);
    };
  }, []);

  // ============================================
  // EMAIL/PASSWORD AUTH
  // ============================================

  // Helper to check if response is a 2FA challenge
  const isTwoFactorChallenge = (response: unknown): response is TwoFactorChallengeResponse => {
    return typeof response === 'object' && response !== null && 'requiresTwoFactor' in response && (response as TwoFactorChallengeResponse).requiresTwoFactor === true;
  };

  const login = useCallback(async (credentials: LoginRequest): Promise<LoginResult> => {
    // Try to get browser location for accurate geolocation (non-blocking)
    let location: LocationData | undefined;
    try {
      console.log('[Auth] Getting browser location before login...');
      const browserLocation = await getBrowserLocation();
      if (browserLocation) {
        location = {
          latitude: browserLocation.latitude,
          longitude: browserLocation.longitude,
          city: browserLocation.city,
          country: browserLocation.country,
        };
        console.log('[Auth] Browser location obtained:', location);
      } else {
        console.log('[Auth] No browser location available, will use IP-based');
      }
    } catch (e) {
      // Silently fail - IP-based location will be used as fallback
      console.log('[Auth] Browser location error, using IP-based location:', e);
    }

    console.log('[Auth] Sending login request with location:', location);
    const response = await authApi.login({ ...credentials, location });

    // Check if 2FA is required
    if (isTwoFactorChallenge(response)) {
      console.log('[Auth] 2FA required, storing challenge token');
      setTwoFactorChallenge({
        token: response.twoFactorToken,
        authMethod: 'credentials',
      });
      return { success: false, requiresTwoFactor: true };
    }

    setUser(response.user);
    // Set token expiry for proactive refresh
    setTokenExpiry();
    // Fetch full user data including session
    await refreshUser();
    // Prefetch all app data in background (non-blocking)
    prefetchUserData();
    return { success: true };
  }, [refreshUser, prefetchUserData]);

  const register = useCallback(async (data: RegisterRequest) => {
    // Try to get browser location for accurate geolocation (non-blocking)
    let location: LocationData | undefined;
    try {
      const browserLocation = await getBrowserLocation();
      if (browserLocation) {
        location = {
          latitude: browserLocation.latitude,
          longitude: browserLocation.longitude,
          city: browserLocation.city,
          country: browserLocation.country,
        };
      }
    } catch (e) {
      // Silently fail - IP-based location will be used as fallback
      console.log('Browser location unavailable, using IP-based location');
    }

    const response = await authApi.register({ ...data, location });
    setUser(response.user);
    // Set token expiry for proactive refresh
    setTokenExpiry();
    // Fetch full user data including session
    await refreshUser();
    // Prefetch all app data in background (non-blocking)
    prefetchUserData();
  }, [refreshUser, prefetchUserData]);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setCurrentSession(null);
    setPendingActions(null);
    setTwoFactorChallenge(null);
    // Clear token expiry
    clearTokenExpiry();
    // Clear all cached data
    clearCache();
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

    // Get browser location for the 2FA verification
    let location: LocationData | undefined;
    try {
      const browserLocation = await getBrowserLocation();
      if (browserLocation) {
        location = {
          latitude: browserLocation.latitude,
          longitude: browserLocation.longitude,
          city: browserLocation.city,
          country: browserLocation.country,
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

    // Clear the challenge
    setTwoFactorChallenge(null);

    // Complete login
    setUser(response.user);
    setTokenExpiry();
    await refreshUser();
    prefetchUserData();
  }, [twoFactorChallenge, refreshUser, prefetchUserData]);

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
      });

      // Check if 2FA is required
      if (isTwoFactorChallenge(response)) {
        console.log('[Auth] 2FA required for wallet login, storing challenge token');
        setTwoFactorChallenge({
          token: response.twoFactorToken,
          authMethod: 'wallet',
        });
        return { isNewUser: false, requiresTwoFactor: true };
      }

      setUser(response.user);
      // Set token expiry for proactive refresh
      setTokenExpiry();
      await refreshUser();
      // Clear disconnected flag so wallet can auto-reconnect
      clearDisconnectedFlag();
      // Prefetch all app data in background (non-blocking)
      prefetchUserData();
      return { isNewUser: false };
    } else {
      const response = await authApi.walletRegister({
        walletAddress,
        signature,
        message,
        firstName: options?.firstName,
        lastName: options?.lastName,
        referralCode: options?.referralCode,
      });
      setUser(response.user);
      // Set token expiry for proactive refresh
      setTokenExpiry();
      await refreshUser();
      // Clear disconnected flag so wallet can auto-reconnect
      clearDisconnectedFlag();
      // Prefetch all app data in background (non-blocking)
      prefetchUserData();
      return { isNewUser: true };
    }
  }, [refreshUser, prefetchUserData]);

  const walletLogin = useCallback(async (
    walletAddress: string,
    signMessage: (message: string) => Promise<string>
  ): Promise<LoginResult> => {
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
      console.log('[Auth] 2FA required for wallet login');
      setTwoFactorChallenge({
        token: response.twoFactorToken,
        authMethod: 'wallet',
      });
      return { success: false, requiresTwoFactor: true };
    }

    setUser(response.user);
    // Set token expiry for proactive refresh
    setTokenExpiry();
    await refreshUser();
    // Clear disconnected flag so wallet can auto-reconnect
    clearDisconnectedFlag();
    // Prefetch all app data in background (non-blocking)
    prefetchUserData();
    return { success: true };
  }, [refreshUser, prefetchUserData]);

  const walletRegister = useCallback(async (
    walletAddress: string,
    signMessage: (message: string) => Promise<string>,
    options?: WalletAuthOptions
  ) => {
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
    });

    setUser(response.user);
    // Set token expiry for proactive refresh
    setTokenExpiry();
    await refreshUser();
    // Clear disconnected flag so wallet can auto-reconnect
    clearDisconnectedFlag();
    // Prefetch all app data in background (non-blocking)
    prefetchUserData();
  }, [refreshUser, prefetchUserData]);

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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
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

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = redirectTo;
    }
  }, [isAuthenticated, isLoading, redirectTo]);

  return { isAuthenticated, isLoading };
}

// Hook for admin-only access
export function useRequireAdmin(redirectTo = "/dashboard") {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "ADMIN")) {
      window.location.href = redirectTo;
    }
  }, [user, isLoading, redirectTo]);

  return { isAdmin: user?.role === "ADMIN", isLoading };
}
