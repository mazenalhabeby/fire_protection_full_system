"use client";

import { useState } from "react";
import { Wallet, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";

interface OffChainBalanceMobileProps {
  balance?: string;
  className?: string;
  onNavigate?: () => void;
}

export function OffChainBalanceMobile({
  balance = "0.00",
  className,
  onNavigate
}: OffChainBalanceMobileProps) {
  const [showBalance, setShowBalance] = useState(true);

  // Toggle between balance and label
  const handleToggle = () => {
    setShowBalance(!showBalance);
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl",
        "bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900",
        "border border-gray-200 dark:border-gray-700",
        className
      )}
    >
      <div className="flex items-center h-10">
        {/* Toggle Button */}
        <button
          onClick={handleToggle}
          className={cn(
            "h-full flex items-center gap-2 px-4 transition-all duration-300",
            "text-sm font-medium",
            "text-gray-700 dark:text-gray-300"
          )}
        >
          {/* Wallet Icon with indicator */}
          <div className="relative">
            <Wallet className="w-4 h-4" />
            {/* Active indicator */}
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white dark:border-gray-800" />
          </div>

          {/* Content with slide animation */}
          <div className="relative overflow-hidden min-w-[80px]">
            <div
              className={cn(
                "transition-all duration-300",
                showBalance ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
              )}
            >
              {balance} HBCT
            </div>

            <div
              className={cn(
                "absolute top-0 left-0 transition-all duration-300",
                !showBalance ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
              )}
            >
              Off-chain
            </div>
          </div>
        </button>

        {/* Details Button */}
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className={cn(
            "h-full px-3 flex items-center justify-center",
            "border-l border-gray-200 dark:border-gray-700",
            "text-gray-400 hover:text-brand-500 dark:hover:text-brand-400",
            "transition-colors"
          )}
        >
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

export default OffChainBalanceMobile;
