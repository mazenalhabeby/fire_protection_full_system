"use client";

import { useState } from "react";
import { Wallet, ChevronRight, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useWallet, useCorrectChain } from "@/hooks/useWallet";
import { WalletConnectModal } from "./WalletConnectModal";
import { cn } from "@/lib/utils";

interface WalletButtonMobileProps {
  className?: string;
  onNavigate?: () => void;
}

export function WalletButtonMobile({ className, onNavigate }: WalletButtonMobileProps) {
  const t = useTranslations("wallet");
  const {
    shortAddress,
    isConnected,
    isConnecting,
    balance,
    balanceSymbol,
    connect,
    isModalOpen,
    openModal,
    closeModal,
  } = useWallet();

  const { isCorrectChain } = useCorrectChain();
  const [showBalance, setShowBalance] = useState(true);

  // Toggle between showing connect and balance
  const handleToggle = () => {
    if (!isConnected) {
      connect();
      return;
    }
    setShowBalance(!showBalance);
  };

  // Open wallet details
  const handleOpenDetails = () => {
    openModal();
    onNavigate?.();
  };

  if (isConnecting) {
    return (
      <>
        <div
          className={cn(
            "flex items-center justify-center gap-2 h-10 px-4 rounded-xl",
            "bg-gradient-to-r from-brand-500/80 to-brand-600/80",
            "text-white text-sm font-medium",
            className
          )}
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{t("connecting")}</span>
        </div>
        <WalletConnectModal isOpen={isModalOpen} onClose={closeModal} />
      </>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl",
        "bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900",
        "border border-gray-200 dark:border-gray-700",
        className
      )}
    >
      <div className="flex items-center h-10">
        {/* Toggle Button */}
        <button
          onClick={handleToggle}
          className={cn(
            "h-full flex items-center gap-2 px-4 transition-all duration-300",
            "text-sm font-medium",
            isConnected
              ? "text-gray-700 dark:text-gray-300"
              : "text-white bg-gradient-to-r from-brand-500 to-brand-600 rounded-xl shadow-md"
          )}
        >
          {/* Status indicator */}
          <div className="relative">
            <Wallet className="w-4 h-4" />
            {isConnected && (
              <div
                className={cn(
                  "absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-gray-800",
                  isCorrectChain ? "bg-green-500" : "bg-amber-500"
                )}
              />
            )}
          </div>

          {/* Content with slide animation */}
          <div className="relative overflow-hidden min-w-[80px]">
            {!isConnected ? (
              <span>{t("connect")}</span>
            ) : (
              <div
                className={cn(
                  "transition-all duration-300",
                  showBalance ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
                )}
              >
                {balance} {balanceSymbol}
              </div>
            )}

            {isConnected && (
              <div
                className={cn(
                  "absolute top-0 left-0 transition-all duration-300",
                  !showBalance ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
                )}
              >
                {shortAddress}
              </div>
            )}
          </div>
        </button>

        {/* Details Button (when connected) */}
        {isConnected && (
          <button
            onClick={handleOpenDetails}
            className={cn(
              "h-full px-3 flex items-center justify-center",
              "border-l border-gray-200 dark:border-gray-700",
              "text-gray-400 hover:text-brand-500 dark:hover:text-brand-400",
              "transition-colors"
            )}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Wallet Connect Modal */}
      <WalletConnectModal isOpen={isModalOpen} onClose={closeModal} />
    </div>
  );
}

export default WalletButtonMobile;
