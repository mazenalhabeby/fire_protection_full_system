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
import { authApi, adminApi, type MeResponse, type Session, type SessionActivity, type TwoFactorStatus, type MyPermissionsResponse } from "@/lib/api";
import type { Role } from "@/lib/api/admin";
import { toast } from "sonner";
import { ApiError, setSessionMarker, clearSessionMarker, hasSessionMarker } from "@/lib/api";
import type { User } from "@/types";

// Session expired reason type
export type SessionExpiredReason = "expired" | "revoked" | "security";

interface LoginRequest {
  email: string;
  password: string;
}

// 2FA Challenge State
interface TwoFactorChallenge {
  token: string;
}

// Login result - either success or 2FA required
interface LoginResult {
  success: boolean;
  requiresTwoFactor?: boolean;
}

interface AdminAuthContextType {
  // State
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  currentSession: MeResponse['currentSession'] | null;

  // RBAC State
  permissions: string[];
  userRole: Role | null;
  hasPermission: (permission: string | string[], mode?: 'all' | 'any') => boolean;
  refreshPermissions: () => Promise<void>;

  // 2FA State
  twoFactorChallenge: TwoFactorChallenge | null;
  clearTwoFactorChallenge: () => void;

  // Auth Methods
  login: (credentials: LoginRequest) => Promise<LoginResult>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;

  // 2FA Methods
  verifyTwoFactorLogin: (code: string) => Promise<void>;
  getTwoFactorStatus: () => Promise<TwoFactorStatus>;

