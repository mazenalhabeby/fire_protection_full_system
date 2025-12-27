import { cookieStorage, createStorage } from "@wagmi/core";
import { bsc, bscTestnet, mainnet, sepolia } from "wagmi/chains";

// Get projectId from https://cloud.reown.com
export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
  console.warn("WalletConnect Project ID is not defined. Wallet connection will not work.");
}

// App metadata for WalletConnect
export const metadata = {
  name: "HBCT Fire Protection",
  description: "HBC Fire Protection Token - Secure your assets with blockchain technology",
  url: typeof window !== "undefined" ? window.location.origin : "https://hbctoken.com",
  icons: ["/logo.png"],
};

// Supported chains - BSC is primary for HBCT token
export const chains = [bsc, bscTestnet, mainnet, sepolia] as const;

// Default chain for the app
export const defaultChain = bsc;

// Wagmi storage configuration for SSR
export const wagmiStorage = createStorage({
  storage: cookieStorage,
});

// Chain display names
export const chainNames: Record<number, string> = {
  [bsc.id]: "BNB Smart Chain",
  [bscTestnet.id]: "BSC Testnet",
  [mainnet.id]: "Ethereum",
  [sepolia.id]: "Sepolia Testnet",
};

// Chain icons
export const chainIcons: Record<number, string> = {
  [bsc.id]: "/chains/bnb.svg",
  [bscTestnet.id]: "/chains/bnb.svg",
  [mainnet.id]: "/chains/eth.svg",
  [sepolia.id]: "/chains/eth.svg",
};

// Explorer URLs
export const explorerUrls: Record<number, string> = {
  [bsc.id]: "https://bscscan.com",
  [bscTestnet.id]: "https://testnet.bscscan.com",
  [mainnet.id]: "https://etherscan.io",
  [sepolia.id]: "https://sepolia.etherscan.io",
};

// Get explorer URL for an address
export const getAddressExplorerUrl = (chainId: number, address: string): string => {
  const baseUrl = explorerUrls[chainId] || explorerUrls[bsc.id];
  return `${baseUrl}/address/${address}`;
};

// Get explorer URL for a transaction
export const getTxExplorerUrl = (chainId: number, txHash: string): string => {
  const baseUrl = explorerUrls[chainId] || explorerUrls[bsc.id];
  return `${baseUrl}/tx/${txHash}`;
};

// Format address for display (0x1234...5678)
export const formatAddress = (address: string, chars = 4): string => {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
};

// Format balance with proper decimals
export const formatBalance = (balance: bigint, decimals = 18, displayDecimals = 4): string => {
  const divisor = BigInt(10 ** decimals);
  const integerPart = balance / divisor;
  const fractionalPart = balance % divisor;

  const fractionalString = fractionalPart.toString().padStart(decimals, "0");
  const displayFractional = fractionalString.slice(0, displayDecimals);

  return `${integerPart}.${displayFractional}`;
};
