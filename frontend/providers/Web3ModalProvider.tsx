"use client";

import React, { ReactNode, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { bsc, bscTestnet, mainnet, sepolia } from "wagmi/chains";
import { injected, metaMask, coinbaseWallet, walletConnect } from "wagmi/connectors";
import { disconnect as wagmiDisconnect, getAccount, watchAccount, type Config } from "@wagmi/core";

// Project ID from WalletConnect Cloud
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

// LocalStorage key to track if user explicitly logged out
const WALLET_DISCONNECTED_KEY = "wallet_explicitly_disconnected";

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
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

// Create wagmi config with connectors
export const wagmiConfig = createConfig({
  chains: [bsc, bscTestnet, mainnet, sepolia],
  connectors: [
    metaMask({
      dappMetadata: {
        name: "HBCT Fire Protection",
      },
    }),
    coinbaseWallet({
      appName: "HBCT Fire Protection",
      appLogoUrl: "https://hbct.io/logo.png",
    }),
    ...(projectId ? [walletConnect({
      projectId,
      metadata: {
        name: "HBCT Fire Protection",
        description: "HBCT Fire Protection Token Platform",
        url: "https://hbct.io",
        icons: ["https://hbct.io/logo.png"],
      },
    })] : []),
    injected({
      shimDisconnect: true,
    }),
  ],
  transports: {
    [bsc.id]: http(),
    [bscTestnet.id]: http(),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
  ssr: true,
});

/**
 * Disconnect wallet and set flag to prevent auto-reconnection
 * Call this on logout to ensure wallet doesn't auto-reconnect
 */
export async function disconnectWallet(): Promise<void> {
  try {
    // Set flag to prevent auto-reconnection
    if (typeof window !== "undefined") {
      localStorage.setItem(WALLET_DISCONNECTED_KEY, "true");
    }

    // Disconnect all connectors
    await wagmiDisconnect(wagmiConfig as Config);
  } catch {
    // Silently handle disconnect errors
  }
}

/**
 * Clear the disconnected flag to allow wallet connection
 * Call this when user explicitly connects wallet
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
 * Watches for connection changes and disconnects if the flag is set
 */
function WalletAutoDisconnectHandler() {
  useEffect(() => {
    const checkAndDisconnect = async () => {
      if (wasExplicitlyDisconnected()) {
        const account = getAccount(wagmiConfig as Config);
        if (account.isConnected) {
          await wagmiDisconnect(wagmiConfig as Config);
        }
      }
    };

    checkAndDisconnect();

    const unwatch = watchAccount(wagmiConfig as Config, {
      onChange: async (account) => {
        if (account.isConnected && wasExplicitlyDisconnected()) {
          await wagmiDisconnect(wagmiConfig as Config);
        }
      },
    });

    return () => {
      unwatch();
    };
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
