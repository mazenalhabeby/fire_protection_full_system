"use client";

import React, { ReactNode, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { bsc, bscTestnet, mainnet, sepolia } from "wagmi/chains";
import { disconnect as wagmiDisconnect, getAccount, type Config } from "@wagmi/core";
import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";

// Project ID from WalletConnect Cloud (https://cloud.walletconnect.com)
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

// LocalStorage key to track if user explicitly logged out
const WALLET_DISCONNECTED_KEY = "wallet_explicitly_disconnected";

// Metadata for WalletConnect - URL must match WalletConnect Cloud project settings
const getMetadata = () => {
  // Use current origin for development, production URL for production
  const origin = typeof window !== "undefined" ? window.location.origin : "https://hbct.io";

  return {
    name: "HBCT Fire Protection",
    description: "HBCT Fire Protection Token Platform",
    url: origin,
    icons: ["https://hbct.io/logo.png"],
  };
};

const metadata = getMetadata();

// Define chains for AppKit - BSC first as default
const chains = [bsc, bscTestnet, mainnet, sepolia];

// Create Wagmi Adapter for AppKit with proper WalletConnect v2 configuration
const wagmiAdapter = new WagmiAdapter({
  networks: chains as [typeof bsc, ...typeof chains],
  projectId,
  ssr: true,
});

// Initialize AppKit with comprehensive WalletConnect v2 configuration
if (projectId) {
  createAppKit({
    adapters: [wagmiAdapter],
    networks: chains as [typeof bsc, ...typeof chains],
    defaultNetwork: bsc,
    projectId,
    metadata,
    features: {
      analytics: false,
      email: false,
      socials: false,
    },
    // Allow unsupported chains to let wallets try even if they don't advertise support
    allowUnsupportedChain: true,
    // Featured wallets that are known to work well with BSC
    featuredWalletIds: [
      "c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96", // MetaMask
      "4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0", // Trust Wallet
      "fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa", // Coinbase
      "1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369", // Rainbow
    ],
    themeMode: "dark",
    themeVariables: {
      "--w3m-accent": "#f97316",
      "--w3m-color-mix": "#1f2937",
      "--w3m-color-mix-strength": 20,
      "--w3m-border-radius-master": "2px",
    },
  });
}

// Create query client for React Query - singleton pattern
const makeQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        retry: 2,
      },
    },
  });
};

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

// Export wagmi config from adapter
export const wagmiConfig = wagmiAdapter.wagmiConfig;

/**
 * Disconnect wallet and set flag to prevent auto-reconnection
 */
export async function disconnectWallet(): Promise<void> {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(WALLET_DISCONNECTED_KEY, "true");
    }
    await wagmiDisconnect(wagmiConfig as Config);
  } catch {
    // Silently handle disconnect errors
  }
}

/**
 * Force disconnect - clears all wagmi/wallet state from localStorage, sessionStorage, and IndexedDB
 * Use this when user cancels signature or session expires to ensure complete reset
 * This ensures user gets wallet selection modal on next connection attempt
 */
