"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Mail,
  Clock,
  Shield,
} from "lucide-react";
import { PremiumButton } from "@/components/ui/premium-button";
import type { InitiateTransferResponse } from "@/types/api";

interface TransferConfirmationProps {
  transfer: InitiateTransferResponse;
  onConfirm: (code: string) => Promise<void>;
  onCancel: () => void;
  isConfirming?: boolean;
  error?: string;
}

const CODE_LENGTH = 8; // 8-character alphanumeric code

export function TransferConfirmation({
  transfer,
  onConfirm,
  onCancel,
  isConfirming,
  error,
}: TransferConfirmationProps) {
  const [code, setCode] = useState(Array(CODE_LENGTH).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Calculate time remaining
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  useEffect(() => {
    const updateTime = () => {
      const expires = new Date(transfer.confirmationExpiresAt);
      const now = new Date();
      const diff = expires.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining("Expired");
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [transfer.confirmationExpiresAt]);

  const handleInput = (index: number, value: string) => {
    // Only allow alphanumeric characters, convert to uppercase
    const char = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(-1);

    const newCode = [...code];
    newCode[index] = char;
    setCode(newCode);

    // Auto-advance to next input
    if (char && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when complete
    if (char && index === CODE_LENGTH - 1) {
      const fullCode = newCode.join("");
      if (fullCode.length === CODE_LENGTH) {
        onConfirm(fullCode);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, CODE_LENGTH);
    const newCode = pasted.split("").concat(Array(CODE_LENGTH - pasted.length).fill(""));
    setCode(newCode);

    // Focus appropriate input
    const nextEmpty = newCode.findIndex((c) => !c);
    if (nextEmpty === -1) {
      // All filled, submit
      onConfirm(pasted);
    } else {
      inputRefs.current[nextEmpty]?.focus();
    }
  };

  const isComplete = code.every((c) => c);
  const isExpired = timeRemaining === "Expired";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Confirm Transfer
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Enter the code sent to your email</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isConfirming}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Transfer Summary */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Sending to</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {transfer.recipient.displayName}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Amount</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {transfer.amount} {transfer.currency}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Fee</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {transfer.fee} {transfer.currency}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Recipient Receives</span>
              <span className="text-base font-semibold text-emerald-600 dark:text-emerald-400">
                {transfer.netAmount} {transfer.currency}
              </span>
            </div>
          </div>

          {/* Email Notice */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <Mail className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              We've sent an 8-character code to your email address
            </p>
          </div>

          {/* Code Input */}
          <div>
            <div className="flex justify-center gap-2" onPaste={handlePaste}>
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
                  onChange={(e) => handleInput(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  disabled={isConfirming || isExpired}
                  className={cn(
                    "w-10 h-12 text-center text-xl font-bold rounded-xl border-2 transition-all uppercase",
                    "focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500",
                    "bg-gray-50 dark:bg-gray-800",
                    char
                      ? "border-brand-500 text-gray-900 dark:text-white"
                      : "border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white",
                    isExpired && "opacity-50 cursor-not-allowed"
                  )}
                />
              ))}
            </div>

            {/* Timer */}
            <div className="flex items-center justify-center gap-2 mt-3">
              <Clock className={cn("h-4 w-4", isExpired ? "text-red-500" : "text-gray-500 dark:text-gray-400")} />
              <span className={cn("text-sm font-medium", isExpired ? "text-red-500" : "text-gray-500 dark:text-gray-400")}>
                {isExpired ? "Code expired" : `Expires in ${timeRemaining}`}
              </span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isConfirming}
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
              onClick={() => onConfirm(code.join(""))}
              disabled={!isComplete || isConfirming || isExpired}
              variant="brand"
              className="flex-1"
            >
              {isConfirming ? (
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
  );
}
