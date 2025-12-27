"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  X,
  Mail,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useConfirmWithdrawal } from "@/hooks/useWithdrawals";
import type { WithdrawalRequest } from "@/types/withdrawals";
import { PremiumButton } from "@/components/ui/premium-button";
import { CurrencyIcon } from "./CurrencyIcon";

interface WithdrawalConfirmationModalProps {
  withdrawal: WithdrawalRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CODE_LENGTH = 8; // 8-character alphanumeric code

export function WithdrawalConfirmationModal({
  withdrawal,
  isOpen,
  onClose,
  onSuccess,
}: WithdrawalConfirmationModalProps) {
  const [code, setCode] = useState(Array(CODE_LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmWithdrawal = useConfirmWithdrawal();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCode(Array(CODE_LENGTH).fill(""));
      setError(null);
      setSuccess(false);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen || !withdrawal) return null;

  const handleChange = (index: number, value: string) => {
    // Only allow alphanumeric characters, convert to uppercase
    const char = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(-1);

    const newCode = [...code];
    newCode[index] = char;
    setCode(newCode);
    setError(null);

    // Move to next input
    if (char && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, CODE_LENGTH);
    if (pasted.length > 0) {
      const newCode = [...code];
      for (let i = 0; i < CODE_LENGTH; i++) {
        newCode[i] = pasted[i] || "";
      }
      setCode(newCode);
      inputRefs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const confirmationCode = code.join("");
    if (confirmationCode.length !== CODE_LENGTH) {
      setError(`Please enter the full ${CODE_LENGTH}-character code`);
      return;
    }

    try {
      await confirmWithdrawal.mutateAsync({
        withdrawalId: withdrawal.id,
        confirmationCode,
      });
      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || "Invalid confirmation code");
    }
  };

  // Calculate time remaining
  const expiresAt = withdrawal.confirmationExpiresAt
    ? new Date(withdrawal.confirmationExpiresAt)
    : null;
  const timeRemaining = expiresAt
    ? Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000 / 60))
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Confirm Withdrawal
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Withdrawal Confirmed!
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Your withdrawal is being processed.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Withdrawal Summary */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Amount</span>
                  <div className="flex items-center gap-2">
                    <CurrencyIcon size="sm" />
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {parseFloat(withdrawal.amount).toLocaleString()} HBCT
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Fee</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {parseFloat(withdrawal.feeAmount).toLocaleString()} HBCT
                  </span>
                </div>
                <hr className="border-gray-200 dark:border-gray-700" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    You'll Receive
                  </span>
                  <span className="font-semibold text-brand-500">
                    {parseFloat(withdrawal.netAmount).toLocaleString()} HBCT
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">To</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                    {withdrawal.toAddress.slice(0, 10)}...{withdrawal.toAddress.slice(-8)}
                  </span>
                </div>
              </div>

              {/* Email Notice */}
              <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-500/10 rounded-xl">
                <Mail className="h-5 w-5 text-blue-500 shrink-0" />
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  We've sent an 8-character confirmation code to your email
                </p>
              </div>

              {/* Code Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-center">
                  Enter Confirmation Code
                </label>
                <div className="flex justify-center gap-1.5" onPaste={handlePaste}>
                  {code.map((char, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="text"
                      autoCapitalize="characters"
                      maxLength={1}
                      value={char}
                      onChange={(e) => handleChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className={cn(
                        "w-10 h-12 text-center text-xl font-bold rounded-xl border-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-colors uppercase",
                        error
                          ? "border-red-500"
                          : "border-gray-300 dark:border-gray-700 focus:border-brand-500"
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Time Remaining */}
              {timeRemaining !== null && timeRemaining > 0 && (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Clock className="h-4 w-4" />
                  <span>Code expires in {timeRemaining} minutes</span>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <PremiumButton
                  type="submit"
                  disabled={code.join("").length !== CODE_LENGTH || confirmWithdrawal.isPending}
                  className="flex-1"
                  icon={confirmWithdrawal.isPending ? Loader2 : CheckCircle2}
                >
                  {confirmWithdrawal.isPending ? "Confirming..." : "Confirm"}
                </PremiumButton>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
