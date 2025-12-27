"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useWallet } from "@/hooks/useWallet";
import { Loader2, X, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Animated gradient border component
const GlowingBorder = ({ children, isActive, color }: { children: React.ReactNode; isActive?: boolean; color: string }) => (
  <div className={cn(
    "relative rounded-2xl p-[1px] transition-all duration-500",
    isActive ? `bg-gradient-to-r ${color}` : "bg-transparent"
  )}>
    <div className={cn(
      "absolute inset-0 rounded-2xl opacity-0 blur-xl transition-opacity duration-500",
      isActive && "opacity-50",
      `bg-gradient-to-r ${color}`
    )} />
    {children}
  </div>
);

// Premium Wallet Icons with better styling
const MetaMaskIcon = () => (
  <svg viewBox="0 0 35 33" className="w-7 h-7">
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
);

const WalletConnectIcon = () => (
  <svg viewBox="0 0 300 185" className="w-7 h-7">
    <path d="M61.4385 36.2562C104.051 -5.41874 172.949 -5.41874 215.562 36.2562L220.823 41.3618C223.007 43.4878 223.007 46.9405 220.823 49.0665L202.537 66.8303C201.445 67.8933 199.691 67.8933 198.599 66.8303L191.369 59.7717C162.294 31.4217 114.706 31.4217 85.6312 59.7717L77.8503 67.3708C76.7583 68.4338 75.0041 68.4338 73.9121 67.3708L55.6261 49.6071C53.4421 47.4811 53.4421 44.0283 55.6261 41.9023L61.4385 36.2562ZM251.855 71.6413L268.041 87.3563C270.225 89.4823 270.225 92.9351 268.041 95.0611L195.421 165.768C193.237 167.894 189.729 167.894 187.545 165.768L135.495 115.067C134.949 114.536 134.072 114.536 133.526 115.067L81.4779 165.768C79.2939 167.894 75.7861 167.894 73.6021 165.768L0.959094 95.0596C-1.22491 92.9336 -1.22491 89.4808 0.959094 87.3548L17.1451 71.6398C19.3291 69.5138 22.8369 69.5138 25.0209 71.6398L77.0714 122.342C77.6174 122.873 78.4941 122.873 79.0401 122.342L131.088 71.6398C133.272 69.5138 136.78 69.5138 138.964 71.6398L191.016 122.342C191.562 122.873 192.439 122.873 192.985 122.342L245.034 71.6413C247.218 69.5153 250.726 69.5153 252.91 71.6413H251.855Z" fill="#3B99FC"/>
  </svg>
);

const CoinbaseIcon = () => (
  <svg viewBox="0 0 28 28" className="w-7 h-7">
    <rect width="28" height="28" rx="5.6" fill="#0052FF"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M14 23.8C19.4124 23.8 23.8 19.4124 23.8 14C23.8 8.58761 19.4124 4.2 14 4.2C8.58761 4.2 4.2 8.58761 4.2 14C4.2 19.4124 8.58761 23.8 14 23.8ZM11.55 10.85C11.163 10.85 10.85 11.163 10.85 11.55V16.45C10.85 16.837 11.163 17.15 11.55 17.15H16.45C16.837 17.15 17.15 16.837 17.15 16.45V11.55C17.15 11.163 16.837 10.85 16.45 10.85H11.55Z" fill="white"/>
  </svg>
);

const LedgerIcon = () => (
  <svg viewBox="0 0 40 40" className="w-7 h-7">
    <rect width="40" height="40" rx="8" fill="#000000"/>
    <g fill="white">
      <rect x="11" y="8" width="5" height="5"/>
      <rect x="11" y="15" width="5" height="5"/>
      <rect x="11" y="22" width="5" height="5"/>
      <rect x="18" y="22" width="5" height="5"/>
      <rect x="25" y="22" width="5" height="5"/>
      <rect x="25" y="8" width="5" height="5"/>
      <rect x="11" y="29" width="5" height="4"/>
      <rect x="18" y="29" width="12" height="4"/>
    </g>
  </svg>
);

// Wallet configuration - map multiple possible connector IDs
const wallets = [
  {
    id: "metaMask",
    connectorIds: ["metaMask", "io.metamask", "MetaMask"],
    name: "MetaMask",
    icon: MetaMaskIcon,
    color: "from-[#F6851B] to-[#E2761B]",
    bgColor: "bg-[#F6851B]/10",
    popular: true,
    detectInstalled: () => typeof window !== "undefined" && !!(window as any).ethereum?.isMetaMask,
  },
  {
    id: "coinbaseWallet",
    connectorIds: ["coinbaseWallet", "coinbaseWalletSDK", "com.coinbase.wallet"],
    name: "Coinbase",
    icon: CoinbaseIcon,
    color: "from-[#0052FF] to-[#0040CC]",
    bgColor: "bg-[#0052FF]/10",
    popular: true,
    detectInstalled: () => typeof window !== "undefined" && !!(window as any).ethereum?.isCoinbaseWallet,
  },
  {
    id: "walletConnect",
    connectorIds: ["walletConnect", "WalletConnect"],
    name: "WalletConnect",
    icon: WalletConnectIcon,
    color: "from-[#3B99FC] to-[#2D7DD2]",
    bgColor: "bg-[#3B99FC]/10",
    popular: false,
  },
  {
    id: "ledger",
    connectorIds: ["ledger"],
    name: "Ledger",
    icon: LedgerIcon,
    color: "from-[#000000] to-[#333333]",
    bgColor: "bg-black/10 dark:bg-white/10",
    isExternal: true,
  },
];

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WalletConnectModal({ isOpen, onClose }: WalletConnectModalProps) {
  const { connectors, connect, pendingConnector, isConnecting } = useWallet();
  const [hoveredWallet, setHoveredWallet] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const findConnector = (wallet: typeof wallets[0]) => {
    // Debug: log all connectors
    console.log("Available connectors:", connectors.map(c => ({ id: c.id, name: c.name })));

    for (const connectorId of wallet.connectorIds) {
      const connector = connectors.find((c) =>
        c.id === connectorId ||
        c.id.toLowerCase() === connectorId.toLowerCase() ||
        c.name.toLowerCase().includes(connectorId.toLowerCase())
      );
      if (connector) {
        console.log(`Found connector for ${wallet.name}:`, connector.id, connector.name);
        return connector;
      }
    }

    // Fallback: try to find by name
    const byName = connectors.find((c) =>
      c.name.toLowerCase().includes(wallet.name.toLowerCase())
    );
    if (byName) {
      console.log(`Found connector by name for ${wallet.name}:`, byName.id, byName.name);
      return byName;
    }

    console.log(`No connector found for ${wallet.name}`);
    return null;
  };

  const handleConnect = (wallet: typeof wallets[0]) => {
    if (wallet.isExternal) {
      window.open("https://www.ledger.com/ledger-live", "_blank");
      return;
    }

    const connector = findConnector(wallet);
    console.log("Connecting with connector:", connector?.id, connector?.name);

    if (connector) {
      connect(connector.id);
    } else {
      // Fallback: try direct connection with first matching connector
      const fallbackConnector = connectors.find(c =>
        c.name.toLowerCase().includes(wallet.name.toLowerCase().split(' ')[0])
      );
      if (fallbackConnector) {
        console.log("Using fallback connector:", fallbackConnector.id);
        connect(fallbackConnector.id);
      }
    }
  };

  // Always show all wallets
  const isWalletAvailable = () => true;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[400px] p-0 gap-0 border-0 bg-transparent overflow-visible [&>button]:hidden">
        {/* Outer glow effect */}
        <div className="absolute -inset-4 bg-gradient-to-r from-brand-500/20 via-purple-500/20 to-pink-500/20 rounded-[40px] blur-2xl opacity-60 animate-pulse" />

        {/* Main container */}
        <div className="relative">
          {/* Animated border gradient */}
          <div className="absolute -inset-[1px] rounded-[28px] bg-gradient-to-r from-brand-500 via-purple-500 to-pink-500 opacity-75"
               style={{
                 backgroundSize: '200% 200%',
                 animation: 'gradient-shift 3s ease infinite'
               }}
          />

          {/* Content container */}
          <div className="relative rounded-[27px] bg-white dark:bg-[#0a0a0b] overflow-hidden">
            {/* Subtle noise texture */}
            <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
                 style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noise"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%" height="100%" filter="url(%23noise)"/%3E%3C/svg%3E")' }}
            />

            {/* Header */}
            <div className="relative px-6 pt-6 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">
                    Connect Wallet
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Select your wallet
                  </p>
                </div>

                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Wallet Grid */}
            <div className="px-4 pb-4">
              <div className="grid grid-cols-2 gap-2">
                {wallets.map((wallet, index) => {
                  const matchedConnector = findConnector(wallet);
                  const isPending = matchedConnector && pendingConnector === matchedConnector.id;
                  const isLoading = isPending && isConnecting;
                  const isHovered = hoveredWallet === wallet.id;
                  const IconComponent = wallet.icon;

                  return (
                    <button
                      key={wallet.id}
                      onClick={() => handleConnect(wallet)}
                      onMouseEnter={() => setHoveredWallet(wallet.id)}
                      onMouseLeave={() => setHoveredWallet(null)}
                      disabled={isConnecting && !isPending}
                      className={cn(
                        "group relative flex flex-col items-center justify-center gap-2.5 p-5 rounded-2xl",
                        "transition-all duration-300 ease-out",
                        "bg-gray-50 dark:bg-white/[0.02]",
                        "border border-gray-100 dark:border-white/[0.06]",
                        "hover:bg-white dark:hover:bg-white/[0.04]",
                        "hover:border-gray-200 dark:hover:border-white/[0.1]",
                        "hover:shadow-lg hover:shadow-black/[0.03] dark:hover:shadow-black/20",
                        "hover:-translate-y-0.5",
                        isLoading && "border-brand-500/50 bg-brand-50/50 dark:bg-brand-500/5",
                        "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                      )}
                      style={{
                        animationDelay: mounted ? `${index * 50}ms` : '0ms'
                      }}
                    >
                      {/* Icon */}
                      <div className={cn(
                        "relative w-12 h-12 rounded-xl flex items-center justify-center",
                        "transition-all duration-300",
                        wallet.bgColor,
                        isHovered && "scale-110",
                        isLoading && "animate-pulse"
                      )}>
                        {isLoading ? (
                          <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                        ) : (
                          <IconComponent />
                        )}

                        {/* Glow effect on hover */}
                        <div className={cn(
                          "absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300",
                          "bg-gradient-to-br",
                          wallet.color,
                          "blur-xl",
                          isHovered && "opacity-30"
                        )} />
                      </div>

                      {/* Name */}
                      <span className={cn(
                        "text-sm font-medium transition-colors duration-200",
                        "text-gray-700 dark:text-gray-300",
                        "group-hover:text-gray-900 dark:group-hover:text-white"
                      )}>
                        {wallet.name}
                      </span>

                      {/* External link indicator */}
                      {wallet.isExternal && (
                        <ArrowUpRight className="absolute top-3 right-3 w-3.5 h-3.5 text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-500 transition-colors" />
                      )}

                      {/* Installed indicator - small green dot */}
                      {wallet.detectInstalled?.() && (
                        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                      )}

                      {/* Hover gradient overlay */}
                      <div className={cn(
                        "absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300",
                        "bg-gradient-to-br from-white/50 to-transparent dark:from-white/[0.02]",
                        isHovered && "opacity-100"
                      )} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="mx-6 h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-white/10 to-transparent" />

            {/* Footer */}
            <div className="px-6 py-4">
              <div className="flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Secured by blockchain technology</span>
              </div>
            </div>
          </div>
        </div>

        {/* Add keyframe animation for gradient */}
        <style jsx>{`
          @keyframes gradient-shift {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}

export default WalletConnectModal;
