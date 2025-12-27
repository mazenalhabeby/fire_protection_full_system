"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { useRegisterSection } from "@/hooks/useNavbarTheme";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

interface DistributionItemProps {
  label: string;
  percentage: number;
  tokens: string;
  description: string;
  color: string;
  delay?: number;
}

function DistributionItem({
  label,
  percentage,
  tokens,
  description,
  color,
  delay = 0,
}: DistributionItemProps) {
  return (
    <div
      className="group relative animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start gap-4">
        {/* Color indicator */}
        <div
          className="w-4 h-4 rounded-full mt-1.5 shrink-0 ring-2 ring-white/10"
          style={{ backgroundColor: color }}
        />

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-baseline justify-between gap-4 mb-1">
            <h4 className="font-bebas-neue text-xl lg:text-2xl tracking-wide text-white">
              {label}
            </h4>
            <span
              className="font-bebas-neue text-2xl lg:text-3xl tracking-wide"
              style={{ color }}
            >
              {percentage}%
            </span>
          </div>
          <p className="text-gray-500 text-sm mb-1">{tokens} tokens</p>
          <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}

interface TokenDistributionSectionProps {
  className?: string;
}

export function TokenDistributionSection({
  className,
}: TokenDistributionSectionProps) {
  const sectionRef = useRegisterSection("token-distribution", "dark");
  const t = useTranslations("tokenDistribution");
  const chartRef = useRef<HTMLDivElement>(null);
  const [isChartInView, setIsChartInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsChartInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (chartRef.current) {
      observer.observe(chartRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const distribution = [
    {
      label: t("distribution.companyReserve.label"),
      percentage: 35,
      tokens: t("distribution.companyReserve.tokens"),
      description: t("distribution.companyReserve.description"),
      color: "#f97316", // orange-500
    },
    {
      label: t("distribution.publicPresale.label"),
      percentage: 25,
      tokens: t("distribution.publicPresale.tokens"),
      description: t("distribution.publicPresale.description"),
      color: "#fb923c", // orange-400
    },
    {
      label: t("distribution.ecosystemRewards.label"),
      percentage: 15,
      tokens: t("distribution.ecosystemRewards.tokens"),
      description: t("distribution.ecosystemRewards.description"),
      color: "#fdba74", // orange-300
    },
    {
      label: t("distribution.rdCertifications.label"),
      percentage: 10,
      tokens: t("distribution.rdCertifications.tokens"),
      description: t("distribution.rdCertifications.description"),
      color: "#fed7aa", // orange-200
    },
    {
      label: t("distribution.teamAdvisors.label"),
      percentage: 10,
      tokens: t("distribution.teamAdvisors.tokens"),
      description: t("distribution.teamAdvisors.description"),
      color: "#9ca3af", // gray-400
    },
    {
      label: t("distribution.liquidity.label"),
      percentage: 5,
      tokens: t("distribution.liquidity.tokens"),
      description: t("distribution.liquidity.description"),
      color: "#6b7280", // gray-500
    },
  ];

  // Calculate cumulative percentages for the donut chart
  let cumulative = 0;
  const segments = distribution.map((item) => {
    const start = cumulative;
    cumulative += item.percentage;
    return { ...item, start, end: cumulative };
  });

  return (
    <section
      ref={sectionRef}
      id="token-distribution"
      className={cn(
        "relative w-full bg-black pt-16 md:pt-20 pb-24 md:pb-32 lg:pb-40 overflow-hidden",
        className
      )}
    >
      {/* Glowing top divider */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl px-8">
        {/* Glow effect */}
        <div className="h-8 bg-linear-to-b from-brand-500/20 to-transparent blur-xl -mt-4" />
        {/* Line */}
        <div className="h-px bg-linear-to-r from-transparent via-brand-500/50 to-transparent -mt-4" />
      </div>

      {/* Background gradient - only bottom glow */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 80% 100%, rgba(251, 146, 60, 0.1) 0%, transparent 40%)
          `,
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Modern Animated Chart */}
          <div
            ref={chartRef}
            className={cn(
              "relative flex justify-center transition-all duration-700",
              isChartInView ? "opacity-100 scale-100" : "opacity-0 scale-95"
            )}
          >
            <div className="relative w-80 h-80 md:w-96 md:h-96 lg:w-[420px] lg:h-[420px]">
              {/* Outer rotating ring */}
              <div
                className={cn(
                  "absolute inset-0",
                  isChartInView && "animate-chart-rotate"
                )}
              >
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <circle
                    cx="50"
                    cy="50"
                    r="48"
                    fill="none"
                    stroke="url(#outerGradient)"
                    strokeWidth="0.5"
                    strokeDasharray="4 4"
                    opacity="0.3"
                  />
                  <defs>
                    <linearGradient
                      id="outerGradient"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#f97316" />
                      <stop offset="100%" stopColor="#ffffff" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              {/* Background glow */}
              <div
                className={cn(
                  "absolute inset-8 rounded-full bg-brand-500/10 blur-2xl",
                  isChartInView && "animate-pulse"
                )}
              />

              {/* Main donut chart */}
              <svg
                viewBox="0 0 100 100"
                className="absolute inset-0 w-full h-full -rotate-90"
              >
                <defs>
                  {segments.map((segment, index) => (
                    <linearGradient
                      key={`grad-${index}`}
                      id={`segment-gradient-${index}`}
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor={segment.color} />
                      <stop
                        offset="100%"
                        stopColor={segment.color}
                        stopOpacity="0.6"
                      />
                    </linearGradient>
                  ))}
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Track background */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="white"
                  strokeWidth="12"
                  opacity="0.05"
                />

                {/* Segments */}
                {segments.map((segment, index) => {
                  const radius = 38;
                  const circumference = 2 * Math.PI * radius;
                  const segmentLength =
                    (segment.percentage / 100) * circumference;
                  const gapSize = 2;
                  const strokeDasharray = `${segmentLength - gapSize} ${
                    circumference - segmentLength + gapSize
                  }`;
                  const strokeDashoffset = -(
                    (segment.start / 100) *
                    circumference
                  );

                  return (
                    <circle
                      key={segment.label}
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="none"
                      stroke={`url(#segment-gradient-${index})`}
                      strokeWidth={isChartInView ? "12" : "0"}
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      filter="url(#glow)"
                      className={cn(
                        "transition-all duration-1000",
                        isChartInView && "animate-chart-draw"
                      )}
                      style={{
                        animationDelay: `${index * 150}ms`,
                        transformOrigin: "center",
                      }}
                    />
                  );
                })}
              </svg>

              {/* Inner decorative ring */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 rounded-full border border-white/10" />
              </div>

              {/* Center content with token */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="relative">
                  {/* Pulsing glow behind token */}
                  <div
                    className={cn(
                      "absolute inset-0 -m-6 rounded-full bg-brand-500/20 blur-xl",
                      isChartInView && "animate-pulse"
                    )}
                  />

                  {/* Token image */}
                  <div
                    className={cn(
                      "relative transition-all duration-1000",
                      isChartInView
                        ? "scale-100 opacity-100"
                        : "scale-75 opacity-0"
                    )}
                  >
                    <Image
                      src="/images/token/token3.png"
                      alt="HBCT Token"
                      width={140}
                      height={140}
                      className={cn(
                        "object-contain drop-shadow-[0_0_30px_rgba(251,146,60,0.5)]",
                        isChartInView && "animate-float-slow"
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Floating particles */}
              <div
                className={cn(
                  "absolute top-8 right-12 w-2 h-2 rounded-full bg-brand-400/60",
                  isChartInView && "animate-float-slow"
                )}
              />
              <div
                className={cn(
                  "absolute bottom-16 left-8 w-1.5 h-1.5 rounded-full bg-brand-300/40",
                  isChartInView && "animate-float-medium"
                )}
              />
              <div
                className={cn(
                  "absolute top-1/3 left-4 w-1 h-1 rounded-full bg-white/30",
                  isChartInView && "animate-float-fast"
                )}
              />
            </div>
          </div>

          {/* Distribution List */}
          <div className="space-y-6">
            {distribution.map((item, index) => (
              <DistributionItem
                key={item.label}
                label={item.label}
                percentage={item.percentage}
                tokens={item.tokens}
                description={item.description}
                color={item.color}
                delay={400 + index * 100}
              />
            ))}
          </div>
        </div>

        {/* Vesting Info */}
        <div className="mt-16 md:mt-20 p-6 md:p-8 rounded-3xl bg-linear-to-br from-white/5 to-white/2 animate-fade-in-up animation-delay-1000">
          <h3 className="font-bebas-neue text-2xl lg:text-3xl tracking-wide text-white mb-4">
            {t("vesting.title")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <VestingInfo
              title={t("vesting.presale.title")}
              desc={t("vesting.presale.description")}
            />
            <VestingInfo
              title={t("vesting.rdEcosystem.title")}
              desc={t("vesting.rdEcosystem.description")}
            />
            <VestingInfo
              title={t("vesting.companyReserve.title")}
              desc={t("vesting.companyReserve.description")}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

const VestingInfo = ({ title, desc }: { title: string; desc: string }) => {
  return (
    <div>
      <p className="text-brand-400 font-medium mb-1">{title}</p>
      <p className="text-gray-400">{desc}</p>
    </div>
  );
};
