"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";
import { toast } from "sonner";
import {
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  Wallet,
  Search,
  ArrowRight,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  FileText,
  Plus,
  Trash2,
} from "lucide-react";
import type { LinkedWallet } from "@/lib/api/auth";

interface DepositCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  linkedWallets: LinkedWallet[];
  depositAddress: string;
  onDepositsFound?: () => void; // Callback when new deposits are credited
}

type CheckStep = "select" | "checking" | "results" | "txhash";

interface CheckResult {
  success: boolean;
  message: string;
  transactions?: {
    txHash: string;
    amount: string;
    status: "new" | "existing" | "pending";
    blockNumber?: string;
    confirmations?: number;
  }[];
  totalNewDeposits?: number;
  totalAmount?: string;
}

export function DepositCheckModal({
  isOpen,
  onClose,
  linkedWallets,
  depositAddress,
  onDepositsFound,
}: DepositCheckModalProps) {
  const [step, setStep] = useState<CheckStep>("select");
  const [selectedWallet, setSelectedWallet] = useState<LinkedWallet | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [currentAction, setCurrentAction] = useState("");
  const [txHashes, setTxHashes] = useState<string[]>([""]);
  const [isVerifyingTxHash, setIsVerifyingTxHash] = useState(false);
  const [txVerifyResults, setTxVerifyResults] = useState<{txHash: string; success: boolean; message: string; amount?: string}[]>([]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("select");
      setSelectedWallet(linkedWallets.length === 1 ? linkedWallets[0] : null);
      setCheckResult(null);
      setCurrentAction("");
      setTxHashes([""]);
      setTxVerifyResults([]);
    }
  }, [isOpen, linkedWallets]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleCheck = async () => {
    if (!selectedWallet) {
      toast.error("Please select a wallet");
      return;
    }

    setStep("checking");
    setIsChecking(true);
    setCurrentAction("Connecting to blockchain...");

    try {
      // Simulate step-by-step progress for better UX
      await new Promise((r) => setTimeout(r, 500));
      setCurrentAction("Scanning recent transactions...");

      const result = await api.post<CheckResult>("/deposits/check-wallet", {
        walletAddress: selectedWallet.walletAddress,
      });

      setCurrentAction("Processing results...");
      await new Promise((r) => setTimeout(r, 300));

      setCheckResult(result);
      setStep("results");

      if (result.totalNewDeposits && result.totalNewDeposits > 0) {
        toast.success(`Found ${result.totalNewDeposits} new deposit(s)!`);
        // Trigger balance refresh
        onDepositsFound?.();
      }
    } catch (error: any) {
      setCheckResult({
        success: false,
        message: error.message || "Failed to check deposits",
      });
      setStep("results");
    } finally {
      setIsChecking(false);
    }
  };

  const handleRetry = () => {
    setStep("select");
    setCheckResult(null);
  };

  // Transaction hash handlers
  const addTxHashField = () => {
    if (txHashes.length < 5) {
      setTxHashes([...txHashes, ""]);
    }
  };

  const removeTxHashField = (index: number) => {
    if (txHashes.length > 1) {
      setTxHashes(txHashes.filter((_, i) => i !== index));
    }
  };

  const updateTxHash = (index: number, value: string) => {
    const updated = [...txHashes];
    updated[index] = value;
    setTxHashes(updated);
  };

  const handleVerifyTxHashes = async () => {
    const validHashes = txHashes.filter(h => /^0x[a-fA-F0-9]{64}$/.test(h.trim()));

    if (validHashes.length === 0) {
      toast.error("Please enter at least one valid transaction hash");
      return;
    }

    setIsVerifyingTxHash(true);
    setTxVerifyResults([]);
    const results: {txHash: string; success: boolean; message: string; amount?: string}[] = [];

    for (const txHash of validHashes) {
      try {
        const result = await api.post<{
          success: boolean;
          message: string;
          deposit?: { amount: string };
        }>("/deposits/verify", { txHash: txHash.trim() });

        results.push({
          txHash: txHash.trim(),
          success: result.success,
          message: result.message,
          amount: result.deposit?.amount,
        });
      } catch (error: any) {
        results.push({
          txHash: txHash.trim(),
          success: false,
          message: error.message || "Failed to verify",
        });
      }
    }

    setTxVerifyResults(results);
    setIsVerifyingTxHash(false);

    const successCount = results.filter(r => r.success && r.message.includes("credited")).length;
    if (successCount > 0) {
      toast.success(`${successCount} deposit(s) verified and credited!`);
      // Trigger balance refresh
      onDepositsFound?.();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Check for Deposits
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
          {/* Step 1: Select Method */}
          {step === "select" && (
            <div className="space-y-4">
              {/* Method Tabs */}
              <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                <button
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium shadow-sm"
                >
                  <Search className="h-4 w-4" />
                  Auto Check
                </button>
                <button
                  onClick={() => setStep("txhash")}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <FileText className="h-4 w-4" />
                  By Tx Hash
                </button>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400">
                Select the wallet you sent HBCT from to check recent deposits (last 5 minutes):
              </p>

              {/* Deposit Address Info */}
              <div className="p-4 rounded-xl bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/20">
                <p className="text-xs text-brand-600 dark:text-brand-400 mb-1">
                  Deposit Address
                </p>
                <p className="font-mono text-sm text-brand-800 dark:text-brand-300 break-all">
                  {depositAddress}
                </p>
              </div>

              {/* Wallet Selection */}
              <div className="space-y-2">
                {linkedWallets.map((wallet) => (
                  <button
                    key={wallet.id}
                    onClick={() => setSelectedWallet(wallet)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                      selectedWallet?.id === wallet.id
                        ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        selectedWallet?.id === wallet.id
                          ? "bg-brand-500 text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                      }`}
                    >
                      <Wallet className="h-5 w-5" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {wallet.label || "Wallet"}
                        {wallet.isPrimary && (
                          <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400">
                            PRIMARY
                          </span>
                        )}
                      </p>
                      <p className="text-sm font-mono text-gray-500 dark:text-gray-400">
                        {formatAddress(wallet.walletAddress)}
                      </p>
                    </div>
                    {selectedWallet?.id === wallet.id && (
                      <CheckCircle2 className="h-5 w-5 text-brand-500" />
                    )}
                  </button>
                ))}
              </div>

              {/* Check Button */}
              <button
                onClick={handleCheck}
                disabled={!selectedWallet}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-semibold transition-all"
              >
                <Search className="h-5 w-5" />
                Check Recent Deposits
                <ArrowRight className="h-5 w-5" />
              </button>

              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                For older deposits, use &quot;By Tx Hash&quot; tab
              </p>
            </div>
          )}

          {/* Transaction Hash Step */}
          {step === "txhash" && (
            <div className="space-y-4">
              {/* Method Tabs */}
              <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                <button
                  onClick={() => setStep("select")}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <Search className="h-4 w-4" />
                  Auto Check
                </button>
                <button
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium shadow-sm"
                >
                  <FileText className="h-4 w-4" />
                  By Tx Hash
                </button>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400">
                Enter transaction hash(es) to verify older deposits:
              </p>

              {/* Transaction Hash Inputs */}
              <div className="space-y-2">
                {txHashes.map((hash, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={hash}
                      onChange={(e) => updateTxHash(index, e.target.value)}
                      placeholder="0x..."
                      className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    {txHashes.length > 1 && (
                      <button
                        onClick={() => removeTxHashField(index)}
                        className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-red-500 hover:border-red-500 transition-colors"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {txHashes.length < 5 && (
                <button
                  onClick={addTxHashField}
                  className="flex items-center gap-2 text-sm text-brand-500 hover:text-brand-600"
                >
                  <Plus className="h-4 w-4" />
                  Add another transaction
                </button>
              )}

              {/* Verify Results */}
              {txVerifyResults.length > 0 && (
                <div className="space-y-2 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Results:</p>
                  {txVerifyResults.map((result, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2 p-2 rounded-lg ${
                        result.success ? "bg-emerald-50 dark:bg-emerald-500/10" : "bg-red-50 dark:bg-red-500/10"
                      }`}
                    >
                      {result.success ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono text-gray-500 truncate">
                          {formatAddress(result.txHash)}
                        </p>
                        <p className={`text-sm ${result.success ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
                          {result.message}
                          {result.amount && ` (+${result.amount} HBCT)`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Verify Button */}
              <button
                onClick={handleVerifyTxHashes}
                disabled={isVerifyingTxHash || !txHashes.some(h => h.trim())}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-semibold transition-all"
              >
                {isVerifyingTxHash ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    Verify Transactions
                  </>
                )}
              </button>

              {/* Done Button */}
              {txVerifyResults.length > 0 && (
                <button
                  onClick={onClose}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Done
                </button>
              )}
            </div>
          )}

          {/* Step 2: Checking */}
          {step === "checking" && (
            <div className="py-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-brand-500 animate-spin" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Checking Blockchain
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {currentAction}
              </p>

              {/* Progress indicators */}
              <div className="mt-6 flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse delay-100" />
                <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse delay-200" />
              </div>
            </div>
          )}

          {/* Step 3: Results */}
          {step === "results" && checkResult && (
            <div className="space-y-4">
              {/* Success with new deposits */}
              {checkResult.success && checkResult.totalNewDeposits && checkResult.totalNewDeposits > 0 ? (
                <>
                  <div className="text-center py-4">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      Deposits Found!
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {checkResult.totalNewDeposits} new deposit(s) credited to your account
                    </p>
                    {checkResult.totalAmount && (
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                        +{checkResult.totalAmount} HBCT
                      </p>
                    )}
                  </div>

                  {/* Transaction list */}
                  {checkResult.transactions && checkResult.transactions.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {checkResult.transactions.map((tx, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                tx.status === "new"
                                  ? "bg-emerald-100 dark:bg-emerald-500/20"
                                  : "bg-gray-100 dark:bg-gray-700"
                              }`}
                            >
                              {tx.status === "new" ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 text-gray-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-mono text-sm text-gray-900 dark:text-white">
                                {formatAddress(tx.txHash)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {tx.status === "new" ? "Just credited" : "Already credited"}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {tx.amount} HBCT
                            </p>
                            <a
                              href={`https://testnet.bscscan.com/tx/${tx.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1"
                            >
                              View <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : checkResult.success ? (
                /* Success but no new deposits */
                <div className="text-center py-4">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                    <AlertTriangle className="h-8 w-8 text-amber-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    No New Deposits
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                    {checkResult.message}
                  </p>

                  {checkResult.transactions && checkResult.transactions.length > 0 && (
                    <div className="mt-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <p className="text-xs text-gray-500 mb-2">Previously credited deposits:</p>
                      {checkResult.transactions.slice(0, 3).map((tx, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="font-mono text-gray-600 dark:text-gray-400">
                            {formatAddress(tx.txHash)}
                          </span>
                          <span className="text-gray-900 dark:text-white">{tx.amount} HBCT</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Error */
                <div className="text-center py-4">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                    <XCircle className="h-8 w-8 text-red-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    Check Failed
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                    {checkResult.message}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleRetry}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Check Again
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
