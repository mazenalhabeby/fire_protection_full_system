"use client";

import { cn } from "@/lib/utils";
import { useRegisterSection } from "@/hooks/useNavbarTheme";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

interface TimelineItemProps {
  phase: string;
  title: string;
  description: string;
  index: number;
  isVisible: boolean;
  position: "left" | "right";
  isCompleted?: boolean;
}

function TimelineItem({
  phase,
  title,
  description,
  index,
  isVisible,
  position,
  isCompleted,
}: TimelineItemProps) {
  return (
    <div
      className={cn(
        "relative transition-all duration-700",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12",
        position === "left" ? "md:pr-[55%]" : "md:pl-[55%]"
      )}
      style={{ transitionDelay: `${index * 150}ms` }}
    >
      {/* Card */}
      <div
        className={cn(
          "relative group",
          position === "left" ? "md:text-right" : "md:text-left"
        )}
      >
        {/* Glowing background on hover */}
        <div className="absolute -inset-2 bg-brand-500/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="relative bg-white rounded-2xl p-6 lg:p-8 shadow-[0_4px_30px_rgba(0,0,0,0.05)] border border-gray-100 hover:shadow-[0_8px_40px_rgba(0,0,0,0.08)] hover:border-brand-100 transition-all duration-500">
          {/* Phase badge */}
          <div
            className={cn(
              "flex items-center gap-2 mb-4 flex-wrap",
              position === "left" ? "md:flex-row-reverse md:justify-end" : ""
            )}
          >
            <span className={cn(
              "w-10 h-10 rounded-xl text-white font-bebas-neue text-xl flex items-center justify-center shadow-lg",
              isCompleted
                ? "bg-green-500 shadow-green-500/25"
                : "bg-brand-500 shadow-brand-500/25"
            )}>
              {isCompleted ? "✓" : index + 1}
            </span>
            <span className={cn(
              "font-medium text-sm tracking-wide uppercase",
              isCompleted ? "text-green-500" : "text-brand-500"
            )}>
              {phase}
            </span>
            {isCompleted && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Completed
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-bebas-neue text-2xl lg:text-3xl tracking-wide text-gray-900 mb-3">
            {title}
          </h3>

          {/* Description as bullet points */}
          <ul className="text-gray-500 leading-relaxed text-sm lg:text-base space-y-2">
            {description.split(". ").filter(Boolean).map((point, i) => {
              // Phase 3 (index 2) has first 3 items completed
              const isItemCompleted = isCompleted || (index === 2 && i < 3);
              return (
                <li
                  key={i}
                  className={cn(
                    "flex items-start gap-2",
                    position === "left" ? "md:flex-row-reverse" : ""
                  )}
                >
                  <span className={cn(
                    "mt-1",
                    isItemCompleted ? "text-green-500" : "text-brand-500"
                  )}>•</span>
                  <span className={isItemCompleted ? "line-through decoration-green-500/50" : ""}>
                    {point.replace(/\.$/, "")}
                  </span>
                </li>
              );
            })}
          </ul>

          {/* Connector dot */}
          <div
            className={cn(
              "hidden md:flex absolute top-1/2 -translate-y-1/2 items-center justify-center",
              position === "left" ? "-right-8" : "-left-8"
            )}
          >
            {/* Outer glow ring */}
            <div className={cn(
              "absolute w-6 h-6 rounded-full animate-ping",
              isCompleted ? "bg-green-500/20" : "bg-brand-500/20"
            )} style={{ animationDuration: '2s' }} />
            {/* Middle ring */}
            <div className="absolute w-5 h-5 rounded-full bg-white shadow-lg" />
            {/* Inner dot */}
            <div className={cn(
              "relative w-3 h-3 rounded-full",
              isCompleted
                ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                : "bg-brand-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]"
            )} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProjectTimelineSection({
  className,
}: {
  className?: string;
}) {
  const sectionRef = useRegisterSection("timeline", "light");
  const t = useTranslations("projectTimeline");
  const pathRef = useRef<SVGPathElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pathLength, setPathLength] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    if (pathRef.current) {
      setPathLength(pathRef.current.getTotalLength());
    }
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let rafId: number;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        rafId = requestAnimationFrame(() => {
          if (!containerRef.current) {
            ticking = false;
            return;
          }

          const rect = containerRef.current.getBoundingClientRect();
          const windowHeight = window.innerHeight;
          const elementTop = rect.top;
          const elementHeight = rect.height;

          const progress = Math.max(
            0,
            Math.min(1, (windowHeight - elementTop) / (windowHeight + elementHeight - 200))
          );
          setScrollProgress(progress);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const timeline = [
    {
      phase: t("phases.phase1.phase"),
      title: t("phases.phase1.title"),
      description: t("phases.phase1.description"),
    },
    {
      phase: t("phases.phase2.phase"),
      title: t("phases.phase2.title"),
      description: t("phases.phase2.description"),
    },
    {
      phase: t("phases.phase3.phase"),
      title: t("phases.phase3.title"),
      description: t("phases.phase3.description"),
    },
    {
      phase: t("phases.phase4.phase"),
      title: t("phases.phase4.title"),
      description: t("phases.phase4.description"),
    },
    {
      phase: t("phases.phase5.phase"),
      title: t("phases.phase5.title"),
      description: t("phases.phase5.description"),
    },
    {
      phase: t("phases.phase6.phase"),
      title: t("phases.phase6.title"),
      description: t("phases.phase6.description"),
    },
  ];

  const drawLength = pathLength * scrollProgress;

  return (
    <section
      ref={sectionRef}
      id="timeline"
      className={cn(
        "relative w-full bg-linear-to-b from-white via-gray-50 to-white py-24 md:py-32 lg:py-40 overflow-hidden",
        className
      )}
    >
      {/* Background decorations */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-brand-200/30 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-brand-100/40 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-50/50 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-20 md:mb-28">
          <p className="text-brand-500 font-medium tracking-wide uppercase text-sm mb-4 animate-fade-in-up">
            {t("label")}
          </p>
          <h2 className="font-bebas-neue text-4xl md:text-5xl lg:text-6xl xl:text-7xl tracking-wide text-gray-900 animate-fade-in-up animation-delay-100">
            {t("title")}
          </h2>
          <p className="mt-6 text-lg md:text-xl text-gray-500 max-w-2xl mx-auto animate-fade-in-up animation-delay-200">
            {t("subtitle")}
          </p>
        </div>

        {/* Timeline Container */}
        <div ref={containerRef} className="relative">
          {/* SVG Animated Path - Desktop only */}
          <svg
            className="absolute left-1/2 -translate-x-1/2 top-0 h-full w-32 hidden md:block"
            viewBox="0 0 100 1200"
            preserveAspectRatio="none"
            fill="none"
            style={{
              willChange: 'transform',
              transform: 'translateZ(0)',
              WebkitTransform: 'translateZ(0)',
            }}
          >
            {/* SVG filter for glow effect - more performant than CSS drop-shadow */}
            <defs>
              <linearGradient id="pathGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f97316" />
                <stop offset="50%" stopColor="#fb923c" />
                <stop offset="100%" stopColor="#fdba74" />
              </linearGradient>
              <linearGradient id="completedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="50%" stopColor="#4ade80" />
                <stop offset="100%" stopColor="#86efac" />
              </linearGradient>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <filter id="glowGreen" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <filter id="glowDot" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            {/* Background path */}
            <path
              d="M50 0
                 C50 100, 80 100, 80 200
                 C80 300, 20 300, 20 400
                 C20 500, 80 500, 80 600
                 C80 700, 20 700, 20 800
                 C20 900, 80 900, 80 1000
                 C80 1100, 50 1100, 50 1200"
              stroke="#e5e7eb"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
            {/* Animated progress path */}
            <path
              ref={pathRef}
              d="M50 0
                 C50 100, 80 100, 80 200
                 C80 300, 20 300, 20 400
                 C20 500, 80 500, 80 600
                 C80 700, 20 700, 20 800
                 C20 900, 80 900, 80 1000
                 C80 1100, 50 1100, 50 1200"
              stroke="url(#pathGradient)"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
              filter="url(#glow)"
              style={{
                strokeDasharray: pathLength,
                strokeDashoffset: pathLength - drawLength,
                willChange: 'stroke-dashoffset',
              }}
            />
            {/* Glowing dot at progress point */}
            {isInView && (
              <g
                style={{
                  transform: `translateY(${scrollProgress * 1200}px)`,
                  willChange: 'transform',
                }}
              >
                {/* Outer glow */}
                <circle
                  cx="50"
                  cy="0"
                  r="16"
                  fill="url(#pathGradient)"
                  opacity="0.15"
                />
                {/* Pulsing ring */}
                <circle
                  cx="50"
                  cy="0"
                  r="12"
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="2"
                  opacity="0.4"
                  className="animate-ping"
                  style={{ transformOrigin: '50px 0', animationDuration: '2s' }}
                />
                {/* White outer ring */}
                <circle
                  cx="50"
                  cy="0"
                  r="10"
                  fill="white"
                  filter="url(#glowDot)"
                />
                {/* Orange inner circle */}
                <circle
                  cx="50"
                  cy="0"
                  r="7"
                  fill="url(#pathGradient)"
                />
                {/* Center highlight */}
                <circle
                  cx="48"
                  cy="-2"
                  r="2"
                  fill="white"
                  opacity="0.6"
                />
              </g>
            )}
          </svg>

          {/* Mobile vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-1 bg-gray-200 md:hidden">
            <div
              className="absolute top-0 left-0 right-0 bg-linear-to-b from-brand-500 to-brand-300 origin-top"
              style={{
                transform: `scaleY(${scrollProgress})`,
                height: '100%',
                willChange: 'transform',
              }}
            />
          </div>

          {/* Timeline Items */}
          <div className="space-y-16 md:space-y-24 pl-12 md:pl-0">
            {timeline.map((item, index) => (
              <TimelineItem
                key={item.phase}
                phase={item.phase}
                title={item.title}
                description={item.description}
                index={index}
                isVisible={isInView}
                position={index % 2 === 0 ? "left" : "right"}
                isCompleted={index < 2}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
