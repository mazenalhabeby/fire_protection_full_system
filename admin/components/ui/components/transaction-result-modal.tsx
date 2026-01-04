"use client";

import { Dialog, DialogContent, DialogTitle } from "./dialog";
import { Check, X, ExternalLink, AlertTriangle, Copy, ArrowRight, Wallet, RefreshCw, Database, Globe } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { cn } from "../lib/utils";
import { toast } from "sonner";

export type TransactionStatus = "success" | "failed" | "pending";

export interface TransactionResultData {
  status: TransactionStatus;
  title?: string;
  message?: string;
  // Success data
  txHash?: string;
  amount?: string;
  tokens?: string;
  tokenSymbol?: string;
  deliveryMethod?: "OFF_CHAIN" | "ON_CHAIN";
  // Error data
  errorCode?: string;
  errorDetails?: string;
  suggestion?: string;
}

interface TransactionResultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: TransactionResultData | null;
  onRetry?: () => void;
  onViewBalance?: () => void;
  onViewHistory?: () => void;
  explorerBaseUrl?: string;
}

export function TransactionResultModal({
  open,
  onOpenChange,
  data,
  onRetry,
  onViewBalance,
  onViewHistory,
  explorerBaseUrl = "https://bscscan.com",
}: TransactionResultModalProps) {
  const [copied, setCopied] = useState(false);

  if (!data) return null;

  const isSuccess = data.status === "success";
  const isFailed = data.status === "failed";

  const handleCopyTxHash = () => {
    if (data.txHash) {
      navigator.clipboard.writeText(data.txHash);
      setCopied(true);
      toast.success("Transaction hash copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isInternal = data.deliveryMethod === "OFF_CHAIN";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md p-0 gap-0 border-0 bg-transparent overflow-visible"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">
          {data.title || (isSuccess ? "Transaction Successful" : "Transaction Failed")}
        </DialogTitle>
        <div className="relative">
          {/* Animated background glow */}
          <div
            className={cn(
              "absolute -inset-4 rounded-3xl blur-2xl animate-pulse",
              isSuccess
                ? "bg-gradient-to-r from-emerald-500/20 via-brand-500/20 to-emerald-500/20"
                : "bg-gradient-to-r from-red-500/20 via-rose-500/20 to-red-500/20"
            )}
          />

          {/* Main card */}
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-2xl">
            {/* Header with animated gradient */}
            <div
              className={cn(
                "relative h-32 overflow-hidden",
                isSuccess
                  ? "bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600"
                  : "bg-gradient-to-br from-red-500 via-rose-500 to-red-600"
              )}
            >
              {/* Animated circles */}
              <div className="absolute inset-0">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full animate-pulse" />
                <div
                  className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full animate-pulse"
                  style={{ animationDelay: "0.5s" }}
                />
                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-white/5 rounded-full animate-ping"
                  style={{ animationDuration: "2s" }}
                />
              </div>

              {/* Icon */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="relative">
                  <div className="absolute inset-0 bg-white/20 rounded-full blur-xl scale-150" />
                  <div className="relative w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
                    {isSuccess ? (
                      <Check className="h-8 w-8 text-emerald-600" strokeWidth={3} />
                    ) : (
                      <X className="h-8 w-8 text-red-600" strokeWidth={3} />
                    )}
                  </div>
                </div>
              </div>

              {/* Sparkles for success */}
              {isSuccess && (
                <>
                  <div
                    className="absolute top-4 left-8 w-2 h-2 bg-white/60 rounded-full animate-ping"
                    style={{ animationDuration: "1.5s" }}
                  />
                  <div
                    className="absolute top-8 right-12 w-1.5 h-1.5 bg-white/60 rounded-full animate-ping"
                    style={{ animationDuration: "2s", animationDelay: "0.5s" }}
                  />
                  <div
                    className="absolute bottom-6 left-16 w-1 h-1 bg-white/60 rounded-full animate-ping"
                    style={{ animationDuration: "1.8s", animationDelay: "0.3s" }}
                  />
                </>
              )}

              {/* Warning icon particles for failure */}
              {isFailed && (
                <>
                  <div
                    className="absolute top-6 left-12 opacity-30"
                    style={{ animation: "float 3s ease-in-out infinite" }}
                  >
                    <AlertTriangle className="w-4 h-4 text-white" />
                  </div>
                  <div
                    className="absolute top-10 right-8 opacity-20"
                    style={{ animation: "float 2.5s ease-in-out infinite", animationDelay: "0.5s" }}
                  >
                    <AlertTriangle className="w-3 h-3 text-white" />
                  </div>
                  <div
                    className="absolute bottom-8 left-8 opacity-25"
                    style={{ animation: "float 3.5s ease-in-out infinite", animationDelay: "1s" }}
                  >
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                </>
              )}
            </div>

            {/* Content */}
            <div className="p-6 text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {data.title || (isSuccess ? "Transaction Successful!" : "Transaction Failed")}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                {data.message ||
                  (isSuccess
                    ? data.deliveryMethod === "OFF_CHAIN"
                      ? "Your HBCT tokens have been added to your balance"
                      : "Your HBCT tokens have been sent to your wallet"
                    : "Something went wrong with your transaction")}
              </p>

              {/* Success content */}
              {isSuccess && data.tokens && (
                <>
                  {/* Delivery method badge */}
                  <div className="flex justify-center mb-4">
                    <div
                      className={cn(
                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
                        isInternal
                          ? "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
                          : "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      {isInternal ? (
                        <>
                          <Database className="w-3.5 h-3.5" />
                          Added to Internal Balance
                        </>
                      ) : (
                        <>
                          <Globe className="w-3.5 h-3.5" />
                          Sent to External Wallet
                        </>
                      )}
                    </div>
                  </div>

                  {/* Token amount highlight */}
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-gradient-to-r from-brand-500/10 via-brand-500/20 to-brand-500/10 rounded-2xl blur-lg" />
                    <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/50 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
                          <Image
                            src="/images/logo-white.svg"
                            alt="HBCT"
                            width={24}
                            height={24}
                            className="w-6 h-6"
                          />
                        </div>
                        <div className="text-left">
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                            You received
                          </p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {data.tokens}{" "}
                            <span className="text-brand-500">{data.tokenSymbol || "HBCT"}</span>
                          </p>
                        </div>
                      </div>
                      {data.amount && (
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <span>Paid:</span>
                          <span className="font-semibold text-gray-700 dark:text-gray-300">
                            {data.amount}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Transaction hash - prominent section */}
                  {data.txHash && (
                    <div className="mb-6 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 font-medium">
                        Payment Transaction
                      </p>

                      {/* Transaction hash with copy */}
                      <div className="flex items-center justify-between gap-2 mb-3 p-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600">
                        <code className="text-xs text-gray-600 dark:text-gray-300 font-mono truncate flex-1">
                          {data.txHash}
                        </code>
                        <button
                          onClick={handleCopyTxHash}
                          className="shrink-0 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="Copy transaction hash"
                        >
                          <Copy
                            className={cn(
                              "w-4 h-4 transition-colors",
                              copied ? "text-emerald-500" : "text-gray-400"
                            )}
                          />
                        </button>
                      </div>

                      {/* View on BSCScan button */}
                      <a
                        href={`${explorerBaseUrl}/tx/${data.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-white font-medium text-sm hover:from-amber-600 hover:to-amber-700 transition-all shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View on BSCScan
                      </a>
                    </div>
                  )}
                </>
              )}

              {/* Failed content */}
              {isFailed && (
                <>
                  {/* Error details box */}
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-red-500/10 to-red-500/5 rounded-2xl blur-lg" />
                    <div className="relative bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20 rounded-2xl p-5 border border-red-200 dark:border-red-800/50">
                      {data.errorCode && (
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-medium mb-3">
                          <AlertTriangle className="w-3 h-3" />
                          {data.errorCode}
                        </div>
                      )}
                      {data.errorDetails && (
                        <p className="text-sm text-red-600 dark:text-red-400 mb-3">
                          {data.errorDetails}
                        </p>
                      )}
                      {data.suggestion && (
                        <div className="pt-3 border-t border-red-200 dark:border-red-800/50">
                          <p className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2">
                            <span className="shrink-0 mt-0.5">
                              <ArrowRight className="w-3 h-3 text-brand-500" />
                            </span>
                            <span>{data.suggestion}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Failed transaction hash (if available) */}
                  {data.txHash && (
                    <div className="mb-6 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 font-medium">
                        Failed Transaction
                      </p>

                      {/* Transaction hash display */}
                      <div className="flex items-center justify-between gap-2 mb-3 p-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600">
                        <code className="text-xs text-gray-600 dark:text-gray-300 font-mono truncate flex-1">
                          {data.txHash}
                        </code>
                        <button
                          onClick={handleCopyTxHash}
                          className="shrink-0 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="Copy transaction hash"
                        >
                          <Copy
                            className={cn(
                              "w-4 h-4 transition-colors",
                              copied ? "text-emerald-500" : "text-gray-400"
                            )}
                          />
                        </button>
                      </div>

                      {/* View on BSCScan button */}
                      <a
                        href={`${explorerBaseUrl}/tx/${data.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View on BSCScan
                      </a>
                    </div>
                  )}
                </>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                {isSuccess ? (
                  <>
                    <button
                      onClick={() => onOpenChange(false)}
                      className="flex-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      Close
                    </button>
                    {onViewBalance && (
                      <button
                        onClick={() => {
                          onOpenChange(false);
                          onViewBalance();
                        }}
                        className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-white font-semibold shadow-lg shadow-brand-500/25 hover:shadow-xl hover:shadow-brand-500/30 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                      >
                        <Wallet className="w-4 h-4" />
                        View Wallet
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => onOpenChange(false)}
                      className="flex-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      Close
                    </button>
                    {onRetry && (
                      <button
                        onClick={() => {
                          onOpenChange(false);
                          onRetry();
                        }}
                        className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-white font-semibold shadow-lg shadow-brand-500/25 hover:shadow-xl hover:shadow-brand-500/30 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Try Again
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* View transactions link */}
              {onViewHistory && (
                <button
                  onClick={() => {
                    onOpenChange(false);
                    onViewHistory();
                  }}
                  className="mt-4 text-sm text-gray-500 hover:text-brand-500 transition-colors flex items-center justify-center gap-1 mx-auto"
                >
                  View Transactions
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Confetti effect for success */}
            {isSuccess && (
              <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                <div
                  className="absolute top-10 left-[10%] w-2 h-2 bg-brand-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0s", animationDuration: "1s" }}
                />
                <div
                  className="absolute top-12 left-[30%] w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s", animationDuration: "1.2s" }}
                />
                <div
                  className="absolute top-8 left-[50%] w-2 h-2 bg-amber-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s", animationDuration: "0.9s" }}
                />
                <div
                  className="absolute top-14 left-[70%] w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.15s", animationDuration: "1.1s" }}
                />
                <div
                  className="absolute top-10 left-[85%] w-2 h-2 bg-teal-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.05s", animationDuration: "1s" }}
                />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TransactionResultModal;