export async function forceDisconnectWallet(): Promise<void> {
  try {
    // First try normal disconnect
    await wagmiDisconnect(wagmiConfig as Config);
  } catch {
    // Ignore errors
  }

  // Clear all wallet-related storage
  if (typeof window !== "undefined") {
    // Specifically clear wagmi store first (this is the main one)
    // Clear ALL wagmi keys to ensure fresh state
    localStorage.removeItem("wagmi.store");
    localStorage.removeItem("wagmi.connected");
    localStorage.removeItem("wagmi.wallet");
    localStorage.removeItem("wagmi.recentConnectorId");
    localStorage.removeItem("wagmi.injected.shimDisconnect");
    localStorage.removeItem("wagmi.metaMask.shimDisconnect");
    localStorage.removeItem("wagmi.coinbaseWallet.shimDisconnect");

    // Clear AppKit/Reown state
    localStorage.removeItem("@appkit/active_caip_network_id");
    localStorage.removeItem("@appkit/connected_connector");
    localStorage.removeItem("@appkit/recent_wallets");

    // Clear Coinbase Wallet SDK specific keys directly
    localStorage.removeItem("-walletlink:https://www.walletlink.org:version");
    localStorage.removeItem("-walletlink:https://www.walletlink.org:session:id");
    localStorage.removeItem("-walletlink:https://www.walletlink.org:session:secret");
    localStorage.removeItem("-walletlink:https://www.walletlink.org:session:linked");
    localStorage.removeItem("walletlink:https://www.walletlink.org:version");
    localStorage.removeItem("walletlink:https://www.walletlink.org:session:id");
    localStorage.removeItem("walletlink:https://www.walletlink.org:session:secret");
    localStorage.removeItem("walletlink:https://www.walletlink.org:session:linked");

    // Clear localStorage - be aggressive
    const localStorageKeysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      // Skip our own disconnect flag
      if (key === WALLET_DISCONNECTED_KEY) continue;

      if (key && (
        key.startsWith("wagmi") ||
        key.startsWith("wc@") ||
        key.startsWith("wc2") ||
        key.startsWith("W3M") ||
        key.startsWith("@w3m") ||
        key.startsWith("@appkit") ||
        key.startsWith("-walletlink") ||
        key.startsWith("walletlink") ||
        key.startsWith("coinbaseWallet") ||
        key.startsWith("COINBASE") ||
        key.startsWith("coinbase-") ||
        key.startsWith("Coinbase") ||
        key.includes("walletconnect") ||
        key.includes("WALLETCONNECT") ||
        key.includes("reown") ||
        key.includes("appkit") ||
        key.includes("CoinbaseWallet") ||
        key.includes("coinbase_wallet") ||
        key.includes("coinbase") ||
        key.includes("Coinbase")
      )) {
        localStorageKeysToRemove.push(key);
      }
    }
    localStorageKeysToRemove.forEach(key => localStorage.removeItem(key));

    // Clear sessionStorage too (some wallets use this)
    const sessionStorageKeysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (
        key.startsWith("wagmi") ||
        key.startsWith("wc") ||
        key.startsWith("W3M") ||
        key.startsWith("@w3m") ||
        key.startsWith("@appkit") ||
        key.startsWith("-walletlink") ||
        key.startsWith("walletlink") ||
        key.startsWith("coinbase") ||
        key.startsWith("Coinbase") ||
        key.includes("walletconnect") ||
        key.includes("reown") ||
        key.includes("appkit") ||
        key.includes("CoinbaseWallet") ||
        key.includes("coinbase")
      )) {
        sessionStorageKeysToRemove.push(key);
      }
    }
    sessionStorageKeysToRemove.forEach(key => sessionStorage.removeItem(key));

    // Clear IndexedDB databases used by wallet SDKs
    // Coinbase Wallet SDK, WalletConnect, and AppKit use IndexedDB
    try {
      const databases = await window.indexedDB.databases();
      for (const db of databases) {
        if (db.name && (
          db.name.includes("walletlink") ||
          db.name.includes("coinbase") ||
          db.name.includes("Coinbase") ||
          db.name.includes("WALLET_CONNECT") ||
          db.name.includes("wc@") ||
          db.name.includes("reown") ||
          db.name.includes("appkit") ||
          db.name.toLowerCase().includes("wallet")
        )) {
          window.indexedDB.deleteDatabase(db.name);
        }
      }
    } catch {
      // IndexedDB.databases() might not be supported in all browsers
    }

    // Set our disconnect flag
    localStorage.setItem(WALLET_DISCONNECTED_KEY, "true");
  }
}

/**
 * Force disconnect and reload page - use this as last resort
 * This guarantees a complete reset of wallet state
 */
export async function forceDisconnectAndReload(): Promise<void> {
  await forceDisconnectWallet();
  if (typeof window !== "undefined") {
    window.location.reload();
  }
}

/**
 * Clear the disconnected flag to allow wallet connection
 */
export function clearDisconnectedFlag(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(WALLET_DISCONNECTED_KEY);
  }
}

/**
 * Check if wallet was explicitly disconnected
 */
export function wasExplicitlyDisconnected(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(WALLET_DISCONNECTED_KEY) === "true";
}

interface Web3ModalProviderProps {
  children: ReactNode;
}

/**
 * Component to handle wallet auto-disconnect when user logged out
 * Only runs once on mount to prevent interfering with in-app wallet connections
 */
function WalletAutoDisconnectHandler() {
  useEffect(() => {
    const checkAndDisconnect = async () => {
      // Only disconnect on initial page load if flag is set
      // This prevents wallet from auto-reconnecting after user logs out
      if (wasExplicitlyDisconnected()) {
        const account = getAccount(wagmiConfig as Config);
        if (account.isConnected) {
          await wagmiDisconnect(wagmiConfig as Config);
        }
      }
    };

    checkAndDisconnect();

    // NOTE: We no longer watch for account changes here because it interferes
    // with legitimate wallet connection attempts in the app. The flag is cleared
    // when the user initiates a new connection via useWallet.connect() or openModal().
  }, []);

  return null;
}

export function Web3ModalProvider({ children }: Web3ModalProviderProps) {
  const queryClient = getQueryClient();

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <WalletAutoDisconnectHandler />
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default Web3ModalProvider;
