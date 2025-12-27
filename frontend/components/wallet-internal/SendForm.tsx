"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  User,
  Mail,
  Hash,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Info
} from "lucide-react";
import { useLookupRecipient } from "@/hooks/useWalletData";
import { CurrencyIcon } from "./CurrencyIcon";
import { PremiumButton } from "@/components/ui/premium-button";
import type { TransferMethod, WalletBalance, TransferLimits } from "@/types/api";
import { useDebounce } from "@/hooks/useMinimumLoading";

interface SendFormProps {
  balances: WalletBalance[];
  limits?: TransferLimits;
  onSubmit: (data: {
    recipientIdentifier: string;
    transferMethod: TransferMethod;
    currency: "HBCT";
    amount: number;
    note?: string;
  }) => void;
  isSubmitting?: boolean;
}

const transferMethods: { id: TransferMethod; label: string; icon: typeof User; placeholder: string }[] = [
  { id: "EMAIL", label: "Email", icon: Mail, placeholder: "recipient@example.com" },
  { id: "USERNAME", label: "Username", icon: User, placeholder: "@username" },
  { id: "USER_ID", label: "User ID", icon: Hash, placeholder: "User ID" },
];

export function SendForm({ balances, limits, onSubmit, isSubmitting }: SendFormProps) {
  const [method, setMethod] = useState<TransferMethod>("EMAIL");
  const [identifier, setIdentifier] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);

  const lookupMutation = useLookupRecipient();
  const debouncedIdentifier = useDebounce(identifier, 500);

  // Lookup recipient when identifier changes
  useEffect(() => {
    if (debouncedIdentifier.length >= 3) {
      lookupMutation.mutate({ method, identifier: debouncedIdentifier });
    }
  }, [debouncedIdentifier, method]);

  // Get HBCT balance (only currency supported)
  const hbctBalance = balances.find(b => b.currency === "HBCT");
  const availableBalance = parseFloat(hbctBalance?.availableBalance || "0");
  const amountValue = parseFloat(amount) || 0;

  // Validation
  const errors: string[] = [];
  if (touched) {
    if (!identifier) errors.push("Recipient is required");
    if (!amount || amountValue <= 0) errors.push("Amount must be greater than 0");
    if (amountValue > availableBalance) errors.push("Insufficient balance");
    if (limits) {
      if (amountValue > parseFloat(limits.singleTransferMax)) {
        errors.push(`Max single transfer: ${parseFloat(limits.singleTransferMax).toLocaleString()}`);
      }
      if (amountValue > parseFloat(limits.dailyRemaining)) {
        errors.push(`Daily limit remaining: ${parseFloat(limits.dailyRemaining).toLocaleString()}`);
      }
    }
  }

  const isValid = identifier && amountValue > 0 && amountValue <= availableBalance && errors.length === 0;
  const recipient = lookupMutation.data?.recipient;
  const recipientFound = lookupMutation.data?.found;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);

    if (!isValid || !recipientFound) return;

    onSubmit({
      recipientIdentifier: identifier,
      transferMethod: method,
      currency: "HBCT",
      amount: amountValue,
      note: note || undefined,
    });
  };

  const handleAmountChange = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) return;
    if (parts[1]?.length > 8) return;
    setAmount(cleaned);
  };

  const handleMax = () => {
    setAmount(availableBalance.toString());
  };

  const handlePercentage = (percent: number) => {
    setAmount((availableBalance * percent / 100).toString());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Transfer Method Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Send To
        </label>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {transferMethods.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setMethod(m.id);
                setIdentifier("");
                lookupMutation.reset();
              }}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-xl text-xs font-medium transition-all border",
                method === m.id
                  ? "bg-brand-50 dark:bg-brand-500/10 border-brand-500 text-brand-600 dark:text-brand-400"
                  : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
              )}
            >
              <m.icon className="h-4 w-4" />
              {m.label}
            </button>
          ))}
        </div>

        {/* Recipient Input */}
        <div className="relative">
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder={transferMethods.find(m => m.id === method)?.placeholder}
            className={cn(
              "w-full px-4 py-3.5 pr-12 rounded-xl border transition-all",
              "bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white",
              "focus:outline-none focus:ring-2",
              lookupMutation.isPending && "pr-12",
              recipientFound && "border-emerald-500 focus:ring-emerald-500/20",
              lookupMutation.data && !recipientFound && "border-red-500 focus:ring-red-500/20",
              !lookupMutation.data && "border-gray-200 dark:border-gray-700 focus:border-brand-500 focus:ring-brand-500/20"
            )}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {lookupMutation.isPending ? (
              <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
            ) : recipientFound ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : lookupMutation.data ? (
              <AlertCircle className="h-5 w-5 text-red-500" />
            ) : (
              <Search className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>

        {/* Recipient Result */}
        {recipientFound && recipient && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              {recipient.displayName}
            </p>
          </div>
        )}
        {lookupMutation.data && !recipientFound && (
          <p className="mt-2 text-sm text-red-500">User not found</p>
        )}
      </div>

      {/* HBCT Balance Display */}
      <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CurrencyIcon size="md" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">HBCT</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Fire Protection Token</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold text-gray-900 dark:text-white">
              {availableBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Available</p>
          </div>
        </div>
      </div>

      {/* Amount Input */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Amount
          </label>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Available: <span className="text-gray-700 dark:text-gray-300">{availableBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })} HBCT</span>
          </span>
        </div>

        <div className="relative">
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="0.00"
            className={cn(
              "w-full px-4 py-4 pr-24 text-xl font-semibold rounded-xl border transition-all",
              "bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white",
              "focus:outline-none focus:ring-2 focus:border-brand-500 focus:ring-brand-500/20",
              "border-gray-200 dark:border-gray-700"
            )}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <button
              type="button"
              onClick={handleMax}
              className="px-2 py-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded transition-colors"
            >
              MAX
            </button>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">HBCT</span>
          </div>
        </div>

        {/* Quick Amount Buttons */}
        <div className="flex gap-2 mt-3">
          {[25, 50, 75, 100].map((percent) => (
            <button
              key={percent}
              type="button"
              onClick={() => handlePercentage(percent)}
              className="flex-1 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
            >
              {percent}%
            </button>
          ))}
        </div>

        {/* Fee Info */}
        {amountValue > 0 && (
          <div className="mt-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Transfer Fee (0.1%)</span>
              <span className="text-gray-700 dark:text-gray-300">
                {(amountValue * 0.001).toLocaleString(undefined, { maximumFractionDigits: 4 })} HBCT
              </span>
            </div>
            <div className="flex justify-between text-sm font-medium pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">Recipient Receives</span>
              <span className="text-gray-900 dark:text-white">
                {(amountValue * 0.999).toLocaleString(undefined, { maximumFractionDigits: 4 })} HBCT
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Note (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Note <span className="text-gray-400 dark:text-gray-500">(Optional)</span>
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note for the recipient..."
          rows={2}
          className={cn(
            "w-full px-4 py-3 rounded-xl border resize-none transition-all",
            "bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white",
            "focus:outline-none focus:ring-2 focus:border-brand-500 focus:ring-brand-500/20",
            "border-gray-200 dark:border-gray-700 placeholder-gray-400 dark:placeholder-gray-500"
          )}
        />
      </div>

      {/* Limits Info */}
      {limits && (
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-3">
            <Info className="h-4 w-4 text-brand-600 dark:text-brand-400 mt-0.5 shrink-0" />
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <p>Daily Limit: <span className="text-gray-700 dark:text-gray-300">{parseFloat(limits.dailyUsed).toLocaleString()} / {parseFloat(limits.dailyLimit).toLocaleString()}</span> (Remaining: <span className="text-emerald-600 dark:text-emerald-400">{parseFloat(limits.dailyRemaining).toLocaleString()}</span>)</p>
              <p>Max Single Transfer: <span className="text-gray-700 dark:text-gray-300">{parseFloat(limits.singleTransferMax).toLocaleString()}</span></p>
            </div>
          </div>
        </div>
      )}

      {/* Errors */}
      {touched && errors.length > 0 && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30">
          <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
            {errors.map((error, i) => (
              <li key={i} className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Submit Button */}
      <PremiumButton
        type="submit"
        disabled={!isValid || !recipientFound || isSubmitting}
        variant="brand"
        size="lg"
        className="w-full"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            Continue
            <ArrowRight className="h-5 w-5" />
          </>
        )}
      </PremiumButton>
    </form>
  );
}
