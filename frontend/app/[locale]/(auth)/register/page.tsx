"use client";

import { useState, useEffect } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/useAuth";
import { useAccount, useSignMessage, useDisconnect } from "wagmi";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { UserPlus, LogIn, ArrowRight, Loader2, Mail, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { WalletConnectModal } from "@/components/wallet/WalletConnectModal";

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

export default function RegisterPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register, walletAuth } = useAuth();

  const referralCode = searchParams.get("ref") || "";

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    referralCode: referralCode,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [pendingWalletRegister, setPendingWalletRegister] = useState(false);

  // Wagmi hooks
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnectAsync } = useDisconnect();

  // Handle wallet registration after connection
  useEffect(() => {
    if (isConnected && address && pendingWalletRegister) {
      handleWalletAuth();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address, pendingWalletRegister]);

  const handleWalletAuth = async () => {
    if (!address) return;

    setSocialLoading("wallet");
    try {
      const { isNewUser } = await walletAuth(address, async (message: string) => {
        const signature = await signMessageAsync({ message });
        return signature;
      }, {
        firstName: formData.firstName || undefined,
        lastName: formData.lastName || undefined,
        referralCode: formData.referralCode || undefined,
      });

      if (isNewUser) {
        toast.success(t("registerSuccess"));
        router.push("/dashboard?welcome=true");
      } else {
        toast.success("Welcome back!");
        router.push("/dashboard");
      }
    } catch (err) {
      // Disconnect wallet on error so user can try different wallet
      try {
        await disconnectAsync();
      } catch {
        // Ignore disconnect errors
      }

      if (err instanceof ApiError) {
        toast.error(err.message + " - Please try a different wallet");
      } else if (err instanceof Error) {
        if (err.message.includes("User rejected")) {
          toast.error("Signature request was rejected");
        } else {
          toast.error(err.message + " - Please try a different wallet");
        }
      } else {
        toast.error("Failed to connect wallet - Please try a different wallet");
      }
    } finally {
      setSocialLoading(null);
      setPendingWalletRegister(false);
    }
  };

  const handleGoogleSignup = () => {
    setSocialLoading("google");
    // Redirect to backend Google OAuth endpoint (handles both login and signup)
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    window.location.href = `${backendUrl}/auth/google`;
  };

  const handleFacebookSignup = () => {
    setSocialLoading("facebook");
    // Redirect to backend Facebook OAuth endpoint (handles both login and signup)
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    window.location.href = `${backendUrl}/auth/facebook`;
  };

  const handleWalletSignup = async () => {
    // If already connected, proceed with registration
    if (isConnected && address) {
      handleWalletAuth();
    } else {
      // Open wallet connect modal
      setPendingWalletRegister(true);
      setShowWalletModal(true);
    }
  };

  const handleWalletModalClose = () => {
    setShowWalletModal(false);
    if (!isConnected) {
      setPendingWalletRegister(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error(t("passwordMismatch"));
      return;
    }

    if (formData.password.length < 8) {
      toast.error(t("passwordTooShort"));
      return;
    }

    setIsLoading(true);

    try {
      await register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName || undefined,
        lastName: formData.lastName || undefined,
      });
      toast.success(t("registerSuccess"));
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error(t("registerError"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 py-8 relative overflow-hidden">
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
          {/* Header */}
          <div className="px-8 pt-8 pb-6 text-center">
            {/* Icon */}
            <div className={cn(
              "mx-auto w-14 h-14 rounded-2xl mb-4",
              "bg-gradient-icon",
              "flex items-center justify-center",
              "shadow-brand-lg"
            )}>
              <UserPlus className="h-7 w-7 text-white" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t("registerTitle")}
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t("registerSubtitle")}
            </p>
          </div>

          {/* Form */}
          <div className="px-8 pb-8">
            {/* Premium Social Login - Vertical Layout */}
            <div className="space-y-3 mb-6">
              {/* Google Button */}
              <button
                type="button"
                onClick={handleGoogleSignup}
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
                onClick={handleFacebookSignup}
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
                onClick={handleWalletSignup}
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
                    {/* Name Fields with slide-in animation */}
                    <div
                      className={cn(
                        "grid grid-cols-2 gap-4 transition-all duration-500 delay-75",
                        showEmailForm
                          ? "translate-y-0 opacity-100"
                          : "translate-y-4 opacity-0"
                      )}
                    >
                      <Input
                        type="text"
                        name="firstName"
                        label={t("firstName")}
                        placeholder={t("firstNamePlaceholder")}
                        value={formData.firstName}
                        onChange={handleChange}
                        autoComplete="given-name"
                      />
                      <Input
                        type="text"
                        name="lastName"
                        label={t("lastName")}
                        placeholder={t("lastNamePlaceholder")}
                        value={formData.lastName}
                        onChange={handleChange}
                        autoComplete="family-name"
                      />
                    </div>

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
                        name="email"
                        label={t("email")}
                        placeholder={t("emailPlaceholder")}
                        value={formData.email}
                        onChange={handleChange}
                        required
                        autoComplete="email"
                      />
                    </div>

                    {/* Password Input with slide-in animation */}
                    <div
                      className={cn(
                        "transition-all duration-500 delay-150",
                        showEmailForm
                          ? "translate-y-0 opacity-100"
                          : "translate-y-4 opacity-0"
                      )}
                    >
                      <Input
                        type="password"
                        name="password"
                        label={t("password")}
                        placeholder={t("passwordPlaceholder")}
                        value={formData.password}
                        onChange={handleChange}
                        required
                        autoComplete="new-password"
                      />
                    </div>

                    {/* Confirm Password with slide-in animation */}
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
                        name="confirmPassword"
                        label={t("confirmPassword")}
                        placeholder={t("confirmPasswordPlaceholder")}
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                        autoComplete="new-password"
                      />
                    </div>

                    {/* Referral Code with slide-in animation */}
                    <div
                      className={cn(
                        "transition-all duration-500 delay-250",
                        showEmailForm
                          ? "translate-y-0 opacity-100"
                          : "translate-y-4 opacity-0"
                      )}
                    >
                      <Input
                        type="text"
                        name="referralCode"
                        label={t("referralCode")}
                        placeholder={t("referralCodePlaceholder")}
                        value={formData.referralCode}
                        onChange={handleChange}
                      />
                    </div>

                    {/* Premium Register Button with slide-in animation */}
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
                              {t("registering")}
                            </>
                          ) : (
                            <>
                              {t("register")}
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
                  {t("hasAccount")}
                </span>
              </div>
            </div>

            {/* Login Button */}
            <Link
              href="/login"
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
              <LogIn className="h-5 w-5" />
              {t("loginLink")}
            </Link>
          </div>
        </div>

        {/* Footer text */}
        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          By continuing, you agree to our{" "}
          <Link href="/" className="text-brand-500 hover:text-brand-600 font-medium">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/" className="text-brand-500 hover:text-brand-600 font-medium">
            Privacy Policy
          </Link>
        </p>
      </div>

      {/* Wallet Connect Modal */}
      <WalletConnectModal
        isOpen={showWalletModal}
        onClose={handleWalletModalClose}
      />
    </div>
  );
}
