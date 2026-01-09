"use client";

import React, { useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Smartphone, CheckCircle2, Fingerprint, X, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface SignaturePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletName?: string;
  walletIcon?: string;
  isWalletConnect?: boolean;
  status: "pending" | "signing" | "success" | "error";
  errorMessage?: string;
  /** Auto close after error (in milliseconds). Set to 0 to disable. Default: 3000ms */
  autoCloseOnError?: number;
}

// WalletConnect icon SVG
const WalletConnectIcon = () => (
  <svg viewBox="0 0 300 185" className="w-4 h-4">
    <path d="M61.4385 36.2562C104.051 -5.41874 172.949 -5.41874 215.562 36.2562L220.823 41.3618C223.007 43.4878 223.007 46.9405 220.823 49.0665L202.537 66.8303C201.445 67.8933 199.691 67.8933 198.599 66.8303L191.369 59.7717C162.294 31.4217 114.706 31.4217 85.6312 59.7717L77.8503 67.3708C76.7583 68.4338 75.0041 68.4338 73.9121 67.3708L55.6261 49.6071C53.4421 47.4811 53.4421 44.0283 55.6261 41.9023L61.4385 36.2562ZM251.855 71.6413L268.041 87.3563C270.225 89.4823 270.225 92.9351 268.041 95.0611L195.421 165.768C193.237 167.894 189.729 167.894 187.545 165.768L135.495 115.067C134.949 114.536 134.072 114.536 133.526 115.067L81.4779 165.768C79.2939 167.894 75.7861 167.894 73.6021 165.768L0.959094 95.0596C-1.22491 92.9336 -1.22491 89.4808 0.959094 87.3548L17.1451 71.6398C19.3291 69.5138 22.8369 69.5138 25.0209 71.6398L77.0714 122.342C77.6174 122.873 78.4941 122.873 79.0401 122.342L131.088 71.6398C133.272 69.5138 136.78 69.5138 138.964 71.6398L191.016 122.342C191.562 122.873 192.439 122.873 192.985 122.342L245.034 71.6413C247.218 69.5153 250.726 69.5153 252.91 71.6413H251.855Z" fill="#3B99FC"/>
  </svg>
);

