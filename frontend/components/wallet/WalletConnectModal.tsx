"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Loader2, X, Scan, ExternalLink, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConnect as useWagmiConnect, useConnectors as useWagmiConnectors } from "wagmi";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import Image from "next/image";

const DISCONNECT_FLAG_KEY = "wallet_explicitly_disconnected";

interface WalletConfig {
  id: string;
  name: string;
  icon: React.FC<{ className?: string }>;
  detectInstalled?: () => boolean;
}

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  skipDisconnectOnOpen?: boolean;
  onWalletConnectSelect?: () => void;
}

const clearDisconnectFlag = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem(DISCONNECT_FLAG_KEY);
  }
};

const getEthereumProvider = () => {
  if (typeof window === "undefined") return null;
  return (window as any).ethereum;
};

const isMetaMaskInstalled = () => {
  const ethereum = getEthereumProvider();
  return ethereum?.isMetaMask || ethereum?.providers?.some((p: any) => p.isMetaMask);
};

const isCoinbaseWalletInstalled = () => {
  if ((window as any)?.coinbaseWalletExtension) return true;
  const ethereum = getEthereumProvider();
  return ethereum?.isCoinbaseWallet || ethereum?.providers?.some((p: any) => p.isCoinbaseWallet);
};

const isTrustWalletInstalled = () => {
  const ethereum = getEthereumProvider();
  return ethereum?.isTrust || ethereum?.isTrustWallet || ethereum?.providers?.some((p: any) => p.isTrust || p.isTrustWallet);
};

const isPhantomInstalled = () => {
  if (typeof window === "undefined") return false;
  const phantom = (window as any).phantom?.ethereum;
  const ethereum = getEthereumProvider();
  return phantom?.isPhantom || ethereum?.isPhantom || ethereum?.providers?.some((p: any) => p.isPhantom);
};

const isRabbyInstalled = () => {
  const ethereum = getEthereumProvider();
  return ethereum?.isRabby || ethereum?.providers?.some((p: any) => p.isRabby);
};

const isBraveWalletInstalled = () => {
  const ethereum = getEthereumProvider();
  return ethereum?.isBraveWallet || ethereum?.providers?.some((p: any) => p.isBraveWallet);
};

const isOKXWalletInstalled = () => {
  if (typeof window === "undefined") return false;
  const okx = (window as any).okxwallet;
  const ethereum = getEthereumProvider();
  return !!okx || ethereum?.isOkxWallet || ethereum?.providers?.some((p: any) => p.isOkxWallet);
};

const isRainbowInstalled = () => {
  const ethereum = getEthereumProvider();
  return ethereum?.isRainbow || ethereum?.providers?.some((p: any) => p.isRainbow);
};

const isZerionInstalled = () => {
  const ethereum = getEthereumProvider();
  return ethereum?.isZerion || ethereum?.providers?.some((p: any) => p.isZerion);
};

const isBitgetInstalled = () => {
  if (typeof window === "undefined") return false;
  const bitget = (window as any).bitkeep?.ethereum;
  const ethereum = getEthereumProvider();
  return !!bitget || ethereum?.isBitKeep || ethereum?.providers?.some((p: any) => p.isBitKeep);
};

