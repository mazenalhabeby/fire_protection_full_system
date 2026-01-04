"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { useRegisterSection } from "@/hooks/useNavbarTheme";
import { useTranslations } from "next-intl";
import { Coins, Shield, TrendingUp } from "lucide-react";
import FloatingToken from "@/components/FloatingToken";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay?: number;
}

function FeatureCard({
  icon,
  title,
  description,
  delay = 0,
}: FeatureCardProps) {
  return (
    <div
      className="group relative z-10 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Subtle glow on hover */}
      <div className="absolute -inset-1 bg-linear-to-r from-brand-500/0 via-brand-500/10 to-brand-500/0 rounded-4xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

      <div className="relative h-full p-8 lg:p-10 rounded-4xl bg-linear-to-br from-white/8 to-white/2 transition-all duration-500 hover:-translate-y-2">
        {/* Soft inner shadow/highlight */}
        <div className="absolute inset-0 rounded-4xl bg-linear-to-br from-white/5 via-transparent to-transparent pointer-events-none" />

        {/* Icon - minimal style */}
        <div className="relative inline-flex items-center justify-center w-16 h-16 mb-6">
          <div className="absolute inset-0 bg-brand-500/10 rounded-2xl" />
          <div className="relative text-brand-400">{icon}</div>
        </div>

        {/* Title */}
        <h3 className="relative font-bebas-neue text-2xl lg:text-3xl tracking-wide text-white mb-4">
          {title}
        </h3>

        {/* Description */}
        <p className="relative text-gray-400 leading-relaxed text-base">
          {description}
        </p>

        {/* Bottom accent line */}
        <div className="relative mt-6 h-px w-12 bg-linear-to-r from-brand-500/50 to-transparent group-hover:w-20 transition-all duration-500" />
      </div>
    </div>
  );
}

interface WhyHBCTSectionProps {
  className?: string;
}

export function WhyHBCTSection({ className }: WhyHBCTSectionProps) {
  const sectionRef = useRegisterSection("why-hbct", "dark");
  const t = useTranslations("whyHbct");

  const features = [
    {
      icon: <Coins className="w-7 h-7" />,
      title: t("features.realUtility.title"),
      description: t("features.realUtility.description"),
    },
    {
      icon: <Shield className="w-7 h-7" />,
      title: t("features.blockchainTransparency.title"),
      description: t("features.blockchainTransparency.description"),
    },
    {
      icon: <TrendingUp className="w-7 h-7" />,
      title: t("features.longTermValue.title"),
      description: t("features.longTermValue.description"),
    },
  ];

  return (
    <section
      ref={sectionRef}
      id="why-hbct"
      className={cn(
        "relative w-full bg-black pt-24 md:pt-32 lg:pt-40 pb-16 md:pb-20 overflow-hidden",
        className
      )}
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 0%, rgba(251, 146, 60, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse 50% 30% at 20% 80%, rgba(251, 146, 60, 0.08) 0%, transparent 40%)
          `,
        }}
      />

      {/* Floating tokens - hidden on mobile/tablet, visible on desktop */}
      <div className="hidden lg:block z-0">
        {/* Top left area */}
        <FloatingToken
          src="/images/token/token1.png"
          size={80}
          blur
          className="animate-float-slow"
          style={{ top: "10%", left: "5%" }}
        />
        <FloatingToken
          src="/images/token/token3.png"
          size={50}
          className="animate-float-medium"
          style={{ top: "20%", left: "15%" }}
        />

        {/* Top right area */}
        <FloatingToken
          src="/images/token/token1.png"
          size={60}
          className="animate-float-fast"
          style={{ top: "8%", right: "10%" }}
        />
        <FloatingToken
          src="/images/token/token3.png"
          size={90}
          blur
          className="animate-float-slow"
          style={{ top: "25%", right: "5%" }}
        />

        {/* Middle left */}
        <FloatingToken
          src="/images/token/token1.png"
          size={45}
          className="animate-float-medium"
          style={{ top: "45%", left: "3%" }}
        />
        <FloatingToken
          src="/images/token/token3.png"
          size={70}
          blur
          className="animate-float-slow"
          style={{ top: "55%", left: "12%" }}
        />

        {/* Middle right */}
        <FloatingToken
          src="/images/token/token1.png"
          size={55}
          blur
          className="animate-float-fast"
          style={{ top: "40%", right: "8%" }}
        />
        <FloatingToken
          src="/images/token/token3.png"
          size={40}
          className="animate-float-medium"
          style={{ top: "60%", right: "15%" }}
        />

        {/* Bottom area */}
        <FloatingToken
          src="/images/token/token1.png"
          size={65}
          className="animate-float-slow"
          style={{ bottom: "15%", left: "8%" }}
        />
        <FloatingToken
          src="/images/token/token3.png"
          size={50}
          blur
          className="animate-float-fast"
          style={{ bottom: "20%", right: "12%" }}
        />
        <FloatingToken
          src="/images/token/token1.png"
          size={35}
          className="animate-float-medium"
          style={{ bottom: "10%", left: "25%" }}
        />
        <FloatingToken
          src="/images/token/token3.png"
          size={45}
          blur
          className="animate-float-slow"
          style={{ bottom: "8%", right: "25%" }}
        />
      </div>

      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16 md:mb-20">
          <p className="text-brand-400 font-medium tracking-wide uppercase text-sm mb-4 animate-fade-in-up">
            {t("label")}
          </p>
          <h2 className="font-bebas-neue text-4xl md:text-5xl lg:text-6xl xl:text-7xl tracking-wide text-white animate-fade-in-up animation-delay-100">
            {t("title")}
          </h2>
          <p className="mt-6 text-lg md:text-xl text-gray-400 max-w-2xl mx-auto animate-fade-in-up animation-delay-200">
            {t("subtitle")}
          </p>
        </div>

        {/* Main Token Display */}
        <div className="relative flex justify-center mb-16 md:mb-20">
          <div className="relative animate-fade-in-scale animation-delay-300">
            {/* Glow effect behind token */}
            <div className="absolute inset-0 blur-[60px] bg-brand-500/30 rounded-full scale-150" />

            {/* Main token */}
            <div className="relative animate-float-slow">
              <Image
                src="/images/token/token2.png"
                alt="HBCT Token"
                width={280}
                height={280}
                className="object-contain drop-shadow-[0_0_40px_rgba(251,146,60,0.4)]"
                priority
              />
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-16">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              delay={400 + index * 100}
            />
          ))}
        </div>

        {/* Token Info */}
        <div className="flex flex-wrap justify-center gap-8 md:gap-16 animate-fade-in-up animation-delay-800">
          <div className="text-center">
            <p className="text-gray-500 text-sm uppercase tracking-wide mb-1">
              {t("tokenInfo.tokenName")}
            </p>
            <p className="text-white font-bebas-neue text-2xl tracking-wide">
              {t("tokenInfo.tokenNameValue")}
            </p>
          </div>
          <div className="text-center">
            <p className="text-gray-500 text-sm uppercase tracking-wide mb-1">
              {t("tokenInfo.symbol")}
            </p>
            <p className="text-brand-400 font-bebas-neue text-2xl tracking-wide">
              {t("tokenInfo.symbolValue")}
            </p>
          </div>
          <div className="text-center">
            <p className="text-gray-500 text-sm uppercase tracking-wide mb-1">
              {t("tokenInfo.totalSupply")}
            </p>
            <p className="text-white font-bebas-neue text-2xl tracking-wide">
              {t("tokenInfo.totalSupplyValue")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