export function SignaturePromptModal({
  isOpen,
  onClose,
  walletName = "your wallet",
  walletIcon,
  isWalletConnect = false,
  status,
  errorMessage,
  autoCloseOnError = 3000,
}: SignaturePromptModalProps) {
  const t = useTranslations("wallet.signature");

  // Auto-close modal after showing error
  useEffect(() => {
    if (status === "error" && autoCloseOnError > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseOnError);
      return () => clearTimeout(timer);
    }
  }, [status, autoCloseOnError, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && status !== "signing" && onClose()}>
      <DialogContent
        className="max-w-[380px] p-0 gap-0 border-0 bg-white dark:bg-gray-900 overflow-visible"
        showCloseButton={false}
      >
        <div className="relative rounded-2xl overflow-hidden">
          {/* Animated background gradient */}
          <div className="absolute inset-0 overflow-hidden">
            <div
              className={cn(
                "absolute -top-1/2 -left-1/2 w-[200%] h-[200%] animate-spin-slow",
                status === "signing" && "opacity-100",
                status === "pending" && "opacity-70",
                status === "success" && "opacity-0",
                status === "error" && "opacity-0"
              )}
              style={{
                background: "conic-gradient(from 0deg, transparent, rgba(139, 92, 246, 0.1), transparent, rgba(59, 130, 246, 0.1), transparent)",
                animationDuration: "8s",
              }}
            />
          </div>

          {/* Subtle noise texture */}
          <div
            className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
            style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noise"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%" height="100%" filter="url(%23noise)"/%3E%3C/svg%3E")'
            }}
          />

          {/* Close button - only show when not signing */}
          {status !== "signing" && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          )}

          {/* Content */}
          <div className="relative px-8 py-10">
            {/* Icon Area */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                {/* Outer ring animation */}
                {status === "signing" && (
                  <>
                    <div className="absolute inset-0 -m-4 rounded-full border-2 border-purple-500/20 animate-ping" />
                    <div className="absolute inset-0 -m-2 rounded-full border border-purple-500/30 animate-pulse" />
                  </>
                )}

                {/* Main icon container */}
                <div
                  className={cn(
                    "relative w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-500",
                    status === "pending" && "bg-gradient-to-br from-violet-500/10 to-purple-500/10 dark:from-violet-500/20 dark:to-purple-500/20",
                    status === "signing" && "bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-purple-500/30",
                    status === "success" && "bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/30",
                    status === "error" && "bg-gradient-to-br from-red-500/10 to-rose-500/10 dark:from-red-500/20 dark:to-rose-500/20"
                  )}
                >
                  {status === "pending" && (
                    <Fingerprint className="w-10 h-10 text-purple-500 dark:text-purple-400" />
                  )}
                  {status === "signing" && (
                    <div className="relative">
                      {isWalletConnect ? (
                        <Smartphone className="w-10 h-10 text-white animate-bounce" style={{ animationDuration: "1.5s" }} />
                      ) : (
                        <Loader2 className="w-10 h-10 text-white animate-spin" />
                      )}
                    </div>
                  )}
                  {status === "success" && (
                    <CheckCircle2 className="w-10 h-10 text-white" />
                  )}
                  {status === "error" && (
                    <X className="w-10 h-10 text-red-500 dark:text-red-400" />
                  )}
                </div>

                {/* Wallet icon badge - show for all wallets during signing */}
                {status === "signing" && (walletIcon || isWalletConnect) && (
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white dark:bg-gray-800 shadow-lg border-2 border-white dark:border-gray-700 flex items-center justify-center overflow-hidden">
                    {walletIcon ? (
                      <img
                        src={walletIcon}
                        alt={walletName}
                        className="w-5 h-5 object-contain"
                        onError={(e) => {
                          // Fallback if image fails to load
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : isWalletConnect ? (
                      <WalletConnectIcon />
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            {/* Text Content */}
            <div className="text-center">
              <DialogTitle
                className={cn(
                  "text-xl font-semibold mb-2 transition-colors duration-300",
                  status === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-gray-900 dark:text-white"
                )}
              >
                {status === "pending" && t("required")}
                {status === "signing" && (isWalletConnect ? t("checkWallet") : t("signing"))}
                {status === "success" && t("verified")}
                {status === "error" && t("failed")}
              </DialogTitle>

              <DialogDescription className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {status === "pending" && (
                  <>
                    {t("verifyOwnership", { wallet: walletName })}
                  </>
                )}
                {status === "signing" && isWalletConnect && (
                  <span className="flex flex-col gap-1">
                    <span>{t("openMobileApp")}</span>
                    <span className="text-purple-500 dark:text-purple-400 font-medium">
                      {t("requestWaiting")}
                    </span>
                  </span>
                )}
                {status === "signing" && !isWalletConnect && (
                  <>
                    {t("confirmInExtension")}
                  </>
                )}
                {status === "success" && (
                  <>
                    {t("verifiedSuccess")}
                  </>
                )}
                {status === "error" && (
                  <span className="text-red-500 dark:text-red-400">
                    {errorMessage || t("rejectedOrFailed")}
                  </span>
                )}
              </DialogDescription>

              {/* Progress Steps for WalletConnect */}
              {isWalletConnect && status === "signing" && (
                <div className="flex items-center justify-center gap-2 mb-6">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">{t("connected")}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center animate-pulse">
                      <Fingerprint className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-purple-600 dark:text-purple-400 font-medium">{t("signMessage")}</span>
                  </div>
                </div>
              )}

              {/* Auto-close indicator for error state */}
              {status === "error" && autoCloseOnError > 0 && (
                <div className="flex flex-col items-center gap-2">
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {t("closingAutomatically")}
                  </p>
                  <div className="w-32 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-500 to-rose-500 rounded-full"
                      style={{
                        animation: `shrink ${autoCloseOnError}ms linear forwards`,
                      }}
                    />
                  </div>
                  <style jsx>{`
                    @keyframes shrink {
                      from { width: 100%; }
                      to { width: 0%; }
                    }
                  `}</style>
                </div>
              )}

              {/* Loader for signing state */}
              {status === "signing" && (
                <div className="flex justify-center">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom accent line */}
          <div
            className={cn(
              "h-1 transition-colors duration-500",
              status === "pending" && "bg-gradient-to-r from-violet-500/50 via-purple-500/50 to-violet-500/50",
              status === "signing" && "bg-gradient-to-r from-violet-500 via-purple-500 to-violet-500 animate-pulse",
              status === "success" && "bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-500",
              status === "error" && "bg-gradient-to-r from-red-500/50 via-rose-500/50 to-red-500/50"
            )}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SignaturePromptModal;
