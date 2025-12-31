"use client";

import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import {
  useAccount,
  useBalance,
  useDisconnect,
  useChainId,
  useSwitchChain,
  useConnect,
  useConnectors,
} from "wagmi";
import { bsc } from "wagmi/chains";
import { toast } from "sonner";
import { clearDisconnectedFlag } from "@/providers/Web3ModalProvider";
import { authApi } from "@/lib/api/auth";
import { useAuth } from "@/hooks/useAuth";

// Chain names mapping
const chainNames: Record<number, string> = {
  56: "BNB Smart Chain",
  97: "BSC Testnet",
  1: "Ethereum",
  11155111: "Sepolia Testnet",
};

// Explorer URLs
const explorerUrls: Record<number, string> = {
  56: "https://bscscan.com",
  97: "https://testnet.bscscan.com",
  1: "https://etherscan.io",
  11155111: "https://sepolia.etherscan.io",
};

// Format address for display (0x1234...5678)
export const formatAddress = (address: string, chars = 4): string => {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
};

// Get explorer URL for an address
export const getAddressExplorerUrl = (chainId: number, address: string): string => {
  const baseUrl = explorerUrls[chainId] || explorerUrls[56];
  return `${baseUrl}/address/${address}`;
};

export interface WalletInfo {
  address: string | undefined;
  shortAddress: string;
  isConnected: boolean;
  isConnecting: boolean;
  chainId: number | undefined;
  chainName: string;
  balance: string;
  balanceSymbol: string;
  explorerUrl: string;
}

export interface ConnectorInfo {
  id: string;
  name: string;
  icon?: string;
}

export interface WalletConflictError {
  hasConflict: boolean;
  message: string;
  walletAddress: string;
}

export interface UseWalletReturn extends WalletInfo {
  connect: (connectorId?: string) => void;
  disconnect: () => void;
  switchChain: (chainId: number) => Promise<void>;
  copyAddress: () => void;
  connectors: ConnectorInfo[];
  pendingConnector: string | null;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  // Wallet conflict detection
  walletConflict: WalletConflictError | null;
  isCheckingWallet: boolean;
  clearWalletConflict: () => void;
}

