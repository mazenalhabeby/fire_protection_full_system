"use client";

import { useState, useRef, useCallback } from "react";
import {
  Wallet,
  ChevronDown,
  Copy,
  LogOut,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useWallet, useCorrectChain, useClickOutside } from "@/hooks";
import { WalletConnectModal } from "./WalletConnectModal";
import { cn } from "@/lib/utils";

interface WalletButtonProps {
  variant?: "default" | "compact" | "full";
  className?: string;
}

export function WalletButton({ variant = "default", className }: WalletButtonProps) {
  const {
    address,
    shortAddress,
    isConnected,
    isConnecting,
    chainName,
    balance,
    balanceSymbol,
    connect,
    disconnect,
    copyAddress,
    isModalOpen,
    closeModal,
  } = useWallet();

  // If we have an address, we're definitely connected - use this as the source of truth
  const actuallyConnected = Boolean(address) || isConnected;

  const { isCorrectChain, switchToCorrectChain } = useCorrectChain();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const closeDropdown = useCallback(() => setIsDropdownOpen(false), []);
  useClickOutside(dropdownRef, closeDropdown, isDropdownOpen);

  const handleCopy = () => {
    copyAddress();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Loading state - only show if NOT connected yet
  // Address is the source of truth - if we have one, we're connected
  if (!actuallyConnected && isConnecting) {
    return (
      <>
        <button
          disabled
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl",
            "bg-gradient-to-r from-brand-500/80 to-brand-600/80",
            "text-white font-medium text-sm",
            "cursor-wait",
            className
          )}
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Connecting...</span>
        </button>
        <WalletConnectModal isOpen={isModalOpen} onClose={closeModal} />
      </>
    );
  }

  // Not connected - show connect button
  if (!actuallyConnected) {
    return (
      <>
        <button
          onClick={() => connect()}
          className={cn(
            "group relative flex items-center gap-2 px-5 py-2.5 rounded-xl overflow-hidden",
            "text-sm font-semibold text-white",
            "bg-gradient-to-r from-brand-500 to-brand-600",
            "hover:from-brand-600 hover:to-brand-700",
            "shadow-lg shadow-brand-500/25 hover:shadow-xl hover:shadow-brand-500/30",
            "transition-all duration-300",
            "hover:scale-[1.02] active:scale-[0.98]",
            className
          )}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          <Wallet className="w-4 h-4" />
          <span>Connect Web3</span>
        </button>
        <WalletConnectModal isOpen={isModalOpen} onClose={closeModal} />
      </>
    );
  }

  // Connected - show wallet info with dropdown
  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      {/* Main Button */}
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl",
          "bg-white/10 dark:bg-white/5 backdrop-blur-sm",
          "border border-gray-200/50 dark:border-gray-700/50",
          "hover:bg-white/20 dark:hover:bg-white/10",
          "transition-all duration-200",
          isDropdownOpen && "bg-white/20 dark:bg-white/10"
        )}
      >
        {/* Status Indicator */}
        <div className="relative">
          <div
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              isCorrectChain
                ? "bg-gradient-to-br from-green-400 to-emerald-500"
                : "bg-gradient-to-br from-amber-400 to-orange-500"
            )}
          >
            <Wallet className="w-4 h-4 text-white" />
          </div>
          {/* Online indicator */}
          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white dark:border-gray-900" />
        </div>

        {/* Address & Balance */}
        {variant !== "compact" && (
          <div className="flex flex-col items-start min-w-0">
            <span className="text-xs font-medium text-gray-900 dark:text-white truncate">
              {shortAddress}
            </span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">
              {balance} {balanceSymbol}
            </span>
          </div>
        )}

        <ChevronDown
          className={cn(
            "w-4 h-4 text-gray-500 transition-transform duration-200",
            isDropdownOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div
          className={cn(
            "absolute right-0 mt-2 w-72 rounded-2xl overflow-hidden z-50",
            "bg-white dark:bg-gray-900",
            "border border-gray-200 dark:border-gray-800",
            "shadow-2xl shadow-black/10 dark:shadow-black/30",
            "animate-in fade-in slide-in-from-top-2 duration-200"
          )}
        >
          {/* Header */}
          <div className="p-4 bg-gradient-to-br from-brand-500/10 to-brand-600/10 dark:from-brand-500/20 dark:to-brand-600/20 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  "bg-gradient-to-br from-brand-500 to-brand-600",
                  "shadow-lg shadow-brand-500/30"
                )}
              >
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {shortAddress}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    title="Copy address"
                  >
                    {copied ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                      isCorrectChain
                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                        : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                    )}
                  >
                    {isCorrectChain ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <AlertCircle className="w-3 h-3" />
                    )}
                    {chainName}
                  </span>
                </div>
              </div>
            </div>

            {/* On-chain Balance Card */}
            <div className="mt-4 p-3 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">On-chain Balance</div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {balance}
                </span>
                <span className="text-sm text-gray-500">{balanceSymbol}</span>
              </div>
            </div>
          </div>

          {/* Wrong Chain Warning */}
          {!isCorrectChain && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800/50">
              <button
                onClick={() => {
                  switchToCorrectChain();
                  setIsDropdownOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Switch to BNB Smart Chain
              </button>
            </div>
          )}

          {/* Disconnect Button */}
          <div className="p-3">
            <button
              onClick={() => {
                disconnect();
                setIsDropdownOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <LogOut className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span className="text-sm font-medium text-red-600 dark:text-red-400">
                Disconnect
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Wallet Connect Modal */}
      <WalletConnectModal isOpen={isModalOpen} onClose={closeModal} />
    </div>
  );
}

export default WalletButton;