const isMobileDevice = () => {
  if (typeof window === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Mobile wallet deep links and app store URLs
interface MobileWalletConfig {
  id: string;
  name: string;
  icon: React.FC<{ className?: string }>;
  deepLink: (uri: string) => string;
  universalLink: (uri: string) => string;
  appStore: string;
  playStore: string;
}

const openWalletWithUri = (walletId: string, uri: string): void => {
  if (!uri) return;
  const encodedUri = encodeURIComponent(uri);
  const links: Record<string, string> = {
    metaMask: `https://metamask.app.link/wc?uri=${encodedUri}`,
    trustWallet: `https://link.trustwallet.com/wc?uri=${encodedUri}`,
    coinbaseWallet: `https://go.cb-w.com/wc?uri=${encodedUri}`,
    rainbow: `https://rnbwapp.com/wc?uri=${encodedUri}`,
    phantom: `https://phantom.app/ul/wc?uri=${encodedUri}`,
    okx: `https://www.okx.com/download?deeplink=${encodedUri}`,
    zerion: `https://wallet.zerion.io/wc?uri=${encodedUri}`,
    bitget: `https://bkcode.vip/wc?uri=${encodedUri}`,
  };
  if (links[walletId]) window.location.href = links[walletId];
};

const MetaMaskIcon = ({ className }: { className?: string }) => (
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
);

const TrustWalletIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 40 40" className={className}>
    <rect width="40" height="40" rx="8" fill="white"/>
    {/* Left half - solid blue */}
    <path
      d="M7.3 12.3L20 6v33.2c-7.6-3.3-12.7-10-12.7-17.9V12.3z"
      fill="#0500FF"
    />
    {/* Right half - gradient */}
    <path
      d="M32.7 12.3L20 6v33.2c7.6-3.3 12.7-10 12.7-17.9V12.3z"
      fill="url(#trustGradient)"
    />
    <defs>
      <linearGradient id="trustGradient" x1="20" y1="6" x2="32" y2="35" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#0500FF"/>
        <stop offset="25%" stopColor="#0094FF"/>
        <stop offset="50%" stopColor="#48FF91"/>
        <stop offset="75%" stopColor="#0094FF"/>
        <stop offset="100%" stopColor="#0500FF"/>
      </linearGradient>
    </defs>
  </svg>
);

const CoinbaseIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 28 28" className={className}>
    <rect width="28" height="28" rx="5.6" fill="#0052FF"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M14 23.8C19.4124 23.8 23.8 19.4124 23.8 14C23.8 8.58761 19.4124 4.2 14 4.2C8.58761 4.2 4.2 8.58761 4.2 14C4.2 19.4124 8.58761 23.8 14 23.8ZM11.55 10.85C11.163 10.85 10.85 11.163 10.85 11.55V16.45C10.85 16.837 11.163 17.15 11.55 17.15H16.45C16.837 17.15 17.15 16.837 17.15 16.45V11.55C17.15 11.163 16.837 10.85 16.45 10.85H11.55Z" fill="white"/>
  </svg>
);

const PhantomIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 40 40" className={className}>
    <rect width="40" height="40" rx="8" fill="url(#phantom-gradient)"/>
    <defs>
      <linearGradient id="phantom-gradient" x1="0" y1="0" x2="40" y2="40">
        <stop offset="0%" stopColor="#534BB1"/>
        <stop offset="100%" stopColor="#551BF9"/>
      </linearGradient>
    </defs>
    <path d="M29.5 20.5C29.5 25.47 25.47 29.5 20.5 29.5H12.5C11.12 29.5 10 28.38 10 27V13C10 11.62 11.12 10.5 12.5 10.5H20.5C25.47 10.5 29.5 14.53 29.5 19.5V20.5Z" fill="white"/>
    <circle cx="16" cy="19" r="2" fill="#534BB1"/>
    <circle cx="22" cy="19" r="2" fill="#534BB1"/>
  </svg>
);

const RabbyIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 40 40" className={className}>
    <rect width="40" height="40" rx="8" fill="url(#rabby-gradient)"/>
    <defs>
      <linearGradient id="rabby-gradient" x1="0" y1="0" x2="40" y2="40">
        <stop offset="0%" stopColor="#8697FF"/>
        <stop offset="100%" stopColor="#6E7CF9"/>
      </linearGradient>
    </defs>
    <ellipse cx="20" cy="22" rx="10" ry="8" fill="white"/>
    <circle cx="16" cy="21" r="2" fill="#6E7CF9"/>
    <circle cx="24" cy="21" r="2" fill="#6E7CF9"/>
    <ellipse cx="14" cy="14" rx="4" ry="5" fill="white"/>
    <ellipse cx="26" cy="14" rx="4" ry="5" fill="white"/>
  </svg>
);

const BraveIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 40 40" className={className}>
    <rect width="40" height="40" rx="8" fill="#FB542B"/>
    <path d="M20 8L10 14V26L20 32L30 26V14L20 8Z" fill="white"/>
    <path d="M20 12L14 16V24L20 28L26 24V16L20 12Z" fill="#FB542B"/>
  </svg>
);

const OKXIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 40 40" className={className}>
    <rect width="40" height="40" rx="8" fill="#000000"/>
    <rect x="10" y="10" width="8" height="8" rx="1" fill="white"/>
    <rect x="22" y="10" width="8" height="8" rx="1" fill="white"/>
    <rect x="10" y="22" width="8" height="8" rx="1" fill="white"/>
    <rect x="22" y="22" width="8" height="8" rx="1" fill="white"/>
    <rect x="16" y="16" width="8" height="8" rx="1" fill="white"/>
  </svg>
);

const RainbowIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 40 40" className={className}>
    <rect width="40" height="40" rx="8" fill="#001E59"/>
    <path d="M8 28C8 19.16 15.16 12 24 12H32V16H24C17.37 16 12 21.37 12 28V32H8V28Z" fill="#FF4000"/>
    <path d="M12 28C12 21.37 17.37 16 24 16H32V20H24C19.58 20 16 23.58 16 28V32H12V28Z" fill="#FF8B00"/>
    <path d="M16 28C16 23.58 19.58 20 24 20H32V24H24C21.79 24 20 25.79 20 28V32H16V28Z" fill="#FFCB00"/>
    <path d="M20 28C20 25.79 21.79 24 24 24H32V28C32 30.21 30.21 32 28 32H20V28Z" fill="#00E676"/>
    <path d="M24 28H32V32H28C25.79 32 24 30.21 24 28Z" fill="#00B0FF"/>
  </svg>
);

const ZerionIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 40 40" className={className}>
    <rect width="40" height="40" rx="8" fill="#2962EF"/>
    <path d="M12 14H28L12 26H28" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);

const BitgetIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 40 40" className={className}>
    <rect width="40" height="40" rx="8" fill="#00F0FF"/>
    <path d="M20 10L10 20L20 30L30 20L20 10Z" fill="white"/>
    <path d="M20 14L14 20L20 26L26 20L20 14Z" fill="#00F0FF"/>
  </svg>
);

// Always show these wallets
const DEFAULT_WALLETS: WalletConfig[] = [
  { id: "metaMask", name: "MetaMask", icon: MetaMaskIcon, detectInstalled: isMetaMaskInstalled },
  { id: "coinbaseWallet", name: "Coinbase", icon: CoinbaseIcon, detectInstalled: isCoinbaseWalletInstalled },
];

// Additional wallets only shown if installed
const ADDITIONAL_WALLETS: WalletConfig[] = [
  { id: "trustWallet", name: "Trust", icon: TrustWalletIcon, detectInstalled: isTrustWalletInstalled },
  { id: "phantom", name: "Phantom", icon: PhantomIcon, detectInstalled: isPhantomInstalled },
  { id: "rabby", name: "Rabby", icon: RabbyIcon, detectInstalled: isRabbyInstalled },
  { id: "brave", name: "Brave", icon: BraveIcon, detectInstalled: isBraveWalletInstalled },
  { id: "okx", name: "OKX", icon: OKXIcon, detectInstalled: isOKXWalletInstalled },
  { id: "rainbow", name: "Rainbow", icon: RainbowIcon, detectInstalled: isRainbowInstalled },
  { id: "zerion", name: "Zerion", icon: ZerionIcon, detectInstalled: isZerionInstalled },
  { id: "bitget", name: "Bitget", icon: BitgetIcon, detectInstalled: isBitgetInstalled },
];

const ALL_WALLETS = [...DEFAULT_WALLETS, ...ADDITIONAL_WALLETS];

