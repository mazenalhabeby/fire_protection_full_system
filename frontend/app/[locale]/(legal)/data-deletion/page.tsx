"use client";

import { useTranslations } from "next-intl";
import { useRegisterSection } from "@/hooks/useNavbarTheme";
import { Trash2, Mail } from "lucide-react";
import { Link } from "@/i18n/navigation";

export default function DataDeletionPage() {
  const heroRef = useRegisterSection("data-deletion-hero", "dark");
  const contentRef = useRegisterSection("data-deletion-content", "light");
  const t = useTranslations("dataDeletion");

  return (
    <main className="overflow-x-hidden">
      {/* Hero Section - Dark */}
      <section
        ref={heroRef}
        className="relative w-full bg-black pt-32 pb-20 overflow-hidden"
      >
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-500/10 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-brand-400 text-sm font-medium mb-6 border border-white/10">
              <Trash2 className="w-4 h-4" />
              <span>{t("badge")}</span>
            </div>
            <h1 className="font-bebas-neue text-4xl md:text-5xl lg:text-6xl tracking-wide text-white mb-4">
              {t("title")}
            </h1>
          </div>
        </div>
      </section>

      {/* Content Section - Light */}
      <section ref={contentRef} className="relative w-full bg-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Introduction */}
          <div className="prose prose-gray max-w-none mb-12">
            <p className="text-lg text-gray-600 leading-relaxed">
              {t("introduction")}
            </p>
          </div>

          {/* Instructions */}
          <div className="bg-gray-50 rounded-2xl p-8 mb-12">
            <h2 className="font-bebas-neue text-2xl tracking-wide text-gray-900 mb-6">
              {t("instructions.title")}
            </h2>
            <ol className="space-y-4">
              <li className="flex items-start gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center font-medium">
                  1
                </span>
                <div className="pt-1">
                  <p className="text-gray-700">
                    {t("instructions.step1")}{" "}
                    <a
                      href="mailto:privacy@fire-protection.tech"
                      className="text-brand-500 hover:text-brand-600 font-medium"
                    >
                      privacy@fire-protection.tech
                    </a>
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center font-medium">
                  2
                </span>
                <div className="pt-1">
                  <p className="text-gray-700">
                    {t("instructions.step2")}{" "}
                    <span className="font-medium text-gray-900">
                      &quot;Facebook Data Deletion Request&quot;
                    </span>
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center font-medium">
                  3
                </span>
                <div className="pt-1">
                  <p className="text-gray-700">{t("instructions.step3")}</p>
                </div>
              </li>
            </ol>
          </div>

          {/* Confirmation */}
          <div className="p-8 rounded-2xl bg-gray-900 text-white">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand-500 flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bebas-neue text-2xl tracking-wide mb-2">
                  {t("confirmation.title")}
                </h3>
                <p className="text-gray-400">{t("confirmation.description")}</p>
              </div>
            </div>
          </div>

          {/* Footer Links */}
          <div className="mt-12 pt-8 border-t border-gray-200 flex flex-wrap gap-4 justify-center text-sm text-gray-500">
            <Link
              href="/privacy"
              className="hover:text-brand-500 transition-colors"
            >
              {t("links.privacy")}
            </Link>
            <span>•</span>
            <Link
              href="/terms"
              className="hover:text-brand-500 transition-colors"
            >
              {t("links.terms")}
            </Link>
            <span>•</span>
            <Link href="/" className="hover:text-brand-500 transition-colors">
              {t("links.home")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
