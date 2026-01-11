"use client";

import { cn } from "@/lib/utils";
import { useRegisterSection } from "@/hooks/useNavbarTheme";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";

interface ParticleProps {
  delay: number;
  duration: number;
  size: number;
  left: string;
  top: string;
}

function Particle({ delay, duration, size, left, top }: ParticleProps) {
  return (
    <div
      className="absolute rounded-full bg-brand-500/30 animate-pulse-glow"
      style={{
        width: size,
        height: size,
        left,
        top,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }}
    />
  );
}

function GridPattern() {
  return (
    <div className="absolute inset-0 overflow-hidden opacity-[0.03]">
      <svg className="absolute w-full h-full">
        <defs>
          <pattern
            id="grid-pattern"
            width="60"
            height="60"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 60 0 L 0 0 0 60"
              fill="none"
              stroke="white"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-pattern)" />
      </svg>
    </div>
  );
}

export function JoinRevolutionSection({
  className,
}: {
  className?: string;
}) {
  const sectionRef = useRegisterSection("join-revolution", "dark");
  const t = useTranslations("joinRevolution");
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      { threshold: 0.2 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setMousePosition({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      });
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousemove", handleMouseMove);
    }

    return () => {
      if (container) {
        container.removeEventListener("mousemove", handleMouseMove);
      }
    };
  }, []);

  const particles: ParticleProps[] = [
    { delay: 0, duration: 3, size: 4, left: "10%", top: "20%" },
    { delay: 0.5, duration: 4, size: 6, left: "85%", top: "15%" },
    { delay: 1, duration: 3.5, size: 3, left: "20%", top: "70%" },
    { delay: 1.5, duration: 4.5, size: 5, left: "75%", top: "80%" },
    { delay: 2, duration: 3, size: 4, left: "50%", top: "10%" },
    { delay: 0.3, duration: 4, size: 3, left: "30%", top: "85%" },
    { delay: 1.2, duration: 3.5, size: 5, left: "90%", top: "50%" },
    { delay: 0.8, duration: 4, size: 4, left: "5%", top: "60%" },
  ];

  return (
    <section
      ref={sectionRef}
      id="join-revolution"
      className={cn(
        "relative w-full bg-black py-20 md:py-24 lg:py-28 overflow-hidden",
        className
      )}
    >
      {/* Grid pattern background */}
      <GridPattern />

      {/* Dynamic gradient that follows mouse */}
      <div
        ref={containerRef}
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          background: `
            radial-gradient(circle 600px at ${mousePosition.x}% ${mousePosition.y}%, rgba(249, 115, 22, 0.15), transparent 50%),
            radial-gradient(ellipse 80% 50% at 50% 100%, rgba(251, 146, 60, 0.1) 0%, transparent 50%)
          `,
        }}
      />

      {/* Animated gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-brand-600/10 rounded-full blur-[80px] animate-pulse animation-delay-1000" />

      {/* Floating particles */}
      {particles.map((particle, index) => (
        <Particle key={index} {...particle} />
      ))}

      {/* Glowing top divider */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl px-8">
        <div className="h-8 bg-linear-to-b from-brand-500/20 to-transparent blur-xl -mt-4" />
        <div className="h-px bg-linear-to-r from-transparent via-brand-500/50 to-transparent -mt-4" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Floating token decoration - left */}
        <div
          className={cn(
            "absolute -left-8 md:left-0 top-1/2 -translate-y-1/2 transition-all duration-1000",
            isInView
              ? "opacity-100 translate-x-0"
              : "opacity-0 -translate-x-20"
          )}
        >
          <div className="relative">
            <div className="absolute inset-0 -m-4 rounded-full bg-brand-500/20 blur-2xl animate-pulse" />
            <Image
              src="/images/token/token1.png"
              alt="HBCT Token"
              width={120}
              height={120}
              className="relative object-contain animate-float-slow opacity-60 hidden lg:block"
            />
          </div>
        </div>

        {/* Floating token decoration - right */}
        <div
          className={cn(
            "absolute -right-8 md:right-0 top-1/3 transition-all duration-1000 delay-200",
            isInView ? "opacity-100 translate-x-0" : "opacity-0 translate-x-20"
          )}
        >
          <div className="relative">
            <div className="absolute inset-0 -m-4 rounded-full bg-brand-500/20 blur-2xl animate-pulse" />
            <Image
              src="/images/token/token3.png"
              alt="HBCT Token"
              width={100}
              height={100}
              className="relative object-contain animate-float-medium opacity-60 hidden lg:block"
            />
          </div>
        </div>

        {/* Main heading */}
        <h2
          className={cn(
            "font-bebas-neue text-5xl md:text-6xl lg:text-7xl xl:text-8xl tracking-wide mb-6 transition-all duration-700 delay-100",
            isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          <span className="text-white">{t("title")}</span>
          <br />
          <span className="bg-linear-to-r from-brand-400 via-brand-500 to-brand-600 bg-clip-text text-transparent">
            {t("titleHighlight")}
          </span>
        </h2>

        {/* Description */}
        <p
          className={cn(
            "text-lg md:text-xl lg:text-2xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed transition-all duration-700 delay-200",
            isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          {t("subtitle")}
        </p>

        {/* CTA Buttons */}
        <div
          className={cn(
            "flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 transition-all duration-700 delay-300",
            isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          {/* Primary CTA */}
          <Link
            href="/buy-tokens"
            className="group relative inline-flex items-center justify-center"
          >
            {/* Animated glow background */}
            <div className="absolute -inset-1 bg-linear-to-r from-brand-600 via-brand-500 to-brand-600 rounded-full blur-lg opacity-70 group-hover:opacity-100 transition-opacity duration-500 animate-pulse" />

            {/* Button */}
            <div className="relative flex items-center gap-3 px-8 py-4 bg-linear-to-r from-brand-500 to-brand-600 rounded-full text-white font-semibold text-lg shadow-2xl shadow-brand-500/25 hover:shadow-brand-500/40 transition-all duration-300 group-hover:scale-105">
              <span>{t("ctaBuy")}</span>
              <svg
                className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </div>
          </Link>

          {/* Secondary CTA */}
          <Link
            href="https://hbc-1.gitbook.io/fire-protection-hbct/"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-flex items-center justify-center"
          >
            {/* Border glow on hover */}
            <div className="absolute -inset-0.5 bg-linear-to-r from-brand-500/50 to-brand-600/50 rounded-full opacity-0 group-hover:opacity-100 blur transition-opacity duration-500" />

            {/* Button */}
            <div className="relative flex items-center gap-3 px-8 py-4 bg-white/5 border border-white/10 rounded-full text-white font-semibold text-lg hover:bg-white/10 hover:border-brand-500/30 transition-all duration-300">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>{t("ctaWhitepaper")}</span>
            </div>
          </Link>
        </div>

        {/* Trust indicators */}
        <div
          className={cn(
            "mt-10 flex flex-wrap items-center justify-center gap-8 md:gap-12 transition-all duration-700 delay-500",
            isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          <div className="flex items-center gap-2 text-gray-500">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm">{t("trust.auditedContract")}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm">{t("trust.verifiedTeam")}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm">{t("trust.securePayments")}</span>
          </div>
        </div>
      </div>

      {/* Bottom decorative line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />
    </section>
  );
}
