/**
 * Shared Tier Configuration
 *
 * This file contains tier styling configurations used across
 * locking and affiliate pages for consistent visual representation.
 */

import type { LockTier, AffiliateTier } from "@/types/api";

export interface TierStyle {
  coin: string | null;
  logo: string | null;
  bgGradient: string;
  borderColor: string;
  shadowColor: string;
  textColor: string;
  iconBg: string;
  accent: string;
  glowColor?: string;
}

/**
 * Tier styling configuration for lock tiers and affiliate tiers
 * Used for consistent styling of tier badges, cards, and indicators
 */
export const tierStyles: Record<string, TierStyle> = {
  Starter: {
    coin: null,
    logo: null,
    bgGradient: "from-gray-100/80 to-gray-200/80 dark:from-gray-800/60 dark:to-gray-700/60",
    borderColor: "border-gray-300 dark:border-gray-600",
    shadowColor: "shadow-gray-300/30 dark:shadow-gray-700/30",
    textColor: "text-gray-600 dark:text-gray-300",
    iconBg: "bg-gray-400",
    accent: "gray",
    glowColor: "shadow-gray-300/50",
  },
  Silver: {
    coin: "/images/token/coin-silver.svg",
    logo: "/images/logo-white.svg",
    bgGradient: "from-gray-100/80 to-gray-200/80 dark:from-gray-700/50 dark:to-gray-600/50",
    borderColor: "border-gray-300 dark:border-gray-500",
    shadowColor: "shadow-gray-400/40 dark:shadow-gray-500/30",
    textColor: "text-gray-600 dark:text-gray-300",
    iconBg: "bg-gradient-to-br from-gray-300 to-gray-400",
    accent: "gray",
    glowColor: "shadow-gray-300/50",
  },
  Gold: {
    coin: "/images/token/coin-gold.svg",
    logo: "/images/logo.svg",
    bgGradient: "from-yellow-100/80 to-amber-100/80 dark:from-yellow-900/40 dark:to-amber-900/40",
    borderColor: "border-yellow-400 dark:border-yellow-500",
    shadowColor: "shadow-yellow-400/40 dark:shadow-yellow-500/30",
    textColor: "text-yellow-600 dark:text-yellow-400",
    iconBg: "bg-gradient-to-br from-yellow-400 to-amber-500",
    accent: "yellow",
    glowColor: "shadow-yellow-400/50",
  },
  Platinum: {
    coin: "/images/token/coin-platinum.svg",
    logo: "/images/logo-dark.svg",
    bgGradient: "from-purple-100/80 to-indigo-100/80 dark:from-purple-900/40 dark:to-indigo-900/40",
    borderColor: "border-purple-400 dark:border-purple-500",
    shadowColor: "shadow-purple-400/40 dark:shadow-purple-500/30",
    textColor: "text-purple-600 dark:text-purple-400",
    iconBg: "bg-gradient-to-br from-purple-400 to-indigo-500",
    accent: "purple",
    glowColor: "shadow-purple-400/50",
  },
};

/**
 * Get tier style configuration by tier name
 * Falls back to Starter/Silver tier if name not found
 */
export function getTierStyle(tierName: string): TierStyle {
  return tierStyles[tierName] || tierStyles.Silver;
}

/**
 * Leaderboard rank styles for top positions
 */
export const leaderboardRankStyles = {
  1: {
    bg: "bg-gradient-to-br from-yellow-400 to-amber-500",
    text: "text-white",
    icon: "Crown",
    shadow: "shadow-yellow-500/30",
  },
  2: {
    bg: "bg-gradient-to-br from-gray-300 to-gray-400",
    text: "text-white",
    icon: "Medal",
    shadow: "shadow-gray-400/30",
  },
  3: {
    bg: "bg-gradient-to-br from-amber-600 to-orange-700",
    text: "text-white",
    icon: "Medal",
    shadow: "shadow-amber-600/30",
  },
} as const;

/**
 * Status badge configurations
 */
export const statusStyles = {
  ACTIVE: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20",
  },
  PENDING: {
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20",
  },
  COMPLETED: {
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-500 dark:text-gray-400",
    border: "border-gray-200 dark:border-gray-700",
  },
  CONVERTED: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20",
  },
  FAILED: {
    bg: "bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-500/20",
  },
} as const;

export type StatusType = keyof typeof statusStyles;

/**
 * Lock tiers with fixed bonus percentages
 * These are static values used for display purposes
 */
export const lockTiers: LockTier[] = [
  {
    id: "1",
    name: "Silver",
    lockMonths: 6,
    bonusPercent: "7",
    minAmount: "100",
    maxAmount: "50000",
  },
  {
    id: "2",
    name: "Gold",
    lockMonths: 12,
    bonusPercent: "20",
    minAmount: "500",
    maxAmount: "100000",
  },
  {
    id: "3",
    name: "Platinum",
    lockMonths: 24,
    bonusPercent: "50",
    minAmount: "1000",
    maxAmount: "500000",
  },
];

/**
 * Affiliate tiers with commission rates
 */
export const affiliateTiers: AffiliateTier[] = [
  {
    id: "1",
    name: "Starter",
    level: 1,
    commissionRate: "3",
    minReferrals: 0,
    minVolume: "0",
    benefits: ["3% commission on all sales", "Basic analytics", "Email support"],
    badgeColor: "gray",
  },
  {
    id: "2",
    name: "Silver",
    level: 2,
    commissionRate: "5",
    minReferrals: 10,
    minVolume: "1000",
    benefits: [
      "5% commission on all sales",
      "Advanced analytics",
      "Priority support",
      "Custom referral links",
    ],
    badgeColor: "gray",
  },
  {
    id: "3",
    name: "Gold",
    level: 3,
    commissionRate: "7",
    minReferrals: 50,
    minVolume: "10000",
    benefits: [
      "7% commission on all sales",
      "Real-time analytics",
      "Dedicated account manager",
      "Marketing materials",
      "Early access to features",
    ],
    badgeColor: "yellow",
  },
  {
    id: "4",
    name: "Platinum",
    level: 4,
    commissionRate: "15",
    minReferrals: 100,
    minVolume: "50000",
    benefits: [
      "15% commission on all sales",
      "VIP support",
      "Custom landing pages",
      "Exclusive bonuses",
      "Revenue share opportunities",
    ],
    badgeColor: "purple",
  },
];
