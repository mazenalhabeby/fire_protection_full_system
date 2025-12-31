"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useAuth } from "@/hooks/useAuth";
import { useWalletBalances } from "@/hooks/useWalletData";
import { usePageLoading } from "@/hooks/useMinimumLoading";
import {
  ArrowLeft,
  Copy,
  Check,
  User,
  Mail,
  AtSign,
  Share2,
  Sparkles,
  ArrowDownLeft,
  CheckCircle2,
} from "lucide-react";
import { CurrencyIcon } from "@/components/wallet-internal";
import { formatName } from "@/lib/utils";

export default function ReceivePage() {
  const router = useRouter();
  const locale = useLocale();
  const { user } = useAuth();

  // State
  const [copied, setCopied] = useState<string | null>(null);

  // Fetch data
  const { data: balancesData, isLoading: balancesLoading } = useWalletBalances();

  // Loading
  const { isLoading: isMinLoading, stopLoading } = usePageLoading();

  useEffect(() => {
    if (!balancesLoading) {
      stopLoading();
    }
  }, [balancesLoading, stopLoading]);

  // User details for receiving
  const userDetails = {
    email: user?.email || "",
    username: user?.username || "",
    userId: user?.id || "",
    displayName: user?.firstName || user?.lastName
      ? formatName(user?.firstName, user?.lastName)
      : user?.username
        ? `@${user.username}`
        : user?.email?.split("@")[0] || "User",
  };

  const handleCopy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleShare = async () => {
    const shareText = userDetails.username
      ? `Send me HBCT tokens!\n\nUsername: @${userDetails.username}`
      : `Send me HBCT tokens!\n\nEmail: ${userDetails.email}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Receive HBCT",
          text: shareText,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(shareText);
      setCopied("share");
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const showSkeleton = balancesLoading || isMinLoading;

  if (showSkeleton) {
    return <ReceiveSkeleton />;
  }

  // Primary identifier (username preferred, then email)
  const primaryIdentifier = userDetails.username
    ? `@${userDetails.username}`
    : userDetails.email;

  return (
    <div className="flex-1 min-h-screen bg-gradient-to-b from-gray-50 via-gray-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4 py-8 max-w-lg">
        {/* Header */}
        <button
          onClick={() => router.push(`/${locale}/wallet`)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-medium">Back to Wallet</span>
        </button>

        {/* Hero Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-800 via-gray-900 to-gray-950 p-6 mb-6 shadow-xl border border-gray-700/50">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-brand-500/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-500/20 backdrop-blur flex items-center justify-center">
                <ArrowDownLeft className="h-6 w-6 text-brand-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Receive HBCT</h1>
                <p className="text-white/70 text-sm">Share to get paid instantly</p>
              </div>
            </div>

            {/* Primary Identifier */}
            <div className="bg-gray-700/50 backdrop-blur border border-gray-600/50 rounded-2xl p-4 mb-4">
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">
                {userDetails.username ? "Your Username" : "Your Email"}
              </p>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold text-white truncate pr-4">
                  {primaryIdentifier}
                </p>
                <button
                  onClick={() => handleCopy(primaryIdentifier, "primary")}
                  className="p-2.5 rounded-xl bg-gray-600/50 hover:bg-gray-600 transition-colors shrink-0"
                >
                  {copied === "primary" ? (
                    <Check className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <Copy className="h-5 w-5 text-gray-300" />
                  )}
                </button>
              </div>
            </div>

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold transition-colors"
            >
              {copied === "share" ? (
                <>
                  <Check className="h-5 w-5" />
                  Copied!
                </>
              ) : (
                <>
                  <Share2 className="h-5 w-5" />
                  Share My Details
                </>
              )}
            </button>
          </div>
        </div>

        {/* All Receive Methods */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm mb-6">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              All Receive Methods
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Sender can use any of these to find you
            </p>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {/* Username */}
            <div className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
                  <AtSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Username</p>
                  {userDetails.username ? (
                    <p className="font-medium text-gray-900 dark:text-white">
                      @{userDetails.username}
                    </p>
                  ) : (
                    <button
                      onClick={() => router.push(`/${locale}/settings?tab=profile`)}
                      className="text-sm text-brand-500 hover:text-brand-600 font-medium"
                    >
                      Set username →
                    </button>
                  )}
                </div>
              </div>
              {userDetails.username && (
                <button
                  onClick={() => handleCopy(`@${userDetails.username}`, "username")}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
                >
                  {copied === "username" ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Email */}
            {userDetails.email && (
              <div className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {userDetails.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(userDetails.email, "email")}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
                >
                  {copied === "email" ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            )}

            {/* User ID */}
            <div className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">User ID</p>
                  <p className="font-medium text-gray-900 dark:text-white font-mono text-sm">
                    {userDetails.userId.slice(0, 12)}...
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleCopy(userDetails.userId, "userId")}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
              >
                {copied === "userId" ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-brand-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">How it works</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-brand-600 dark:text-brand-400">1</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Share your <span className="font-medium text-gray-900 dark:text-white">username</span> or <span className="font-medium text-gray-900 dark:text-white">email</span> with the sender
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-brand-600 dark:text-brand-400">2</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                They search for you in the <span className="font-medium text-gray-900 dark:text-white">Send</span> page
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium text-gray-900 dark:text-white">Instant transfer</span> — HBCT arrives in seconds
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReceiveSkeleton() {
  return (
    <div className="flex-1 min-h-screen bg-gradient-to-b from-gray-50 via-gray-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded mb-6 animate-pulse" />
        <div className="h-64 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-700 rounded-3xl mb-6 animate-pulse" />
        <div className="h-48 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 animate-pulse" />
      </div>
    </div>
  );
}
