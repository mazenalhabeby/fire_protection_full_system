"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/hooks/useAuth";
import { authApi, type LinkedWallet } from "@/lib/api/auth";
import { api } from "@/lib/api/client";
import { toast } from "sonner";
import {
  ArrowLeft,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
  Shield,
  Wallet,
  CheckCircle2,
  Link2,
  Loader2,
  Search,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Image from "next/image";
import { PageHeader } from "@/components/ui/page-header";
import { DepositHistory } from "@/components/wallet-internal/DepositHistory";
import { CurrencyIcon } from "@/components/wallet-internal/CurrencyIcon";
import { PremiumButton } from "@/components/ui/premium-button";

export default function DepositPage() {
  const router = useRouter();
  useAuth();
  const [copied, setCopied] = useState(false);
  const [linkedWallets, setLinkedWallets] = useState<LinkedWallet[]>([]);
  const [isLoadingWallets, setIsLoadingWallets] = useState(true);
  const [activeTab, setActiveTab] = useState<"deposit" | "history">("deposit");
  const [isCheckingDeposits, setIsCheckingDeposits] = useState(false);
  const [lastCheckResult, setLastCheckResult] = useState<string | null>(null);

  // Deposit configuration
  const depositAddress =
    process.env.NEXT_PUBLIC_DEPOSIT_WALLET_ADDRESS ||
    "0x0000000000000000000000000000000000000000";
  const minConfirmations = 12;
  const isConfigured = depositAddress !== "0x0000000000000000000000000000000000000000";

  // Load linked wallets
  useEffect(() => {
    async function loadWallets() {
      try {
        setIsLoadingWallets(true);
        const response = await authApi.getWallets();
        setLinkedWallets(response.wallets);
      } catch (err) {
        console.error("Failed to load wallets:", err);
      } finally {
        setIsLoadingWallets(false);
      }
    }
    loadWallets();
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(depositAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Check for new deposits from linked wallet
  const handleCheckDeposits = async () => {
    if (linkedWallets.length === 0) {
      toast.error("Please link a wallet first to check for deposits");
      return;
    }

    setIsCheckingDeposits(true);
    setLastCheckResult(null);

    try {
      const result = await api.post<{
        checked: boolean;
        newDeposits: number;
        message: string;
      }>("/deposits/check");

      setLastCheckResult(result.message);

      if (result.newDeposits > 0) {
        toast.success(`Found ${result.newDeposits} new deposit(s)!`);
      } else if (result.checked) {
        toast.info("No new deposits found");
      } else {
        toast.warning(result.message);
      }
    } catch (error: any) {
      const message = error.message || "Failed to check deposits";
      toast.error(message);
      setLastCheckResult(message);
    } finally {
      setIsCheckingDeposits(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="flex-1 relative overflow-hidden">
      {/* Premium Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50 via-gray-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950" />
        <div
          className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Button */}
        <button
          onClick={() => router.push('/wallet')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-medium">Back to Wallet</span>
        </button>

        {/* Header */}
        <PageHeader
          title="Deposit HBCT"
          subtitle="Send HBCT tokens from your external wallet"
        />

        {/* Tabs */}
        <div className="flex gap-2 mt-6">
          <button
            onClick={() => setActiveTab("deposit")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === "deposit"
                ? "bg-brand-500 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            Deposit
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === "history"
                ? "bg-brand-500 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            History
          </button>
        </div>

        <div className="mt-6 space-y-6">
          {activeTab === "deposit" ? (
            <>
              {/* Not Configured Warning */}
              {!isConfigured && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-300">
                      Deposits Not Available
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      The deposit system is not configured yet. Please contact support.
                    </p>
                  </div>
                </div>
              )}

              {/* Main Deposit Card */}
              <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <CurrencyIcon size="lg" />
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          HBCT Deposit
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          BNB Smart Chain (BSC)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        Active
                      </span>
                    </div>
                  </div>

                  {/* QR Code with Logo */}
                  <div className="flex justify-center mb-6">
                    <div className="p-5 bg-white rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
                      {isConfigured ? (
                        <div className="relative w-56 h-56">
                          <QRCodeSVG
                            value={depositAddress}
                            size={224}
                            level="H"
                            includeMargin={false}
                            className="rounded-lg"
                            bgColor="#ffffff"
                            fgColor="#000000"
                          />
                          {/* Logo overlay in center */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-20 h-20 bg-white rounded-2xl p-2 shadow-xl border border-gray-200">
                              <Image
                                src="/images/logo-dark.svg"
                                alt="Logo"
                                width={64}
                                height={64}
                                className="w-full h-full object-contain"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="w-56 h-56 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                          <AlertTriangle className="h-14 w-14 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Scan instruction */}
                  <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Scan QR code or copy address below
                  </p>

                  {/* Address Box */}
                  <div className="relative">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Deposit Address
                        </p>
                        <span className="text-xs text-gray-400 dark:text-gray-500">BSC Network</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <code className="flex-1 text-sm font-mono text-gray-900 dark:text-white break-all select-all">
                          {depositAddress}
                        </code>
                        <button
                          onClick={handleCopy}
                          disabled={!isConfigured}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 text-white font-medium text-sm transition-colors shrink-0"
                        >
                          {copied ? (
                            <>
                              <Check className="h-4 w-4" />
                              <span className="hidden sm:inline">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" />
                              <span className="hidden sm:inline">Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* BSCScan Link */}
                  {isConfigured && (
                    <div className="mt-4 flex justify-center">
                      <a
                        href={`https://bscscan.com/address/${depositAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-brand-500 hover:text-brand-600 transition-colors"
                      >
                        View on BSCScan
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Steps Card */}
              <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                  How to Deposit
                </h4>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-brand-600 dark:text-brand-400">1</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Copy the deposit address</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Click the copy button above or scan the QR code
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-brand-600 dark:text-brand-400">2</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Send HBCT from your wallet</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Use MetaMask, Trust Wallet, or any BSC-compatible wallet
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-brand-600 dark:text-brand-400">3</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Wait for confirmation</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {minConfirmations} block confirmations (~1-2 minutes)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-brand-600 dark:text-brand-400">4</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Click "Check for Deposits"</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Use the button below to check for your deposit
                      </p>
                    </div>
                  </div>
                </div>

                {/* Check for Deposits Button */}
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleCheckDeposits}
                    disabled={isCheckingDeposits || linkedWallets.length === 0}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-semibold text-base transition-all shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40"
                  >
                    {isCheckingDeposits ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Checking Blockchain...
                      </>
                    ) : (
                      <>
                        <Search className="h-5 w-5" />
                        Check for Deposits
                      </>
                    )}
                  </button>
                  {lastCheckResult && (
                    <p className="mt-3 text-center text-sm text-gray-600 dark:text-gray-400">
                      {lastCheckResult}
                    </p>
                  )}
                  {linkedWallets.length === 0 && (
                    <p className="mt-3 text-center text-sm text-amber-600 dark:text-amber-400">
                      Link a wallet first to check for deposits
                    </p>
                  )}
                </div>
              </div>

              {/* Linked Wallets Card */}
              <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-brand-500" />
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      Your Linked Wallets
                    </h4>
                  </div>
                  <button
                    onClick={() => router.push('/settings?tab=wallets')}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Link2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Manage</span>
                  </button>
                </div>

                {isLoadingWallets ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : linkedWallets.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                      Deposits from these wallets will be automatically credited to your account:
                    </p>
                    {linkedWallets.map((wallet) => (
                      <div
                        key={wallet.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
                      >
                        <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center">
                          <Wallet className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                        </div>
                        <div className="flex-1 min-w-0">
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
                          <p className="text-sm text-gray-500 dark:text-gray-400 font-mono truncate">
                            {formatAddress(wallet.walletAddress)}
                          </p>
                        </div>
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center mb-3">
                      <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <p className="font-medium text-gray-900 dark:text-white mb-1">
                      No Wallets Linked
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-sm mx-auto">
                      Link a wallet so deposits are automatically matched to your account
                    </p>
                    <PremiumButton
                      onClick={() => router.push('/settings?tab=wallets')}
                      icon={Link2}
                    >
                      Link Wallet
                    </PremiumButton>
                  </div>
                )}
              </div>

              {/* Warning Card */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    Important
                  </p>
                  <ul className="mt-2 text-sm text-amber-700 dark:text-amber-400/80 space-y-1">
                    <li>• Only send <strong>HBCT tokens</strong> to this address</li>
                    <li>• Only use <strong>BNB Smart Chain (BSC)</strong> network</li>
                    <li>• Sending other tokens may result in <strong>permanent loss</strong></li>
                  </ul>
                </div>
              </div>
            </>
          ) : (
            /* History Tab */
            <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6">
              <DepositHistory limit={10} showPagination />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
