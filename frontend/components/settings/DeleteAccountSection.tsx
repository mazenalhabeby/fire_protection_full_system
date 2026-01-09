"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  RefreshCcw,
  Clock,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authApi, clearSessionMarker } from "@/lib/api";
import type { User } from "@/types/api";

interface DeleteAccountSectionProps {
  user: User | null;
}

const TOTAL_STEPS = 4;

export function DeleteAccountSection({ user }: DeleteAccountSectionProps) {
  const t = useTranslations("settings.deleteAccount");
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // 0 = eligibility check
  const [confirmations, setConfirmations] = useState({
    loseTokens: false,
    loseLockedTokens: false,
    loseAffiliateEarnings: false,
    canRecover: false,
  });
  const [deleteText, setDeleteText] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");

  // Fetch deletion eligibility when dialog opens
  const {
    data: eligibility,
    isLoading: isCheckingEligibility,
    refetch: refetchEligibility,
  } = useQuery({
    queryKey: ["deletion-eligibility"],
    queryFn: authApi.checkDeletionEligibility,
    enabled: isDialogOpen,
    staleTime: 0, // Always fetch fresh data
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: authApi.deleteMyAccount,
    onSuccess: (data) => {
      const gracePeriodDate = new Date(data.gracePeriodEndsAt).toLocaleDateString();
      toast.success(t("success", { date: gracePeriodDate }));

      // Clear session and redirect
      clearSessionMarker();
      queryClient.clear();
      router.push('/login');
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete account");
    },
  });

  // Auto-advance to step 1 when eligibility is confirmed
  useEffect(() => {
    if (isDialogOpen && eligibility?.canDelete && currentStep === 0) {
      setCurrentStep(1);
    }
  }, [isDialogOpen, eligibility, currentStep]);

  const allConfirmed = Object.values(confirmations).every(Boolean);
  const deleteTextValid = deleteText.toUpperCase() === "DELETE";
  const emailValid = confirmEmail === user?.email;

  const resetDialog = () => {
    setCurrentStep(0);
    setConfirmations({
      loseTokens: false,
      loseLockedTokens: false,
      loseAffiliateEarnings: false,
      canRecover: false,
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
      toast.error(t("step4.emailMismatch"));
      return;
    }
    deleteAccountMutation.mutate();
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return eligibility?.canDelete === true;
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
      text: t("step2.confirmations.loseTokens"),
    },
    {
      key: "loseLockedTokens" as const,
      icon: Lock,
      text: t("step2.confirmations.loseLockedTokens"),
    },
    {
      key: "loseAffiliateEarnings" as const,
      icon: Users,
      text: t("step2.confirmations.loseAffiliateEarnings"),
    },
    {
      key: "canRecover" as const,
      icon: RefreshCcw,
      text: t("step2.confirmations.canRecover"),
    },
  ];

  const getBlockerIcon = (type: 'balance' | 'locks' | 'withdrawals') => {
    switch (type) {
      case 'balance': return Wallet;
      case 'locks': return Lock;
      case 'withdrawals': return Clock;
      default: return AlertTriangle;
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-red-50 dark:bg-red-900/10 border-2 border-red-200 dark:border-red-800/50 overflow-hidden">
        <div className="p-6 border-b border-red-200 dark:border-red-800/50">
          <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {t("dangerZone")}
          </h2>
        </div>

        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                {t("deleteYourAccount")}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
                {t("deleteDescription")}
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setIsDialogOpen(true)}
              className="shrink-0"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t("deleteButton")}
            </Button>
          </div>
        </div>
      </div>

      {/* Recovery Info */}
      <div className="rounded-2xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 p-6">
        <div className="flex gap-4">
          <div className="shrink-0">
            <ShieldCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
              {t("recoveryPolicy.title")}
            </h3>
            <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1 list-disc list-inside">
              <li>{t("recoveryPolicy.gracePeriod")}</li>
              <li>{t("recoveryPolicy.dataRetention")}</li>
              <li>{t("recoveryPolicy.contactSupport")}</li>
              <li>{t("recoveryPolicy.permanentDeletion")}</li>
            </ul>
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
              {t("whatHappens.title")}
            </h3>
            <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1 list-disc list-inside">
              <li>{t("whatHappens.emailAnonymized")}</li>
              <li>{t("whatHappens.sessionsLoggedOut")}</li>
              <li>{t("whatHappens.cannotLogin")}</li>
              <li>{t("whatHappens.tokensForfeited")}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Multi-Step Confirmation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-lg">
          {/* Step 0: Eligibility Check */}
          {currentStep === 0 && (
            <>
              <DialogHeader>
                <DialogTitle className="text-center text-xl">
                  {t("eligibility.title")}
                </DialogTitle>
                <DialogDescription className="text-center">
                  {t("eligibility.description")}
                </DialogDescription>
              </DialogHeader>

              <div className="py-6">
                {isCheckingEligibility ? (
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 text-gray-400 animate-spin" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t("eligibility.checking")}
                    </p>
                  </div>
                ) : eligibility?.canDelete ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                      {t("eligibility.eligible")}
                      <br />
                      {t("eligibility.eligibleContinue")}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col items-center gap-2 mb-4">
                      <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                        {t("eligibility.notEligible")}
                      </p>
                    </div>

                    <div className="space-y-3">
                      {eligibility?.blockers.map((blocker, index) => {
                        const Icon = getBlockerIcon(blocker.type);
                        return (
                          <div
                            key={index}
                            className="flex items-start gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50"
                          >
                            <Icon className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm text-red-700 dark:text-red-400">
                                {blocker.message}
                              </p>
                              {blocker.amount && (
                                <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                                  Amount: {blocker.amount}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>
                  {t("steps.cancel")}
                </Button>
                {eligibility?.canDelete ? (
                  <Button
                    variant="destructive"
                    onClick={() => setCurrentStep(1)}
                  >
                    {t("steps.continue")}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => refetchEligibility()}
                    disabled={isCheckingEligibility}
                  >
                    <RefreshCcw className={cn("h-4 w-4 mr-2", isCheckingEligibility && "animate-spin")} />
                    {t("eligibility.recheck")}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}

          {/* Progress Steps (only show after eligibility check) */}
          {currentStep > 0 && (
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
          )}

          {/* Step 1: Initial Warning */}
          {currentStep === 1 && (
            <>
              <DialogHeader>
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
                <DialogTitle className="text-center text-xl">
                  {t("step1.title")}
                </DialogTitle>
                <DialogDescription className="text-center">
                  {t("step1.description")}
                </DialogDescription>
              </DialogHeader>

              <div className="py-4">
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50">
                  <p className="text-sm text-blue-700 dark:text-blue-400 text-center">
                    {t("step1.gracePeriod")}
                    <br />
                    {t("step1.dataRetention")}
                  </p>
                </div>
                <div className="mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50">
                  <p className="text-sm text-red-700 dark:text-red-400 text-center font-medium">
                    {t("step1.stepsWarning", { steps: TOTAL_STEPS })}
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
                  {t("step2.title")}
                </DialogTitle>
                <DialogDescription className="text-center">
                  {t("step2.description")}
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
                  {t("step2.checkAllBoxes")}
                </p>
              )}
            </>
          )}

          {/* Step 3: Type DELETE */}
          {currentStep === 3 && (
            <>
              <DialogHeader>
                <DialogTitle className="text-center text-lg">
                  {t("step3.title")}
                </DialogTitle>
                <DialogDescription className="text-center">
                  {t("step3.description")}
                </DialogDescription>
              </DialogHeader>

              <div className="py-4">
                <div className="relative">
                  <Input
                    type="text"
                    value={deleteText}
                    onChange={(e) => setDeleteText(e.target.value)}
                    placeholder={t("step3.placeholder")}
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
                  {t("step3.caseInsensitive")}
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
                  {t("step4.title")}
                </DialogTitle>
                <DialogDescription className="text-center">
                  {t("step4.description")}
                </DialogDescription>
              </DialogHeader>

              <div className="py-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("step4.emailLabel")}
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
                  {t("step4.typeEmailToConfirm", { email: user?.email })}
                </p>

                {/* Final Warning */}
                <div className="mt-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50">
                  <p className="text-xs text-blue-700 dark:text-blue-400 text-center">
                    {t("step4.recoveryWarning")}
                  </p>
                </div>
                <div className="mt-2 p-3 rounded-xl bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800">
                  <p className="text-xs text-red-700 dark:text-red-400 text-center font-medium">
                    {t("step4.permanentWarning")}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Footer with navigation (only for steps > 0) */}
          {currentStep > 0 && (
            <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
              {currentStep > 1 && (
                <Button
                  variant="ghost"
                  onClick={() => setCurrentStep((prev) => prev - 1)}
                  className="order-2 sm:order-1"
                  disabled={deleteAccountMutation.isPending}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  {t("steps.back")}
                </Button>
              )}

              <div className="flex gap-2 order-1 sm:order-2">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={deleteAccountMutation.isPending}
                >
                  {t("steps.cancel")}
                </Button>

                {currentStep < TOTAL_STEPS ? (
                  <Button
                    variant="destructive"
                    onClick={() => setCurrentStep((prev) => prev + 1)}
                    disabled={!canProceed()}
                  >
                    {t("steps.continue")}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleteAccountMutation.isPending || !emailValid}
                    className="min-w-[140px]"
                  >
                    {deleteAccountMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t("step4.deleting")}
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t("step4.deleteForever")}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
