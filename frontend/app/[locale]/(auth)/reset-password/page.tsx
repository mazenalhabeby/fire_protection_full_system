"use client";

import { useState, useEffect } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { FormPasswordInput } from "@/components/ui/password-input";
import { ApiError } from "@/lib/api/client";
import { KeyRound, ArrowLeft, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resetPassword } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    setToken(tokenParam);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    // Validate password complexity
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);

    if (!hasUppercase || !hasLowercase || !hasNumber) {
      toast.error("Password must contain at least one uppercase letter, one lowercase letter, and one number");
      return;
    }

    if (!token) {
      toast.error("Invalid or missing reset token");
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword(token, password);
      setIsSuccess(true);
      toast.success("Password reset successfully!");
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error("Failed to reset password. The link may have expired.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // No token provided
  if (!token && typeof window !== "undefined") {
    return (
      <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background */}
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-white via-brand-50/50 to-brand-secondary-50/30 dark:hidden" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-gray-950 to-black hidden dark:block" />
        </div>

        <div className="w-full max-w-md relative z-10">
          <div className={cn(
            "relative overflow-hidden rounded-2xl",
            "bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl",
            "border border-white/50 dark:border-gray-700/50",
            "shadow-2xl shadow-gray-900/10 dark:shadow-black/30"
          )}>
            <div className="px-8 py-8 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl mb-4 bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg">
                <AlertTriangle className="h-7 w-7 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Invalid Link
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                This password reset link is invalid or has expired.
              </p>
              <Link
                href="/forgot-password"
                className="inline-flex items-center justify-center gap-2 mt-6 px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold transition-colors"
              >
                Request New Link
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-white via-brand-50/50 to-brand-secondary-50/30 dark:hidden" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-gray-950 to-black hidden dark:block" />

        <div className="absolute inset-0 dark:hidden overflow-hidden">
          <div className="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-brand-200/40 to-brand-secondary-100/30 rounded-full blur-[120px] animate-blob" />
          <div className="absolute top-1/4 -right-1/4 w-[700px] h-[700px] bg-gradient-to-br from-brand-secondary-100/40 to-brand-secondary-100/30 rounded-full blur-[130px] animate-blob animation-delay-2000" />
        </div>

        <div className="absolute inset-0 hidden dark:block overflow-hidden">
          <div className="absolute top-0 -left-40 w-[500px] h-[500px] bg-gradient-to-br from-brand-500/30 to-brand-secondary-500/10 rounded-full blur-[100px] animate-blob" />
          <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-brand-secondary-500/20 to-brand-600/10 rounded-full blur-[120px] animate-blob animation-delay-2000" />
        </div>
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
            <div className={cn(
              "mx-auto w-14 h-14 rounded-2xl mb-4",
              isSuccess
                ? "bg-gradient-to-br from-emerald-500 to-emerald-600"
                : "bg-gradient-icon",
              "flex items-center justify-center",
              "shadow-brand-lg"
            )}>
              {isSuccess ? (
                <CheckCircle className="h-7 w-7 text-white" />
              ) : (
                <KeyRound className="h-7 w-7 text-white" />
              )}
            </div>

            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isSuccess ? "Password Reset!" : "Create New Password"}
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {isSuccess
                ? "Your password has been successfully reset"
                : "Enter your new password below"
              }
            </p>
          </div>

          {/* Form */}
          <div className="px-8 pb-8">
            {isSuccess ? (
              <div className="space-y-6">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-emerald-800 dark:text-emerald-200">
                      Success!
                    </p>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
                      You can now log in with your new password.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => router.push("/login")}
                  className={cn(
                    "w-full h-12 rounded-xl",
                    "font-semibold text-white",
                    "gradient-primary shadow-brand-lg",
                    "hover:-translate-y-0.5 active:translate-y-0",
                    "transition-all duration-300"
                  )}
                >
                  Go to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <FormPasswordInput
                  label="New Password"
                  value={password}
                  onChange={(value) => setPassword(value)}
                  placeholder="Enter new password"
                />

                <FormPasswordInput
                  label="Confirm Password"
                  value={confirmPassword}
                  onChange={(value) => setConfirmPassword(value)}
                  placeholder="Confirm new password"
                />

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Password must be at least 8 characters with one uppercase, one lowercase, and one number.
                </p>

                <button
                  type="submit"
                  disabled={isLoading || !password || !confirmPassword}
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
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <span className="relative flex items-center justify-center gap-2">
                    {isLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Resetting...
                      </>
                    ) : (
                      "Reset Password"
                    )}
                  </span>
                </button>
              </form>
            )}

            {/* Back to Login */}
            {!isSuccess && (
              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-medium transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to login
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
