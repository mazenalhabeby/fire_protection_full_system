"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "@/i18n/navigation";
import { LogIn, Clock, Shield } from "lucide-react";

interface SessionExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: "expired" | "revoked" | "security";
}

export function SessionExpiredModal({ isOpen, onClose, reason = "expired" }: SessionExpiredModalProps) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);

  const handleLogin = useCallback(() => {
    onClose();
    router.push('/login');
  }, [router, onClose]);

  // Auto-redirect after countdown
  useEffect(() => {
    if (!isOpen) {
      setCountdown(10);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleLogin();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, handleLogin]);

  if (!isOpen) return null;

  const content = {
    expired: {
      icon: Clock,
      title: "Session Expired",
      description: "Your session has expired due to inactivity. Please log in again to continue.",
      iconColor: "text-amber-500",
      iconBg: "bg-amber-500/10",
    },
    revoked: {
      icon: Shield,
      title: "Session Ended",
      description: "Your session was ended. This may happen if you logged out from another device.",
      iconColor: "text-blue-500",
      iconBg: "bg-blue-500/10",
    },
    security: {
      icon: Shield,
      title: "Security Alert",
      description: "Your session was ended for security reasons. Please log in again.",
      iconColor: "text-red-500",
      iconBg: "bg-red-500/10",
    },
  };

  const { icon: Icon, title, description, iconColor, iconBg } = content[reason];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        {/* Decorative top gradient */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-500 via-purple-500 to-pink-500" />

        <div className="p-6 pt-8">
          {/* Icon */}
          <div className="flex justify-center mb-5">
            <div className={`w-16 h-16 rounded-2xl ${iconBg} flex items-center justify-center`}>
              <Icon className={`h-8 w-8 ${iconColor}`} />
            </div>
          </div>

          {/* Title & Description */}
          <h2 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-2">
            {title}
          </h2>
          <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-6">
            {description}
          </p>

          {/* Login Button */}
          <button
            onClick={handleLogin}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25"
          >
            <LogIn className="h-4 w-4" />
            Log In Again
          </button>

          {/* Auto-redirect countdown */}
          <p className="text-xs text-center text-gray-400 mt-4">
            Redirecting to login in {countdown}s...
          </p>
        </div>
      </div>
    </div>
  );
}
