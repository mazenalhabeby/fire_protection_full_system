"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Wallet,
  Plus,
  Copy,
  Check,
  Trash2,
  Star,
  StarOff,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Shield,
  Edit3,
  X,
  Clock,
  Link2,
  AlertTriangle,
  Unlink,
} from "lucide-react";
import { useWallet, useCorrectChain } from "@/hooks/useWallet";
import { WalletConnectModal } from "@/components/wallet/WalletConnectModal";
import { authApi, LinkedWallet } from "@/lib/api/auth";
import type { User } from "@/types/api";
import { cn } from "@/lib/utils";

interface WalletsSectionProps {
  user: User | null;
}

// Max wallets allowed per user
const MAX_WALLETS = 3;

// Wallet address formatting helper
const formatAddress = (address: string, short = false): string => {
  if (short) return `${address.slice(0, 6)}...${address.slice(-4)}`;
  return `${address.slice(0, 10)}...${address.slice(-8)}`;
};

export function WalletsSection({ user }: WalletsSectionProps) {
  const {
    address,
    shortAddress,
    isConnected,
    isConnecting,
    chainName,
    balance,
    balanceSymbol,
    explorerUrl,
    connect,
    disconnect,
    copyAddress,
    isModalOpen,
    closeModal,
  } = useWallet();

  const { isCorrectChain, switchToCorrectChain, requiredChainName } = useCorrectChain();
  const [copied, setCopied] = useState(false);

  // Multi-wallet state
  const [linkedWallets, setLinkedWallets] = useState<LinkedWallet[]>([]);
  const [remainingSlots, setRemainingSlots] = useState(MAX_WALLETS);
  const [isLoadingWallets, setIsLoadingWallets] = useState(true);
  const [isLinking, setIsLinking] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkingStep, setLinkingStep] = useState<"confirm" | "sign">("confirm");
  const [pendingLink, setPendingLink] = useState<{
    address: string;
    nonce: string;
    message: string;
  } | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [editingWalletId, setEditingWalletId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [removingWalletId, setRemovingWalletId] = useState<string | null>(null);
  const [settingPrimaryId, setSettingPrimaryId] = useState<string | null>(null);

  // Fetch linked wallets
  const fetchWallets = useCallback(async () => {
    try {
      setIsLoadingWallets(true);
      const response = await authApi.getWallets();
      setLinkedWallets(response.wallets);
      setRemainingSlots(response.remainingSlots);
    } catch (error: any) {
      console.error("Failed to load wallets:", error);
    } finally {
      setIsLoadingWallets(false);
    }
  }, []);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  const handleCopy = () => {
    copyAddress();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyAddress = async (addr: string) => {
    try {
      await navigator.clipboard.writeText(addr);
      toast.success("Address copied to clipboard");
    } catch {
      toast.error("Failed to copy address");
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  // Check if current connected wallet is already linked
  const isCurrentWalletLinked = address
    ? linkedWallets.some(
        (w) => w.walletAddress.toLowerCase() === address.toLowerCase()
      )
    : false;

  // Start linking the currently connected wallet
  const startLinkingWallet = async () => {
    if (!isConnected || !address) {
      toast.error("Please connect a wallet first");
      return;
    }

    if (isCurrentWalletLinked) {
      toast.error("This wallet is already linked to your account");
      return;
    }

    if (remainingSlots <= 0) {
      toast.error(`You can only link up to ${MAX_WALLETS} wallets`);
      return;
    }

    setShowLinkModal(true);
    setLinkingStep("confirm");
    setNewLabel("");
    setPendingLink(null);
  };

  // Request nonce and prepare for signing
  const requestNonce = async () => {
    if (!address) return;

    setIsLinking(true);
    try {
      const response = await authApi.generateLinkingNonce(address);
      setPendingLink({
        address,
        nonce: response.nonce,
        message: response.message,
      });
      setLinkingStep("sign");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate linking nonce");
      setShowLinkModal(false);
    } finally {
      setIsLinking(false);
    }
  };

  // Sign and complete linking
  const signAndLink = async () => {
    if (!pendingLink || !window.ethereum) return;

    setIsLinking(true);
    try {
      // Request signature
      const signature = (await window.ethereum.request({
        method: "personal_sign",
        params: [pendingLink.message, pendingLink.address],
      })) as string;

      // Link wallet
      const response = await authApi.linkNewWallet({
        walletAddress: pendingLink.address,
        signature,
        nonce: pendingLink.nonce,
        label: newLabel.trim() || undefined,
      });

      setLinkedWallets((prev) => [...prev, response.wallet]);
      setRemainingSlots((prev) => Math.max(0, prev - 1));
      toast.success("Wallet linked successfully!");
      setShowLinkModal(false);
      setPendingLink(null);
      setNewLabel("");
    } catch (error: any) {
      if (error.code === 4001) {
        toast.error("Signature request was rejected");
      } else {
        toast.error(error.message || "Failed to link wallet");
      }
    } finally {
      setIsLinking(false);
    }
  };

  // Set wallet as primary
  const setPrimary = async (walletId: string) => {
    setSettingPrimaryId(walletId);
    try {
      await authApi.setPrimaryWallet(walletId);
      setLinkedWallets((prev) =>
        prev.map((w) => ({
          ...w,
          isPrimary: w.id === walletId,
        }))
      );
      toast.success("Primary wallet updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to set primary wallet");
    } finally {
      setSettingPrimaryId(null);
    }
  };

  // Update wallet label
  const updateLabel = async (walletId: string) => {
    if (!editLabel.trim()) {
      toast.error("Label cannot be empty");
      return;
    }

    try {
      await authApi.updateWalletLabel(walletId, editLabel.trim());
      setLinkedWallets((prev) =>
        prev.map((w) =>
          w.id === walletId ? { ...w, label: editLabel.trim() } : w
        )
      );
      setEditingWalletId(null);
      setEditLabel("");
      toast.success("Label updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to update label");
    }
  };

  // Remove wallet
  const removeWallet = async (walletId: string) => {
    setRemovingWalletId(walletId);
    try {
      await authApi.removeWallet(walletId);
      setLinkedWallets((prev) => prev.filter((w) => w.id !== walletId));
      setRemainingSlots((prev) => Math.min(MAX_WALLETS, prev + 1));
      toast.success("Wallet removed");
    } catch (error: any) {
      toast.error(error.message || "Failed to remove wallet");
    } finally {
      setRemovingWalletId(null);
    }
  };

  // Cancel linking
  const cancelLinking = () => {
    setShowLinkModal(false);
    setLinkingStep("confirm");
    setPendingLink(null);
    setNewLabel("");
    setIsLinking(false);
  };

  return (
    <div className="space-y-6">
      {/* Currently Connected Wallet Card */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Wallet className="h-5 w-5 text-brand-500" />
                Active Wallet
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Currently connected Web3 wallet
              </p>
            </div>
            {!isConnected && (
              <Button
                variant="primary"
                onClick={() => connect()}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="h-4 w-4 mr-2" />
                    Connect Wallet
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {!isConnected ? (
            <div className="p-12 text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500/10 to-purple-500/10 flex items-center justify-center mx-auto mb-4">
                <Wallet className="h-10 w-10 text-brand-500" />
              </div>
              <p className="text-gray-900 dark:text-white font-semibold text-lg mb-1">
                No wallet connected
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                Connect your Web3 wallet to interact with the blockchain and manage your HBCT tokens
              </p>
              <Button
                variant="primary"
                size="lg"
                onClick={() => connect()}
                disabled={isConnecting}
                className="shadow-lg shadow-brand-500/25"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="h-5 w-5 mr-2" />
                    Connect Wallet
                  </>
                )}
              </Button>
            </div>
          ) : (
            <>
              {/* Connected Wallet Card */}
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
                        <Wallet className="h-7 w-7 text-white" />
                      </div>
                      {/* Status indicator */}
                      <div
                        className={cn(
                          "absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900",
                          isCorrectChain ? "bg-green-500" : "bg-amber-500"
                        )}
                      >
                        {isCorrectChain ? (
                          <CheckCircle2 className="h-3 w-3 text-white" />
                        ) : (
                          <AlertCircle className="h-3 w-3 text-white" />
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-mono font-semibold text-gray-900 dark:text-white text-lg">
                          {shortAddress}
                        </p>
                        <button
                          onClick={handleCopy}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          title="Copy full address"
                        >
                          {copied ? (
                            <Check className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <Copy className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                        <a
                          href={explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          title="View on explorer"
                        >
                          <ExternalLink className="h-4 w-4 text-gray-400" />
                        </a>
                        {isCurrentWalletLinked && (
                          <Badge variant="success" size="sm" className="flex items-center gap-1">
                            <Link2 className="h-3 w-3" />
                            Linked
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-medium",
                            isCorrectChain
                              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                              : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                          )}
                        >
                          {isCorrectChain ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <AlertCircle className="h-3.5 w-3.5" />
                          )}
                          {chainName}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-500 dark:text-gray-400">
                          {balance} {balanceSymbol}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isCurrentWalletLinked && remainingSlots > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={startLinkingWallet}
                        className="text-brand-600 border-brand-200 hover:bg-brand-50 dark:border-brand-800 dark:hover:bg-brand-900/20"
                      >
                        <Link2 className="h-4 w-4 mr-1.5" />
                        Link to Account
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDisconnect}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Unlink className="h-4 w-4 mr-1.5" />
                      Disconnect
                    </Button>
                  </div>
                </div>

                {/* Wrong Chain Warning */}
                {!isCorrectChain && (
                  <div className="mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                          Wrong Network Detected
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                          Please switch to {requiredChainName} to use HBCT features.
                        </p>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={switchToCorrectChain}
                        className="flex-shrink-0"
                      >
                        <RefreshCw className="h-4 w-4 mr-1.5" />
                        Switch Network
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Linked Wallets Card */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Shield className="h-5 w-5 text-brand-500" />
                Linked Wallets
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Wallets permanently linked to your account
              </p>
            </div>
            <Badge variant="neutral" size="sm">
              {linkedWallets.length} / {MAX_WALLETS} slots
            </Badge>
          </div>
        </div>

        <div className="p-6">
          {isLoadingWallets ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
            </div>
          ) : linkedWallets.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <Shield className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No linked wallets
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-sm mx-auto">
                Link your wallets to your account for seamless switching and enhanced security
              </p>
              {isConnected && !isCurrentWalletLinked && (
                <Button variant="primary" onClick={startLinkingWallet}>
                  <Link2 className="h-4 w-4 mr-2" />
                  Link Current Wallet
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {linkedWallets.map((wallet) => (
                <div
                  key={wallet.id}
                  className={cn(
                    "relative p-4 rounded-xl border transition-all duration-200",
                    wallet.isPrimary
                      ? "border-brand-500 bg-brand-50/50 dark:bg-brand-900/10"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  )}
                >
                  {/* Primary Badge */}
                  {wallet.isPrimary && (
                    <div className="absolute -top-2.5 right-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full blur-md opacity-40" />
                        <div className="relative flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full shadow-md">
                          <Star className="h-3 w-3 text-white fill-white drop-shadow-sm" />
                          <span className="text-[10px] font-bold text-white uppercase tracking-wider drop-shadow-sm">
                            Primary
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-4">
                    {/* Wallet Info */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                        <Wallet className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* Label */}
                        <div className="mb-1.5">
                          {editingWalletId === wallet.id ? (
                            <div className="flex items-center gap-2 animate-in fade-in duration-200">
                              <div className="relative flex-1 max-w-[200px]">
                                <input
                                  value={editLabel}
                                  onChange={(e) => setEditLabel(e.target.value)}
                                  placeholder="Enter wallet name..."
                                  maxLength={30}
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") updateLabel(wallet.id);
                                    if (e.key === "Escape") {
                                      setEditingWalletId(null);
                                      setEditLabel("");
                                    }
                                  }}
                                  className="w-full h-9 px-3 text-sm font-medium bg-white dark:bg-gray-800 border-2 border-brand-500 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                                  {editLabel.length}/30
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => updateLabel(wallet.id)}
                                  className="h-9 w-9 flex items-center justify-center rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm transition-all hover:scale-105 active:scale-95"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingWalletId(null);
                                    setEditLabel("");
                                  }}
                                  className="h-9 w-9 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-all hover:scale-105 active:scale-95"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="group/label flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900 dark:text-white text-base">
                                {wallet.label || (
                                  <span className="text-gray-400 dark:text-gray-500 italic font-normal">
                                    Add a name...
                                  </span>
                                )}
                              </h3>
                              <button
                                onClick={() => {
                                  setEditingWalletId(wallet.id);
                                  setEditLabel(wallet.label || "");
                                }}
                                className="opacity-0 group-hover/label:opacity-100 p-1.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 transition-all duration-200"
                                title="Edit wallet name"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Address */}
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono text-gray-600 dark:text-gray-400">
                            {formatAddress(wallet.walletAddress)}
                          </code>
                          <button
                            onClick={() => handleCopyAddress(wallet.walletAddress)}
                            className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <a
                            href={`https://bscscan.com/address/${wallet.walletAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>

                        {/* Metadata */}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            Linked {new Date(wallet.verifiedAt).toLocaleDateString()}
                          </span>
                          {wallet.lastUsedAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Last used {new Date(wallet.lastUsedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!wallet.isPrimary && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPrimary(wallet.id)}
                          disabled={settingPrimaryId === wallet.id}
                        >
                          {settingPrimaryId === wallet.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <StarOff className="h-4 w-4 mr-1.5" />
                              Set Primary
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeWallet(wallet.id)}
                        disabled={removingWalletId === wallet.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        {removingWalletId === wallet.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Remaining Slots Info */}
          {remainingSlots > 0 && linkedWallets.length > 0 && (
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <Link2 className="h-4 w-4 flex-shrink-0" />
              <span>
                You can link {remainingSlots} more wallet{remainingSlots > 1 ? "s" : ""}.
                {isConnected && !isCurrentWalletLinked && " Connect and link your wallet above."}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Security Tips */}
      <div className="rounded-2xl bg-gradient-to-br from-brand-500/5 to-purple-500/5 border border-brand-500/10 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0">
            <Shield className="h-5 w-5 text-brand-500" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              Multi-Wallet Security
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-1">
              <li>• Each wallet requires cryptographic signature verification to link</li>
              <li>• Wallets can only be linked to one account - no sharing allowed</li>
              <li>• You can link up to {MAX_WALLETS} wallets to easily switch between them</li>
              <li>• Your primary wallet cannot be removed if it's your only auth method</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Wallet Connect Modal */}
      <WalletConnectModal isOpen={isModalOpen} onClose={closeModal} />

      {/* Link Wallet Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Link Wallet to Account
                </h3>
                <button
                  onClick={cancelLinking}
                  className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {linkingStep === "confirm" && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mb-4">
                      <Link2 className="h-8 w-8 text-white" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Confirm Wallet Link
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Link this wallet permanently to your account
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Wallet Address
                      </span>
                    </div>
                    <code className="text-sm font-mono text-gray-900 dark:text-white break-all">
                      {address}
                    </code>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800 dark:text-amber-200">
                        Important
                      </p>
                      <p className="text-amber-700 dark:text-amber-300 mt-1">
                        This wallet can only be linked to one account. You will not be able to use it with any other account.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={cancelLinking}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={requestNonce}
                      disabled={isLinking}
                      className="flex-1"
                    >
                      {isLinking ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Processing...
                        </>
                      ) : (
                        "Continue"
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {linkingStep === "sign" && pendingLink && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-4">
                      <Shield className="h-8 w-8 text-white" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Sign to Verify
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Sign the message in your wallet to prove ownership
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                        Name Your Wallet
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                          <Wallet className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          value={newLabel}
                          onChange={(e) => setNewLabel(e.target.value)}
                          placeholder="e.g., Main Wallet, Trading, Savings..."
                          maxLength={30}
                          className="w-full h-11 pl-10 pr-14 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                          {newLabel.length}/30
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <Edit3 className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Give your wallet a memorable name to easily identify it later. You can change this anytime.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={cancelLinking}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={signAndLink}
                      disabled={isLinking}
                      className="flex-1"
                    >
                      {isLinking ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Signing...
                        </>
                      ) : (
                        <>
                          <Shield className="h-4 w-4 mr-2" />
                          Sign & Link
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
