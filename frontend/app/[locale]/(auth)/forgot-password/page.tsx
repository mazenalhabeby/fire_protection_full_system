"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { KeyRound, ArrowLeft, Loader2, Mail, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await forgotPassword(email);
      setIsSuccess(true);
      toast.success("Password reset email sent!");
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error("Failed to send reset email. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background - same as login page */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-white via-brand-50/50 to-brand-secondary-50/30 dark:hidden" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-gray-950 to-black hidden dark:block" />

        <div className="absolute inset-0 dark:hidden overflow-hidden">
          <div className="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-brand-200/40 to-brand-secondary-100/30 rounded-full blur-[120px] animate-blob" />
          <div className="absolute top-1/4 -right-1/4 w-[700px] h-[700px] bg-gradient-to-br from-brand-secondary-100/40 to-brand-secondary-100/30 rounded-full blur-[130px] animate-blob animation-delay-2000" />
          <div className="absolute -bottom-1/4 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-brand-accent-100/40 to-brand-100/30 rounded-full blur-[120px] animate-blob animation-delay-4000" />
        </div>

        <div className="absolute inset-0 hidden dark:block overflow-hidden">
          <div className="absolute top-0 -left-40 w-[500px] h-[500px] bg-gradient-to-br from-brand-500/30 to-brand-secondary-500/10 rounded-full blur-[100px] animate-blob" />
          <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-brand-secondary-500/20 to-brand-600/10 rounded-full blur-[120px] animate-blob animation-delay-2000" />
          <div className="absolute -bottom-40 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-brand-secondary-500/15 to-brand-500/10 rounded-full blur-[100px] animate-blob animation-delay-4000" />
        </div>

        <div
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.07]"
          style={{
            backgroundImage: `linear-gradient(rgba(251,146,60,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(251,146,60,0.3) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
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
              {isSuccess ? "Check Your Email" : "Reset Password"}
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {isSuccess
                ? "We've sent you a password reset link"
                : "Enter your email and we'll send you a reset link"
              }
            </p>
          </div>

          {/* Form */}
          <div className="px-8 pb-8">
            {isSuccess ? (
              <div className="space-y-6">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                  <Mail className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-emerald-800 dark:text-emerald-200">
                      Email sent to {email}
                    </p>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
                      Click the link in the email to reset your password. The link will expire in 15 minutes.
                    </p>
                  </div>
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  Didn't receive the email?{" "}
                  <button
                    onClick={() => setIsSuccess(false)}
                    className="text-brand-500 hover:text-brand-600 font-medium"
                  >
                    Try again
                  </button>
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  type="email"
                  label="Email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />

                <button
                  type="submit"
                  disabled={isLoading || !email}
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
                        Sending...
                      </>
                    ) : (
                      "Send Reset Link"
                    )}
                  </span>
                </button>
              </form>
            )}

            {/* Back to Login */}
            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-medium transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
