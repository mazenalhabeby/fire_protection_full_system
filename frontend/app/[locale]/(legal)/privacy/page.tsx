"use client";

import { useTranslations } from "next-intl";
import { useRegisterSection } from "@/hooks/useNavbarTheme";
import { Shield, Eye, Database, Lock, Globe, UserCheck, Bell, Mail } from "lucide-react";
import { Link } from "@/i18n/navigation";

export default function PrivacyPolicyPage() {
  const heroRef = useRegisterSection("privacy-hero", "dark");
  const contentRef = useRegisterSection("privacy-content", "light");
  const t = useTranslations("privacy");

  const sections = [
    {
      id: "collection",
      icon: Database,
      title: t("sections.collection.title"),
      content: t("sections.collection.content"),
    },
    {
      id: "usage",
      icon: Eye,
      title: t("sections.usage.title"),
      content: t("sections.usage.content"),
    },
    {
      id: "blockchain",
      icon: Globe,
      title: t("sections.blockchain.title"),
      content: t("sections.blockchain.content"),
    },
    {
      id: "cookies",
      icon: Database,
      title: t("sections.cookies.title"),
      content: t("sections.cookies.content"),
    },
    {
      id: "sharing",
      icon: UserCheck,
      title: t("sections.sharing.title"),
      content: t("sections.sharing.content"),
    },
    {
      id: "security",
      icon: Lock,
      title: t("sections.security.title"),
      content: t("sections.security.content"),
    },
    {
      id: "retention",
      icon: Database,
      title: t("sections.retention.title"),
      content: t("sections.retention.content"),
    },
    {
      id: "rights",
      icon: UserCheck,
      title: t("sections.rights.title"),
      content: t("sections.rights.content"),
    },
    {
      id: "international",
      icon: Globe,
      title: t("sections.international.title"),
      content: t("sections.international.content"),
    },
    {
      id: "children",
      icon: Shield,
      title: t("sections.children.title"),
      content: t("sections.children.content"),
    },
    {
      id: "changes",
      icon: Bell,
      title: t("sections.changes.title"),
      content: t("sections.changes.content"),
    },
  ];

  const dataTypes = [
    { label: t("dataTypes.personal"), description: t("dataTypes.personalDesc") },
    { label: t("dataTypes.wallet"), description: t("dataTypes.walletDesc") },
    { label: t("dataTypes.transaction"), description: t("dataTypes.transactionDesc") },
    { label: t("dataTypes.device"), description: t("dataTypes.deviceDesc") },
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
              <Shield className="w-4 h-4" />
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

          {/* Data Types Overview */}
          <div className="bg-brand-50 rounded-2xl p-6 mb-12">
            <h2 className="font-bebas-neue text-xl tracking-wide text-gray-900 mb-4">
              {t("dataOverview")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dataTypes.map((type, index) => (
                <div
                  key={index}
                  className="p-4 bg-white rounded-xl border border-brand-100"
                >
                  <h3 className="font-medium text-gray-900 mb-1">
                    {type.label}
                  </h3>
                  <p className="text-sm text-gray-500">{type.description}</p>
                </div>
              ))}
            </div>
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

          {/* Your Rights Summary */}
          <div className="mt-16 p-8 rounded-2xl bg-gray-50 border border-gray-100">
            <h3 className="font-bebas-neue text-2xl tracking-wide text-gray-900 mb-6">
              {t("rightsSummary.title")}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                t("rightsSummary.access"),
                t("rightsSummary.rectification"),
                t("rightsSummary.erasure"),
                t("rightsSummary.portability"),
                t("rightsSummary.restriction"),
                t("rightsSummary.objection"),
              ].map((right, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-brand-500" />
                  <span className="text-gray-600">{right}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Section */}
          <div className="mt-12 p-8 rounded-2xl bg-gray-900 text-white">
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
                <div className="space-y-2">
                  <a
                    href="mailto:privacy@hbc-engineering.com"
                    className="block text-brand-400 hover:text-brand-300 transition-colors"
                  >
                    privacy@hbc-engineering.com
                  </a>
                  <p className="text-gray-500 text-sm">
                    {t("contact.address")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Links */}
          <div className="mt-12 pt-8 border-t border-gray-200 flex flex-wrap gap-4 justify-center text-sm text-gray-500">
            <Link href="/terms" className="hover:text-brand-500 transition-colors">
              {t("links.terms")}
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
