"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { toast } from "sonner";
import { User, Mail, CheckCircle, Loader2, AlertCircle, Send, Pencil, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompleteProfileModalProps {
  isOpen: boolean;
}

export function CompleteProfileModal({ isOpen }: CompleteProfileModalProps) {
  const { user, refreshUser, verifyEmailCode, resendVerificationEmail } = useAuth();

  const [step, setStep] = useState<"profile" | "verify-email" | "edit-email">("profile");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });
  const [verificationCode, setVerificationCode] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [newEmail, setNewEmail] = useState("");
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Determine what's missing
  const needsName = !user?.firstName || !user?.lastName;
  const needsEmail = !user?.email;
  const needsEmailVerification = user?.email && !user?.isEmailVerified;

  // Set initial step based on what's needed
  useEffect(() => {
    if (needsName || needsEmail) {
      setStep("profile");
    } else if (needsEmailVerification) {
      setStep("verify-email");
    }
  }, [needsName, needsEmail, needsEmailVerification]);

  // Prefill form with existing data
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
      });
    }
  }, [user]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendCountdown]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle verification code input
  const handleCodeChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits are entered
    if (value && index === 5 && newCode.every((digit) => digit)) {
      handleVerifyCode(newCode.join(""));
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pastedData.length === 6) {
      const newCode = pastedData.split("");
      setVerificationCode(newCode);
      inputRefs.current[5]?.focus();
      handleVerifyCode(pastedData);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error("Please enter your first and last name");
      return;
    }

    // If wallet user needs to add email
    if (needsEmail && !formData.email.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    setIsLoading(true);
    try {
      const isAddingNewEmail = needsEmail && formData.email.trim();

      await api.patch("/users/profile", {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        ...(isAddingNewEmail ? { email: formData.email.trim().toLowerCase() } : {}),
      });

      await refreshUser();
      toast.success("Profile updated successfully!");

      // Check if email verification is needed
      if (isAddingNewEmail || (formData.email && !user?.isEmailVerified)) {
        setStep("verify-email");
        // Automatically send verification email for new email
        if (isAddingNewEmail) {
          try {
            await resendVerificationEmail();
            toast.success("Verification code sent! Check your inbox.");
            setCanResend(false);
            setResendCountdown(60);
          } catch {
            // Silently fail - user can manually resend
          }
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (code: string) => {
    if (code.length !== 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }

    setIsVerifying(true);
    try {
      await verifyEmailCode(code);
      toast.success("Email verified successfully!");
    } catch (error: any) {
      toast.error(error.message || "Invalid or expired code");
      // Clear the code inputs
      setVerificationCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendVerification = async () => {
    if (!canResend) return;

    setIsResending(true);
    try {
      await resendVerificationEmail();
      toast.success("Verification code sent! Check your inbox.");
      setCanResend(false);
      setResendCountdown(60); // 60 second cooldown
      // Clear previous code
      setVerificationCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (error: any) {
      toast.error(error.message || "Failed to send verification code");
    } finally {
      setIsResending(false);
    }
  };

  const handleEditEmail = () => {
    setNewEmail(user?.email || "");
    setStep("edit-email");
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (newEmail.trim().toLowerCase() === user?.email?.toLowerCase()) {
      toast.error("Please enter a different email address");
      return;
    }

    setIsUpdatingEmail(true);
    try {
      await api.patch("/users/profile", {
        email: newEmail.trim().toLowerCase(),
      });

      await refreshUser();
      toast.success("Email updated! Check your inbox for verification code.");

      // Send verification email
      try {
        await resendVerificationEmail();
        setCanResend(false);
        setResendCountdown(60);
      } catch {
        // Silently fail - user can manually resend
      }

      // Reset and go to verification step
      setVerificationCode(["", "", "", "", "", ""]);
      setStep("verify-email");
    } catch (error: any) {
      toast.error(error.message || "Failed to update email");
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4">
        <div className={cn(
          "rounded-2xl overflow-hidden",
          "bg-white dark:bg-gray-900",
          "border border-gray-200 dark:border-gray-800",
          "shadow-2xl"
        )}>
          {/* Header */}
          <div className="px-6 pt-6 pb-4 text-center border-b border-gray-100 dark:border-gray-800">
            <div className={cn(
              "mx-auto w-14 h-14 rounded-2xl mb-4",
              "bg-gradient-to-br from-brand-500 to-brand-600",
              "flex items-center justify-center",
              "shadow-lg shadow-brand-500/20"
            )}>
              {step === "profile" ? (
                <User className="h-7 w-7 text-white" />
              ) : step === "edit-email" ? (
                <Pencil className="h-7 w-7 text-white" />
              ) : (
                <Mail className="h-7 w-7 text-white" />
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {step === "profile"
                ? "Complete Your Profile"
                : step === "edit-email"
                ? "Update Email Address"
                : "Verify Your Email"}
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {step === "profile"
                ? "Please provide your details to continue"
                : step === "edit-email"
                ? "Enter your correct email address"
                : "Enter the 6-digit code sent to your email"}
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            {step === "profile" && (
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleChange("firstName", e.target.value)}
                      placeholder="John"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleChange("lastName", e.target.value)}
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>

                {needsEmail && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      placeholder="john@example.com"
                      required
                    />
                    <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                      You'll need to verify your email to continue
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
              </form>
            )}

            {step === "verify-email" && (
              <div className="space-y-6">
                {/* Email display */}
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                        <Mail className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Code sent to</p>
                        <p className="font-medium text-gray-900 dark:text-white">{user?.email}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleEditEmail}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  </div>
                </div>

                {/* Code Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-center">
                    Enter verification code
                  </label>
                  <div className="flex justify-center gap-2" onPaste={handleCodePaste}>
                    {verificationCode.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => { inputRefs.current[index] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleCodeChange(index, e.target.value)}
                        onKeyDown={(e) => handleCodeKeyDown(index, e)}
                        disabled={isVerifying}
                        className={cn(
                          "w-12 h-14 text-center text-2xl font-bold rounded-lg",
                          "border-2 transition-all duration-200",
                          "focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500",
                          "bg-white dark:bg-gray-800",
                          "text-gray-900 dark:text-white",
                          digit
                            ? "border-brand-500"
                            : "border-gray-200 dark:border-gray-700",
                          isVerifying && "opacity-50 cursor-not-allowed"
                        )}
                      />
                    ))}
                  </div>
                  {isVerifying && (
                    <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying...
                    </div>
                  )}
                </div>

                {/* Warning */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Check your spam folder if you don't see the email. Code expires in 15 minutes.
                  </p>
                </div>

                {/* Resend Button */}
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={handleResendVerification}
                  disabled={isResending || !canResend}
                >
                  {isResending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Sending...
                    </>
                  ) : !canResend ? (
                    `Resend code in ${resendCountdown}s`
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Resend Verification Code
                    </>
                  )}
                </Button>
              </div>
            )}

            {step === "edit-email" && (
              <form onSubmit={handleUpdateEmail} className="space-y-4">
                {/* Back button */}
                <button
                  type="button"
                  onClick={() => setStep("verify-email")}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to verification
                </button>

                {/* Current email info */}
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current email</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white line-through opacity-60">
                    {user?.email}
                  </p>
                </div>

                {/* New email input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    New Email Address <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter your correct email"
                    required
                    autoFocus
                  />
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    A new verification code will be sent to this email
                  </p>
                </div>

                {/* Submit button */}
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  disabled={isUpdatingEmail}
                >
                  {isUpdatingEmail ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Updating...
                    </>
                  ) : (
                    "Update Email & Send Code"
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
