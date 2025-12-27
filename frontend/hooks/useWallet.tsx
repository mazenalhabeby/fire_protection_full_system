"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
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
}

export function useWallet(): UseWalletReturn {
  const { address, isConnected, isConnecting } = useAccount();
  const chainId = useChainId();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { switchChain: wagmiSwitchChain } = useSwitchChain();
  const { connect: wagmiConnect, isPending } = useConnect();
  const wagmiConnectors = useConnectors();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingConnector, setPendingConnector] = useState<string | null>(null);

  // Auto-close modal when wallet connects
  useEffect(() => {
    if (isConnected && isModalOpen) {
      setIsModalOpen(false);
      setPendingConnector(null);
    }
  }, [isConnected, isModalOpen]);

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
  const openModal = useCallback(() => setIsModalOpen(true), []);
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
