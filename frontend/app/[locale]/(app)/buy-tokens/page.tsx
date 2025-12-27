"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRequireAuth } from "@/hooks/useAuth";
import { useWalletBalances } from "@/hooks/useWalletData";
import {
  usePurchasePrice,
  usePurchaseLimits,
  usePurchaseQuote,
  useLinkedWalletsForPurchase,
  usePurchaseOffChain,
  usePurchaseOnChain,
} from "@/hooks/usePurchase";
import { cn } from "@/lib/utils";
import {
  Coins,
  ArrowDown,
  TrendingUp,
  Wallet,
  ExternalLink,
  AlertCircle,
  Check,
  ChevronDown,
  Shield,
  Zap,
  Info,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { BuyTokensSkeleton } from "@/components/skeletons/page-skeletons";
import { usePageLoading } from "@/hooks/useMinimumLoading";
import { PageHeader } from "@/components/ui/page-header";
import { PremiumButton } from "@/components/ui/premium-button";
import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";

type DeliveryMethod = "OFF_CHAIN" | "ON_CHAIN";
type PaymentCurrency = "BNB" | "USDT" | "USDC";

export default function BuyTokensPage() {
  const t = useTranslations("tokenSales");
  const locale = useLocale();
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated } = useRequireAuth(`/${locale}/login`);
  const { isConnected: isWalletConnected } = useWallet();

  // State
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentCurrency, setPaymentCurrency] = useState<PaymentCurrency>("USDT");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("OFF_CHAIN");
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);

  // Data hooks
  const { data: priceData, isLoading: priceLoading } = usePurchasePrice();
  const { data: limitsData } = usePurchaseLimits();
  const { data: balancesData, isLoading: balancesLoading } = useWalletBalances();
  const { data: walletsData } = useLinkedWalletsForPurchase();

  // Quote hook (debounced)
  const quoteParams = useMemo(() => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) return null;
    return {
      paymentCurrency,
      paymentAmount,
      deliveryMethod,
    };
  }, [paymentAmount, paymentCurrency, deliveryMethod]);

  const { data: quoteData, isLoading: quoteLoading, error: quoteError } = usePurchaseQuote(quoteParams);

  // Purchase mutations
  const purchaseOffChain = usePurchaseOffChain();
  const purchaseOnChain = usePurchaseOnChain();

  // Loading state
  const { isLoading: isMinLoading, stopLoading } = usePageLoading();
  const isDataLoading = priceLoading || balancesLoading;

  useEffect(() => {
    if (!isDataLoading) {
      stopLoading();
    }
  }, [isDataLoading, stopLoading]);

  // Auto-select primary wallet for on-chain
  useEffect(() => {
    if (walletsData?.wallets && !selectedWalletId) {
      const primary = walletsData.wallets.find((w) => w.isPrimary);
      if (primary) setSelectedWalletId(primary.id);
      else if (walletsData.wallets.length > 0) setSelectedWalletId(walletsData.wallets[0].id);
    }
  }, [walletsData, selectedWalletId]);

  // Token price
  const tokenPrice = priceData?.hbctPriceUsd ? parseFloat(priceData.hbctPriceUsd) : 0.03;

  // Currency configurations
  const currencies = [
    { symbol: "BNB" as PaymentCurrency, name: "Binance Coin", color: "bg-yellow-500", icon: "B" },
    { symbol: "USDT" as PaymentCurrency, name: "Tether USD", color: "bg-emerald-500", icon: "₮" },
    { symbol: "USDC" as PaymentCurrency, name: "USD Coin", color: "bg-blue-500", icon: "$" },
  ];

  const selectedCurrency = currencies.find((c) => c.symbol === paymentCurrency) || currencies[0];

  // Get wallet balance for selected currency
  const getBalance = (currency: string): string => {
    if (!balancesData?.balances) return "0.00";
    const balance = balancesData.balances.find((b) => b.currency === currency);
    return balance ? parseFloat(balance.availableBalance).toFixed(4) : "0.00";
  };

  // Get selected wallet
  const selectedWallet = walletsData?.wallets?.find((w) => w.id === selectedWalletId);

  // Calculate tokens to receive
  const tokensToReceive = quoteData?.hbctAmount
    ? parseFloat(quoteData.hbctAmount).toFixed(4)
    : paymentAmount
      ? (parseFloat(paymentAmount) / tokenPrice).toFixed(4)
      : "0.00";

  // Handle quick amount buttons
  const handleQuickAmount = (percent: number) => {
    const balance = parseFloat(getBalance(paymentCurrency));
    if (balance > 0) {
      const amount = (balance * percent / 100).toFixed(6);
      setPaymentAmount(amount);
    }
  };

  // Handle purchase
  const handlePurchase = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error("Please enter an amount");
      return;
    }

    // Validate limits - convert payment amount to USD
    if (limitsData && priceData) {
      let amountUsd = parseFloat(paymentAmount);
      // Convert BNB to USD using live price
      if (paymentCurrency === "BNB") {
        amountUsd = amountUsd * parseFloat(priceData.bnbPriceUsd);
      }
      // USDT and USDC are 1:1 with USD

      if (amountUsd < parseFloat(limitsData.minPurchaseUsd)) {
        toast.error(`Minimum purchase is $${limitsData.minPurchaseUsd}`);
        return;
      }
      if (amountUsd > parseFloat(limitsData.maxPurchaseUsd)) {
        toast.error(`Maximum purchase per transaction is $${limitsData.maxPurchaseUsd}`);
        return;
      }
    }

    try {
      if (deliveryMethod === "OFF_CHAIN") {
        await purchaseOffChain.mutateAsync({
          paymentCurrency,
          paymentAmount,
        });
        toast.success("Purchase successful! HBCT added to your wallet.");
      } else {
        if (!selectedWalletId) {
          toast.error("Please select a destination wallet");
          return;
        }
        const result = await purchaseOnChain.mutateAsync({
          paymentCurrency,
          paymentAmount,
          destinationWalletId: selectedWalletId,
        });
        toast.success(`Purchase successful! HBCT sent to your wallet. TX: ${result.txHash?.slice(0, 10)}...`);
      }
      setPaymentAmount("");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Purchase failed";
      toast.error(message);
    }
  };

  const isPurchasing = purchaseOffChain.isPending || purchaseOnChain.isPending;
  const showSkeleton = authLoading || !isAuthenticated || isDataLoading || isMinLoading;

  if (showSkeleton) {
    return (
      <div className="flex-1 relative overflow-x-hidden">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-gray-50 via-gray-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950" />
        </div>
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <BuyTokensSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative overflow-x-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50 via-gray-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950" />
        <div
          className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <PageHeader title={t("title")} subtitle="Buy HBCT tokens using your wallet balance" />

        {/* Connect Wallet Prompt */}
        {!isWalletConnected && (
          <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Wallet Not Connected</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Please connect your Web3 wallet to buy HBCT tokens</p>
              </div>
            </div>
          </div>
        )}

        <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-6", !isWalletConnected && "opacity-50 pointer-events-none")}>
          {/* Left Side - Buy Form */}
          <div className="space-y-6">
            {/* Delivery Method Toggle */}
            <div className="p-1 rounded-xl bg-gray-100 dark:bg-gray-800 inline-flex">
              <button
                onClick={() => setDeliveryMethod("OFF_CHAIN")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all",
                  deliveryMethod === "OFF_CHAIN"
                    ? "bg-white dark:bg-gray-900 text-brand-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                )}
              >
                <Wallet className="h-4 w-4" />
                Internal Balance
              </button>
              <button
                onClick={() => setDeliveryMethod("ON_CHAIN")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all",
                  deliveryMethod === "ON_CHAIN"
                    ? "bg-white dark:bg-gray-900 text-brand-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                )}
              >
                <ExternalLink className="h-4 w-4" />
                Send to Wallet
              </button>
            </div>

            {/* Buy Form Card */}
            <div className="relative rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Buy HBCT</h2>
              </div>

              <div className="p-6 space-y-4">
                {/* You Pay Section */}
                <div className="relative p-5 rounded-2xl bg-gray-50 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">You Pay</span>
                    <span className="text-xs text-gray-400">
                      Balance: {getBalance(paymentCurrency)} {paymentCurrency}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      placeholder="0"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="flex-1 bg-transparent text-3xl font-semibold text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 outline-none w-full min-w-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    {/* Currency Selector */}
                    <div className="shrink-0 relative">
                      <button
                        onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all shadow-sm"
                      >
                        <div className={cn("w-7 h-7 rounded-full flex items-center justify-center", selectedCurrency.color)}>
                          <span className="text-white text-xs font-bold">{selectedCurrency.icon}</span>
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white">{selectedCurrency.symbol}</span>
                        <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", showCurrencyDropdown && "rotate-180")} />
                      </button>

                      {showCurrencyDropdown && (
                        <div className="absolute top-full right-0 mt-2 w-48 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl z-20">
                          {currencies.map((currency) => (
                            <button
                              key={currency.symbol}
                              onClick={() => {
                                setPaymentCurrency(currency.symbol);
                                setShowCurrencyDropdown(false);
                              }}
                              className={cn(
                                "w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors",
                                paymentCurrency === currency.symbol && "bg-gray-50 dark:bg-gray-700"
                              )}
                            >
                              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", currency.color)}>
                                <span className="text-white text-xs font-bold">{currency.icon}</span>
                              </div>
                              <div className="text-left flex-1">
                                <p className="font-semibold text-gray-900 dark:text-white">{currency.symbol}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{getBalance(currency.symbol)}</p>
                              </div>
                              {paymentCurrency === currency.symbol && <Check className="w-4 h-4 text-emerald-500" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Quick amount buttons */}
                  <div className="flex items-center gap-2 mt-4">
                    {[25, 50, 75, 100].map((percent) => (
                      <button
                        key={percent}
                        onClick={() => handleQuickAmount(percent)}
                        className="px-3 py-1 text-xs font-medium rounded-lg bg-gray-200/60 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-brand-500/20 hover:text-brand-500 transition-colors"
                      >
                        {percent === 100 ? "MAX" : `${percent}%`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Swap Arrow */}
                <div className="relative flex justify-center py-1 z-10">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border-4 border-gray-50 dark:border-gray-900 shadow-md">
                    <ArrowDown className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                  </div>
                </div>

                {/* You Receive Section */}
                <div className="relative p-5 rounded-2xl bg-gradient-to-br from-brand-500/5 via-brand-500/5 to-brand-600/10 dark:from-brand-500/10 dark:via-brand-500/5 dark:to-brand-600/15 border border-brand-500/20">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">You Receive</span>
                    {quoteLoading && <Loader2 className="h-4 w-4 animate-spin text-brand-500" />}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="flex-1 text-3xl font-semibold text-gray-900 dark:text-white">
                      {tokensToReceive}
                    </span>
                    <div className="shrink-0">
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-white dark:bg-gray-800 border border-brand-500/30 shadow-sm">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center p-1.5 shadow-lg shadow-brand-500/30">
                          <Image src="/images/logo-white.svg" alt="HBCT" width={20} height={20} className="w-full h-full object-contain" />
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white">HBCT</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>1 HBCT = ${tokenPrice.toFixed(4)}</span>
                    <span className="text-gray-300 dark:text-gray-600">•</span>
                    <span className="text-emerald-500 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> Low slippage
                    </span>
                  </div>
                </div>

                {/* Wallet Selector (On-Chain only) */}
                {deliveryMethod === "ON_CHAIN" && (
                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Destination Wallet</span>
                    </div>
                    {walletsData?.wallets && walletsData.wallets.length > 0 ? (
                      <div className="relative">
                        <button
                          onClick={() => setShowWalletDropdown(!showWalletDropdown)}
                          className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:border-brand-500 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand-500/10 flex items-center justify-center">
                              <Wallet className="h-4 w-4 text-brand-500" />
                            </div>
                            <div className="text-left">
                              <p className="font-medium text-gray-900 dark:text-white text-sm">
                                {selectedWallet?.label || "Wallet"}
                              </p>
                              <p className="text-xs text-gray-500 font-mono">
                                {selectedWallet?.walletAddress.slice(0, 6)}...{selectedWallet?.walletAddress.slice(-4)}
                              </p>
                            </div>
                          </div>
                          <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", showWalletDropdown && "rotate-180")} />
                        </button>

                        {/* Inline expanded wallet list instead of dropdown */}
                        {showWalletDropdown && (
                          <div className="mt-2 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
                            {walletsData.wallets.map((wallet) => (
                              <button
                                key={wallet.id}
                                onClick={() => {
                                  setSelectedWalletId(wallet.id);
                                  setShowWalletDropdown(false);
                                }}
                                className={cn(
                                  "w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors",
                                  selectedWalletId === wallet.id && "bg-gray-50 dark:bg-gray-700"
                                )}
                              >
                                <div className="w-8 h-8 rounded-full bg-brand-500/10 flex items-center justify-center">
                                  <Wallet className="h-4 w-4 text-brand-500" />
                                </div>
                                <div className="text-left flex-1">
                                  <p className="font-medium text-gray-900 dark:text-white text-sm">
                                    {wallet.label || "Wallet"} {wallet.isPrimary && <span className="text-brand-500">(Primary)</span>}
                                  </p>
                                  <p className="text-xs text-gray-500 font-mono">
                                    {wallet.walletAddress.slice(0, 10)}...{wallet.walletAddress.slice(-6)}
                                  </p>
                                </div>
                                {selectedWalletId === wallet.id && <Check className="w-4 h-4 text-emerald-500" />}
                              </button>
                            ))}
                            {/* Link new wallet option */}
                            <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2">
                              <button
                                onClick={() => {
                                  setShowWalletDropdown(false);
                                  router.push(`/${locale}/settings?tab=wallets`);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-brand-500"
                              >
                                <div className="w-8 h-8 rounded-full bg-brand-500/10 flex items-center justify-center">
                                  <ExternalLink className="h-4 w-4 text-brand-500" />
                                </div>
                                <span className="font-medium text-sm">Link New Wallet</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">No linked wallets</p>
                          <p className="text-xs text-amber-500/80">Link a wallet in settings to use on-chain delivery</p>
                        </div>
                        <button
                          onClick={() => router.push(`/${locale}/settings?tab=wallets`)}
                          className="text-xs font-medium text-brand-500 hover:text-brand-600"
                        >
                          Link Wallet →
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Quote Details */}
                {quoteData && paymentAmount && (
                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Token Amount</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {quoteData.paymentAmount} {paymentCurrency}
                      </span>
                    </div>
                    {parseFloat(quoteData.platformFee) > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Platform Fee</span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {quoteData.platformFee} {paymentCurrency}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Network Fee</span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {quoteData.networkFee} {paymentCurrency}
                      </span>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 dark:text-gray-300 font-medium">Total Cost</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {quoteData.totalCost} {paymentCurrency}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error message */}
                {quoteError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {(quoteError as Error).message || "Failed to get quote"}
                    </p>
                  </div>
                )}

                {/* Buy Button */}
                <PremiumButton
                  onClick={handlePurchase}
                  disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || isPurchasing || (deliveryMethod === "ON_CHAIN" && !selectedWalletId)}
                  isLoading={isPurchasing}
                  loadingText="Processing..."
                  icon={deliveryMethod === "OFF_CHAIN" ? Wallet : ExternalLink}
                  size="lg"
                  fullWidth
                >
                  {deliveryMethod === "OFF_CHAIN" ? "Buy & Add to Balance" : "Buy & Send to Wallet"}
                </PremiumButton>
              </div>
            </div>
          </div>

          {/* Right Side - Info */}
          <div className="space-y-6">
            {/* Delivery Info */}
            <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                {deliveryMethod === "OFF_CHAIN" ? "Internal Balance" : "External Wallet"}
              </h3>
              <div className="space-y-4">
                {deliveryMethod === "OFF_CHAIN" ? (
                  <>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <Zap className="h-4 w-4 text-emerald-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">Instant</p>
                        <p className="text-xs text-gray-500">Tokens added immediately</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0">
                        <Shield className="h-4 w-4 text-brand-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">Secure Storage</p>
                        <p className="text-xs text-gray-500">Stored in platform wallet</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                        <Wallet className="h-4 w-4 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">Easy Transfers</p>
                        <p className="text-xs text-gray-500">Send to other users instantly</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0">
                        <ExternalLink className="h-4 w-4 text-brand-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">On-Chain</p>
                        <p className="text-xs text-gray-500">Tokens sent to your wallet</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <Shield className="h-4 w-4 text-emerald-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">Full Control</p>
                        <p className="text-xs text-gray-500">Your keys, your tokens</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                        <Info className="h-4 w-4 text-amber-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">Network Fee</p>
                        <p className="text-xs text-gray-500">Small fee for blockchain tx</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Price Card */}
            <div className="group relative p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="absolute right-2 top-1/2 -translate-y-1/2 w-20 h-20 opacity-80 dark:opacity-90">
                <Image src="/images/token/token3.png" alt="HBCT" width={80} height={80} className="object-contain" />
              </div>
              <div className="relative z-10">
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Current Price</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">${tokenPrice.toFixed(4)}</span>
                  <span className="text-gray-500 dark:text-gray-400">/ HBCT</span>
                </div>
              </div>
            </div>

            {/* Limits Card */}
            {limitsData && (
              <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Your Limits</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Per Transaction</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      ${limitsData.minPurchaseUsd} - ${limitsData.maxPurchaseUsd}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Daily Remaining</span>
                    <span className="font-medium text-gray-900 dark:text-white">${limitsData.dailyRemainingUsd}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Monthly Remaining</span>
                    <span className="font-medium text-gray-900 dark:text-white">${limitsData.monthlyRemainingUsd}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Methods */}
            <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pay With</h3>
                <span className="text-xs text-gray-400">From Wallet Balance</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {currencies.map((currency) => (
                  <button
                    key={currency.symbol}
                    onClick={() => setPaymentCurrency(currency.symbol)}
                    className={cn(
                      "group relative flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-300 border-2",
                      paymentCurrency === currency.symbol
                        ? "bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/50 border-brand-500"
                        : "bg-gray-50 dark:bg-gray-800/50 border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                    )}
                  >
                    {paymentCurrency === currency.symbol && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center shadow-lg">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", currency.color)}>
                      <span className="text-white font-bold">{currency.icon}</span>
                    </div>
                    <div className="text-center">
                      <p className={cn("font-bold text-sm", paymentCurrency === currency.symbol ? "text-brand-500" : "text-gray-900 dark:text-white")}>
                        {currency.symbol}
                      </p>
                      <p className="text-[10px] text-gray-400">{getBalance(currency.symbol)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