  // Session Management
  getSessions: () => Promise<Session[]>;
  revokeSession: (sessionId: string) => Promise<void>;
  logoutAllOtherSessions: () => Promise<number>;
  getSessionActivities: (limit?: number) => Promise<SessionActivity[]>;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [currentSession, setCurrentSession] = useState<MeResponse['currentSession'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [twoFactorChallenge, setTwoFactorChallenge] = useState<TwoFactorChallenge | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [userRole, setUserRole] = useState<Role | null>(null);

  const clearTwoFactorChallenge = useCallback(() => {
    setTwoFactorChallenge(null);
  }, []);

  const clearCache = useCallback(() => {
    queryClient.clear();
    queryClient.removeQueries();
    queryClient.resetQueries();
  }, [queryClient]);

  // Load user permissions based on their role
  const refreshPermissions = useCallback(async () => {
    if (!user?.roleId) {
      setPermissions([]);
      setUserRole(null);
      return;
    }

    try {
      // Use the dedicated my-permissions endpoint that doesn't require roles.view permission
      const response = await authApi.getMyPermissions();
      if (response.role) {
        setUserRole({
          ...response.role,
          isSystem: false, // Not needed for display
          isActive: true,
          createdAt: '',
          updatedAt: '',
          permissions: response.permissions,
        } as Role);
        setPermissions(response.permissions.map(p => p.code));
      } else {
        setPermissions([]);
        setUserRole(null);
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
      setPermissions([]);
      setUserRole(null);
    }
  }, [user?.roleId]);

  // Check if user has specific permission(s)
  // Legacy ADMIN users (without RBAC role) get full access
  const hasPermission = useCallback((permission: string | string[], mode: 'all' | 'any' = 'all'): boolean => {
    // Legacy admins with legacyRole='ADMIN' but no roleId have full access
    if (user?.role === 'ADMIN' && !user?.roleId) {
      return true;
    }

    const requiredPermissions = Array.isArray(permission) ? permission : [permission];

    if (mode === 'all') {
      return requiredPermissions.every(p => permissions.includes(p));
    }

    return requiredPermissions.some(p => permissions.includes(p));
  }, [permissions, user?.role, user?.roleId]);

  const refreshUser = useCallback(async () => {
    try {
      const response = await authApi.getMe();
      setUser(response.user);
      setCurrentSession(response.currentSession);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
        setCurrentSession(null);
        setPermissions([]);
        setUserRole(null);
      }
    }
  }, []);

  // Refresh permissions when user changes
  useEffect(() => {
    if (user?.roleId) {
      refreshPermissions();
    }
  }, [user?.roleId, refreshPermissions]);

  // Check auth on mount - always verify with backend for cross-app session support
  useEffect(() => {
    const initAuth = async () => {
      // Always verify with backend - handles cross-app sessions (admin panel <-> frontend)
      try {
        const response = await authApi.getMe();

        // Session is valid - ensure session marker is set (for cross-app compatibility)
        setSessionMarker();

        setUser(response.user);
        setCurrentSession(response.currentSession);

        // Ensure user is admin (legacy role) OR has an RBAC role assigned
        if (response.user?.role !== 'ADMIN' && !response.user?.roleId) {
          toast.error('Admin access required');
          clearSessionMarker();
          setUser(null);
          setCurrentSession(null);
        }
      } catch {
        // Not authenticated - clear marker and state
        setUser(null);
        setCurrentSession(null);
        clearSessionMarker();
        clearCache();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [clearCache]);

  // Listen for session expiration events
  useEffect(() => {
    const handleSessionExpired = async () => {
      setUser(null);
      setCurrentSession(null);
      clearSessionMarker();
      clearCache();

      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        if (!currentPath.includes('/login')) {
          const pathParts = currentPath.split('/').filter(Boolean);
          const locale = pathParts[0] || 'en';
          window.location.href = `/${locale}/login?expired=true`;
        }
      }
    };

    window.addEventListener('session-expired', handleSessionExpired);
    window.addEventListener('session-revoked', handleSessionExpired);
    return () => {
      window.removeEventListener('session-expired', handleSessionExpired);
      window.removeEventListener('session-revoked', handleSessionExpired);
    };
  }, [clearCache]);

  // Helper to check if response is a 2FA challenge
  const isTwoFactorChallenge = (response: unknown): response is { requiresTwoFactor: true; twoFactorToken: string } => {
    return typeof response === 'object' && response !== null && 'requiresTwoFactor' in response && (response as { requiresTwoFactor: boolean }).requiresTwoFactor === true;
  };

  const login = useCallback(async (credentials: LoginRequest): Promise<LoginResult> => {
    clearCache();

    const response = await authApi.login(credentials);

    if (isTwoFactorChallenge(response)) {
      setTwoFactorChallenge({
        token: response.twoFactorToken,
      });
      return { success: false, requiresTwoFactor: true };
    }

    // Check admin role OR RBAC role
    if (response.user.role !== 'ADMIN' && !response.user.roleId) {
      throw new Error('Admin access required');
    }

    setUser(response.user);
    setSessionMarker();
    await refreshUser();
    return { success: true };
  }, [clearCache, refreshUser]);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setCurrentSession(null);
    setTwoFactorChallenge(null);
    setPermissions([]);
    setUserRole(null);
    clearSessionMarker();
    clearCache();
  }, [clearCache]);

  const verifyTwoFactorLogin = useCallback(async (code: string) => {
    if (!twoFactorChallenge) {
      throw new Error('No 2FA challenge active');
    }

    clearCache();

    const response = await authApi.verifyTwoFactorLogin({
      twoFactorToken: twoFactorChallenge.token,
      code,
    });

    // Check admin role OR RBAC role
    if (response.user.role !== 'ADMIN' && !response.user.roleId) {
      throw new Error('Admin access required');
    }

    setUser(response.user);
    setSessionMarker();
    setTwoFactorChallenge(null);
    await refreshUser();
  }, [clearCache, twoFactorChallenge, refreshUser]);

  const getTwoFactorStatus = useCallback(async () => {
    return authApi.getTwoFactorStatus();
  }, []);

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

  const getSessionActivities = useCallback(async (limit?: number): Promise<SessionActivity[]> => {
    const response = await authApi.getSessionActivities(limit);
    return response.activities;
  }, []);

  const value: AdminAuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN' || !!user?.roleId, // Legacy admin OR has RBAC role
    currentSession,
    permissions,
    userRole,
    hasPermission,
    refreshPermissions,
    twoFactorChallenge,
    clearTwoFactorChallenge,
    login,
    logout,
    refreshUser,
    verifyTwoFactorLogin,
    getTwoFactorStatus,
    getSessions,
    revokeSession,
    logoutAllOtherSessions,
    getSessionActivities,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return context;
}

// Hook for requiring admin authentication
export function useRequireAdmin(redirectTo = "/login") {
  const { user, isLoading, isAdmin } = useAdminAuth();

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      window.location.href = redirectTo;
    }
  }, [user, isLoading, isAdmin, redirectTo]);

  return { isAdmin, isLoading };
}