// Popular mobile wallets for the mobile view
const MOBILE_WALLETS: MobileWalletConfig[] = [
  {
    id: "metaMask",
    name: "MetaMask",
    icon: MetaMaskIcon,
    deepLink: (uri) => `metamask://wc?uri=${encodeURIComponent(uri)}`,
    universalLink: (uri) => `https://metamask.app.link/wc?uri=${encodeURIComponent(uri)}`,
    appStore: "https://apps.apple.com/app/metamask/id1438144202",
    playStore: "https://play.google.com/store/apps/details?id=io.metamask",
  },
  {
    id: "trustWallet",
    name: "Trust Wallet",
    icon: TrustWalletIcon,
    deepLink: (uri) => `trust://wc?uri=${encodeURIComponent(uri)}`,
    universalLink: (uri) => `https://link.trustwallet.com/wc?uri=${encodeURIComponent(uri)}`,
    appStore: "https://apps.apple.com/app/trust-wallet/id1288339409",
    playStore: "https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp",
  },
  {
    id: "coinbaseWallet",
    name: "Coinbase Wallet",
    icon: CoinbaseIcon,
    deepLink: (uri) => `cbwallet://wc?uri=${encodeURIComponent(uri)}`,
    universalLink: (uri) => `https://go.cb-w.com/wc?uri=${encodeURIComponent(uri)}`,
    appStore: "https://apps.apple.com/app/coinbase-wallet/id1278383455",
    playStore: "https://play.google.com/store/apps/details?id=org.toshi",
  },
  {
    id: "rainbow",
    name: "Rainbow",
    icon: RainbowIcon,
    deepLink: (uri) => `rainbow://wc?uri=${encodeURIComponent(uri)}`,
    universalLink: (uri) => `https://rnbwapp.com/wc?uri=${encodeURIComponent(uri)}`,
    appStore: "https://apps.apple.com/app/rainbow-ethereum-wallet/id1457119021",
    playStore: "https://play.google.com/store/apps/details?id=me.rainbow",
  },
  {
    id: "phantom",
    name: "Phantom",
    icon: PhantomIcon,
    deepLink: (uri) => `phantom://wc?uri=${encodeURIComponent(uri)}`,
    universalLink: (uri) => `https://phantom.app/ul/wc?uri=${encodeURIComponent(uri)}`,
    appStore: "https://apps.apple.com/app/phantom-solana-wallet/id1598432977",
    playStore: "https://play.google.com/store/apps/details?id=app.phantom",
  },
  {
    id: "zerion",
    name: "Zerion",
    icon: ZerionIcon,
    deepLink: (uri) => `zerion://wc?uri=${encodeURIComponent(uri)}`,
    universalLink: (uri) => `https://wallet.zerion.io/wc?uri=${encodeURIComponent(uri)}`,
    appStore: "https://apps.apple.com/app/zerion-wallet/id1456732565",
    playStore: "https://play.google.com/store/apps/details?id=io.zerion.android",
  },
];

