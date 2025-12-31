"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRequireAuth } from "@/hooks/useAuth";
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
import { useAccount, useBalance, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, usePublicClient, useSendTransaction, useWalletClient } from "wagmi";
import { parseEther, parseUnits } from "viem";
import { TransactionResultModal, TransactionResultData } from "@/components/ui/transaction-result-modal";
import { bscTestnet } from "wagmi/chains";

// BSC Testnet token addresses (these are test tokens - you may need to deploy your own or use faucet tokens)
const BSC_USDT_ADDRESS = "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd" as `0x${string}`; // Testnet USDT
const BSC_USDC_ADDRESS = "0x64544969ed7EBf5f083679233325356EbE738930" as `0x${string}`; // Testnet USDC

// For production, use these mainnet addresses:
// const BSC_USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955" as `0x${string}`;
// const BSC_USDC_ADDRESS = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d" as `0x${string}`;

// Deposit wallet address from env
const DEPOSIT_WALLET_ADDRESS = (process.env.NEXT_PUBLIC_DEPOSIT_WALLET_ADDRESS || "") as `0x${string}`;

// ERC-20 ABI for transfer function
const ERC20_ABI = [
  {
    name: "transfer",
    type: "function",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

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
  const { data: walletsData } = useLinkedWalletsForPurchase();

  // Get connected wallet address, chain, and connector for on-chain balance queries
  const { address: connectedAddress, chainId, connector } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  // Get public client for reading blockchain data (doesn't require wallet)
  const publicClient = usePublicClient();

  // Use wagmi's sendTransaction hook - best practice for WalletConnect compatibility
  const { sendTransactionAsync } = useSendTransaction();

  // Get wallet client for additional verification
  const { data: walletClient, isError: walletClientError } = useWalletClient();

  // Check if on BSC Testnet
  const isOnBsc = chainId === bscTestnet.id;

  // Check if connected via WalletConnect (includes AppKit WalletConnect)
  const isWalletConnect = connector?.id === 'walletConnect' ||
    connector?.id?.includes('walletConnect') ||
    connector?.name?.toLowerCase().includes('walletconnect') ||
    connector?.type === 'walletConnect';

  // Check if connected via Safe wallet
  const isSafeWallet = connector?.id === 'safe' || connector?.name?.toLowerCase().includes('safe');

  // On-chain balance hooks for connected wallet
  const { data: bnbBalance, isLoading: bnbLoading } = useBalance({
    address: connectedAddress,
  });

  const { data: usdtBalance, isLoading: usdtLoading } = useBalance({
    address: connectedAddress,
    token: BSC_USDT_ADDRESS,
  });

  const { data: usdcBalance, isLoading: usdcLoading } = useBalance({
    address: connectedAddress,
    token: BSC_USDC_ADDRESS,
  });

  const balancesLoading = bnbLoading || usdtLoading || usdcLoading;

  // Web3 transaction hooks
  const { writeContractAsync } = useWriteContract();
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}` | undefined>();
  const [txState, setTxState] = useState<'idle' | 'sending' | 'confirming' | 'processing' | 'success'>('idle');

  // Transaction result modal state (for both success and failure)
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultData, setResultData] = useState<TransactionResultData | null>(null);

  // Wait for transaction confirmation (used for UI feedback)
  // BSC has ~3 second block times, 3 confirmations = ~9 seconds
  useWaitForTransactionReceipt({
    hash: pendingTxHash,
    confirmations: 3,
  });

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

  // Get on-chain wallet balance for selected currency
  const getBalance = (currency: string): string => {
    switch (currency) {
      case "BNB":
        return bnbBalance ? parseFloat(bnbBalance.formatted).toFixed(4) : "0.0000";
      case "USDT":
        return usdtBalance ? parseFloat(usdtBalance.formatted).toFixed(4) : "0.0000";
      case "USDC":
        return usdcBalance ? parseFloat(usdcBalance.formatted).toFixed(4) : "0.0000";
      default:
        return "0.0000";
    }
  };

  // Get numeric balance for validation
  const getNumericBalance = (currency: string): number => {
    switch (currency) {
      case "BNB":
        return bnbBalance ? parseFloat(bnbBalance.formatted) : 0;
      case "USDT":
        return usdtBalance ? parseFloat(usdtBalance.formatted) : 0;
      case "USDC":
        return usdcBalance ? parseFloat(usdcBalance.formatted) : 0;
      default:
        return 0;
    }
  };

  // Check balance validity
  const currentBalance = getNumericBalance(paymentCurrency);
  const enteredAmount = parseFloat(paymentAmount) || 0;
  const hasNoBalance = currentBalance <= 0;
  const exceedsBalance = enteredAmount > currentBalance;
  const isBalanceInvalid = hasNoBalance || exceedsBalance;

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

  // Handle purchase with Web3 payment
  const handlePurchase = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error("Please enter an amount");
      return;
    }

    if (!connectedAddress) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!DEPOSIT_WALLET_ADDRESS) {
      toast.error("Deposit wallet not configured");
      return;
    }

    // Verify connector is ready
    if (!connector) {
      toast.error("Wallet not properly connected. Please reconnect.");
      return;
    }

    // Safe wallets are not supported for direct purchases (require multisig)
    if (isSafeWallet) {
      toast.error("Safe (multisig) wallets are not supported for token purchases. Please use a regular wallet.");
      return;
    }

    // Check if wallet client is available (important for WalletConnect)
    if (!walletClient && isWalletConnect) {
      toast.error("Wallet connection not ready. Please wait a moment or reconnect your wallet.", {
        description: "Make sure your wallet app is open and connected.",
      });
      return;
    }

    if (walletClientError) {
      toast.error("Unable to connect to your wallet. Please try reconnecting.");
      return;
    }

    // Ensure user is on BSC network
    if (!isOnBsc) {
      try {
        toast.info("Switching to BSC Testnet...");
        await switchChainAsync({ chainId: bscTestnet.id });
        // Wait a moment for the chain switch to complete
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (switchError) {
        if (switchError instanceof Error) {
          if (switchError.message.includes("rejected") || switchError.message.includes("denied")) {
            toast.error("Please switch to BSC network to continue");
          } else {
            toast.error("Failed to switch network. Please manually switch to BSC.");
          }
        }
        return;
      }
    }

    // Validate limits - convert payment amount to USD
    if (limitsData && priceData) {
      let amountUsd = parseFloat(paymentAmount);
      if (paymentCurrency === "BNB") {
        amountUsd = amountUsd * parseFloat(priceData.bnbPriceUsd);
      }

      if (amountUsd > parseFloat(limitsData.maxPurchaseUsd)) {
        toast.error(`Maximum purchase per transaction is $${limitsData.maxPurchaseUsd}`);
        return;
      }
    }

    try {
      let txHash: `0x${string}`;

      // Step 1: Send Web3 transaction based on currency
      console.log("=== Transaction Debug ===");
      console.log("Sending transaction from:", connectedAddress);
      console.log("Connected via:", connector?.name, "(id:", connector?.id, ", type:", connector?.type, ")");
      console.log("Current Chain ID:", chainId);
      console.log("Target chain (BSC Testnet):", bscTestnet.id);
      console.log("Is WalletConnect:", isWalletConnect);
      console.log("Is Safe Wallet:", isSafeWallet);
      console.log("Wallet client ready:", !!walletClient);
      console.log("Wallet client chain:", walletClient?.chain?.id);
      console.log("Deposit wallet:", DEPOSIT_WALLET_ADDRESS);
      console.log("Amount:", paymentAmount, paymentCurrency);
      console.log("=========================");

      if (isWalletConnect) {
        toast.info("Check your wallet app for the transaction request...");
      } else {
        toast.info(`Please confirm the transaction in ${connector?.name || 'your wallet'}...`);
      }

      // Set sending state
      setTxState('sending');

      if (paymentCurrency === "BNB") {
        // Send native BNB
        txHash = await sendTransactionAsync({
          to: DEPOSIT_WALLET_ADDRESS,
          value: parseEther(paymentAmount),
          chainId: bscTestnet.id,
        });
      } else {
        // Send ERC-20 token (USDT/USDC)
        const tokenAddress = paymentCurrency === "USDT" ? BSC_USDT_ADDRESS : BSC_USDC_ADDRESS;
        // USDT and USDC on BSC have 18 decimals
        const amount = parseUnits(paymentAmount, 18);

        txHash = await writeContractAsync({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: "transfer",
          args: [DEPOSIT_WALLET_ADDRESS, amount],
          chainId: bscTestnet.id,
        });
      }

      // Transaction sent - now waiting for confirmations
      setTxState('confirming');
      setPendingTxHash(txHash);

      const tokensReceived = tokensToReceive;
      const amountPaid = paymentAmount;

      toast.success(`Transaction sent!`, {
        description: "Waiting for blockchain confirmations...",
      });

      // Step 2: Wait for 3 confirmations using public client (doesn't require wallet methods)
      // BSC has ~3 second block times, 3 confirmations = ~9 seconds
      if (publicClient) {
        try {
          await publicClient.waitForTransactionReceipt({
            hash: txHash,
            confirmations: 3,
            timeout: 60_000, // 1 minute
          });
        } catch (waitError) {
          console.log("Confirmation wait completed or timed out:", waitError);
          // Continue anyway - transaction was sent
        }
      } else {
        // Fallback: just wait 15 seconds
        await new Promise((resolve) => setTimeout(resolve, 15000));
      }

      // Step 3: Call backend to record the purchase
      setTxState('processing');

      if (deliveryMethod === "OFF_CHAIN") {
        await purchaseOffChain.mutateAsync({
          paymentCurrency,
          paymentAmount: amountPaid,
          txHash,
        });
      } else {
        if (!selectedWalletId) {
          toast.error("Please select a destination wallet");
          setTxState('idle');
          return;
        }
        await purchaseOnChain.mutateAsync({
          paymentCurrency,
          paymentAmount: amountPaid,
          destinationWalletId: selectedWalletId,
          txHash,
        });
      }

      // Success! Show premium modal
      setTxState('success');
      setResultData({
        status: 'success',
        title: 'Purchase Successful!',
        message: deliveryMethod === 'OFF_CHAIN'
          ? 'Your HBCT tokens have been added to your balance'
          : 'Your HBCT tokens have been sent to your wallet',
        txHash,
        amount: `${amountPaid} ${paymentCurrency}`,
        tokens: tokensReceived,
        tokenSymbol: 'HBCT',
        deliveryMethod,
      });
      setShowResultModal(true);

      // Reset form
      setPaymentAmount("");
      setPendingTxHash(undefined);

      // Reset state after delay
      setTimeout(() => {
        setTxState('idle');
      }, 500);

    } catch (error: unknown) {
      setPendingTxHash(undefined);
      setTxState('idle');
      console.error("Transaction error:", error);
      console.error("Error details:", {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        isWalletConnect,
        connector: connector?.id,
        connectorName: connector?.name,
        chainId,
      });

      // Prepare error data for modal
      let errorTitle = "Transaction Failed";
      let errorMessage = "Something went wrong with your transaction";
      let errorCode = "";
      let errorDetails = "";
      let suggestion = "";

      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();

        if (errorMsg.includes("rejected") || errorMsg.includes("denied") || errorMsg.includes("user rejected") || errorMsg.includes("user disapproved") || errorMsg.includes("cancelled")) {
          errorTitle = "Transaction Cancelled";
          errorMessage = "You cancelled the transaction";
          errorCode = "USER_REJECTED";
          errorDetails = "The transaction was not completed because it was cancelled in your wallet.";
          suggestion = "You can try again when you're ready to proceed.";
        } else if (errorMsg.includes("unknown method") || errorMsg.includes("unsupported method") || errorMsg.includes("method not found") || errorMsg.includes("not supported") || errorMsg.includes("unknown rpc")) {
          errorTitle = "Wallet Incompatibility";
          errorCode = "UNSUPPORTED_METHOD";
          if (isWalletConnect) {
            errorMessage = "Your wallet doesn't support BSC transactions via WalletConnect";
            errorDetails = "Some mobile wallets have limited support for BSC network transactions when connected via WalletConnect.";
            suggestion = "Please use MetaMask or Coinbase Wallet browser extension, or try Trust Wallet mobile app for better compatibility.";
          } else {
            errorMessage = "Your wallet doesn't support this transaction type";
            errorDetails = "The connected wallet may not fully support all required transaction methods.";
            suggestion = "Try using MetaMask or Coinbase Wallet browser extension instead.";
          }
        } else if (errorMsg.includes("insufficient funds") || errorMsg.includes("insufficient balance")) {
          errorTitle = "Insufficient Balance";
          errorCode = "INSUFFICIENT_FUNDS";
          errorMessage = "You don't have enough balance for this transaction";
          errorDetails = `Your ${paymentCurrency} balance is not sufficient to cover the transaction amount plus network fees.`;
          suggestion = "Please add more funds to your wallet or reduce the transaction amount.";
        } else if (errorMsg.includes("network") || errorMsg.includes("chain") || errorMsg.includes("wrong network")) {
          errorTitle = "Network Error";
          errorCode = "NETWORK_MISMATCH";
          errorMessage = "Please connect to the correct network";
          errorDetails = "Your wallet may be connected to a different blockchain network than required.";
          suggestion = "Switch to BNB Smart Chain (BSC) network in your wallet and try again.";
        } else if (errorMsg.includes("timeout") || errorMsg.includes("timed out")) {
          errorTitle = "Transaction Timeout";
          errorCode = "TIMEOUT";
          errorMessage = "The transaction took too long to process";
          errorDetails = "The blockchain network may be congested or your wallet connection was interrupted.";
          suggestion = "Please check your wallet for any pending transactions and try again.";
        } else if (errorMsg.includes("session") || errorMsg.includes("disconnected") || errorMsg.includes("no active session")) {
          errorTitle = "Connection Lost";
          errorCode = "SESSION_EXPIRED";
          errorMessage = "Your wallet connection was lost";
          errorDetails = "The connection between your wallet and the app has been interrupted.";
          suggestion = "Please reconnect your wallet and try again.";
        } else if (errorMsg.includes("pending") || errorMsg.includes("already processing")) {
          errorTitle = "Transaction Pending";
          errorCode = "TX_PENDING";
          errorMessage = "A transaction is already in progress";
          errorDetails = "You have another transaction that hasn't been confirmed yet.";
          suggestion = "Please wait for the pending transaction to complete or check your wallet app.";
        } else {
          errorCode = "UNKNOWN_ERROR";
          errorDetails = error.message.length > 150
            ? error.message.substring(0, 150) + "..."
            : error.message;
          suggestion = "Please try again. If the problem persists, contact support.";
        }
      } else {
        errorCode = "UNKNOWN_ERROR";
        suggestion = "Please try again. If the problem persists, contact support.";
      }

      // Show premium failure modal
      setResultData({
        status: 'failed',
        title: errorTitle,
        message: errorMessage,
        errorCode,
        errorDetails,
        suggestion,
      });
      setShowResultModal(true);
    }
  };

  const isPurchasing = txState !== 'idle' && txState !== 'success';

  // Get button text based on current state
  const getButtonText = () => {
    switch (txState) {
      case 'sending':
        return 'Confirm in Wallet...';
      case 'confirming':
        return 'Confirming on Chain...';
      case 'processing':
        return 'Processing Purchase...';
      case 'success':
        return 'Purchase Complete!';
      default:
        if (hasNoBalance) return `No ${paymentCurrency} Balance`;
        if (exceedsBalance) return 'Insufficient Balance';
        return deliveryMethod === 'OFF_CHAIN' ? 'Buy & Add to Balance' : 'Buy & Send to Wallet';
    }
  };
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
        <PageHeader title={t("title")} subtitle="Buy HBCT tokens using your connected Web3 wallet" />

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

        {/* Wrong Network Warning */}
        {isWalletConnected && !isOnBsc && (
          <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent border border-red-500/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white">Wrong Network</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Please switch to BSC Testnet to buy HBCT tokens</p>
              </div>
              <button
                onClick={async () => {
                  try {
                    await switchChainAsync({ chainId: bscTestnet.id });
                  } catch {
                    toast.error("Failed to switch network");
                  }
                }}
                className="px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
              >
                Switch to Testnet
              </button>
            </div>
          </div>
        )}

        {/* WalletConnect Limitation Warning */}
        {isWalletConnected && isWalletConnect && (
          <div className="mb-8 p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  WalletConnect May Have Limited Support
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Some mobile wallets don&apos;t support transactions on BSC via WalletConnect.
                  If you see &quot;Unknown method&quot; errors, please use one of these options:
                </p>
                <ul className="text-xs text-gray-600 dark:text-gray-400 list-disc list-inside mt-1 space-y-0.5">
                  <li><strong>MetaMask</strong> or <strong>Coinbase Wallet</strong> browser extension (recommended)</li>
                  <li><strong>Trust Wallet</strong> mobile app (best WalletConnect + BSC support)</li>
                  <li><strong>MetaMask Mobile</strong> app</li>
                </ul>
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
                <div className={cn(
                  "relative p-5 rounded-2xl border",
                  exceedsBalance
                    ? "bg-red-50 dark:bg-red-900/10 border-red-300 dark:border-red-500/30"
                    : hasNoBalance
                      ? "bg-amber-50 dark:bg-amber-900/10 border-amber-300 dark:border-amber-500/30"
                      : "bg-gray-50 dark:bg-gray-800/80 border-gray-100 dark:border-gray-700/50"
                )}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">You Pay</span>
                    <span className={cn(
                      "text-xs",
                      exceedsBalance ? "text-red-500 font-medium" : hasNoBalance ? "text-amber-500 font-medium" : "text-gray-400"
                    )}>
                      Balance: {getBalance(paymentCurrency)} {paymentCurrency}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      placeholder="0"
                      value={paymentAmount}
                      min="0"
                      onChange={(e) => {
                        const value = e.target.value;
                        // Only allow positive numbers
                        if (value === '' || parseFloat(value) >= 0) {
                          setPaymentAmount(value.replace('-', ''));
                        }
                      }}
                      onKeyDown={(e) => {
                        // Prevent typing minus sign
                        if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                          e.preventDefault();
                        }
                      }}
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

                {/* Error messages */}
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
                  disabled={
                    !paymentAmount ||
                    parseFloat(paymentAmount) <= 0 ||
                    isPurchasing ||
                    isBalanceInvalid ||
                    txState === 'success' ||
                    (deliveryMethod === "ON_CHAIN" && !selectedWalletId)
                  }
                  isLoading={isPurchasing}
                  loadingText={getButtonText()}
                  icon={txState === 'success' ? Check : deliveryMethod === "OFF_CHAIN" ? Wallet : ExternalLink}
                  size="lg"
                  fullWidth
                  className={txState === 'success' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
                >
                  {getButtonText()}
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
                      Up to ${limitsData.maxPurchaseUsd}
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
                <span className="text-xs text-gray-400">From Connected Wallet</span>
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

      {/* Premium Transaction Result Modal (Success & Failure) */}
      <TransactionResultModal
        open={showResultModal}
        onOpenChange={setShowResultModal}
        data={resultData}
        onRetry={handlePurchase}
        onViewBalance={() => router.push(`/${locale}/wallet`)}
        onViewHistory={() => router.push(`/${locale}/wallet/transactions`)}
        explorerBaseUrl="https://testnet.bscscan.com"
      />
    </div>
  );
}
