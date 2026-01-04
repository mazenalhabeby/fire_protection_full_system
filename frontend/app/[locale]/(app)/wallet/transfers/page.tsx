"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  usePendingTransfers,
  useConfirmTransfer,
  useCancelTransfer,
} from "@/hooks/useWalletData";
import { useAuth } from "@/hooks/useAuth";
import { usePageLoading } from "@/hooks/useMinimumLoading";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Clock,
  Send,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  Mail,
  Shield,
  Smartphone,
} from "lucide-react";
import { PremiumButton } from "@/components/ui/premium-button";
import { EmptyState } from "@/components/ui/empty-state";
import type { TransferInfo } from "@/types/api";

const EMAIL_CODE_LENGTH = 8; // 8-character alphanumeric code for email
const TOTP_CODE_LENGTH = 6; // 6-digit code for 2FA

export default function PendingTransfersPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Check if user has 2FA enabled
  const is2FA = user?.twoFactorEnabled ?? false;
  const codeLength = is2FA ? TOTP_CODE_LENGTH : EMAIL_CODE_LENGTH;

  // State
  const [selectedTransfer, setSelectedTransfer] = useState<TransferInfo | null>(null);
  const [confirmationCode, setConfirmationCode] = useState<string[]>(Array(codeLength).fill(""));
  const [confirmError, setConfirmError] = useState<string>("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Fetch data
  const { data: pendingData, isLoading, refetch } = usePendingTransfers();

  // Mutations
  const confirmMutation = useConfirmTransfer();
  const cancelMutation = useCancelTransfer();

  // Loading
  const { isLoading: isMinLoading, stopLoading } = usePageLoading();

  useEffect(() => {
    if (!isLoading) {
      stopLoading();
    }
  }, [isLoading, stopLoading]);

  const transfers = pendingData?.transfers || [];

  // Focus first input when modal opens
  useEffect(() => {
    if (selectedTransfer) {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [selectedTransfer]);

  const handleSelectTransfer = (transfer: TransferInfo) => {
    setSelectedTransfer(transfer);
    setConfirmationCode(Array(codeLength).fill(""));
    setConfirmError("");
  };

  const handleCloseModal = () => {
    setSelectedTransfer(null);
    setConfirmationCode(Array(codeLength).fill(""));
    setConfirmError("");
  };

  const handleCodeInput = (index: number, value: string) => {
    // For 2FA: only digits; For email: alphanumeric, uppercase
    let char: string;
    if (is2FA) {
      char = value.replace(/[^0-9]/g, "").slice(-1);
    } else {
      char = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(-1);
    }

    const newCode = [...confirmationCode];
    newCode[index] = char;
    setConfirmationCode(newCode);

    // Auto-advance to next input
    if (char && index < codeLength - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when complete
    if (char && index === codeLength - 1) {
      const fullCode = newCode.join("");
      if (fullCode.length === codeLength) {
        handleConfirm(fullCode);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !confirmationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    let pasted: string;
    if (is2FA) {
      pasted = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, codeLength);
    } else {
      pasted = e.clipboardData.getData("text").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, codeLength);
    }
    const newCode = pasted.split("").concat(Array(codeLength - pasted.length).fill(""));
    setConfirmationCode(newCode);

    const nextEmpty = newCode.findIndex((c) => !c);
    if (nextEmpty === -1 && pasted.length === codeLength) {
      handleConfirm(pasted);
    } else if (nextEmpty >= 0) {
      inputRefs.current[nextEmpty]?.focus();
    }
  };

  const handleConfirm = async (code: string) => {
    if (!selectedTransfer) return;

    setConfirmError("");
    try {
      await confirmMutation.mutateAsync({
        transferId: selectedTransfer.id,
        confirmationCode: code,
      });
      handleCloseModal();
      refetch();
    } catch (error: unknown) {
      setConfirmError(error instanceof Error ? error.message : "Invalid confirmation code");
      setConfirmationCode(Array(codeLength).fill(""));
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  };

  const handleCancel = async (transferId: string) => {
    try {
      await cancelMutation.mutateAsync(transferId);
      handleCloseModal();
      refetch();
    } catch {
      // Ignore cancel errors
    }
  };

  const showSkeleton = isLoading || isMinLoading;

  if (showSkeleton) {
    return <TransfersSkeleton />;
  }

  return (
    <div className="flex-1 min-h-screen bg-gradient-to-b from-gray-50 via-gray-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/wallet')}
            className="p-2.5 rounded-xl bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700 shadow-sm"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Pending Transfers
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {transfers.length} transfer{transfers.length !== 1 ? "s" : ""} awaiting confirmation
            </p>
          </div>
        </div>

        {/* Transfers List */}
        {transfers.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12">
            <EmptyState
              icon={CheckCircle2}
              message="No pending transfers"
              description="All your transfers have been confirmed or cancelled"
              size="lg"
            />
          </div>
        ) : (
          <div className="space-y-4">
            {transfers.map((transfer) => (
              <TransferCard
                key={transfer.id}
                transfer={transfer}
                onSelect={() => handleSelectTransfer(transfer)}
                onCancel={() => handleCancel(transfer.id)}
                isCancelling={cancelMutation.isPending}
                is2FA={is2FA}
              />
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {selectedTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  is2FA
                    ? "bg-purple-50 dark:bg-purple-500/10"
                    : "bg-brand-50 dark:bg-brand-500/10"
                )}>
                  {is2FA ? (
                    <Smartphone className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  ) : (
                    <Shield className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Confirm Transfer
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {is2FA ? "Enter your authenticator code" : "Enter the code from your email"}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                disabled={confirmMutation.isPending}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <XCircle className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Transfer Summary */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Sending to</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {selectedTransfer.recipient?.displayName || selectedTransfer.recipientIdentifier}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Amount</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {selectedTransfer.amount} {selectedTransfer.currency}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Fee</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedTransfer.fee} {selectedTransfer.currency}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Recipient Receives</span>
                  <span className="text-base font-semibold text-emerald-600 dark:text-emerald-400">
                    {(parseFloat(selectedTransfer.amount) - parseFloat(selectedTransfer.fee)).toFixed(4)} {selectedTransfer.currency}
                  </span>
                </div>
              </div>

              {/* Confirmation Method Notice */}
              <div className={cn(
                "flex items-center gap-3 p-3 rounded-xl border",
                is2FA
                  ? "bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30"
                  : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              )}>
                {is2FA ? (
                  <>
                    <Smartphone className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      Enter the 6-digit code from your authenticator app
                    </p>
                  </>
                ) : (
                  <>
                    <Mail className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Enter the 8-character code sent to your email
                    </p>
                  </>
                )}
              </div>

              {/* Code Input */}
              <div>
                <div className="flex justify-center gap-2" onPaste={handlePaste}>
                  {Array.from({ length: codeLength }).map((_, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode={is2FA ? "numeric" : "text"}
                      autoCapitalize={is2FA ? "off" : "characters"}
                      maxLength={1}
                      value={confirmationCode[index] || ""}
                      onChange={(e) => handleCodeInput(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      disabled={confirmMutation.isPending}
                      className={cn(
                        "w-10 h-12 text-center text-xl font-bold rounded-xl border-2 transition-all",
                        "focus:outline-none focus:ring-2",
                        "bg-gray-50 dark:bg-gray-800",
                        is2FA
                          ? "focus:ring-purple-500/20 focus:border-purple-500"
                          : "focus:ring-brand-500/20 focus:border-brand-500 uppercase",
                        confirmationCode[index]
                          ? is2FA
                            ? "border-purple-500 text-gray-900 dark:text-white"
                            : "border-brand-500 text-gray-900 dark:text-white"
                          : "border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                      )}
                    />
                  ))}
                </div>

                {/* Status - different for 2FA vs Email */}
                <TransferStatus expiresAt={selectedTransfer.confirmationExpiresAt} is2FA={is2FA} />
              </div>

              {/* Error */}
              {confirmError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <p className="text-sm text-red-600 dark:text-red-400">{confirmError}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleCancel(selectedTransfer.id)}
                  disabled={confirmMutation.isPending || cancelMutation.isPending}
                  className={cn(
                    "flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all",
                    "bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
                    "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  Cancel Transfer
                </button>
                <PremiumButton
                  onClick={() => handleConfirm(confirmationCode.join(""))}
                  disabled={confirmationCode.some((c) => !c) || confirmMutation.isPending}
                  variant={is2FA ? "purple" : "brand"}
                  className="flex-1"
                >
                  {confirmMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Confirming...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Confirm
                    </>
                  )}
                </PremiumButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Transfer Card Component
function TransferCard({
  transfer,
  onSelect,
  onCancel,
  isCancelling,
  is2FA,
}: {
  transfer: TransferInfo;
  onSelect: () => void;
  onCancel: () => void;
  isCancelling: boolean;
  is2FA: boolean;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
              <Send className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">
                {transfer.recipient?.displayName || transfer.recipientIdentifier}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                via {transfer.transferMethod.toLowerCase().replace(/_/g, " ")}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {parseFloat(transfer.amount).toLocaleString(undefined, { maximumFractionDigits: 4 })}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{transfer.currency}</p>
          </div>
        </div>

        {/* Status indicator - different for 2FA vs Email */}
        <TransferStatus expiresAt={transfer.confirmationExpiresAt} is2FA={is2FA} compact />

        {/* Actions */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
            disabled={isCancelling}
            className={cn(
              "flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all",
              "bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
              "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            Cancel
          </button>
          <PremiumButton
            onClick={onSelect}
            variant={is2FA ? "purple" : "brand"}
            className="flex-1"
          >
            Confirm
            <ChevronRight className="h-4 w-4" />
          </PremiumButton>
        </div>
      </div>
    </div>
  );
}

// Transfer Status Component - handles both 2FA and Email confirmation
function TransferStatus({ expiresAt, is2FA, compact }: { expiresAt?: string; is2FA: boolean; compact?: boolean }) {
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    // 2FA doesn't have expiration - TOTP codes refresh every 30 seconds
    if (is2FA || !expiresAt) {
      return;
    }

    const updateTime = () => {
      const expires = new Date(expiresAt);
      const now = new Date();
      const diff = expires.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining("Expired");
        setIsExpired(true);
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, "0")}`);
      setIsExpired(false);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, is2FA]);

  // 2FA status display
  if (is2FA) {
    if (compact) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 dark:bg-purple-500/10">
          <Smartphone className="h-4 w-4 text-purple-500" />
          <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
            Ready to confirm with authenticator
          </span>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center gap-2 mt-3">
        <Smartphone className="h-4 w-4 text-purple-500 dark:text-purple-400" />
        <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
          Use your authenticator app
        </span>
      </div>
    );
  }

  // Email expiration timer display
  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg",
        isExpired
          ? "bg-red-50 dark:bg-red-500/10"
          : "bg-amber-50 dark:bg-amber-500/10"
      )}>
        <Clock className={cn(
          "h-4 w-4",
          isExpired ? "text-red-500" : "text-amber-500"
        )} />
        <span className={cn(
          "text-sm font-medium",
          isExpired ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
        )}>
          {isExpired ? "Code expired - cancel and retry" : `Expires in ${timeRemaining}`}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-3">
      <Clock className={cn("h-4 w-4", isExpired ? "text-red-500" : "text-gray-500 dark:text-gray-400")} />
      <span className={cn("text-sm font-medium", isExpired ? "text-red-500" : "text-gray-500 dark:text-gray-400")}>
        {isExpired ? "Code expired" : `Expires in ${timeRemaining}`}
      </span>
    </div>
  );
}

function TransfersSkeleton() {
  return (
    <div className="flex-1 min-h-screen bg-gradient-to-b from-gray-50 via-gray-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-10 w-10 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
          <div>
            <div className="h-7 w-40 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            <div className="h-4 w-56 bg-gray-200 dark:bg-gray-800 rounded mt-2 animate-pulse" />
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