export function WalletConnectModal({ isOpen, onClose }: WalletConnectModalProps) {
  const wagmiConnectors = useWagmiConnectors();
  const { connect: wagmiConnect, reset: resetWagmiConnect } = useWagmiConnect();

  const [wcUri, setWcUri] = useState<string>("");
  const [isMobile, setIsMobile] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);
  const [installedWallets, setInstalledWallets] = useState<string[]>([]);

  // Drag to close state
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [hasAnimatedIn, setHasAnimatedIn] = useState(false);
  const dragStartY = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const wcUriRef = useRef<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsMobile(isMobileDevice());
    const installed = ALL_WALLETS.filter(w => w.detectInstalled?.()).map(w => w.id);
    setInstalledWallets(installed);
  }, []);

  // Keep wcUri ref in sync
  useEffect(() => {
    wcUriRef.current = wcUri;
  }, [wcUri]);

  // Use ref for onClose to avoid dependency issues
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    clearDisconnectFlag();
    setWcUri("");
    setConnectingWallet(null);

    // Find WalletConnect connector
    const wcConnector = wagmiConnectors.find(c =>
      c.id === "walletConnect" ||
      c.id.toLowerCase().includes("walletconnect") ||
      c.name.toLowerCase().includes("walletconnect")
    );

    if (wcConnector) {
      (async () => {
        try {
          // Get provider and listen for URI
          const provider = await (wcConnector as any).getProvider?.();

          if (!provider) {
            return;
          }

          // Remove old listeners
          provider.removeAllListeners?.("display_uri");

          // Listen for URI
          provider.on("display_uri", (uri: string) => {
            setWcUri(uri);
            wcUriRef.current = uri;
          });

          // Also try listening on the provider's events object
          if (provider.events) {
            provider.events.removeAllListeners?.("display_uri");
            provider.events.on("display_uri", (uri: string) => {
              setWcUri(uri);
              wcUriRef.current = uri;
            });
          }

          // Some providers emit on signer
          if (provider.signer) {
            provider.signer.removeAllListeners?.("display_uri");
            provider.signer.on("display_uri", (uri: string) => {
              setWcUri(uri);
              wcUriRef.current = uri;
            });
          }

          // Start the connection - this should trigger display_uri
          wagmiConnect({ connector: wcConnector }, {
            onSuccess: () => {
              onCloseRef.current();
            },
            onError: () => {},
          });
        } catch {
          // Silently handle errors
        }
      })();
    }
  }, [isOpen, wagmiConnectors, wagmiConnect]);

  const getSpecificProvider = useCallback((walletId: string) => {
    const w = window as any;
    const ethereum = w?.ethereum;

    // Check for wallet-specific global objects first
    if (walletId === "phantom" && w.phantom?.ethereum) return w.phantom.ethereum;
    if (walletId === "okx" && w.okxwallet) return w.okxwallet;
    if (walletId === "bitget" && w.bitkeep?.ethereum) return w.bitkeep.ethereum;

    if (!ethereum) return null;

    // Check in providers array (when multiple wallets installed)
    if (ethereum.providers?.length) {
      for (const p of ethereum.providers) {
        if (walletId === "metaMask" && p.isMetaMask && !p.isCoinbaseWallet && !p.isRabby) return p;
        if (walletId === "coinbaseWallet" && p.isCoinbaseWallet) return p;
        if (walletId === "trustWallet" && (p.isTrust || p.isTrustWallet)) return p;
        if (walletId === "phantom" && p.isPhantom) return p;
        if (walletId === "rabby" && p.isRabby) return p;
        if (walletId === "brave" && p.isBraveWallet) return p;
        if (walletId === "rainbow" && p.isRainbow) return p;
        if (walletId === "zerion" && p.isZerion) return p;
      }
    }

    // Fallback to main ethereum object
    if (walletId === "metaMask" && ethereum.isMetaMask && !ethereum.isCoinbaseWallet && !ethereum.isRabby) return ethereum;
    if (walletId === "coinbaseWallet" && ethereum.isCoinbaseWallet) return ethereum;
    if (walletId === "trustWallet" && (ethereum.isTrust || ethereum.isTrustWallet)) return ethereum;
    if (walletId === "phantom" && ethereum.isPhantom) return ethereum;
    if (walletId === "rabby" && ethereum.isRabby) return ethereum;
    if (walletId === "brave" && ethereum.isBraveWallet) return ethereum;
    if (walletId === "rainbow" && ethereum.isRainbow) return ethereum;
    if (walletId === "zerion" && ethereum.isZerion) return ethereum;

    return null;
  }, []);

  const connectWallet = useCallback(async (wallet: WalletConfig) => {
    // Reset any pending connection (like WalletConnect QR) before starting a new one
    resetWagmiConnect();

    // Try to find a matching wagmi connector first (excluding injected for first pass)
    for (const wc of wagmiConnectors) {
      const id = wc.id.toLowerCase(), name = wc.name.toLowerCase();
      if (id === "injected") continue;

      const walletMatches: Record<string, boolean> = {
        metaMask: id.includes("metamask") || name.includes("metamask"),
        coinbaseWallet: id.includes("coinbase") || name.includes("coinbase"),
        trustWallet: id.includes("trust") || name.includes("trust"),
        phantom: id.includes("phantom") || name.includes("phantom"),
        rabby: id.includes("rabby") || name.includes("rabby"),
        brave: id.includes("brave") || name.includes("brave"),
        okx: id.includes("okx") || name.includes("okx"),
        rainbow: id.includes("rainbow") || name.includes("rainbow"),
        zerion: id.includes("zerion") || name.includes("zerion"),
        bitget: id.includes("bitget") || id.includes("bitkeep") || name.includes("bitget"),
      };

      if (walletMatches[wallet.id]) {
        wagmiConnect({ connector: wc }, {
          onSuccess: () => {
            toast.success("Wallet connected!");
            setConnectingWallet(null);
            onCloseRef.current();
          },
          onError: (e) => {
            setConnectingWallet(null);
            if (!e.message?.toLowerCase().includes("rejected")) toast.error("Failed to connect");
          },
        });
        return true;
      }
    }

    // For wallets that use the injected provider (MetaMask, etc.), use the injected connector
    const injectedConnector = wagmiConnectors.find(w => w.id.toLowerCase() === "injected");
    if (injectedConnector && wallet.detectInstalled?.()) {
      wagmiConnect({ connector: injectedConnector }, {
        onSuccess: () => {
          toast.success("Wallet connected!");
          setConnectingWallet(null);
          onCloseRef.current();
        },
        onError: (e) => {
          setConnectingWallet(null);
          if (!e.message?.toLowerCase().includes("rejected")) {
            toast.error("Failed to connect");
          }
        },
      });
      return true;
    }

    // Fallback: try direct provider connection (for wallets not detected by wagmi)
    const provider = getSpecificProvider(wallet.id);
    if (provider) {
      try {
        const accounts = await provider.request({ method: "eth_requestAccounts" });
        if (accounts?.length) {
          toast.success("Wallet connected!");
          setConnectingWallet(null);
          onCloseRef.current();
          // Sync with wagmi by connecting the injected connector
          if (injectedConnector) {
            wagmiConnect({ connector: injectedConnector });
          }
          return true;
        }
      } catch (e: any) {
        setConnectingWallet(null);
        if (!e.message?.toLowerCase().includes("rejected")) toast.error("Failed to connect");
        return true;
      }
    }
    return false;
  }, [wagmiConnectors, wagmiConnect, resetWagmiConnect, getSpecificProvider]);

  const handleWalletClick = useCallback(async (wallet: WalletConfig) => {
    clearDisconnectFlag();
    setConnectingWallet(wallet.id);
    if (wallet.detectInstalled?.()) {
      if (await connectWallet(wallet)) return;
    }
    if (wcUri) openWalletWithUri(wallet.id, wcUri);
    setConnectingWallet(null);
  }, [wcUri, connectWallet]);

  // Handle mobile wallet click - opens wallet app via deep link
  const handleMobileWalletClick = useCallback((wallet: MobileWalletConfig) => {
    setConnectingWallet(wallet.id);

    const openWallet = (uri: string) => {
      // Use universal link - works on both iOS and Android
      const link = wallet.universalLink(uri);

      toast.success(`Opening ${wallet.name}...`, { duration: 2000 });

      // Small delay to show toast, then navigate
      setTimeout(() => {
        // Create an anchor and click it (more reliable on mobile)
        const a = document.createElement("a");
        a.href = link;
        a.rel = "noopener noreferrer";
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, 100);
    };

    const currentUri = wcUriRef.current;

    if (currentUri) {
      openWallet(currentUri);
    } else {
      // No URI yet - show loading and poll for it
      toast.loading("Preparing connection...", { id: "wallet-connecting" });

      let attempts = 0;
      const maxAttempts = 40;

      const checkUri = setInterval(() => {
        attempts++;
        const uri = wcUriRef.current;
        if (uri) {
          clearInterval(checkUri);
          toast.dismiss("wallet-connecting");
          openWallet(uri);
        } else if (attempts >= maxAttempts) {
          clearInterval(checkUri);
          toast.dismiss("wallet-connecting");
          toast.error("Connection timeout. Please try again.");
          setConnectingWallet(null);
        }
      }, 200);
    }
  }, []);

  // Detect iOS vs Android for app store links
  const isIOS = typeof window !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);

  // Drag to close handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - dragStartY.current;
    // Only allow dragging down (positive diff)
    if (diff > 0) {
      // Prevent pull-to-refresh
      e.preventDefault();
      setDragY(diff);
    }
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    // If dragged more than 100px, close the modal
    if (dragY > 100) {
      setIsClosing(true);
      // Wait for close animation to complete
      setTimeout(() => {
        onClose();
        setIsClosing(false);
        setDragY(0);
      }, 200);
    } else {
      // Snap back
      setDragY(0);
    }
  }, [dragY, onClose]);

  // Animated close handler for close button and backdrop
  const handleAnimatedClose = useCallback(() => {
    setHasAnimatedIn(true); // Ensure we're in animated state
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setDragY(0);
    }, 200);
  }, [onClose]);

  // Reset drag state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setDragY(0);
      setIsClosing(false);
      setIsDragging(false);
      setHasAnimatedIn(false);
      // Mark as animated in after initial animation
      const timer = setTimeout(() => setHasAnimatedIn(true), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Prevent body scroll and pull-to-refresh when mobile modal is open
  useEffect(() => {
    if (!isMobile || !isOpen) return;

    // Save current body styles
    const originalStyle = document.body.style.cssText;
    const originalOverscroll = document.body.style.overscrollBehavior;

    // Prevent scrolling and pull-to-refresh
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.top = `-${window.scrollY}px`;

    return () => {
      // Restore body styles
      const scrollY = document.body.style.top;
      document.body.style.cssText = originalStyle;
      document.body.style.overscrollBehavior = originalOverscroll;
      window.scrollTo(0, parseInt(scrollY || "0") * -1);
    };
  }, [isMobile, isOpen]);

  // Mobile View - Bottom sheet with wallet apps
  if (isMobile) {
    if (!isOpen) return null;

    return (
      <>
        {/* Backdrop */}
        <div
          className={cn(
            "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
            !hasAnimatedIn && "animate-in fade-in-0 duration-300",
            isClosing && "transition-opacity duration-200"
          )}
          style={{
            touchAction: "none",
            opacity: isClosing ? 0 : hasAnimatedIn ? Math.max(0, 1 - dragY / 300) : undefined,
          }}
          onClick={handleAnimatedClose}
        />

        {/* Bottom Sheet */}
        <div
          ref={sheetRef}
          className={cn(
            "fixed inset-x-0 bottom-0 z-50",
            // Initial slide-in animation
            !hasAnimatedIn && "animate-in slide-in-from-bottom duration-300 ease-out",
            // After animation, use transform for drag
            hasAnimatedIn && !isDragging && !isClosing && "transition-transform duration-300 ease-out",
            hasAnimatedIn && isDragging && "transition-none",
            hasAnimatedIn && isClosing && "transition-transform duration-200 ease-in"
          )}
          style={{
            touchAction: "none",
            ...(hasAnimatedIn ? {
              transform: isClosing
                ? "translateY(100%)"
                : `translateY(${dragY}px)`,
            } : {}),
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className={cn(
            "relative overflow-hidden rounded-t-[24px]",
            "bg-white dark:bg-[#1a1a2e]",
            "shadow-[0_-10px_40px_rgba(0,0,0,0.2)]"
          )}>
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-9 h-1 rounded-full bg-gray-300 dark:bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Connect Wallet
              </h2>
              <button
                onClick={handleAnimatedClose}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500 dark:text-white/60" />
              </button>
            </div>

            {/* Wallet Grid - WalletConnect Style */}
            <div className="px-4 pb-4">
              <div className="grid grid-cols-4 gap-2">
                {MOBILE_WALLETS.map((wallet) => {
                  const Icon = wallet.icon;
                  const isLoading = connectingWallet === wallet.id;

                  return (
                    <button
                      key={wallet.id}
                      onClick={() => handleMobileWalletClick(wallet)}
                      disabled={isLoading}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-200",
                        "hover:bg-gray-100 dark:hover:bg-white/5",
                        "active:scale-95",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                    >
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center",
                        "bg-gray-50 dark:bg-white/5",
                        "border border-gray-100 dark:border-white/10"
                      )}>
                        {isLoading ? (
                          <Loader2 className="w-7 h-7 animate-spin text-gray-400 dark:text-white/60" />
                        ) : (
                          <Icon className="w-9 h-9" />
                        )}
                      </div>
                      <span className="text-xs font-medium text-gray-700 dark:text-white/80 text-center leading-tight">
                        {wallet.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="mx-6 h-px bg-gray-100 dark:bg-white/10" />

            {/* Get Wallet Section */}
            <div className="px-6 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Don&apos;t have a wallet?
                  </p>
                  <p className="text-xs text-gray-500 dark:text-white/50 mt-0.5">
                    Get started with MetaMask
                  </p>
                </div>
                <a
                  href={isIOS ? "https://apps.apple.com/app/metamask/id1438144202" : "https://play.google.com/store/apps/details?id=io.metamask"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 rounded-full",
                    "bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium",
                    "transition-colors"
                  )}
                >
                  Get
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-8 pt-2">
              <div className="flex items-center justify-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-xs text-gray-400 dark:text-white/40">Secured by WalletConnect</span>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Desktop View - QR Code + Wallet Buttons
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[332px] p-0 gap-0 border-0 bg-transparent overflow-visible" showCloseButton={false}>
        {/* Main Container with Glass Effect */}
        <div className={cn(
          "relative rounded-[28px] overflow-hidden",
          "bg-gradient-to-b from-white to-gray-50",
          "dark:from-[#1a1a2e] dark:to-[#16162a]",
          "shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_30px_60px_-12px_rgba(0,0,0,0.15)]",
          "dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_30px_60px_-12px_rgba(0,0,0,0.5)]"
        )}>
          {/* Glow Effects */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-60 h-60 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-[80px]" />
            <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-60 h-60 bg-purple-500/10 dark:bg-purple-500/20 rounded-full blur-[80px]" />
          </div>

          {/* Header */}
          <div className="relative flex items-center justify-between px-5 py-4">
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              Connect Wallet
            </DialogTitle>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 transition-all"
            >
              <X className="w-4 h-4 text-gray-500 dark:text-white/60" />
            </button>
          </div>

          {/* QR Section */}
          <div className="relative px-5 pb-5">
            <div className="relative rounded-[20px] w-[292px] mx-auto bg-gray-100 dark:bg-white/10 p-[6px]">
              {/* Inner QR Container */}
              <div className="bg-white rounded-[16px] p-4 shadow-sm">
                <div className="flex justify-center">
                  {wcUri ? (
                    <div className="relative">
                      <QRCodeSVG
                        value={wcUri}
                        size={252}
                        level="M"
                        bgColor="#ffffff"
                        fgColor="#1a1a2e"
                      />
                      {/* Logo Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center p-2.5 border border-gray-100">
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
                    <div className="w-[252px] h-[252px] flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
                      <span className="text-sm text-gray-400">Initializing...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Scan Text */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <Scan className="w-4 h-4 text-gray-400 dark:text-white/40" />
              <span className="text-sm text-gray-500 dark:text-white/60">Scan with your wallet app</span>
            </div>
          </div>

          {/* Divider */}
          <div className="relative px-5">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-white/20 to-transparent" />
              <span className="text-xs text-gray-400 dark:text-white/40 font-medium">or connect directly</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-white/20 to-transparent" />
            </div>
          </div>

          {/* Wallet Buttons */}
          <div className="relative px-5 py-5">
            {/* Wallet count info */}
            <div className="flex justify-center mb-3">
              <span className="text-[11px] text-gray-400 dark:text-white/40">
                {installedWallets.length > 0
                  ? `${installedWallets.length} wallet${installedWallets.length !== 1 ? 's' : ''} found · Click to connect`
                  : 'No wallets detected · Install one to continue'
                }
              </span>
            </div>
            {/* Scroll container when many wallets detected */}
            <div
              className={cn(
                "flex flex-wrap justify-center gap-3",
                [...DEFAULT_WALLETS, ...ADDITIONAL_WALLETS.filter(w => installedWallets.includes(w.id))].length > 4 &&
                "max-h-[200px] overflow-y-auto pb-1"
              )}
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(156, 163, 175, 0.5) transparent'
              }}
            >
              {/* Always show default wallets + additional wallets only if installed */}
              {[...DEFAULT_WALLETS, ...ADDITIONAL_WALLETS.filter(w => installedWallets.includes(w.id))].map((wallet) => {
                const Icon = wallet.icon;
                const isLoading = connectingWallet === wallet.id;
                const isInstalled = installedWallets.includes(wallet.id);

                return (
                  <button
                    key={wallet.id}
                    onClick={() => handleWalletClick(wallet)}
                    disabled={isLoading}
                    className={cn(
                      "group relative flex flex-col items-center gap-2.5 p-4 rounded-2xl transition-all duration-200",
                      "w-[140px]",
                      "bg-gray-50 hover:bg-gray-100",
                      "dark:bg-white/5 dark:hover:bg-white/10",
                      "border border-gray-200 hover:border-gray-300",
                      "dark:border-white/10 dark:hover:border-white/20",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {/* Glow on hover */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-gray-100/50 dark:from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className={cn(
                      "relative w-11 h-11 rounded-xl flex items-center justify-center",
                      "bg-gray-100 dark:bg-white/10"
                    )}>
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400 dark:text-white/60" />
                      ) : (
                        <Icon className="w-7 h-7" />
                      )}

                      {/* Installed Indicator - subtle green dot */}
                      {isInstalled && !isLoading && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#1a1a2e] shadow-sm" />
                      )}
                    </div>
                    <span className="relative text-xs font-medium text-gray-700 dark:text-white/80">
                      {wallet.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="relative px-5 pb-4">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-gray-400 dark:text-white/40">Secured with WalletConnect</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default WalletConnectModal;
