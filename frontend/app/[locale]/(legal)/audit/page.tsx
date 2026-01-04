"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useRegisterSection } from "@/hooks/useNavbarTheme";
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  FileText,
  Code,
  Lock,
  Coins,
  Globe,
  Server,
  Wallet,
  Eye,
  Zap,
  Database,
  Users,
  ExternalLink,
  Download,
  Loader2,
} from "lucide-react";
import { Link } from "@/i18n/navigation";

type TabType = "smart-contract" | "platform";

export default function AuditReportPage() {
  const heroRef = useRegisterSection("audit-hero", "dark");
  const contentRef = useRegisterSection("audit-content", "light");
  const t = useTranslations("audit");
  const [activeTab, setActiveTab] = useState<TabType>("smart-contract");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownloadPdf = async () => {
    setIsGenerating(true);
    try {
      const module = await import("@/lib/utils/generateAuditPdf");
      if (module && module.generateAuditPdf) {
        module.generateAuditPdf({
          reportDate: "December 27, 2024",
          version: "1.0",
        });
      } else {
        throw new Error("generateAuditPdf function not found in module");
      }
    } catch (error) {
      alert("Failed to generate PDF: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsGenerating(false);
    }
  };

  const tabs = [
    { id: "smart-contract" as TabType, label: t("tabs.smartContract"), icon: Code },
    { id: "platform" as TabType, label: t("tabs.platform"), icon: Server },
  ];

  return (
    <main className="overflow-x-hidden">
      {/* Hero Section - Dark */}
      <section
        ref={heroRef}
        className="relative w-full bg-black pt-32 pb-12 overflow-hidden"
      >
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-green-500/10 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-green-400 text-sm font-medium mb-6 border border-white/10">
              <Shield className="w-4 h-4" />
              <span>{t("badge")}</span>
            </div>
            <h1 className="font-bebas-neue text-4xl md:text-5xl lg:text-6xl tracking-wide text-white mb-4">
              {t("title")}
            </h1>
            <p className="text-gray-400 text-lg">
              {t("subtitle")}
            </p>
            <p className="text-gray-500 text-sm mt-4">
              {t("reportDate")}: December 27, 2024 | {t("version")}: 1.0
            </p>
          </div>

          {/* Tabs */}
          <div className="flex justify-center mt-10">
            <div className="inline-flex items-center p-1.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300",
                    activeTab === tab.id
                      ? "bg-green-500 text-white shadow-lg shadow-green-500/25"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Report Content - Light */}
      <section ref={contentRef} className="relative w-full bg-white py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Smart Contract Tab Content */}
          {activeTab === "smart-contract" && (
            <div className="animate-in fade-in duration-300">
              {/* Executive Summary */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="font-bebas-neue text-2xl md:text-3xl tracking-wide text-gray-900">
                    {t("executiveSummary.title")}
                  </h2>
                </div>
                <div className="p-6 rounded-2xl bg-green-50 border border-green-100">
                  <div className="flex items-start gap-4">
                    <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-green-800 font-medium mb-2">{t("executiveSummary.status")}</p>
                      <p className="text-green-700 text-sm leading-relaxed">
                        {t("smartContract.summary")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contract Overview */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center">
                    <Code className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="font-bebas-neue text-2xl md:text-3xl tracking-wide text-gray-900">
                    {t("contractOverview.title")}
                  </h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 pr-4 text-gray-500 font-medium w-1/3">{t("contractOverview.tokenName")}</td>
                        <td className="py-3 text-gray-900">HBC Fire Protection Token (HBCT)</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 pr-4 text-gray-500 font-medium">{t("contractOverview.contractAddress")}</td>
                        <td className="py-3 text-gray-900 font-mono text-sm break-all">
                          0x7D57480119a5958ca29d41EE8d770E71b4465329
                          <a
                            href="https://bscscan.com/token/0x7D57480119a5958ca29d41EE8d770E71b4465329"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 ml-2 text-brand-500 hover:text-brand-600"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 pr-4 text-gray-500 font-medium">{t("contractOverview.network")}</td>
                        <td className="py-3 text-gray-900">BNB Smart Chain (BSC) - Chain ID: 56</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 pr-4 text-gray-500 font-medium">{t("contractOverview.tokenStandard")}</td>
                        <td className="py-3 text-gray-900">BEP-20 (ERC-20 Compatible)</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 pr-4 text-gray-500 font-medium">{t("contractOverview.decimals")}</td>
                        <td className="py-3 text-gray-900">18</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 pr-4 text-gray-500 font-medium">{t("contractOverview.totalSupply")}</td>
                        <td className="py-3 text-gray-900">250,000,000 HBCT</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 pr-4 text-gray-500 font-medium">{t("contractOverview.presalePrice")}</td>
                        <td className="py-3 text-gray-900">$0.03 USD</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Smart Contract Functions */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="font-bebas-neue text-2xl md:text-3xl tracking-wide text-gray-900">
                    {t("contractFunctions.title")}
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { func: "transfer(address, uint256)", desc: t("contractFunctions.transfer") },
                    { func: "balanceOf(address)", desc: t("contractFunctions.balanceOf") },
                    { func: "decimals()", desc: t("contractFunctions.decimals") },
                    { func: "symbol()", desc: t("contractFunctions.symbol") },
                    { func: "allowance(address, address)", desc: t("contractFunctions.allowance") },
                    { func: "Transfer event", desc: t("contractFunctions.transferEvent") },
                  ].map((item, index) => (
                    <div key={index} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                      <code className="text-sm text-blue-600 font-mono">{item.func}</code>
                      <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security Analysis */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="font-bebas-neue text-2xl md:text-3xl tracking-wide text-gray-900">
                    {t("securityAnalysis.title")}
                  </h2>
                </div>

                <div className="space-y-4">
                  {[
                    { status: "pass", title: t("securityAnalysis.items.standard.title"), desc: t("securityAnalysis.items.standard.desc") },
                    { status: "pass", title: t("securityAnalysis.items.ownership.title"), desc: t("securityAnalysis.items.ownership.desc") },
                    { status: "pass", title: t("securityAnalysis.items.reentrancy.title"), desc: t("securityAnalysis.items.reentrancy.desc") },
                    { status: "pass", title: t("securityAnalysis.items.overflow.title"), desc: t("securityAnalysis.items.overflow.desc") },
                    { status: "pass", title: t("securityAnalysis.items.gasLimit.title"), desc: t("securityAnalysis.items.gasLimit.desc") },
                    { status: "info", title: t("securityAnalysis.items.centralization.title"), desc: t("securityAnalysis.items.centralization.desc") },
                  ].map((item, index) => (
                    <div key={index} className={cn(
                      "p-4 rounded-xl border",
                      item.status === "pass" ? "bg-green-50 border-green-100" : "bg-blue-50 border-blue-100"
                    )}>
                      <div className="flex items-start gap-3">
                        <CheckCircle className={cn(
                          "w-5 h-5 flex-shrink-0 mt-0.5",
                          item.status === "pass" ? "text-green-500" : "text-blue-500"
                        )} />
                        <div>
                          <p className={cn(
                            "font-medium",
                            item.status === "pass" ? "text-green-800" : "text-blue-800"
                          )}>{item.title}</p>
                          <p className={cn(
                            "text-sm mt-1",
                            item.status === "pass" ? "text-green-700" : "text-blue-700"
                          )}>{item.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contract Recommendations */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="font-bebas-neue text-2xl md:text-3xl tracking-wide text-gray-900">
                    {t("smartContract.recommendations.title")}
                  </h2>
                </div>

                <div className="space-y-3">
                  {[
                    t("smartContract.recommendations.multisig"),
                    t("smartContract.recommendations.thirdPartyAudit"),
                  ].map((item, index) => (
                    <div key={index} className="flex items-start gap-3 p-4 rounded-xl bg-yellow-50 border border-yellow-100">
                      <span className="text-yellow-600 font-bold">{index + 1}.</span>
                      <p className="text-yellow-800">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Conclusion */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="font-bebas-neue text-2xl md:text-3xl tracking-wide text-gray-900">
                    {t("conclusion.title")}
                  </h2>
                </div>

                <div className="p-6 rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100">
                  <p className="text-green-800 leading-relaxed">
                    {t("smartContract.conclusion")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Platform Tab Content */}
          {activeTab === "platform" && (
            <div className="animate-in fade-in duration-300">
              {/* Executive Summary */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="font-bebas-neue text-2xl md:text-3xl tracking-wide text-gray-900">
                    {t("executiveSummary.title")}
                  </h2>
                </div>
                <div className="p-6 rounded-2xl bg-green-50 border border-green-100">
                  <div className="flex items-start gap-4">
                    <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-green-800 font-medium mb-2">{t("executiveSummary.status")}</p>
                      <p className="text-green-700 text-sm leading-relaxed">
                        {t("platform.summary")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Platform Wallet Addresses */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="font-bebas-neue text-2xl md:text-3xl tracking-wide text-gray-900">
                    {t("platformWallets.title")}
                  </h2>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">{t("platformWallets.depositWallet")}</p>
                    <p className="font-mono text-sm text-gray-900 break-all">
                      0x1ed6D2148bD01E0cF0261E24181dA3a6f466F585
                      <a
                        href="https://bscscan.com/address/0x1ed6D2148bD01E0cF0261E24181dA3a6f466F585"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 ml-2 text-brand-500 hover:text-brand-600"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                    <p className="text-xs text-gray-400 mt-2">{t("platformWallets.depositDescription")}</p>
                  </div>
                </div>
              </div>

              {/* Platform Integration Security */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center">
                    <Server className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="font-bebas-neue text-2xl md:text-3xl tracking-wide text-gray-900">
                    {t("platformSecurity.title")}
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { icon: Lock, title: t("platformSecurity.items.2fa"), color: "text-green-500" },
                    { icon: Shield, title: t("platformSecurity.items.encryption"), color: "text-blue-500" },
                    { icon: Eye, title: t("platformSecurity.items.auditLog"), color: "text-purple-500" },
                    { icon: Users, title: t("platformSecurity.items.multiWallet"), color: "text-orange-500" },
                    { icon: Database, title: t("platformSecurity.items.confirmations"), color: "text-cyan-500" },
                    { icon: Zap, title: t("platformSecurity.items.rateLimiting"), color: "text-pink-500" },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                      <item.icon className={cn("w-5 h-5", item.color)} />
                      <span className="text-gray-700">{item.title}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Withdrawal Security */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
                    <Coins className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="font-bebas-neue text-2xl md:text-3xl tracking-wide text-gray-900">
                    {t("withdrawalSecurity.title")}
                  </h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 pr-4 text-gray-500 font-medium w-1/2">{t("withdrawalSecurity.minAmount")}</td>
                        <td className="py-3 text-gray-900">100 HBCT</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 pr-4 text-gray-500 font-medium">{t("withdrawalSecurity.maxAmount")}</td>
                        <td className="py-3 text-gray-900">100,000 HBCT</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 pr-4 text-gray-500 font-medium">{t("withdrawalSecurity.feePercent")}</td>
                        <td className="py-3 text-gray-900">0.1%</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 pr-4 text-gray-500 font-medium">{t("withdrawalSecurity.approvalThreshold")}</td>
                        <td className="py-3 text-gray-900">10,000 HBCT (Admin approval required)</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 pr-4 text-gray-500 font-medium">{t("withdrawalSecurity.emailConfirmation")}</td>
                        <td className="py-3 text-gray-900">{t("withdrawalSecurity.required")} (30-min expiry)</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 pr-4 text-gray-500 font-medium">{t("withdrawalSecurity.gasProtection")}</td>
                        <td className="py-3 text-gray-900">Max 10 Gwei, 100,000 gas limit</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Deposit Security */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center">
                    <Database className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="font-bebas-neue text-2xl md:text-3xl tracking-wide text-gray-900">
                    {t("depositSecurity.title")}
                  </h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 pr-4 text-gray-500 font-medium w-1/2">{t("depositSecurity.confirmations")}</td>
                        <td className="py-3 text-gray-900">12 block confirmations</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 pr-4 text-gray-500 font-medium">{t("depositSecurity.eventTracking")}</td>
                        <td className="py-3 text-gray-900">{t("depositSecurity.transferEvents")}</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 pr-4 text-gray-500 font-medium">{t("depositSecurity.deduplication")}</td>
                        <td className="py-3 text-gray-900">{t("depositSecurity.txHashLogIndex")}</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 pr-4 text-gray-500 font-medium">{t("depositSecurity.rpcRedundancy")}</td>
                        <td className="py-3 text-gray-900">{t("depositSecurity.primaryFallback")}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Technology Stack */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-700 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="font-bebas-neue text-2xl md:text-3xl tracking-wide text-gray-900">
                    {t("techStack.title")}
                  </h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { name: "Viem 2.x", desc: t("techStack.viem") },
                    { name: "Wagmi 2.x", desc: t("techStack.wagmi") },
                    { name: "NestJS", desc: t("techStack.nestjs") },
                    { name: "Next.js 15", desc: t("techStack.nextjs") },
                  ].map((item, index) => (
                    <div key={index} className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-center">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Platform Recommendations */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="font-bebas-neue text-2xl md:text-3xl tracking-wide text-gray-900">
                    {t("platform.recommendations.title")}
                  </h2>
                </div>

                <div className="space-y-3">
                  {[
                    t("platform.recommendations.monitoring"),
                    t("platform.recommendations.insurance"),
                    t("platform.recommendations.penetrationTest"),
                  ].map((item, index) => (
                    <div key={index} className="flex items-start gap-3 p-4 rounded-xl bg-yellow-50 border border-yellow-100">
                      <span className="text-yellow-600 font-bold">{index + 1}.</span>
                      <p className="text-yellow-800">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Conclusion */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="font-bebas-neue text-2xl md:text-3xl tracking-wide text-gray-900">
                    {t("conclusion.title")}
                  </h2>
                </div>

                <div className="p-6 rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100">
                  <p className="text-green-800 leading-relaxed">
                    {t("platform.conclusion")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Signature - Shared */}
          <div className="border-t border-gray-200 pt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <p className="text-sm text-gray-500 mb-2">{t("signature.preparedBy")}</p>
                <p className="font-medium text-gray-900">HBC Engineering Security Team</p>
                <p className="text-sm text-gray-500">security@hbc-engineering.com</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">{t("signature.date")}</p>
                <p className="font-medium text-gray-900">December 27, 2024</p>
                <p className="text-sm text-gray-500">{t("signature.version")} 1.0</p>
              </div>
            </div>
          </div>

          {/* Download Button */}
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleDownloadPdf}
              disabled={isGenerating}
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {isGenerating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Download className="w-5 h-5 group-hover:animate-bounce" />
              )}
              <span className="font-bebas-neue text-xl tracking-wide">
                {isGenerating ? t("generating") : t("downloadPdf")}
              </span>
            </button>
          </div>

          {/* Footer Links */}
          <div className="mt-12 pt-8 border-t border-gray-200 flex flex-wrap gap-4 justify-center text-sm text-gray-500">
            <a
              href="https://bscscan.com/token/0x7D57480119a5958ca29d41EE8d770E71b4465329"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-brand-500 transition-colors inline-flex items-center gap-1"
            >
              {t("links.viewOnBscscan")} <ExternalLink className="w-3 h-3" />
            </a>
            <span>•</span>
            <Link href="/terms" className="hover:text-brand-500 transition-colors">
              {t("links.terms")}
            </Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-brand-500 transition-colors">
              {t("links.privacy")}
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