export function useWallet(): UseWalletReturn {
  const { address, isConnected, isConnecting } = useAccount();
  const chainId = useChainId();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { switchChain: wagmiSwitchChain } = useSwitchChain();
  const { connect: wagmiConnect, isPending } = useConnect();
  const wagmiConnectors = useConnectors();
  const { isAuthenticated } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingConnector, setPendingConnector] = useState<string | null>(null);

  // Wallet conflict detection
  const [walletConflict, setWalletConflict] = useState<WalletConflictError | null>(null);
  const [isCheckingWallet, setIsCheckingWallet] = useState(false);
  const lastCheckedAddress = useRef<string | null>(null);

  // Auto-close modal when wallet connects
  useEffect(() => {
    if (isConnected && isModalOpen) {
      setIsModalOpen(false);
      setPendingConnector(null);
    }
  }, [isConnected, isModalOpen]);

  // Check wallet availability when connected
  // IMPORTANT: Only check when user is AUTHENTICATED (logged in)
  // This prevents showing conflict modal during wallet login/register flow
  useEffect(() => {
    const checkWalletAvailability = async () => {
      if (!isConnected || !address) {
        setWalletConflict(null);
        lastCheckedAddress.current = null;
        return;
      }

      // SKIP check if user is NOT authenticated
      // During login/register with wallet, we don't want to show conflict modal
      // The conflict check is only for when a logged-in user connects a wallet for transactions
      if (!isAuthenticated) {
        setWalletConflict(null);
        lastCheckedAddress.current = null;
        return;
      }

      // Skip if we already checked this address
      if (lastCheckedAddress.current === address.toLowerCase()) {
        return;
      }

      setIsCheckingWallet(true);
      lastCheckedAddress.current = address.toLowerCase();

      try {
        // Use authenticated endpoint since user is logged in
        const result = await authApi.checkWalletAvailabilityAuthenticated(address);

        if (!result.available && !result.linkedToCurrentUser) {
          // Wallet is linked to another user - DISCONNECT immediately
          setWalletConflict({
            hasConflict: true,
            message: result.message || "This wallet is already linked to another account",
            walletAddress: address,
          });

          // Disconnect the wallet - don't allow it to stay connected
          wagmiDisconnect();

          // Show toast notification
          toast.error("Wallet Blocked", {
            description: result.message || "This wallet is already linked to another account. Please use a different wallet.",
            duration: 6000,
          });
        } else {
          setWalletConflict(null);
        }
      } catch (error) {
        // Silently handle errors - don't block the user
        console.warn("Failed to check wallet availability:", error);
        setWalletConflict(null);
      } finally {
        setIsCheckingWallet(false);
      }
    };

    checkWalletAvailability();
  }, [isConnected, address, isAuthenticated, wagmiDisconnect]);

  // Clear wallet conflict state
  const clearWalletConflict = useCallback(() => {
    setWalletConflict(null);
    lastCheckedAddress.current = null;
  }, []);

  // Get native token balance
  const { data: balanceData } = useBalance({
    address: address,
  });

  // Format the balance
  const balance = useMemo(() => {
    if (!balanceData) return "0.00";
    const value = parseFloat(balanceData.formatted);
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  }, [balanceData]);

  // Get chain name
  const chainName = useMemo(() => {
    if (!chainId) return "Unknown";
    return chainNames[chainId] || `Chain ${chainId}`;
  }, [chainId]);

  // Get explorer URL for the connected address
  const explorerUrl = useMemo(() => {
    if (!address || !chainId) return "";
    return getAddressExplorerUrl(chainId, address);
  }, [address, chainId]);

  // Map wagmi connectors to our format
  const connectors: ConnectorInfo[] = useMemo(() => {
    return wagmiConnectors.map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
    }));
  }, [wagmiConnectors]);

  // Connect wallet
  const connect = useCallback(
    (connectorId?: string) => {
      if (!connectorId) {
        setIsModalOpen(true);
        return;
      }

      const connector = wagmiConnectors.find((c) => c.id === connectorId);
      if (!connector) {
        toast.error("Connector not found");
        return;
      }

      setPendingConnector(connectorId);
      // Clear the disconnected flag BEFORE connecting so watchAccount doesn't disconnect
      clearDisconnectedFlag();
      wagmiConnect(
        { connector },
        {
          onSuccess: () => {
            toast.success("Wallet connected!");
            setIsModalOpen(false);
            setPendingConnector(null);
          },
          onError: (error) => {
            setPendingConnector(null);

            // Handle user rejection gracefully - don't show error toast
            const errorMessage = error.message?.toLowerCase() || "";
            if (
              errorMessage.includes("rejected") ||
              errorMessage.includes("denied") ||
              errorMessage.includes("cancelled") ||
              errorMessage.includes("canceled") ||
              errorMessage.includes("user refused") ||
              errorMessage.includes("request reset")
            ) {
              // User cancelled - just close silently or show info
              toast.info("Connection cancelled");
              return;
            }

            // Show error for other failures
            toast.error("Failed to connect wallet. Please try again.");
          },
        }
      );
    },
    [wagmiConnectors, wagmiConnect]
  );

  // Disconnect wallet
  const disconnect = useCallback(() => {
    wagmiDisconnect();
    toast.success("Wallet disconnected");
  }, [wagmiDisconnect]);

  // Switch chain
  const switchChain = useCallback(
    async (targetChainId: number) => {
      try {
        await wagmiSwitchChain({ chainId: targetChainId });
        toast.success(`Switched to ${chainNames[targetChainId] || "new network"}`);
      } catch {
        toast.error("Failed to switch network");
      }
    },
    [wagmiSwitchChain]
  );

  // Copy address to clipboard
  const copyAddress = useCallback(() => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    toast.success("Address copied to clipboard");
  }, [address]);

  // Modal controls
  const openModal = useCallback(() => {
    // Clear the disconnected flag when opening modal so user can connect
    clearDisconnectedFlag();
    setIsModalOpen(true);
  }, []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  return {
    // Wallet info
    address,
    shortAddress: address ? formatAddress(address) : "",
    isConnected,
    isConnecting: isConnecting || isPending,
    chainId,
    chainName,
    balance,
    balanceSymbol: balanceData?.symbol || "BNB",
    explorerUrl,
    // Connectors
    connectors,
    pendingConnector,
    // Actions
    connect,
    disconnect,
    switchChain,
    copyAddress,
    // Modal
    isModalOpen,
    openModal,
    closeModal,
    // Wallet conflict detection
    walletConflict,
    isCheckingWallet,
    clearWalletConflict,
  };
}

// Hook for checking if we're on the correct chain
export function useCorrectChain() {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const isCorrectChain = chainId === bsc.id;

  const switchToCorrectChain = useCallback(async () => {
    try {
      await switchChain({ chainId: bsc.id });
      toast.success("Switched to BNB Smart Chain");
    } catch {
      toast.error("Failed to switch to BNB Smart Chain");
    }
  }, [switchChain]);

  return {
    isCorrectChain,
    switchToCorrectChain,
    requiredChainId: bsc.id,
    requiredChainName: "BNB Smart Chain",
  };
}

export default useWallet;
