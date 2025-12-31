"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useWallet } from "@/hooks/useWallet";
import { Loader2, X, Wallet, Smartphone, Shield, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppKit, useDisconnect as useAppKitDisconnect } from "@reown/appkit/react";

// Constants
const DISCONNECT_FLAG_KEY = "wallet_explicitly_disconnected";

// Types
interface WalletConfig {
  id: string;
  connectorIds: string[];
  name: string;
  description: string;
  icon: React.FC<{ className?: string }>;
  popular?: boolean;
  detectInstalled?: () => boolean;
}

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  skipDisconnectOnOpen?: boolean;
  onWalletConnectSelect?: () => void;
}

// Utility functions
const clearDisconnectFlag = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem(DISCONNECT_FLAG_KEY);
  }
};

const getEthereumProvider = () => {
  if (typeof window === "undefined") return null;
  return (window as any).ethereum;
};

const checkProviderProperty = (property: string): boolean => {
  const ethereum = getEthereumProvider();
  if (!ethereum) return false;

  // Check direct property
  if (ethereum[property]) return true;

  // Check providers array (multiple wallets installed)
  return ethereum.providers?.some((p: any) => p[property]) ?? false;
};

// Wallet detection helpers
const isMetaMaskInstalled = () => checkProviderProperty("isMetaMask");
const isCoinbaseWalletInstalled = () => {
  if (typeof window !== "undefined" && (window as any).coinbaseWalletExtension) {
    return true;
  }
  return checkProviderProperty("isCoinbaseWallet");
};

