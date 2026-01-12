"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  Shield,
  Wallet,
  AlertTriangle,
  Loader2,
  Info,
  CheckCircle2,
  ChevronDown,
  Plus,
  Lock,
} from "lucide-react";
import { useWalletBalances } from "@/hooks/useWalletData";
import { useRequestWithdrawal, useWithdrawalLimits } from "@/hooks/useWithdrawals";
import { authApi, type LinkedWallet } from "@/lib/api/auth";
import { CurrencyIcon } from "./CurrencyIcon";
import { PremiumButton } from "@/components/ui/premium-button";
import type { WithdrawalResponse } from "@/types/withdrawals";

interface WithdrawalFormProps {
  onSuccess?: (withdrawal: WithdrawalResponse) => void;
  onCancel?: () => void;
}

export function WithdrawalForm({ onSuccess, onCancel }: WithdrawalFormProps) {
  const router = useRouter();
  const { data: balancesData } = useWalletBalances();
  const { data: limitsData } = useWithdrawalLimits();
  const requestWithdrawal = useRequestWithdrawal();

  // State
  const [amount, setAmount] = useState("");
  const [selectedWalletId, setSelectedWalletId] = useState<string>("");
  const [linkedWallets, setLinkedWallets] = useState<LinkedWallet[]>([]);
  const [remainingSlots, setRemainingSlots] = useState(0);
  const [isLoadingWallets, setIsLoadingWallets] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get HBCT balance - round to avoid floating point precision issues
  const hbctBalance = balancesData?.balances.find((b) => b.currency === "HBCT");
  const rawBalance = parseFloat(hbctBalance?.availableBalance || "0");
  // Consider balances less than 0.0001 as effectively 0 (floating point dust)
  const availableBalance = rawBalance < 0.0001 ? 0 : Math.floor(rawBalance * 10000) / 10000;

  // Get limits from API (with fallbacks)
  const minAmount = parseFloat(limitsData?.minAmount || "5000");
  const maxAmount = parseFloat(limitsData?.maxAmount || "100000");
  const feePercent = parseFloat(limitsData?.feePercent || "0.1") / 100; // Convert from percentage

  // Fee calculation
  const withdrawAmount = parseFloat(amount) || 0;
  const estimatedFee = withdrawAmount * feePercent;
  const netAmount = Math.max(0, withdrawAmount - estimatedFee);

  // Load linked wallets on mount
  useEffect(() => {
    async function loadWallets() {
      try {
        setIsLoadingWallets(true);
        const response = await authApi.getWallets();
        setLinkedWallets(response.wallets);
        setRemainingSlots(response.remainingSlots);
        // Auto-select primary wallet
        const primaryWallet = response.wallets.find((w) => w.isPrimary);
        if (primaryWallet) {
          setSelectedWalletId(primaryWallet.id);
        } else if (response.wallets.length > 0) {
          setSelectedWalletId(response.wallets[0].id);
        }
      } catch (err) {
        console.error("Failed to load wallets:", err);
      } finally {
        setIsLoadingWallets(false);
      }
    }
    loadWallets();
  }, []);

  // Selected wallet
  const selectedWallet = linkedWallets.find((w) => w.id === selectedWalletId);

  // Validation
  const isValidAmount =
    withdrawAmount >= minAmount &&
    withdrawAmount <= maxAmount &&
    withdrawAmount <= availableBalance;
  const hasLinkedWallet = linkedWallets.length > 0;
  const canSubmit = isValidAmount && selectedWalletId && !requestWithdrawal.isPending;

  const handleAmountChange = (value: string) => {
    if (/^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      setError(null);
    }
  };

  const handleMaxClick = () => {
    if (availableBalance <= 0) {
      setError("Insufficient balance");
      return;
    }
    // Format without scientific notation, max 4 decimal places
    const formattedAmount = availableBalance.toFixed(4).replace(/\.?0+$/, '');
    setAmount(formattedAmount);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!canSubmit) return;

    try {
      const result = await requestWithdrawal.mutateAsync({
        amount: amount,
        walletId: selectedWalletId,
      });
      onSuccess?.(result);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || "Failed to request withdrawal");
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Loading state
  if (isLoadingWallets) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  // No linked wallets
  if (!hasLinkedWallet) {
    return (
      <div className="text-center py-8 space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
          <Shield className="h-8 w-8 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Linked Wallets
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm mx-auto">
            For your security, withdrawals can only be made to wallets you have linked and verified.
            Please link a wallet first.
          </p>
        </div>
        <PremiumButton
          onClick={() => router.push('/settings?tab=wallets')}
          variant="brand"
          icon={Plus}
        >
          Link a Wallet
        </PremiumButton>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Security Notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
        <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
            Secure Withdrawal
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
            Withdrawals are only allowed to wallets you have linked and verified. This protects your funds from unauthorized transfers.
          </p>
        </div>
      </div>

      {/* Wallet Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Destination Wallet
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={cn(
              "w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left",
              "bg-white dark:bg-gray-900",
              isDropdownOpen
                ? "border-brand-500 ring-2 ring-brand-500/20"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
            )}
          >
            {selectedWallet ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedWallet.label || "Wallet"}
                    </span>
                    {selectedWallet.isPrimary && (
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400">
                        PRIMARY
                      </span>
                    )}
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                    {formatAddress(selectedWallet.walletAddress)}
                  </p>
                </div>
              </div>
            ) : (
              <span className="text-gray-400">Select a wallet</span>
            )}
            <ChevronDown
              className={cn(
                "h-5 w-5 text-gray-400 transition-transform",
                isDropdownOpen && "rotate-180"
              )}
            />
          </button>

          {/* Dropdown */}
          {isDropdownOpen && (
            <div className="absolute z-10 w-full mt-2 py-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg">
              {linkedWallets.map((wallet) => (
                <button
                  key={wallet.id}
                  type="button"
                  onClick={() => {
                    setSelectedWalletId(wallet.id);
                    setIsDropdownOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                    selectedWalletId === wallet.id && "bg-brand-50 dark:bg-brand-500/10"
                  )}
                >
                  <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Wallet className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {wallet.label || "Wallet"}
                      </span>
                      {wallet.isPrimary && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400">
                          PRIMARY
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                      {formatAddress(wallet.walletAddress)}
                    </p>
                  </div>
                  {selectedWalletId === wallet.id && (
                    <CheckCircle2 className="h-5 w-5 text-brand-500" />
                  )}
                </button>
              ))}

              {/* Link new wallet option - only show if slots available */}
              {remainingSlots > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2">
                  <button
                    type="button"
                    onClick={() => router.push('/settings?tab=wallets')}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-brand-600 dark:text-brand-400"
                  >
                    <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center">
                      <Plus className="h-5 w-5" />
                    </div>
                    <span className="font-medium">Link New Wallet</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Amount Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Amount
        </label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <CurrencyIcon size="sm" />
          </div>
          <input
            type="text"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="0.00"
            className={cn(
              "w-full pl-12 pr-20 py-3.5 rounded-xl border bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors",
              error
                ? "border-red-500 focus:ring-red-500/20"
                : "border-gray-200 dark:border-gray-700 focus:ring-brand-500/20 focus:border-brand-500"
            )}
          />
          <button
            type="button"
            onClick={handleMaxClick}
            disabled={availableBalance <= 0}
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors",
              availableBalance > 0
                ? "text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10"
                : "text-gray-400 dark:text-gray-600 cursor-not-allowed"
            )}
          >
            MAX
          </button>
        </div>
        <div className="flex items-center justify-between mt-2 text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            Available: <span className="font-medium text-gray-700 dark:text-gray-300">{availableBalance.toLocaleString()} HBCT</span>
          </span>
          <span className="text-gray-500 dark:text-gray-400 text-xs">
            Min: {minAmount.toLocaleString()} | Max: {maxAmount.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Fee Summary */}
      {withdrawAmount > 0 && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Withdrawal Amount</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {withdrawAmount.toLocaleString()} HBCT
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Network Fee (0.1%)</span>
            <span className="font-medium text-gray-900 dark:text-white">
              -{estimatedFee.toLocaleString(undefined, { maximumFractionDigits: 4 })} HBCT
            </span>
          </div>
          <hr className="border-gray-200 dark:border-gray-700" />
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-700 dark:text-gray-300">You'll Receive</span>
            <span className="text-lg font-bold text-brand-600 dark:text-brand-400">
              {netAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })} HBCT
            </span>
          </div>
        </div>
      )}

      {/* Info Notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
        <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-700 dark:text-blue-300">
          <p className="font-medium mb-1">Confirmation Required</p>
          <p className="text-blue-600 dark:text-blue-400 text-xs">
            After submitting, you'll receive an email with a confirmation code. Large withdrawals may require additional admin approval for security.
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3.5 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
        )}
        <PremiumButton
          type="submit"
          disabled={!canSubmit}
          className="flex-1"
          size="lg"
        >
          {requestWithdrawal.isPending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="hidden sm:inline">Processing...</span>
              <span className="sm:hidden">Wait...</span>
            </>
          ) : (
            <>
              <Shield className="h-5 w-5" />
              <span className="hidden sm:inline">Request Secure Withdrawal</span>
              <span className="sm:hidden">Withdraw</span>
            </>
          )}
        </PremiumButton>
      </div>
    </form>
  );
}
