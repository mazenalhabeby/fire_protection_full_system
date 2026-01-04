"use client";

import { useTranslations } from "next-intl";
import { useRegisterSection } from "@/hooks/useNavbarTheme";
import { FileText, Shield, AlertTriangle, Scale, Mail } from "lucide-react";
import { Link } from "@/i18n/navigation";

export default function TermsOfServicePage() {
  const heroRef = useRegisterSection("terms-hero", "dark");
  const contentRef = useRegisterSection("terms-content", "light");
  const t = useTranslations("terms");

  const sections = [
    {
      id: "acceptance",
      icon: FileText,
      title: t("sections.acceptance.title"),
      content: t("sections.acceptance.content"),
    },
    {
      id: "eligibility",
      icon: Shield,
      title: t("sections.eligibility.title"),
      content: t("sections.eligibility.content"),
    },
    {
      id: "account",
      icon: Shield,
      title: t("sections.account.title"),
      content: t("sections.account.content"),
    },
    {
      id: "tokens",
      icon: Scale,
      title: t("sections.tokens.title"),
      content: t("sections.tokens.content"),
    },
    {
      id: "marketplace",
      icon: FileText,
      title: t("sections.marketplace.title"),
      content: t("sections.marketplace.content"),
    },
    {
      id: "prohibited",
      icon: AlertTriangle,
      title: t("sections.prohibited.title"),
      content: t("sections.prohibited.content"),
    },
    {
      id: "intellectual",
      icon: Shield,
      title: t("sections.intellectual.title"),
      content: t("sections.intellectual.content"),
    },
    {
      id: "disclaimer",
      icon: AlertTriangle,
      title: t("sections.disclaimer.title"),
      content: t("sections.disclaimer.content"),
    },
    {
      id: "liability",
      icon: Scale,
      title: t("sections.liability.title"),
      content: t("sections.liability.content"),
    },
    {
      id: "termination",
      icon: FileText,
      title: t("sections.termination.title"),
      content: t("sections.termination.content"),
    },
    {
      id: "governing",
      icon: Scale,
      title: t("sections.governing.title"),
      content: t("sections.governing.content"),
    },
    {
      id: "changes",
      icon: FileText,
      title: t("sections.changes.title"),
      content: t("sections.changes.content"),
    },
  ];

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
              <FileText className="w-4 h-4" />
              <span>{t("badge")}</span>
            </div>
            <h1 className="font-bebas-neue text-4xl md:text-5xl lg:text-6xl tracking-wide text-white mb-4">
              {t("title")}
            </h1>
            <p className="text-gray-400 text-lg">
              {t("lastUpdated")}: {t("updateDate")}
            </p>
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

          {/* Table of Contents */}
          <div className="bg-gray-50 rounded-2xl p-6 mb-12">
            <h2 className="font-bebas-neue text-xl tracking-wide text-gray-900 mb-4">
              {t("tableOfContents")}
            </h2>
            <nav className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {sections.map((section, index) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="flex items-center gap-2 text-gray-600 hover:text-brand-500 transition-colors text-sm"
                >
                  <span className="text-brand-500 font-medium">
                    {String(index + 1).padStart(2, "0")}.
                  </span>
                  {section.title}
                </a>
              ))}
            </nav>
          </div>

          {/* Sections */}
          <div className="space-y-12">
            {sections.map((section, index) => (
              <div
                key={section.id}
                id={section.id}
                className="scroll-mt-24"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                    <section.icon className="w-5 h-5 text-brand-500" />
                  </div>
                  <h2 className="font-bebas-neue text-2xl md:text-3xl tracking-wide text-gray-900 pt-1">
                    {String(index + 1).padStart(2, "0")}. {section.title}
                  </h2>
                </div>
                <div className="pl-14">
                  <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                    {section.content}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Contact Section */}
          <div className="mt-16 p-8 rounded-2xl bg-gray-900 text-white">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand-500 flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bebas-neue text-2xl tracking-wide mb-2">
                  {t("contact.title")}
                </h3>
                <p className="text-gray-400 mb-4">
                  {t("contact.description")}
                </p>
                <a
                  href="mailto:legal@hbc-engineering.com"
                  className="text-brand-400 hover:text-brand-300 transition-colors"
                >
                  legal@hbc-engineering.com
                </a>
              </div>
            </div>
          </div>

          {/* Footer Links */}
          <div className="mt-12 pt-8 border-t border-gray-200 flex flex-wrap gap-4 justify-center text-sm text-gray-500">
            <Link href="/privacy" className="hover:text-brand-500 transition-colors">
              {t("links.privacy")}
            </Link>
            <span>•</span>
            <Link href="/audit" className="hover:text-brand-500 transition-colors">
              {t("links.audit")}
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
