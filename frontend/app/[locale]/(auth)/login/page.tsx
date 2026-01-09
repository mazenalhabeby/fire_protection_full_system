"use client";

import { useState, useEffect, useRef } from "react";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/useAuth";
import { getLocation, type BrowserLocation } from "@/hooks/useGeolocation";
import { useAccount, useSignMessage, useSignTypedData, useDisconnect } from "wagmi";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { LogIn, UserPlus, ArrowRight, Loader2, Mail, ChevronDown, Shield, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { WalletConnectModal } from "@/components/wallet/WalletConnectModal";
import { SignaturePromptModal } from "@/components/wallet/SignaturePromptModal";
import { forceDisconnectWallet, wagmiConfig } from "@/providers/Web3ModalProvider";
import { getAccount, disconnect as wagmiCoreDisconnect } from "@wagmi/core";
import type { Config } from "@wagmi/core";

// Social login icons with dynamic sizing
const GoogleIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

// Web3 Wallet icon - modern wallet with connection indicator
const WalletIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2.5" />
    <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    <circle cx="16" cy="12" r="1" fill="currentColor" />
  </svg>
);

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const { login, walletAuth, twoFactorChallenge, verifyTwoFactorLogin, clearTwoFactorChallenge, isAuthenticated, isLoading: authLoading } = useAuth();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [authLoading, isAuthenticated, router]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [pendingWalletLogin, setPendingWalletLogin] = useState(false);
  const [walletConnectSelected, setWalletConnectSelected] = useState(false);

  // Signature prompt modal state
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureStatus, setSignatureStatus] = useState<"pending" | "signing" | "success" | "error">("pending");
  const [signatureError, setSignatureError] = useState<string | undefined>();

  // 2FA State
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);

  // Browser location for accurate geolocation and VPN detection
  const [browserLocation, setBrowserLocation] = useState<BrowserLocation | null>(null);

  // Ref to prevent multiple auth attempts
  const isAuthenticatingRef = useRef(false);
  // Ref to track WalletConnect selection (persists across re-renders during AppKit flow)
  const walletConnectSelectedRef = useRef(false);
  // Ref to track pending wallet login (persists across re-renders during AppKit flow)
  const pendingWalletLoginRef = useRef(false);

  // Wagmi hooks
  const { address, isConnected, connector, chainId } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { signTypedDataAsync } = useSignTypedData();
  const { disconnectAsync } = useDisconnect();

  // Track previous connection state to detect new connections
  const prevConnectedRef = useRef(false);
  // Track if we've initiated a wallet auth attempt for the current connection
  const hasInitiatedAuthRef = useRef(false);
  // Track if we've already disconnected on mount (to prevent repeated disconnects)
  const hasDisconnectedOnMountRef = useRef(false);

  // Request browser location on mount for accurate geolocation and VPN detection
  useEffect(() => {
    const requestBrowserLocation = async () => {
      try {
        const location = await getLocation({ timeout: 10000 });
        if (location) {
          setBrowserLocation(location);
        }
      } catch {
        // Location denied or unavailable - continue without it
      }
    };
    requestBrowserLocation();
  }, []);

  // Disconnect any existing wallet connection on mount
  // This ensures users always see the wallet selection popup on auth pages
  useEffect(() => {
    const disconnectExistingWallet = async () => {
      // Only run once on mount
      if (hasDisconnectedOnMountRef.current) return;
      hasDisconnectedOnMountRef.current = true;

      // Check account state directly from wagmi core (synchronous, not React state)
      // This ensures we catch connections even before React state hydrates
      const account = getAccount(wagmiConfig as Config);

      if (account.isConnected) {
        try {
          // Use wagmi core disconnect for immediate effect
          await wagmiCoreDisconnect(wagmiConfig as Config);
        } catch {
          // Ignore disconnect errors
        }
        // Also force clear wallet state to ensure complete reset
        await forceDisconnectWallet();
        // Reset refs to clean state
        prevConnectedRef.current = false;
        hasInitiatedAuthRef.current = false;
      }
    };

    disconnectExistingWallet();
  }, []); // Empty deps - only run on mount

  // Check if connected via WalletConnect
  const isWalletConnect = connector?.id === 'walletConnect' || connector?.name?.toLowerCase().includes('walletconnect');

  // Sign message - use EIP-712 for WalletConnect, personal_sign for others
  const signWithFallback = async (message: string): Promise<string> => {
    // For WalletConnect, use EIP-712 directly (many WC wallets don't support personal_sign)
    if (isWalletConnect) {
      const domain = {
        name: "HBCT Fire Protection",
        version: "1",
        chainId: chainId || 56,
      } as const;

      const types = {
        Message: [
          { name: "content", type: "string" },
        ],
      } as const;

      const signature = await signTypedDataAsync({
        domain,
        types,
        primaryType: "Message",
        message: { content: message },
      });
      return signature;
    }

    // For other wallets, try personal_sign first with EIP-712 fallback
    try {
      const signature = await signMessageAsync({ message });
      return signature;
    } catch (error) {
      if (error instanceof Error &&
          (error.message.includes("personal_sign") ||
           error.message.includes("not supported") ||
           error.message.includes("Method not found"))) {

        const domain = {
          name: "HBCT Fire Protection",
          version: "1",
          chainId: chainId || 56,
        } as const;

        const types = {
          Message: [
            { name: "content", type: "string" },
          ],
        } as const;

        const signature = await signTypedDataAsync({
          domain,
          types,
          primaryType: "Message",
          message: { content: message },
        });
        return signature;
      }
      throw error;
    }
  };

  // Check for session revoked message
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reason') === 'session_revoked') {
      toast.error(t("sessionRevoked"));
      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete('reason');
      window.history.replaceState({}, '', url.pathname);
    }
  }, []);

  // Auto-close wallet modal when wallet connects
  useEffect(() => {
    if (isConnected && showWalletModal) {
      setShowWalletModal(false);
    }
  }, [isConnected, showWalletModal]);

  // Detect new wallet connections and trigger auth
  useEffect(() => {
    const wasConnected = prevConnectedRef.current;
    const justConnected = isConnected && !wasConnected;

    // Update ref for next render
    prevConnectedRef.current = isConnected;

    // If we just connected (transition from disconnected to connected)
    // and we were waiting for a wallet login, trigger auth
    if (justConnected && address && (pendingWalletLogin || pendingWalletLoginRef.current)) {
      // Prevent multiple auth attempts for the same connection
      if (!hasInitiatedAuthRef.current && !isAuthenticatingRef.current) {
        hasInitiatedAuthRef.current = true;
        handleWalletAuth();
      }
    }

    // Reset the initiated flag when we disconnect
    if (!isConnected) {
      hasInitiatedAuthRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address, pendingWalletLogin]);

  const handleWalletAuth = async () => {
    if (!address) return;

    // Prevent multiple simultaneous auth attempts
    if (isAuthenticatingRef.current) {
      return;
    }
    isAuthenticatingRef.current = true;

    setSocialLoading("wallet");

    // Show signature modal for all wallet types
    setSignatureStatus("signing");
    setSignatureError(undefined);
    setShowSignatureModal(true);

    try {
      // Request location on submit (user-initiated action - browser more likely to show prompt)
      let currentLocation = browserLocation;
      if (!currentLocation) {
        currentLocation = await getLocation({ timeout: 5000 });
        if (currentLocation) {
          setBrowserLocation(currentLocation);
        }
      }

      // Include browser location for accurate geolocation and VPN detection
      const locationData = currentLocation ? {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        accuracy: currentLocation.accuracy,
      } : undefined;

      const { isNewUser, requiresTwoFactor } = await walletAuth(address, async (message: string) => {
        const signature = await signWithFallback(message);
        return signature;
      }, { location: locationData });

      // Check if 2FA is required
      if (requiresTwoFactor) {
        // 2FA challenge is now stored in context, UI will update
        setSocialLoading(null);
        setPendingWalletLogin(false);
        setShowSignatureModal(false);
        return;
      }

      // Show success state briefly before redirecting
      setSignatureStatus("success");
      await new Promise(resolve => setTimeout(resolve, 800));
      setShowSignatureModal(false);

      if (isNewUser) {
        toast.success("Account created successfully!");
        router.push("/dashboard?welcome=true");
      } else {
        toast.success(t("loginSuccess"));
        router.push("/dashboard");
      }
    } catch (err) {
      // First try wagmi's disconnect
      try {
        await disconnectAsync();
      } catch {
        // Ignore errors
      }

      // Force disconnect - clears ALL wallet state from localStorage, sessionStorage, and IndexedDB
      await forceDisconnectWallet();

      // Reset all refs immediately so next connection attempt works
      prevConnectedRef.current = false;
      pendingWalletLoginRef.current = false;
      walletConnectSelectedRef.current = false;
      hasInitiatedAuthRef.current = false;

      let errorMessage = t("walletErrors.failedToConnect");

      if (err instanceof ApiError) {
        errorMessage = err.message;
      } else if (err instanceof Error) {
        const errMsg = err.message.toLowerCase();
        if (errMsg.includes("user rejected") || errMsg.includes("user disapproved") || errMsg.includes("rejected")) {
          errorMessage = t("walletErrors.signatureCancelled");
        } else if (errMsg.includes("personal_sign") || errMsg.includes("not supported") || errMsg.includes("method not found")) {
          errorMessage = t("walletErrors.signingNotSupported");
        } else if (errMsg.includes("failed to fetch") || errMsg.includes("network") || errMsg.includes("timeout")) {
          errorMessage = t("walletErrors.networkError");
        } else {
          errorMessage = t("walletErrors.authFailed");
        }
      }

      // Show error in modal for all wallet types
      setSignatureStatus("error");
      setSignatureError(errorMessage);
    } finally {
      setSocialLoading(null);
      setPendingWalletLogin(false);
      pendingWalletLoginRef.current = false;
      setWalletConnectSelected(false);
      walletConnectSelectedRef.current = false;
      isAuthenticatingRef.current = false;
      // Note: Don't reset hasInitiatedAuthRef here on success - we want to prevent re-auth
      // It's reset on disconnect or error
    }
  };

  const handleGoogleLogin = () => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!backendUrl) {
      toast.error(t("apiNotConfigured"));
      return;
    }
    setSocialLoading("google");
    // Redirect to backend Google OAuth endpoint
    window.location.href = `${backendUrl}/auth/google`;
  };

  const handleFacebookLogin = () => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!backendUrl) {
      toast.error(t("apiNotConfigured"));
      return;
    }
    setSocialLoading("facebook");
    // Redirect to backend Facebook OAuth endpoint
    window.location.href = `${backendUrl}/auth/facebook`;
  };

  const handleWalletLogin = async () => {
    // If already connected, proceed with login
    if (isConnected && address) {
      handleWalletAuth();
    } else {
      // Open wallet connect modal
      setPendingWalletLogin(true);
      pendingWalletLoginRef.current = true;
      setShowWalletModal(true);
    }
  };

  const handleWalletModalClose = () => {
    setShowWalletModal(false);
    // Don't reset pending state if WalletConnect was selected (AppKit is handling it)
    if (!isConnected && !walletConnectSelected && !walletConnectSelectedRef.current) {
      setPendingWalletLogin(false);
      pendingWalletLoginRef.current = false;
    }
  };

  const handleWalletConnectSelect = () => {
    setWalletConnectSelected(true);
    walletConnectSelectedRef.current = true;
    // Keep pendingWalletLogin true so auth triggers after AppKit connection
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Request location on submit (user-initiated action - browser more likely to show prompt)
      let currentLocation = browserLocation;
      if (!currentLocation) {
        currentLocation = await getLocation({ timeout: 5000 });
        if (currentLocation) {
          setBrowserLocation(currentLocation);
        }
      }

      // Include browser location for accurate geolocation and VPN detection
      const locationData = currentLocation ? {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        accuracy: currentLocation.accuracy,
      } : undefined;

      const result = await login({ email, password, location: locationData });

      // Check if 2FA is required
      if (result.requiresTwoFactor) {
        // 2FA challenge is now stored in context, UI will update
        setIsLoading(false);
        return;
      }

      toast.success(t("loginSuccess"));
      // Don't set loading to false - keep it true during redirect to prevent flash
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error(t("loginError"));
      }
      // Only set loading to false on error
      setIsLoading(false);
    }
  };

  // Handle 2FA verification
  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorCode || twoFactorCode.length < 6) {
      toast.error(t("twoFactor.invalidCode"));
      return;
    }

    setTwoFactorLoading(true);
    try {
      await verifyTwoFactorLogin(twoFactorCode);
      toast.success(t("loginSuccess"));
      // Don't set loading to false - keep it true during redirect to prevent flash
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error(t("twoFactor.verificationFailed"));
      }
      // Only set loading to false on error
      setTwoFactorLoading(false);
    }
  };

  // Handle going back from 2FA screen
  const handleBackFrom2FA = () => {
    clearTwoFactorChallenge();
    setTwoFactorCode("");
  };

  // Show loading while checking auth state
  if (authLoading || isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Epic Animated Background */}
      <div className="fixed inset-0 -z-10">
        {/* Light mode base - very light clean gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-white via-brand-50/50 to-brand-secondary-50/30 dark:hidden" />

        {/* Dark mode base */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-gray-950 to-black hidden dark:block" />

        {/* Light mode animated mesh gradient - softer colors */}
        <div className="absolute inset-0 dark:hidden overflow-hidden">
          <div className="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-brand-200/40 to-brand-secondary-100/30 rounded-full blur-[120px] animate-blob" />
          <div className="absolute top-1/4 -right-1/4 w-[700px] h-[700px] bg-gradient-to-br from-brand-secondary-100/40 to-brand-secondary-100/30 rounded-full blur-[130px] animate-blob animation-delay-2000" />
          <div className="absolute -bottom-1/4 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-brand-accent-100/40 to-brand-100/30 rounded-full blur-[120px] animate-blob animation-delay-4000" />
          <div className="absolute top-1/2 right-1/4 w-[400px] h-[400px] bg-gradient-to-br from-brand-secondary-100/30 to-brand-secondary-50/20 rounded-full blur-[100px] animate-pulse-slow" />
        </div>

        {/* Dark mode animated orbs */}
        <div className="absolute inset-0 hidden dark:block overflow-hidden">
          <div className="absolute top-0 -left-40 w-[500px] h-[500px] bg-gradient-to-br from-brand-500/30 to-brand-secondary-500/10 rounded-full blur-[100px] animate-blob" />
          <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-brand-secondary-500/20 to-brand-600/10 rounded-full blur-[120px] animate-blob animation-delay-2000" />
          <div className="absolute -bottom-40 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-brand-secondary-500/15 to-brand-500/10 rounded-full blur-[100px] animate-blob animation-delay-4000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-brand-500/5 to-transparent rounded-full blur-[150px] animate-pulse-slow" />
        </div>

        {/* Animated grid - very subtle for light, more visible for dark */}
        <div
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.07]"
          style={{
            backgroundImage: `linear-gradient(rgba(251,146,60,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(251,146,60,0.3) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Floating particles - softer for light mode */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-[10%] left-[20%] w-2 h-2 bg-brand-300/50 dark:bg-brand-400/40 rounded-full animate-float-particle" />
          <div className="absolute top-[20%] left-[80%] w-1.5 h-1.5 bg-brand-secondary-300/40 dark:bg-brand-secondary-400/30 rounded-full animate-float-particle animation-delay-1000" />
          <div className="absolute top-[60%] left-[10%] w-1 h-1 bg-brand-accent-300/40 dark:bg-brand-secondary-400/30 rounded-full animate-float-particle animation-delay-2000" />
          <div className="absolute top-[80%] left-[70%] w-2 h-2 bg-brand-400/40 dark:bg-brand-500/25 rounded-full animate-float-particle animation-delay-3000" />
          <div className="absolute top-[40%] left-[90%] w-1.5 h-1.5 bg-brand-secondary-400/40 dark:bg-brand-secondary-500/30 rounded-full animate-float-particle animation-delay-4000" />
          <div className="absolute top-[70%] left-[40%] w-1 h-1 bg-brand-300/50 dark:bg-brand-400/40 rounded-full animate-float-particle animation-delay-5000" />
          <div className="absolute top-[30%] left-[50%] w-2.5 h-2.5 bg-brand-accent-300/40 dark:bg-brand-accent-400/30 rounded-full animate-float-particle animation-delay-3000" />
          <div className="absolute top-[50%] left-[15%] w-1.5 h-1.5 bg-brand-secondary-400/40 dark:bg-brand-secondary-400/30 rounded-full animate-float-particle animation-delay-1000" />
        </div>

        {/* Glowing lines - softer for light mode */}
        <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-brand-200/40 dark:via-brand-500/10 to-transparent animate-glow-line" />
        <div className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-transparent via-brand-secondary-200/30 dark:via-brand-secondary-500/10 to-transparent animate-glow-line animation-delay-2000" />
        <div className="absolute top-0 left-2/3 w-px h-full bg-gradient-to-b from-transparent via-rose-200/20 dark:via-rose-500/5 to-transparent animate-glow-line animation-delay-4000" />

        {/* Decorative shapes for light mode - more subtle */}
        <div className="absolute inset-0 dark:hidden overflow-hidden opacity-10">
          <div className="absolute top-[15%] right-[10%] w-32 h-32 border border-brand-200 rounded-full animate-spin-slow" />
          <div className="absolute bottom-[20%] left-[5%] w-24 h-24 border border-brand-secondary-200 rounded-full animate-spin-slow animation-delay-2000" style={{ animationDirection: 'reverse' }} />
          <div className="absolute top-[60%] right-[20%] w-16 h-16 border border-rose-200 rounded-full animate-spin-slow animation-delay-4000" />
        </div>

        {/* Noise texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.01] dark:opacity-[0.03] mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Very subtle vignette for light mode */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(255,255,255,0.3)_100%)] dark:bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.5)_100%)]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Card */}
        <div className={cn(
          "relative overflow-hidden rounded-2xl",
          "bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl",
          "border border-white/50 dark:border-gray-700/50",
          "shadow-2xl shadow-gray-900/10 dark:shadow-black/30"
        )}>
          {/* 2FA Verification View */}
          {twoFactorChallenge ? (
            <>
              {/* 2FA Header */}
              <div className="px-8 pt-8 pb-6 text-center">
                {/* Back Button */}
                <button
                  type="button"
                  onClick={handleBackFrom2FA}
                  className="absolute top-4 left-4 p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>

                {/* Icon */}
                <div className={cn(
                  "mx-auto w-14 h-14 rounded-2xl mb-4",
                  "bg-gradient-to-br from-emerald-500 to-teal-600",
                  "flex items-center justify-center",
                  "shadow-lg shadow-emerald-500/20"
                )}>
                  <Shield className="h-7 w-7 text-white" />
                </div>

                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {t("twoFactor.title")}
                </h1>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {t("twoFactor.subtitle")}
                </p>
              </div>

              {/* 2FA Form */}
              <div className="px-8 pb-8">
                <form onSubmit={handleTwoFactorSubmit} className="space-y-4">
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9A-Za-z\-]*"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9A-Za-z\-]/g, '').slice(0, 9))}
                    className="text-center text-2xl tracking-[0.5em] font-mono"
                    autoFocus
                  />

                  <button
                    type="submit"
                    disabled={twoFactorLoading || twoFactorCode.length < 6}
                    className={cn(
                      "group relative w-full h-12 rounded-xl overflow-hidden",
                      "font-semibold text-white",
                      "transition-all duration-300",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
                      "disabled:opacity-70 disabled:cursor-not-allowed",
                      "bg-gradient-to-r from-emerald-500 to-teal-600",
                      "shadow-lg shadow-emerald-500/20",
                      "hover:-translate-y-0.5 active:translate-y-0"
                    )}
                  >
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                    <span className="relative flex items-center justify-center gap-2">
                      {twoFactorLoading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          {t("twoFactor.verifying")}
                        </>
                      ) : (
                        <>
                          {t("twoFactor.verifyButton")}
                          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                    </span>
                  </button>
                </form>

                {/* Recovery code hint */}
                <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
                  {t("twoFactor.recoveryHint")}
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Regular Login Header */}
              <div className="px-8 pt-8 pb-6 text-center">
                {/* Icon */}
                <div className={cn(
                  "mx-auto w-14 h-14 rounded-2xl mb-4",
                  "bg-gradient-icon",
                  "flex items-center justify-center",
                  "shadow-brand-lg"
                )}>
                  <LogIn className="h-7 w-7 text-white" />
                </div>

                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {t("loginTitle")}
                </h1>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {t("loginSubtitle")}
                </p>
              </div>

          {/* Form */}
          <div className="px-8 pb-8">
            {/* Premium Social Login - Vertical Layout */}
            <div className="space-y-3 mb-6">
              {/* Google Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={socialLoading !== null}
                className={cn(
                  "group relative w-full h-12 rounded-xl overflow-hidden",
                  "flex items-center justify-center gap-3",
                  "font-medium text-gray-700 dark:text-gray-200",
                  "bg-white dark:bg-gray-800/90",
                  "border border-gray-200 dark:border-gray-700/50",
                  "shadow-sm",
                  "transition-all duration-300 ease-out",
                  "hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-black/20",
                  "hover:border-gray-300 dark:hover:border-gray-600",
                  "hover:-translate-y-0.5 active:translate-y-0",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
                  "disabled:opacity-60 disabled:cursor-not-allowed"
                )}
              >
                {socialLoading === "google" ? (
                  <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                ) : (
                  <GoogleIcon className="w-5 h-5" />
                )}
                <span>{t("continueWithGoogle")}</span>
              </button>

              {/* Facebook Button */}
              <button
                type="button"
                onClick={handleFacebookLogin}
                disabled={socialLoading !== null}
                className={cn(
                  "group relative w-full h-12 rounded-xl overflow-hidden",
                  "flex items-center justify-center gap-3",
                  "font-medium text-white",
                  "bg-[#1877F2]",
                  "shadow-sm shadow-[#1877F2]/20",
                  "transition-all duration-300 ease-out",
                  "hover:bg-[#166FE5]",
                  "hover:shadow-lg hover:shadow-[#1877F2]/30",
                  "hover:-translate-y-0.5 active:translate-y-0",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1877F2] focus-visible:ring-offset-2",
                  "disabled:opacity-60 disabled:cursor-not-allowed"
                )}
              >
                {/* Shine overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                {socialLoading === "facebook" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                )}
                <span className="relative">{t("continueWithFacebook")}</span>
              </button>

              {/* Web3 Wallet Button */}
              <button
                type="button"
                onClick={handleWalletLogin}
                disabled={socialLoading !== null}
                className={cn(
                  "group relative w-full h-12 rounded-xl overflow-hidden",
                  "flex items-center justify-center gap-3",
                  "font-medium text-white",
                  "bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600",
                  "shadow-sm shadow-purple-500/20",
                  "transition-all duration-300 ease-out",
                  "hover:shadow-lg hover:shadow-purple-500/30",
                  "hover:-translate-y-0.5 active:translate-y-0",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2",
                  "disabled:opacity-60 disabled:cursor-not-allowed"
                )}
              >
                {/* Animated shimmer */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                {socialLoading === "wallet" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <WalletIcon className="w-5 h-5" />
                )}
                <span className="relative">{t("connectWallet")}</span>
              </button>
            </div>

            {/* Continue with Email - Expandable Section */}
            <div className="relative">
              {/* Toggle Button */}
              <button
                type="button"
                onClick={() => setShowEmailForm(!showEmailForm)}
                className={cn(
                  "group relative w-full h-12 rounded-xl overflow-hidden",
                  "flex items-center justify-center gap-3",
                  "font-medium",
                  "transition-all duration-300 ease-out",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2",
                  showEmailForm
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                    : "bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100"
                )}
              >
                <Mail className="w-5 h-5" />
                <span>{t("orContinueWith")}</span>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 transition-transform duration-300",
                    showEmailForm && "rotate-180"
                  )}
                />
              </button>

              {/* Expandable Email Form */}
              <div
                className={cn(
                  "grid transition-all duration-500 ease-out",
                  showEmailForm
                    ? "grid-rows-[1fr] opacity-100 mt-4"
                    : "grid-rows-[0fr] opacity-0 mt-0"
                )}
              >
                <div className="overflow-hidden">
                  <form onSubmit={handleSubmit} className="space-y-4 pb-1">
                    {/* Email Input with slide-in animation */}
                    <div
                      className={cn(
                        "transition-all duration-500 delay-100",
                        showEmailForm
                          ? "translate-y-0 opacity-100"
                          : "translate-y-4 opacity-0"
                      )}
                    >
                      <Input
                        type="email"
                        placeholder={t("emailPlaceholder")}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                      />
                    </div>

                    {/* Password Input with slide-in animation */}
                    <div
                      className={cn(
                        "transition-all duration-500 delay-200",
                        showEmailForm
                          ? "translate-y-0 opacity-100"
                          : "translate-y-4 opacity-0"
                      )}
                    >
                      <Input
                        type="password"
                        placeholder={t("passwordPlaceholder")}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                      />
                      {/* Forgot Password Link */}
                      <div className="flex justify-end mt-2">
                        <Link
                          href="/forgot-password"
                          className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 font-medium transition-colors"
                        >
                          {t("forgotPassword")}
                        </Link>
                      </div>
                    </div>

                    {/* Premium Login Button with slide-in animation */}
                    <div
                      className={cn(
                        "transition-all duration-500 delay-300",
                        showEmailForm
                          ? "translate-y-0 opacity-100"
                          : "translate-y-4 opacity-0"
                      )}
                    >
                      <button
                        type="submit"
                        disabled={isLoading || socialLoading !== null}
                        className={cn(
                          "group relative w-full h-12 rounded-xl overflow-hidden",
                          "font-semibold text-white",
                          "transition-all duration-300",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
                          "disabled:opacity-70 disabled:cursor-not-allowed",
                          "gradient-primary shadow-brand-lg",
                          "hover:-translate-y-0.5 active:translate-y-0"
                        )}
                      >
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                        {/* Button content */}
                        <span className="relative flex items-center justify-center gap-2">
                          {isLoading ? (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin" />
                              {t("loggingIn")}
                            </>
                          ) : (
                            <>
                              {t("login")}
                              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                            </>
                          )}
                        </span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white/80 dark:bg-gray-900/80 text-gray-500 dark:text-gray-400">
                  {t("noAccount")}
                </span>
              </div>
            </div>

            {/* Register Button */}
            <Link
              href="/register"
              className={cn(
                "group flex items-center justify-center gap-2 w-full h-12 rounded-xl",
                "font-semibold",
                "transition-all duration-300",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2",
                // Light mode
                "bg-gray-100 text-gray-700 hover:bg-gray-200",
                // Dark mode
                "dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700",
                // Border
                "border border-gray-200 dark:border-gray-700",
                // Transform
                "hover:-translate-y-0.5 active:translate-y-0"
              )}
            >
              <UserPlus className="h-5 w-5" />
              {t("registerLink")}
            </Link>
          </div>
            </>
          )}
        </div>

        {/* Footer text */}
        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          {t("legal.agreementPrefix")}{" "}
          <Link href="/terms" className="text-brand-500 hover:text-brand-600 font-medium">
            {t("legal.termsOfService")}
          </Link>{" "}
          {t("legal.and")}{" "}
          <Link href="/privacy" className="text-brand-500 hover:text-brand-600 font-medium">
            {t("legal.privacyPolicy")}
          </Link>
        </p>
      </div>

      {/* Wallet Connect Modal */}
      <WalletConnectModal
        isOpen={showWalletModal}
        onClose={handleWalletModalClose}
        skipDisconnectOnOpen
        onWalletConnectSelect={handleWalletConnectSelect}
      />

      {/* Signature Prompt Modal for all wallet types */}
      <SignaturePromptModal
        isOpen={showSignatureModal}
        onClose={async () => {
          setShowSignatureModal(false);
          setShowWalletModal(false); // Also close wallet selection modal
          setSignatureStatus("pending");
          setSignatureError(undefined);
          // First try wagmi's disconnect
          try {
            await disconnectAsync();
          } catch {
            // Ignore errors
          }
          // Force disconnect - clears ALL wallet state from localStorage, sessionStorage, and IndexedDB
          await forceDisconnectWallet();
          // Reset ALL states and refs to clean state
          setPendingWalletLogin(false);
          pendingWalletLoginRef.current = false;
          setWalletConnectSelected(false);
          walletConnectSelectedRef.current = false;
          prevConnectedRef.current = false;
          isAuthenticatingRef.current = false;
          hasInitiatedAuthRef.current = false;
        }}
        walletName={connector?.name || "your wallet"}
        walletIcon={connector?.icon}
        isWalletConnect={walletConnectSelectedRef.current || walletConnectSelected || isWalletConnect}
        status={signatureStatus}
        errorMessage={signatureError}
        autoCloseOnError={3000}
      />
    </div>
  );
}