// SVG Icons as memoized components
const MetaMaskIcon = React.memo(({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 35 33" className={className}>
    <path d="M32.9582 1L19.7851 10.7183L22.2299 5.02081L32.9582 1Z" fill="#E17726"/>
    <path d="M2.04187 1L15.1001 10.8087L12.7702 5.02081L2.04187 1Z" fill="#E27625"/>
    <path d="M28.2295 23.5335L24.7346 28.872L32.2172 30.9323L34.3783 23.6501L28.2295 23.5335Z" fill="#E27625"/>
    <path d="M0.632812 23.6501L2.78286 30.9323L10.2655 28.872L6.77057 23.5335L0.632812 23.6501Z" fill="#E27625"/>
    <path d="M9.90497 14.5149L7.81836 17.6507L15.2013 17.9873L14.9577 9.96826L9.90497 14.5149Z" fill="#E27625"/>
    <path d="M25.0951 14.5149L19.9669 9.87793L19.7851 17.9873L27.1818 17.6507L25.0951 14.5149Z" fill="#E27625"/>
    <path d="M10.2656 28.8721L14.7507 26.6938L10.8939 23.7021L10.2656 28.8721Z" fill="#E27625"/>
    <path d="M20.2494 26.6938L24.7345 28.8721L24.1063 23.7021L20.2494 26.6938Z" fill="#E27625"/>
    <path d="M24.7345 28.8722L20.2494 26.6938L20.6127 29.5938L20.5745 30.8419L24.7345 28.8722Z" fill="#D5BFB2"/>
    <path d="M10.2656 28.8722L14.4256 30.8419L14.3992 29.5938L14.7507 26.6938L10.2656 28.8722Z" fill="#D5BFB2"/>
    <path d="M14.5039 21.7842L10.7832 20.6959L13.3988 19.4976L14.5039 21.7842Z" fill="#233447"/>
    <path d="M20.4961 21.7842L21.6012 19.4976L24.2286 20.6959L20.4961 21.7842Z" fill="#233447"/>
    <path d="M10.2655 28.8721L10.9174 23.5335L6.77051 23.6501L10.2655 28.8721Z" fill="#CC6228"/>
    <path d="M24.0826 23.5335L24.7345 28.8721L28.2295 23.6501L24.0826 23.5335Z" fill="#CC6228"/>
    <path d="M27.1818 17.6506L19.7851 17.9872L20.4962 21.7841L21.6013 19.4976L24.2287 20.6959L27.1818 17.6506Z" fill="#CC6228"/>
    <path d="M10.7832 20.6959L13.3988 19.4976L14.5039 21.7841L15.2013 17.9872L7.81836 17.6506L10.7832 20.6959Z" fill="#CC6228"/>
    <path d="M7.81836 17.6506L10.8939 23.7021L10.7832 20.6959L7.81836 17.6506Z" fill="#E27525"/>
    <path d="M24.2287 20.6959L24.1063 23.7021L27.1818 17.6506L24.2287 20.6959Z" fill="#E27525"/>
    <path d="M15.2014 17.9873L14.504 21.7842L15.3822 26.1925L15.5693 20.3595L15.2014 17.9873Z" fill="#E27525"/>
    <path d="M19.7851 17.9873L19.4291 20.3477L19.6179 26.1925L20.4961 21.7842L19.7851 17.9873Z" fill="#E27525"/>
    <path d="M20.4962 21.7842L19.618 26.1925L20.2494 26.6938L24.1063 23.7021L24.2287 20.6959L20.4962 21.7842Z" fill="#F5841F"/>
    <path d="M10.7832 20.6959L10.8939 23.7021L14.7507 26.6938L15.3822 26.1925L14.5039 21.7842L10.7832 20.6959Z" fill="#F5841F"/>
    <path d="M20.5746 30.8419L20.6128 29.5938L20.2729 29.3067H14.7272L14.3992 29.5938L14.4256 30.8419L10.2656 28.8721L11.6839 30.0442L14.6727 32.1H20.3274L23.3162 30.0442L24.7345 28.8721L20.5746 30.8419Z" fill="#C0AC9D"/>
    <path d="M20.2494 26.6938L19.618 26.1925H15.3821L14.7507 26.6938L14.3992 29.5938L14.7271 29.3067H20.2728L20.6127 29.5938L20.2494 26.6938Z" fill="#161616"/>
    <path d="M33.5168 11.3532L34.6837 5.7627L32.9582 1L20.2494 10.3716L25.0951 14.5149L32.0031 16.5233L33.5804 14.6965L32.8903 14.1952L33.9954 13.1887L33.1408 12.5309L34.2459 11.6892L33.5168 11.3532Z" fill="#763E1A"/>
    <path d="M0.316406 5.7627L1.4951 11.3532L0.742203 11.6892L1.84729 12.5309L0.992725 13.1887L2.09781 14.1952L1.40771 14.6965L2.98498 16.5233L9.90496 14.5149L14.7507 10.3716L2.04186 1L0.316406 5.7627Z" fill="#763E1A"/>
    <path d="M32.0031 16.5233L25.0951 14.5149L27.1818 17.6507L24.1063 23.7021L28.2295 23.6502H34.3783L32.0031 16.5233Z" fill="#F5841F"/>
    <path d="M9.90498 14.5149L2.98499 16.5233L0.632812 23.6502H6.77057L10.8939 23.7021L7.81836 17.6507L9.90498 14.5149Z" fill="#F5841F"/>
    <path d="M19.7851 17.9873L20.2494 10.3716L22.2299 5.02081H12.7702L14.7507 10.3716L15.2014 17.9873L15.3703 20.3713L15.3822 26.1925H19.6179L19.6297 20.3713L19.7851 17.9873Z" fill="#F5841F"/>
  </svg>
));
MetaMaskIcon.displayName = "MetaMaskIcon";

const WalletConnectIcon = React.memo(({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 300 185" className={className}>
    <path d="M61.4385 36.2562C104.051 -5.41874 172.949 -5.41874 215.562 36.2562L220.823 41.3618C223.007 43.4878 223.007 46.9405 220.823 49.0665L202.537 66.8303C201.445 67.8933 199.691 67.8933 198.599 66.8303L191.369 59.7717C162.294 31.4217 114.706 31.4217 85.6312 59.7717L77.8503 67.3708C76.7583 68.4338 75.0041 68.4338 73.9121 67.3708L55.6261 49.6071C53.4421 47.4811 53.4421 44.0283 55.6261 41.9023L61.4385 36.2562ZM251.855 71.6413L268.041 87.3563C270.225 89.4823 270.225 92.9351 268.041 95.0611L195.421 165.768C193.237 167.894 189.729 167.894 187.545 165.768L135.495 115.067C134.949 114.536 134.072 114.536 133.526 115.067L81.4779 165.768C79.2939 167.894 75.7861 167.894 73.6021 165.768L0.959094 95.0596C-1.22491 92.9336 -1.22491 89.4808 0.959094 87.3548L17.1451 71.6398C19.3291 69.5138 22.8369 69.5138 25.0209 71.6398L77.0714 122.342C77.6174 122.873 78.4941 122.873 79.0401 122.342L131.088 71.6398C133.272 69.5138 136.78 69.5138 138.964 71.6398L191.016 122.342C191.562 122.873 192.439 122.873 192.985 122.342L245.034 71.6413C247.218 69.5153 250.726 69.5153 252.91 71.6413H251.855Z" fill="#3B99FC"/>
  </svg>
));
WalletConnectIcon.displayName = "WalletConnectIcon";

const CoinbaseIcon = React.memo(({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 28 28" className={className}>
    <rect width="28" height="28" rx="5.6" fill="#0052FF"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M14 23.8C19.4124 23.8 23.8 19.4124 23.8 14C23.8 8.58761 19.4124 4.2 14 4.2C8.58761 4.2 4.2 8.58761 4.2 14C4.2 19.4124 8.58761 23.8 14 23.8ZM11.55 10.85C11.163 10.85 10.85 11.163 10.85 11.55V16.45C10.85 16.837 11.163 17.15 11.55 17.15H16.45C16.837 17.15 17.15 16.837 17.15 16.45V11.55C17.15 11.163 16.837 10.85 16.45 10.85H11.55Z" fill="white"/>
  </svg>
));
CoinbaseIcon.displayName = "CoinbaseIcon";

// Wallet configurations
const WALLETS: WalletConfig[] = [
  {
    id: "metaMask",
    connectorIds: ["metaMask", "io.metamask", "MetaMask"],
    name: "MetaMask",
    description: "Browser extension",
    icon: MetaMaskIcon,
    popular: true,
    detectInstalled: isMetaMaskInstalled,
  },
  {
    id: "coinbaseWallet",
    connectorIds: ["coinbaseWallet", "coinbaseWalletSDK", "com.coinbase.wallet"],
    name: "Coinbase Wallet",
    description: "Mobile & extension",
    icon: CoinbaseIcon,
    popular: true,
    detectInstalled: isCoinbaseWalletInstalled,
  },
  {
    id: "walletConnect",
    connectorIds: ["walletConnect", "WalletConnect"],
    name: "WalletConnect",
    description: "Scan with mobile",
    icon: WalletConnectIcon,
  },
];

// Reusable styles
const styles = {
  container: cn(
    "relative overflow-hidden rounded-2xl",
    "bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl",
    "border border-white/50 dark:border-gray-700/50",
    "shadow-2xl shadow-gray-900/10 dark:shadow-black/30"
  ),
  walletButton: cn(
    "group relative w-full flex items-center gap-4 p-4 rounded-xl",
    "transition-all duration-200 ease-out",
    "bg-gray-50/80 dark:bg-white/[0.03]",
    "border border-gray-200/80 dark:border-white/[0.06]",
    "hover:bg-white dark:hover:bg-white/[0.06]",
    "hover:border-brand-200 dark:hover:border-brand-500/30",
    "hover:shadow-lg hover:shadow-brand-500/10",
    "hover:-translate-y-0.5",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
    "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
  ),
  iconContainer: cn(
    "relative flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center",
    "bg-gray-100 dark:bg-white/[0.06]",
    "border border-gray-200/50 dark:border-white/[0.08]",
    "transition-all duration-200"
  ),
  arrowContainer: cn(
    "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
    "bg-gray-100 dark:bg-white/[0.04]",
    "transition-all duration-200",
    "group-hover:bg-brand-50 dark:group-hover:bg-brand-500/10"
  ),
};

// Wallet Item Component
const WalletItem = React.memo(({
  wallet,
  isLoading,
  isHovered,
  isDisabled,
  onConnect,
  onHover,
}: {
  wallet: WalletConfig;
  isLoading: boolean;
  isHovered: boolean;
  isDisabled: boolean;
  onConnect: () => void;
  onHover: (id: string | null) => void;
}) => {
  const IconComponent = wallet.icon;
  const isInstalled = wallet.detectInstalled?.();
  const isWalletConnect = wallet.id === "walletConnect";

  return (
    <button
      onClick={onConnect}
      onMouseEnter={() => onHover(wallet.id)}
      onMouseLeave={() => onHover(null)}
      disabled={isDisabled}
      className={cn(
        styles.walletButton,
        isLoading && "ring-2 ring-brand-500/50 bg-brand-50/50 dark:bg-brand-500/10"
      )}
    >
      {/* Icon */}
      <div className={cn(
        styles.iconContainer,
        isHovered && "scale-105 border-brand-200 dark:border-brand-500/30",
        isLoading && "animate-pulse"
      )}>
        {isLoading ? (
          <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
        ) : (
          <IconComponent className="w-7 h-7" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
            {wallet.name}
          </span>
          {wallet.popular && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded-md bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400">
              Popular
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {wallet.description}
          </span>
          {isInstalled && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Installed
            </span>
          )}
        </div>
      </div>

      {/* Arrow/Icon */}
      <div className={cn(styles.arrowContainer, isHovered && "translate-x-0.5")}>
        {isWalletConnect ? (
          <Smartphone className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-brand-500 dark:group-hover:text-brand-400 transition-colors" />
        ) : (
          <ChevronRight className={cn(
            "w-4 h-4 text-gray-400 dark:text-gray-500 transition-all duration-200",
            "group-hover:text-brand-500 dark:group-hover:text-brand-400",
            isHovered && "translate-x-0.5"
          )} />
        )}
      </div>
    </button>
  );
});
WalletItem.displayName = "WalletItem";

// Main Component
export function WalletConnectModal({
  isOpen,
  onClose,
  skipDisconnectOnOpen = false,
  onWalletConnectSelect,
}: WalletConnectModalProps) {
  const { connectors, connect, pendingConnector, isConnecting, disconnect } = useWallet();
  const [hoveredWallet, setHoveredWallet] = useState<string | null>(null);
  const { open: openAppKit } = useAppKit();
  const { disconnect: disconnectAppKit } = useAppKitDisconnect();

  // Handle modal open effects
  useEffect(() => {
    if (isOpen) {
      // Always clear the disconnect flag when opening
      clearDisconnectFlag();
      // Note: We don't disconnect here anymore as it causes confusing UX
      // The useWallet.connect() already handles disconnection if needed
    }
  }, [isOpen]);

  // Find connector for a wallet
  const findConnector = useCallback((wallet: WalletConfig) => {
    for (const connectorId of wallet.connectorIds) {
      const connector = connectors.find((c) =>
        c.id === connectorId ||
        c.id.toLowerCase() === connectorId.toLowerCase() ||
        c.name.toLowerCase().includes(connectorId.toLowerCase())
      );
      if (connector) return connector;
    }
    return connectors.find((c) =>
      c.name.toLowerCase().includes(wallet.name.toLowerCase())
    ) || null;
  }, [connectors]);

  // Handle wallet connection
  const handleConnect = useCallback(async (wallet: WalletConfig) => {
    if (wallet.id === "walletConnect") {
      onWalletConnectSelect?.();
      onClose();
      clearDisconnectFlag();
      try {
        await disconnectAppKit();
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
      openAppKit({ view: "ConnectingWalletConnectBasic" });
      return;
    }

    const connector = findConnector(wallet);
    if (connector) {
      connect(connector.id);
    }
  }, [findConnector, connect, onClose, onWalletConnectSelect, disconnectAppKit, openAppKit]);

  // Memoize wallet states
  const walletStates = useMemo(() => {
    return WALLETS.map(wallet => {
      const connector = findConnector(wallet);
      const isPending = connector ? pendingConnector === connector.id : false;
      return {
        wallet,
        isLoading: isPending && isConnecting,
        isDisabled: isConnecting && !isPending,
      };
    });
  }, [findConnector, pendingConnector, isConnecting]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-[400px] p-0 gap-0 border-0 bg-transparent overflow-visible"
        showCloseButton={false}
      >
        <div className={styles.container}>
          {/* Animated background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] opacity-20 dark:opacity-10 animate-spin-slow"
              style={{
                background: "conic-gradient(from 0deg, transparent, rgba(249, 115, 22, 0.08), transparent, rgba(245, 158, 11, 0.08), transparent)",
              }}
            />
          </div>

          {/* Header */}
          <div className="relative px-6 pt-6 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-icon flex items-center justify-center shadow-brand-lg">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                    Connect Wallet
                  </DialogTitle>
                  <DialogDescription className="text-xs text-gray-500 dark:text-gray-400">
                    Select your preferred wallet
                  </DialogDescription>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Wallet List */}
          <div className="relative px-4 pb-4 space-y-2">
            {walletStates.map(({ wallet, isLoading, isDisabled }) => (
              <WalletItem
                key={wallet.id}
                wallet={wallet}
                isLoading={isLoading}
                isHovered={hoveredWallet === wallet.id}
                isDisabled={isDisabled}
                onConnect={() => handleConnect(wallet)}
                onHover={setHoveredWallet}
              />
            ))}
          </div>

          {/* Footer */}
          <div className="relative px-6 pb-5 pt-2">
            <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent mb-4" />
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
                <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  Secure Connection
                </span>
              </div>
            </div>
            <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 mt-3">
              By connecting, you agree to our Terms of Service
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default WalletConnectModal;
