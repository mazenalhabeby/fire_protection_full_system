"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Wallet, Loader2, ChevronUp, ChevronDown } from "lucide-react";
import { useWallet, useCorrectChain } from "@/hooks/useWallet";
import { WalletConnectModal } from "./WalletConnectModal";
import { cn } from "@/lib/utils";

interface CombinedWalletMobileProps {
  offChainBalance?: string;
  className?: string;
}

export function CombinedWalletMobile({
  offChainBalance = "0.00",
  className,
}: CombinedWalletMobileProps) {
  const router = useRouter();
  const locale = useLocale();
  const {
    isConnected,
    isConnecting,
    balance,
    balanceSymbol,
    connect,
    isModalOpen,
    closeModal,
  } = useWallet();

  const { isCorrectChain } = useCorrectChain();

  // Toggle between views: 'offchain' | 'onchain'
  const [view, setView] = useState<"offchain" | "onchain">("offchain");
  const [isAnimating, setIsAnimating] = useState(false);

  const toggleView = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setView(view === "offchain" ? "onchain" : "offchain");
      setTimeout(() => setIsAnimating(false), 50);
    }, 150);
  };

  // Loading state
  if (isConnecting) {
    return (
      <>
        <div
          className={cn(
            "flex items-center justify-center gap-2 w-[140px] h-10 rounded-xl",
            "bg-gradient-to-r from-brand-500/80 to-brand-600/80",
            "text-white font-medium text-sm",
            className
          )}
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Connecting...</span>
        </div>
        <WalletConnectModal isOpen={isModalOpen} onClose={closeModal} />
      </>
    );
  }

  return (
    <>
      <div
        className={cn(
          "flex items-center w-[140px] h-10 rounded-xl overflow-hidden",
          "border border-gray-200/50 dark:border-gray-700/50",
          "transition-all duration-300",
          view === "onchain" && !isConnected
            ? "bg-gradient-to-r from-brand-500 to-brand-600 shadow-lg shadow-brand-500/25"
            : "bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm",
          className
        )}
      >
        {/* Main Button Area */}
        <button
          onClick={() => {
            if (view === "offchain") {
              // Navigate to wallet page when in off-chain view
              router.push(`/${locale}/wallet`);
            } else if (view === "onchain" && !isConnected) {
              connect();
            }
          }}
          className={cn(
            "flex-1 flex items-center gap-2 h-full pl-3 pr-1 overflow-hidden",
            "transition-all duration-200",
            view === "onchain" && !isConnected
              ? "text-white"
              : "text-gray-700 dark:text-gray-300"
          )}
        >
          {/* Content Container with Animation */}
          <div
            className={cn(
              "flex items-center gap-2 transition-all duration-300",
              isAnimating
                ? "opacity-0 scale-95 translate-y-2"
                : "opacity-100 scale-100 translate-y-0"
            )}
          >
            {view === "offchain" ? (
              // Off-chain view - links to wallet page
              <>
                <div className="relative flex-shrink-0">
                  <Wallet className="w-4 h-4" />
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                </div>
                <div className="flex flex-col items-start leading-none min-w-0">
                  <span className="text-[9px] text-gray-400 dark:text-gray-500">My Wallet</span>
                  <span className="text-xs font-semibold truncate">{offChainBalance} <span className="text-[8px] font-normal text-gray-500 dark:text-gray-400">HBCT</span></span>
                </div>
              </>
            ) : isConnected ? (
              // On-chain connected
              <>
                <div className="relative flex-shrink-0">
                  <div
                    className={cn(
                      "w-6 h-6 rounded-md flex items-center justify-center",
                      isCorrectChain
                        ? "bg-gradient-to-br from-green-400 to-emerald-500"
                        : "bg-gradient-to-br from-amber-400 to-orange-500"
                    )}
                  >
                    <Wallet className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div className="flex flex-col items-start leading-none min-w-0">
                  <span className="text-[9px] text-gray-400 dark:text-gray-500">On-chain</span>
                  <span className="text-xs font-semibold truncate">{balance} {balanceSymbol}</span>
                </div>
              </>
            ) : (
              // On-chain not connected
              <span className="text-xs font-semibold">Connect Web3</span>
            )}
          </div>
        </button>

        {/* Toggle Arrow Button */}
        <button
          onClick={toggleView}
          className={cn(
            "flex flex-col items-center justify-center w-7 h-full gap-0.5",
            "border-l transition-all duration-200",
            view === "onchain" && !isConnected
              ? "border-white/20 text-white/70 hover:text-white hover:bg-white/10"
              : "border-gray-200 dark:border-gray-700 text-gray-400 hover:text-brand-500 dark:hover:text-brand-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          )}
        >
          <ChevronUp
            className={cn(
              "w-3 h-3 transition-all duration-300",
              view === "offchain" ? "opacity-50 scale-75" : "opacity-100 scale-100"
            )}
          />
          <ChevronDown
            className={cn(
              "w-3 h-3 -mt-1.5 transition-all duration-300",
              view === "onchain" ? "opacity-50 scale-75" : "opacity-100 scale-100"
            )}
          />
        </button>
      </div>

      {/* Wallet Connect Modal */}
      <WalletConnectModal isOpen={isModalOpen} onClose={closeModal} />
    </>
  );
}

export default CombinedWalletMobile;
