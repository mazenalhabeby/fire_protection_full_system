"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  AlertTriangle,
  Trash2,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  Wallet,
  Lock,
  Users,
  Database
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { User } from "@/types/api";

interface DeleteAccountSectionProps {
  user: User | null;
}

const TOTAL_STEPS = 4;

export function DeleteAccountSection({ user }: DeleteAccountSectionProps) {
  const locale = useLocale();
  const router = useRouter();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [confirmations, setConfirmations] = useState({
    loseTokens: false,
    loseLockedTokens: false,
    loseAffiliateEarnings: false,
    cannotRestore: false,
  });
  const [deleteText, setDeleteText] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const allConfirmed = Object.values(confirmations).every(Boolean);
  const deleteTextValid = deleteText.toUpperCase() === "DELETE";
  const emailValid = confirmEmail === user?.email;

  const resetDialog = () => {
    setCurrentStep(1);
    setConfirmations({
      loseTokens: false,
      loseLockedTokens: false,
      loseAffiliateEarnings: false,
      cannotRestore: false,
    });
    setDeleteText("");
    setConfirmEmail("");
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setTimeout(resetDialog, 300);
  };

  const handleDelete = async () => {
    if (!emailValid) {
      toast.error("Email doesn't match");
      return;
    }

    setIsDeleting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      toast.success("Account deleted successfully");
      router.push(`/${locale}/login`);
    } catch {
      toast.error("Failed to delete account");
    } finally {
      setIsDeleting(false);
      handleClose();
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return true;
      case 2: return allConfirmed;
      case 3: return deleteTextValid;
      case 4: return emailValid;
      default: return false;
    }
  };

  const confirmationItems = [
    {
      key: "loseTokens" as const,
      icon: Wallet,
      text: "I understand all my tokens and balances will be permanently lost",
    },
    {
      key: "loseLockedTokens" as const,
      icon: Lock,
      text: "I understand my locked tokens cannot be recovered",
    },
    {
      key: "loseAffiliateEarnings" as const,
      icon: Users,
      text: "I understand my affiliate earnings will be forfeited",
    },
    {
      key: "cannotRestore" as const,
      icon: Database,
      text: "I understand this action is irreversible and my data cannot be restored",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-red-50 dark:bg-red-900/10 border-2 border-red-200 dark:border-red-800/50 overflow-hidden">
        <div className="p-6 border-b border-red-200 dark:border-red-800/50">
          <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </h2>
        </div>

        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                Delete Your Account
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
                Once you delete your account, there is no going back. Please be certain.
              </p>
            </div>
            <Button
              variant="danger"
              onClick={() => setIsDialogOpen(true)}
              className="shrink-0"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete My Account
            </Button>
          </div>
        </div>
      </div>

      {/* Warning Info */}
      <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 p-6">
        <div className="flex gap-4">
          <div className="shrink-0">
            <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-amber-800 dark:text-amber-300 mb-2">
              What happens when you delete your account?
            </h3>
            <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1 list-disc list-inside">
              <li>All your tokens and balances will be lost</li>
              <li>Your locked tokens will not be recovered</li>
              <li>Your affiliate earnings will be forfeited</li>
              <li>Your account data cannot be restored</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Multi-Step Confirmation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-lg">
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300",
                    currentStep === step && "bg-red-500 text-white scale-110",
                    currentStep > step && "bg-green-500 text-white",
                    currentStep < step && "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  )}
                >
                  {currentStep > step ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    step
                  )}
                </div>
                {step < TOTAL_STEPS && (
                  <div
                    className={cn(
                      "w-8 h-0.5 mx-1 transition-colors duration-300",
                      currentStep > step ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"
                    )}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Initial Warning */}
          {currentStep === 1 && (
            <>
              <DialogHeader>
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
                <DialogTitle className="text-center text-xl">
                  Delete Your Account?
                </DialogTitle>
                <DialogDescription className="text-center">
                  This is a permanent action that cannot be reversed. All your data, tokens, and earnings will be permanently deleted.
                </DialogDescription>
              </DialogHeader>

              <div className="py-4">
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50">
                  <p className="text-sm text-red-700 dark:text-red-400 text-center font-medium">
                    This process requires {TOTAL_STEPS} steps to complete to ensure this is not a mistake.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Step 2: Confirm Understanding */}
          {currentStep === 2 && (
            <>
              <DialogHeader>
                <DialogTitle className="text-center text-lg">
                  Confirm You Understand
                </DialogTitle>
                <DialogDescription className="text-center">
                  Please check each box to confirm you understand the consequences
                </DialogDescription>
              </DialogHeader>

              <div className="py-4 space-y-3">
                {confirmationItems.map((item) => {
                  const Icon = item.icon;
                  const isChecked = confirmations[item.key];
                  return (
                    <button
                      key={item.key}
                      onClick={() =>
                        setConfirmations((prev) => ({
                          ...prev,
                          [item.key]: !prev[item.key],
                        }))
                      }
                      className={cn(
                        "w-full flex items-start gap-3 p-3 rounded-xl border-2 transition-all duration-200 text-left",
                        isChecked
                          ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      )}
                    >
                      <div
                        className={cn(
                          "w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors",
                          isChecked
                            ? "bg-red-500 text-white"
                            : "bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600"
                        )}
                      >
                        {isChecked && <CheckCircle2 className="h-4 w-4" />}
                      </div>
                      <div className="flex items-start gap-2">
                        <Icon className={cn(
                          "h-4 w-4 mt-0.5 shrink-0",
                          isChecked ? "text-red-500" : "text-gray-400"
                        )} />
                        <span className={cn(
                          "text-sm",
                          isChecked ? "text-red-700 dark:text-red-400" : "text-gray-600 dark:text-gray-400"
                        )}>
                          {item.text}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {!allConfirmed && (
                <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                  Please check all boxes to continue
                </p>
              )}
            </>
          )}

          {/* Step 3: Type DELETE */}
          {currentStep === 3 && (
            <>
              <DialogHeader>
                <DialogTitle className="text-center text-lg">
                  Type &quot;DELETE&quot; to Continue
                </DialogTitle>
                <DialogDescription className="text-center">
                  To confirm this is intentional, please type the word DELETE below
                </DialogDescription>
              </DialogHeader>

              <div className="py-4">
                <div className="relative">
                  <Input
                    type="text"
                    value={deleteText}
                    onChange={(e) => setDeleteText(e.target.value)}
                    placeholder="Type DELETE here"
                    className={cn(
                      "text-center text-lg font-mono tracking-widest uppercase",
                      deleteTextValid
                        ? "border-green-500 focus:ring-green-500/20 focus:border-green-500"
                        : "border-red-200 dark:border-red-800/50 focus:ring-red-500/20 focus:border-red-500"
                    )}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {deleteText && (
                      deleteTextValid ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-400" />
                      )
                    )}
                  </div>
                </div>
                <p className="text-xs text-center text-gray-500 mt-3">
                  Case insensitive
                </p>
              </div>
            </>
          )}

          {/* Step 4: Confirm Email */}
          {currentStep === 4 && (
            <>
              <DialogHeader>
                <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="h-7 w-7 text-red-600 dark:text-red-400" />
                </div>
                <DialogTitle className="text-center text-lg">
                  Final Confirmation
                </DialogTitle>
                <DialogDescription className="text-center">
                  Enter your email address to permanently delete your account
                </DialogDescription>
              </DialogHeader>

              <div className="py-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your email address
                </label>
                <div className="relative">
                  <Input
                    type="email"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    placeholder={user?.email || "your@email.com"}
                    className={cn(
                      emailValid
                        ? "border-green-500 focus:ring-green-500/20 focus:border-green-500"
                        : "border-red-200 dark:border-red-800/50 focus:ring-red-500/20 focus:border-red-500"
                    )}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {confirmEmail && (
                      emailValid ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-400" />
                      )
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Type <span className="font-medium text-gray-700 dark:text-gray-300">{user?.email}</span> to confirm
                </p>

                {/* Final Warning */}
                <div className="mt-4 p-3 rounded-xl bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800">
                  <p className="text-xs text-red-700 dark:text-red-400 text-center font-medium">
                    ⚠️ After clicking &quot;Delete Forever&quot;, your account will be immediately and permanently deleted.
                  </p>
                </div>
              </div>
            </>
          )}

          <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
            {currentStep > 1 && (
              <Button
                variant="ghost"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="order-2 sm:order-1"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}

            <div className="flex gap-2 order-1 sm:order-2">
              <Button
                variant="outline"
                onClick={handleClose}
              >
                Cancel
              </Button>

              {currentStep < TOTAL_STEPS ? (
                <Button
                  variant="danger"
                  onClick={() => setCurrentStep((prev) => prev + 1)}
                  disabled={!canProceed()}
                >
                  Continue
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  variant="danger"
                  onClick={handleDelete}
                  disabled={isDeleting || !emailValid}
                  className="min-w-[140px]"
                >
                  {isDeleting ? (
                    <>
                      <div className="h-4 w-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Forever
                    </>
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
