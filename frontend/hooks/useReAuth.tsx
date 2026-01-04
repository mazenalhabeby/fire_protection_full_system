"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import { ReAuthPanel } from "@/components/auth/ReAuthPanel";
import { type AvailableAuthMethods } from "@/lib/api/auth";

// Helper to get useAuth without circular dependency
function getUseAuth() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useAuth } = require("./useAuth");
  return useAuth as () => {
    user: { email?: string | null } | null;
    currentSession: { authMethod: string } | null;
    availableAuthMethods: AvailableAuthMethods | null;
    needsReAuth: boolean;
    refreshUser: () => Promise<void>;
    clearSessionExpired: () => void;
  };
}

// Queued action that will be executed after re-auth
interface QueuedAction {
  id: string;
  action: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
}

interface ReAuthContextType {
  // Whether re-auth is currently needed
  needsReAuth: boolean;

  // Mark session as needing re-auth (silent, doesn't show panel)
  setNeedsReAuth: (value: boolean) => void;

  // Show the re-auth panel
  showReAuthPanel: () => void;

  // Hide the re-auth panel
  hideReAuthPanel: () => void;

  // Execute an action that requires auth, will queue and show re-auth if needed
  withReAuth: <T>(action: () => Promise<T>) => Promise<T>;

  // Set the available auth methods and current session info
  setAuthInfo: (info: {
    availableAuthMethods: AvailableAuthMethods;
    currentAuthMethod: string;
    userEmail?: string | null;
  }) => void;

  // Clear re-auth state (on successful login)
  clearReAuth: () => void;

  // Callback for when re-auth is successful (to sync with useAuth)
  onReAuthSuccess?: () => void;
  setOnReAuthSuccess: (callback: () => void) => void;
}

const ReAuthContext = createContext<ReAuthContextType | null>(null);

export function ReAuthProvider({ children }: { children: ReactNode }) {
  // Get auth state directly from useAuth
  const useAuth = getUseAuth();
  const auth = useAuth();

  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Queue of actions waiting for re-auth
  const queueRef = useRef<QueuedAction[]>([]);
  const actionIdCounter = useRef(0);

  // Use needsReAuth from useAuth directly
  const needsReAuth = auth.needsReAuth;

  // Get auth info directly from auth context
  const authInfo = {
    availableAuthMethods: auth.availableAuthMethods || {
      password: false,
      google: false,
      facebook: false,
      wallet: null,
    },
    currentAuthMethod: auth.currentSession?.authMethod || "password",
    userEmail: auth.user?.email,
  };

  // Show the re-auth panel
  const showReAuthPanel = useCallback(() => {
    setIsPanelOpen(true);
  }, []);

  // Hide the re-auth panel
  const hideReAuthPanel = useCallback(() => {
    setIsPanelOpen(false);
  }, []);

  // Set auth info (no-op since we get it directly from useAuth now)
  const setAuthInfo = useCallback((_info: {
    availableAuthMethods: AvailableAuthMethods;
    currentAuthMethod: string;
    userEmail?: string | null;
  }) => {
    // No-op - we get auth info directly from useAuth
  }, []);

  // setNeedsReAuth - no-op since we use useAuth's state
  const setNeedsReAuth = useCallback((_value: boolean) => {
    // No-op - useAuth manages this state
  }, []);

  // Clear re-auth state
  const clearReAuth = useCallback(() => {
    setIsPanelOpen(false);
    queueRef.current = [];
    auth.clearSessionExpired();
  }, [auth]);

  // Handle successful re-auth
  const handleReAuthSuccess = useCallback(async () => {
    setIsPanelOpen(false);

    // Refresh user data after successful re-auth
    await auth.refreshUser();
    auth.clearSessionExpired();

    // Execute all queued actions
    const queue = [...queueRef.current];
    queueRef.current = [];

    for (const item of queue) {
      try {
        const result = await item.action();
        item.resolve(result);
      } catch (error) {
        item.reject(error);
      }
    }
  }, [auth]);

  // Execute an action with re-auth protection
  const withReAuth = useCallback(async <T,>(action: () => Promise<T>): Promise<T> => {
    // If re-auth is needed, queue the action and show panel
    if (needsReAuth) {
      return new Promise<T>((resolve, reject) => {
        const id = `action-${++actionIdCounter.current}`;
        queueRef.current.push({
          id,
          action: action as () => Promise<unknown>,
          resolve: resolve as (value: unknown) => void,
          reject,
        });

        // Show the panel if not already showing
        if (!isPanelOpen) {
          setIsPanelOpen(true);
        }
      });
    }

    // Otherwise, execute immediately
    try {
      return await action();
    } catch (error: unknown) {
      // Check if it's a 401 error - if so, queue for re-auth
      const isUnauthorized =
        error instanceof Error &&
        (error.message.includes("401") ||
          error.message.includes("Unauthorized") ||
          error.message.includes("Session expired"));

      if (isUnauthorized) {
        setNeedsReAuth(true);

        return new Promise<T>((resolve, reject) => {
          const id = `action-${++actionIdCounter.current}`;
          queueRef.current.push({
            id,
            action: action as () => Promise<unknown>,
            resolve: resolve as (value: unknown) => void,
            reject,
          });

          setIsPanelOpen(true);
        });
      }

      throw error;
    }
  }, [needsReAuth, isPanelOpen]);

  const value: ReAuthContextType = {
    needsReAuth,
    setNeedsReAuth,
    showReAuthPanel,
    hideReAuthPanel,
    withReAuth,
    setAuthInfo,
    clearReAuth,
    setOnReAuthSuccess: () => {}, // No-op - we handle success directly now
  };

  return (
    <ReAuthContext.Provider value={value}>
      {children}
      <ReAuthPanel
        isOpen={isPanelOpen}
        onClose={hideReAuthPanel}
        onSuccess={handleReAuthSuccess}
        availableAuthMethods={authInfo.availableAuthMethods}
        currentAuthMethod={authInfo.currentAuthMethod}
        userEmail={authInfo.userEmail}
      />
    </ReAuthContext.Provider>
  );
}

export function useReAuth() {
  const context = useContext(ReAuthContext);
  if (!context) {
    throw new Error("useReAuth must be used within ReAuthProvider");
  }
  return context;
}

// ReAuthSync is no longer needed since ReAuthProvider now gets auth state directly from useAuth
