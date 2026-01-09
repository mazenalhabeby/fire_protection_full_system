"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import { X, Lock, Mail, Wallet, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { authApi, type AvailableAuthMethods } from "@/lib/api/auth";
import { useWallet } from "@/hooks/useWallet";
import { useSignMessage } from "wagmi";
import { toast } from "sonner";

// Google icon component
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

// Facebook icon component
const FacebookIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

interface ReAuthPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  availableAuthMethods: AvailableAuthMethods;
  currentAuthMethod: string;
  userEmail?: string | null;
}

type AuthMethodType = "password" | "google" | "facebook" | "wallet";

export function ReAuthPanel({
  isOpen,
  onClose,
  onSuccess,
  availableAuthMethods,
  currentAuthMethod,
  userEmail,
}: ReAuthPanelProps) {
  const locale = useLocale();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<AuthMethodType | null>(null);

  const { connect, address } = useWallet();
  const { signMessageAsync } = useSignMessage();

  // Determine primary and secondary auth methods
  const getPrimaryMethod = useCallback((): AuthMethodType => {
    // Primary is what they used to login this session
    if (currentAuthMethod === "google" && availableAuthMethods.google) return "google";
    if (currentAuthMethod === "facebook" && availableAuthMethods.facebook) return "facebook";
    if (currentAuthMethod === "wallet" && availableAuthMethods.wallet) return "wallet";
    if (currentAuthMethod === "password" && availableAuthMethods.password) return "password";

    // Fallback to any available method
    if (availableAuthMethods.password) return "password";
    if (availableAuthMethods.wallet) return "wallet";
    if (availableAuthMethods.google) return "google";
    if (availableAuthMethods.facebook) return "facebook";

    return "password";
  }, [currentAuthMethod, availableAuthMethods]);

  const getSecondaryMethods = useCallback((): AuthMethodType[] => {
    const primary = getPrimaryMethod();
    const methods: AuthMethodType[] = [];

    if (availableAuthMethods.password && primary !== "password") methods.push("password");
    if (availableAuthMethods.wallet && primary !== "wallet") methods.push("wallet");
    if (availableAuthMethods.google && primary !== "google") methods.push("google");
    if (availableAuthMethods.facebook && primary !== "facebook") methods.push("facebook");

    return methods;
  }, [availableAuthMethods, getPrimaryMethod]);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setError(null);
      setSelectedMethod(getPrimaryMethod());
    }
  }, [isOpen, getPrimaryMethod]);

  // Handle password re-auth
  const handlePasswordAuth = async () => {
    if (!password.trim()) {
      setError("Please enter your password");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await authApi.login({
        email: userEmail || "",
        password,
      });

      toast.success("Verified successfully");
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid password";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OAuth re-auth (popup flow)
  const handleOAuthAuth = async (provider: "google" | "facebook") => {
    setIsLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) {
        setError("API URL not configured. Please contact support.");
        setIsLoading(false);
        return;
      }
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        `${apiUrl}/auth/${provider}?popup=true`,
        `${provider}Auth`,
        `width=${width},height=${height},left=${left},top=${top},popup=yes`
      );

      if (!popup) {
        setError("Popup blocked. Please allow popups for this site.");
        setIsLoading(false);
        return;
      }

      // Listen for message from popup
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data?.type === "oauth-success") {
          window.removeEventListener("message", handleMessage);
          popup.close();
          toast.success("Verified successfully");
          onSuccess();
        } else if (event.data?.type === "oauth-error") {
          window.removeEventListener("message", handleMessage);
          popup.close();
          setError(event.data.message || "Authentication failed");
          setIsLoading(false);
        }
      };

      window.addEventListener("message", handleMessage);

      // Check if popup was closed manually
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener("message", handleMessage);
          setIsLoading(false);
        }
      }, 500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      setError(message);
      setIsLoading(false);
    }
  };

  // Handle wallet re-auth
  const handleWalletAuth = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Connect wallet if not connected
      if (!address) {
        connect();
        // Wait a bit for the wallet to connect, then show message
        setError("Please connect your wallet first");
        setIsLoading(false);
        return;
      }

      const walletAddress = address || availableAuthMethods.wallet;
      if (!walletAddress) {
        setError("No wallet connected");
        setIsLoading(false);
        return;
      }

      // Get nonce
      const { message: nonceMessage } = await authApi.getWalletNonce(walletAddress);

      // Sign message using wagmi's signMessageAsync
      const signature = await signMessageAsync({ message: nonceMessage });

      // Verify signature
      await authApi.walletLogin({
        walletAddress,
        signature,
        message: nonceMessage,
      });

      toast.success("Verified successfully");
      onSuccess();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Wallet verification failed";
      // Handle user rejection gracefully
      if (errorMessage.toLowerCase().includes("rejected") ||
          errorMessage.toLowerCase().includes("denied") ||
          errorMessage.toLowerCase().includes("cancelled")) {
        setError("Signature request was cancelled");
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle auth based on selected method
  const handleAuth = () => {
    if (!selectedMethod) return;

    switch (selectedMethod) {
      case "password":
        handlePasswordAuth();
        break;
      case "google":
        handleOAuthAuth("google");
        break;
      case "facebook":
        handleOAuthAuth("facebook");
        break;
      case "wallet":
        handleWalletAuth();
        break;
    }
  };

  const primaryMethod = getPrimaryMethod();
  const secondaryMethods = getSecondaryMethods();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Slide-in Panel */}
      <div
        className={cn(
          "fixed right-0 top-0 h-full w-full sm:w-[420px] bg-white dark:bg-gray-900 shadow-2xl z-50",
          "transform transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Verify It&apos;s You
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Please verify to continue
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Primary Auth Method */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {userEmail && selectedMethod === "password" ? (
                <span className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {userEmail}
                </span>
              ) : (
                "Choose verification method"
              )}
            </p>

            {/* Password Input */}
            {selectedMethod === "password" && (
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                    autoFocus
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}

            {/* Primary Action Button */}
            <button
              onClick={handleAuth}
              disabled={isLoading}
              className={cn(
                "w-full py-3.5 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-3",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                selectedMethod === "google" && "bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50",
                selectedMethod === "facebook" && "bg-[#1877F2] hover:bg-[#166FE5]",
                selectedMethod === "wallet" && "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600",
                selectedMethod === "password" && "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              )}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {selectedMethod === "google" && <GoogleIcon />}
                  {selectedMethod === "facebook" && <FacebookIcon />}
                  {selectedMethod === "wallet" && <Wallet className="w-5 h-5" />}
                  {selectedMethod === "password" && <Lock className="w-5 h-5" />}
                  <span>
                    {selectedMethod === "google" && "Continue with Google"}
                    {selectedMethod === "facebook" && "Continue with Facebook"}
                    {selectedMethod === "wallet" && "Sign with Wallet"}
                    {selectedMethod === "password" && "Verify Password"}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Secondary Methods */}
          {secondaryMethods.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  or use
                </span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              </div>

              <div className="flex flex-wrap gap-2">
                {secondaryMethods.map((method) => (
                  <button
                    key={method}
                    onClick={() => setSelectedMethod(method)}
                    disabled={isLoading}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-medium",
                      selectedMethod === method
                        ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400"
                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                    )}
                  >
                    {method === "google" && <GoogleIcon />}
                    {method === "facebook" && <FacebookIcon />}
                    {method === "wallet" && <Wallet className="w-4 h-4" />}
                    {method === "password" && <Lock className="w-4 h-4" />}
                    <span className="capitalize">{method}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Switch Account Link */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
            <a
              href={`/${locale}/login`}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-purple-500 dark:hover:text-purple-400 transition-colors"
            >
              Use a different account
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

export default ReAuthPanel;
