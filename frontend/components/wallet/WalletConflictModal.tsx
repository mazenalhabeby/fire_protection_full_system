"use client";

import React from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useWallet, formatAddress } from "@/hooks/useWallet";
import { ShieldX, X, Wallet, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export function WalletConflictModal() {
  const { walletConflict, clearWalletConflict, openModal } = useWallet();

  const isOpen = walletConflict?.hasConflict ?? false;

  const handleClose = () => {
    clearWalletConflict();
  };

  const handleConnectDifferent = () => {
    clearWalletConflict();
    // Open wallet connect modal to let user choose a different wallet
    openModal();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && clearWalletConflict()}>
      <DialogContent
        className="max-w-[420px] p-0 gap-0 border-0 bg-transparent overflow-visible"
        showCloseButton={false}
      >
        <div className={cn(
          "relative overflow-hidden rounded-2xl",
          "bg-white dark:bg-gray-900",
          "border border-red-200 dark:border-red-500/30",
          "shadow-2xl shadow-red-500/10"
        )}>
          {/* Animated Warning Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-500/10 dark:bg-red-500/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-orange-500/10 dark:bg-orange-500/20 rounded-full blur-3xl" />
          </div>

          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>

          {/* Header with Warning Icon */}
          <div className="relative px-6 pt-6 pb-4 text-center">
            {/* Warning Icon */}
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-xl shadow-red-500/30 mb-4">
              <ShieldX className="w-8 h-8 text-white" />
            </div>

            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
              Wallet Connection Blocked
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              This wallet belongs to another account
            </DialogDescription>
          </div>

          {/* Content */}
          <div className="relative px-6 pb-6">
            {/* Blocked Wallet Address Display */}
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-600 dark:text-red-400 mb-1 font-medium">Blocked Wallet</p>
                  <p className="text-sm font-mono font-semibold text-red-700 dark:text-red-300">
                    {walletConflict?.walletAddress ? formatAddress(walletConflict.walletAddress, 6) : "Unknown"}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                  <ShieldX className="w-5 h-5 text-red-500" />
                </div>
              </div>
            </div>

            {/* Warning Message */}
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 mb-5">
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {walletConflict?.message || "This wallet address is already linked to another user account."}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                The wallet has been disconnected for security. Please connect a different wallet.
              </p>
            </div>

            {/* What This Means */}
            <div className="space-y-2 mb-6">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Why was this blocked?
              </h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                  <span>Each wallet can only be linked to one account</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                  <span>This protects users from unauthorized transactions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                  <span>Connect a wallet that you own to continue</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleConnectDifferent}
                className="w-full h-12 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl shadow-lg shadow-brand-500/20"
              >
                <Wallet className="w-4 h-4 mr-2" />
                Connect Different Wallet
              </Button>

              <button
                onClick={handleClose}
                className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors py-2"
              >
                Close
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="relative px-6 pb-5">
            <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent mb-4" />
            <a
              href="/help"
              className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-brand-500 dark:hover:text-brand-400 transition-colors"
            >
              <span>Think this is a mistake? Contact support</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default WalletConflictModal;
