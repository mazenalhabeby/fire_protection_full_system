"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { ArrowRight, FileText } from "lucide-react";
import { FloatingCard } from "@/components/ui/floating-card";
import { GlassButton } from "@/components/ui/glass-button";
import { useRegisterSection } from "@/hooks/useNavbarTheme";
import { useTranslations } from "next-intl";

interface HeroSectionProps {
  className?: string;
}

export function HeroSection({ className }: HeroSectionProps) {
  // Register this section as dark for navbar theme detection
  const sectionRef = useRegisterSection("hero", "dark");
  const t = useTranslations("hero");

  return (
    <section
      ref={sectionRef}
      className={cn(
        "relative w-full overflow-hidden bg-black",
        // Mobile: 100vh, no negative margin
        // Desktop: -mt-16 to go behind navbar + extra height
        "min-h-screen md:-mt-16 md:min-h-[calc(100vh+4rem)]",
        className
      )}
    >
      {/* Center radial gradient - gray 10% opacity fading to dark */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(
              circle at 50% 50%,
              rgba(255, 255, 255, 0.127) 0%,
              rgba(0, 0, 0, 0) 60%,
              #000000 100%
            )
          `,
        }}
      />

      {/* Content - highest z-index */}
      <div className="relative z-30 flex min-h-screen md:min-h-[calc(100vh+4rem)] flex-col items-center px-4 sm:px-6 lg:px-8">
        {/* Title & Subtitle - positioned in upper area */}
        <div className="max-w-7xl mx-auto text-center w-full mt-[20vh] sm:mt-[22vh]">
          {/* Main Title with silver/white gradient and shimmer effect */}
          <h1 className="font-bebas-neue font-bold text-5xl tracking-wider sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl uppercase animate-fade-in-up">
            <span
              className="inline-block bg-clip-text text-transparent animate-shimmer"
              style={{
                backgroundImage: `linear-gradient(
                  90deg,
                  #a7afc2 0%,
                  #9ca3af 15%,
                  #ffffff 30%,
                  #e5e7eb 45%,
                  #9ca3af 60%,
                  #ffffff 75%,
                  #a7afc2 100%
                )`,
                backgroundSize: "200% 100%",
                filter: "drop-shadow(0 0 20px rgba(255, 255, 255, 0.3))",
              }}
            >
              {t("title")}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-white/60 sm:text-xl md:text-2xl max-w-3xl mx-auto animate-fade-in-up animation-delay-200">
            <span className="tracking-widest">{t("subtitle")}</span>{" "}
            <span className="relative inline-block ml-1">
              <span
                className="font-bebas-neue text-2xl sm:text-3xl md:text-4xl tracking-widest"
                style={{
                  background:
                    "linear-gradient(180deg, #ffffff 0%, #e5e7eb 40%, #9ca3af 100%)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))",
                }}
              >
                {t("company")}
              </span>
              <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-linear-to-r from-transparent via-white/50 to-transparent" />
            </span>
          </p>
        </div>

        {/* Action Buttons - Centered in the middle of the section */}
        <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 animate-fade-in-up animation-delay-400 w-full">
          <GlassButton href="/buy" variant="primary">
            <span className="font-bebas-neue text-xl tracking-wider uppercase">
              <span className="text-brand-400">HBCT</span>
              <span className="text-white"> {t("ctaToken")}</span>
            </span>
            <ArrowRight className="w-5 h-5 text-brand-400 transition-transform duration-300 group-hover:translate-x-1" />
          </GlassButton>

          <GlassButton href="/whitepaper" variant="secondary">
            <FileText className="w-5 h-5 text-white/60 group-hover:text-white/80 transition-colors" />
            <span className="font-bebas-neue text-xl tracking-wider uppercase text-white/80 group-hover:text-white transition-colors">
              {t("ctaWhitepaper")}
            </span>
          </GlassButton>
        </div>
      </div>

      {/* Floating Feature Cards - Behind the building (z-10) */}
      <div className="absolute inset-0 z-10 pointer-events-none hidden lg:block max-w-[1536px] mx-auto">
        <FloatingCard
          label={t("cards.labCertified.label")}
          description={t("cards.labCertified.description")}
          position="top-left"
          floatSpeed="slow"
          entranceDelay={600}
        />
        <FloatingCard
          label={t("cards.realUtility.label")}
          description={t("cards.realUtility.description")}
          position="top-right"
          floatSpeed="medium"
          entranceDelay={800}
        />
        <FloatingCard
          label={t("cards.incomingToken.label")}
          description={t("cards.incomingToken.description")}
          position="bottom-left"
          floatSpeed="fast"
          entranceDelay={1000}
        />
      </div>

      {/* Hero background image - middle z-index (z-20), above boxes but below content */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex justify-center animate-fade-in-scale animation-delay-300">
        <div className="relative w-full max-w-[1536px] h-[50vh] sm:h-[55vh] md:h-[60vh] lg:h-[65vh]">
          <Image
            src="/images/hero-bg.png"
            alt=""
            fill
            className="object-contain object-bottom"
            priority
            aria-hidden="true"
          />
        </div>
      </div>
    </section>
  );
}
