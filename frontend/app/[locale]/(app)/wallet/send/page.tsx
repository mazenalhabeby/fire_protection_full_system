"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { useAuth } from "@/hooks/useAuth";
import {
  useWalletBalances,
  useTransferLimits,
  useInitiateTransfer,
  useConfirmTransfer,
  useCancelTransfer,
} from "@/hooks/useWalletData";
import { usePageLoading } from "@/hooks/useMinimumLoading";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Send,
} from "lucide-react";
import { SendForm, TransferConfirmation } from "@/components/wallet-internal";
import { PageHeader } from "@/components/ui/page-header";
import { PremiumButton } from "@/components/ui/premium-button";
import type { InitiateTransferResponse, WalletCurrency, TransferMethod } from "@/types/api";

type Step = "form" | "confirm" | "success" | "error";

export default function SendPage() {
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const preselectedCurrency = searchParams.get("currency") as WalletCurrency | null;

  const { user } = useAuth();

  // State
  const [step, setStep] = useState<Step>("form");
  const [pendingTransfer, setPendingTransfer] = useState<InitiateTransferResponse | null>(null);
  const [confirmError, setConfirmError] = useState<string>("");
  const [finalMessage, setFinalMessage] = useState<string>("");

  // Fetch data
  const { data: balancesData, isLoading: balancesLoading } = useWalletBalances();
  const { data: limitsData, isLoading: limitsLoading } = useTransferLimits();

  // Mutations
  const initiateMutation = useInitiateTransfer();
  const confirmMutation = useConfirmTransfer();
  const cancelMutation = useCancelTransfer();

  // Loading
  const { isLoading: isMinLoading, stopLoading } = usePageLoading();

  useEffect(() => {
    if (!balancesLoading && !limitsLoading) {
      stopLoading();
    }
  }, [balancesLoading, limitsLoading, stopLoading]);

  const balances = balancesData?.balances || [];
  const limits = limitsData;

  const handleSubmit = async (data: {
    recipientIdentifier: string;
    transferMethod: TransferMethod;
    currency: WalletCurrency;
    amount: number;
    note?: string;
  }) => {
    try {
      const result = await initiateMutation.mutateAsync(data);
      setPendingTransfer(result);
      setStep("confirm");
    } catch (error: unknown) {
      setFinalMessage(error instanceof Error ? error.message : "Failed to initiate transfer");
      setStep("error");
    }
  };

  const handleConfirm = async (code: string) => {
    if (!pendingTransfer) return;

    setConfirmError("");
    try {
      await confirmMutation.mutateAsync({
        transferId: pendingTransfer.transferId,
        confirmationCode: code,
      });
      setFinalMessage("Transfer completed successfully!");
      setStep("success");
    } catch (error: unknown) {
      setConfirmError(error instanceof Error ? error.message : "Invalid confirmation code");
    }
  };

  const handleCancel = async () => {
    if (!pendingTransfer) {
      router.push(`/${locale}/wallet`);
      return;
    }

    try {
      await cancelMutation.mutateAsync(pendingTransfer.transferId);
    } catch {
      // Ignore cancel errors
    }
    router.push(`/${locale}/wallet`);
  };

  const handleReset = () => {
    setPendingTransfer(null);
    setConfirmError("");
    setFinalMessage("");
    setStep("form");
  };

  const showSkeleton = balancesLoading || isMinLoading;

  if (showSkeleton) {
    return <SendSkeleton />;
  }

  return (
    <div className="flex-1 min-h-screen bg-gradient-to-b from-gray-50 via-gray-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4 py-8 max-w-xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push(`/${locale}/wallet`)}
            className="p-2.5 rounded-xl bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700 shadow-sm"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Send HBCT
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Transfer tokens to another user
            </p>
          </div>
        </div>

        {/* Form Step */}
        {step === "form" && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
            <SendForm
              balances={balances}
              limits={limits}
              onSubmit={handleSubmit}
              isSubmitting={initiateMutation.isPending}
            />
          </div>
        )}

        {/* Confirmation Step */}
        {step === "confirm" && pendingTransfer && (
          <TransferConfirmation
            transfer={pendingTransfer}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            isConfirming={confirmMutation.isPending}
            error={confirmError}
          />
        )}

        {/* Success Step */}
        {step === "success" && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center shadow-sm">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Transfer Successful!
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {finalMessage}
            </p>
            {pendingTransfer && (
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500 dark:text-gray-400">Sent to</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {pendingTransfer.recipient.displayName}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Amount</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {pendingTransfer.netAmount} {pendingTransfer.currency}
                  </span>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className={cn(
                  "flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all",
                  "bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
                  "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                )}
              >
                Send Another
              </button>
              <PremiumButton
                onClick={() => router.push(`/${locale}/wallet`)}
                variant="brand"
                className="flex-1"
              >
                Done
              </PremiumButton>
            </div>
          </div>
        )}

        {/* Error Step */}
        {step === "error" && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center shadow-sm">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center mx-auto mb-6">
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Transfer Failed
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {finalMessage}
            </p>
            <div className="flex gap-3">
              <PremiumButton
                onClick={handleReset}
                variant="brand"
                className="flex-1"
              >
                Try Again
              </PremiumButton>
              <button
                onClick={() => router.push(`/${locale}/wallet`)}
                className={cn(
                  "flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all",
                  "bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
                  "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                )}
              >
                Back to Wallet
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SendSkeleton() {
  return (
    <div className="flex-1 min-h-screen bg-gradient-to-b from-gray-50 via-gray-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4 py-8 max-w-xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-10 w-10 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
          <div>
            <div className="h-7 w-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            <div className="h-4 w-40 bg-gray-200 dark:bg-gray-800 rounded mt-2 animate-pulse" />
          </div>
        </div>
        <div className="h-[600px] bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 animate-pulse" />
      </div>
    </div>
  );
}
