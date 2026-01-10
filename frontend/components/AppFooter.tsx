"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useCookieConsent } from "@/providers/CookieConsentProvider";

export function AppFooter() {
  const t = useTranslations("cookies");
  const { openSettings } = useCookieConsent();

  return (
    <footer className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-800/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Copyright */}
          <p className="text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} HBC Engineering. All rights reserved.
          </p>

          {/* Links */}
          <div className="flex items-center gap-6">
            <Link
              href="/terms"
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/help/contact"
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Support
            </Link>
            <button
              onClick={openSettings}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {t("footer.manageCookies")}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
