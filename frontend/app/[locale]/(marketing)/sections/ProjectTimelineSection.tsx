"use client";

import { cn } from "@/lib/utils";
import { useRegisterSection } from "@/hooks/useNavbarTheme";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useMemo } from "react";

interface TimelineItemProps {
  phase: string;
  title: string;
  description: string;
  index: number;
  isVisible: boolean;
  position: "left" | "right";
  isCompleted?: boolean;
  isStage?: boolean;
  scrollProgress: number;
}

function TimelineItem({
  phase,
  title,
  description,
  index,
  isVisible,
  position,
  isCompleted,
  isStage,
  scrollProgress,
}: TimelineItemProps) {
  const itemProgress = Math.min(1, Math.max(0, (scrollProgress * 7 - index) * 2));

  return (
    <div
      className={cn(
        "relative transition-all duration-700 ease-out",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
        position === "left" ? "md:pr-[54%]" : "md:pl-[54%]"
      )}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      {/* Card */}
      <div
        className={cn(
          "relative group",
          position === "left" ? "md:text-right" : "md:text-left"
        )}
      >
        {/* Main Card - Compact */}
        <div
          className={cn(
            "relative bg-white rounded-xl transition-all duration-300",
            "border shadow-sm hover:shadow-md",
            isCompleted
              ? "border-green-200 hover:border-green-300"
              : isStage
                ? "border-brand-200 hover:border-brand-300"
                : "border-gray-200 hover:border-gray-300"
          )}
        >
          {/* Left/Right color accent bar */}
          <div
            className={cn(
              "absolute top-3 bottom-3 w-1 rounded-full",
              position === "left" ? "right-0" : "left-0",
              isCompleted
                ? "bg-green-500"
                : isStage
                  ? "bg-brand-500"
                  : "bg-blue-500"
            )}
          />

          <div className={cn(
            "p-4 lg:p-5",
            position === "left" ? "pr-5" : "pl-5"
          )}>
            {/* Header Row */}
            <div
              className={cn(
                "flex items-center gap-3 mb-3",
                position === "left" ? "md:flex-row-reverse" : ""
              )}
            >
              {/* Small Icon */}
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-lg text-white",
                  isCompleted
                    ? "bg-green-500"
                    : isStage
                      ? "bg-brand-500"
                      : "bg-blue-500"
                )}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-xs font-bold">{index + 1}</span>
                )}
              </div>

              {/* Title */}
              <div className={cn("flex-1", position === "left" ? "md:text-right" : "")}>
                <span
                  className={cn(
                    "text-[10px] font-semibold tracking-wider uppercase",
                    isCompleted ? "text-green-600" : isStage ? "text-brand-600" : "text-blue-600"
                  )}
                >
                  {phase}
                </span>
                <h3 className="font-bebas-neue text-lg lg:text-xl tracking-wide text-gray-900 leading-tight">
                  {title}
                </h3>
              </div>

              {/* Status */}
              {isCompleted && (
                <span className="text-[10px] font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">
                  Done
                </span>
              )}
            </div>

            {/* Description - Column list */}
            <ul className={cn(
              "space-y-1.5 text-xs text-gray-500",
              position === "left" ? "md:text-right" : ""
            )}>
              {description.split(". ").filter(Boolean).map((point, i) => {
                const isItemCompleted = isCompleted || (index === 2 && i < 3);
                return (
                  <li
                    key={i}
                    className={cn(
                      "flex items-start gap-2",
                      position === "left" ? "md:flex-row-reverse" : "",
                      isItemCompleted ? "text-green-600/70" : ""
                    )}
                  >
                    <span className={cn(
                      "mt-1.5 w-1 h-1 rounded-full flex-shrink-0",
                      isItemCompleted ? "bg-green-500" : isStage ? "bg-brand-400" : "bg-gray-300"
                    )} />
                    <span className={isItemCompleted ? "line-through" : ""}>
                      {point.replace(/\.$/, "")}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Connection Line to Center */}
        <div
          className={cn(
            "hidden md:block absolute top-1/2 h-px",
            position === "left" ? "-right-[calc(4%-8px)] w-[calc(4%)]" : "-left-[calc(4%-8px)] w-[calc(4%)]",
            isCompleted
              ? "bg-green-300"
              : isStage
                ? "bg-brand-300"
                : "bg-blue-300"
          )}
          style={{ transform: 'translateY(-50%)' }}
        />

        {/* Center Node */}
        <div
          className={cn(
            "hidden md:flex absolute top-1/2 -translate-y-1/2 items-center justify-center",
            position === "left" ? "-right-[42px]" : "-left-[42px]"
          )}
        >
          <div className="w-5 h-5 rounded-full bg-white shadow border-2 border-gray-200 flex items-center justify-center">
            <div
              className={cn(
                "w-2.5 h-2.5 rounded-full",
                isCompleted
                  ? "bg-green-500"
                  : itemProgress > 0
                    ? "bg-brand-500"
                    : "bg-gray-300"
              )}
            />
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      { threshold: 0.05 }
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

  const timeline = useMemo(() => [
    {
      phase: t("phases.phase1.phase"),
      title: t("phases.phase1.title"),
      description: t("phases.phase1.description"),
      isStage: false,
    },
    {
      phase: t("phases.phase2.phase"),
      title: t("phases.phase2.title"),
      description: t("phases.phase2.description"),
      isStage: false,
    },
    {
      phase: t("phases.phase3.phase"),
      title: t("phases.phase3.title"),
      description: t("phases.phase3.description"),
      isStage: false,
    },
    {
      phase: t("phases.phase4.phase"),
      title: t("phases.phase4.title"),
      description: t("phases.phase4.description"),
      isStage: true,
    },
    {
      phase: t("phases.phase5.phase"),
      title: t("phases.phase5.title"),
      description: t("phases.phase5.description"),
      isStage: true,
    },
    {
      phase: t("phases.phase6.phase"),
      title: t("phases.phase6.title"),
      description: t("phases.phase6.description"),
      isStage: true,
    },
    {
      phase: t("phases.phase7.phase"),
      title: t("phases.phase7.title"),
      description: t("phases.phase7.description"),
      isStage: true,
    },
  ], [t]);

  return (
    <section
      ref={sectionRef}
      id="timeline"
      className={cn(
        "relative w-full py-24 md:py-32 lg:py-40 overflow-hidden",
        "bg-gradient-to-b from-gray-50 via-white to-gray-50",
        className
      )}
    >
      {/* Subtle Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-50/50 via-transparent to-gray-50/50" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16">
          <span className="text-brand-500 font-medium text-sm tracking-wider uppercase">
            {t("label")}
          </span>

          <h2 className="font-bebas-neue text-4xl md:text-5xl lg:text-6xl tracking-wide text-gray-900 mt-2">
            {t("title")}
          </h2>

          <p className="mt-4 text-base md:text-lg text-gray-500 max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
        </div>

        {/* Timeline Container */}
        <div ref={containerRef} className="relative">
          {/* Simple vertical line - Desktop only */}
          <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-0.5 bg-gray-200 hidden md:block">
            <div
              className="absolute top-0 left-0 right-0 bg-gradient-to-b from-green-500 via-blue-500 to-brand-500 origin-top transition-transform duration-100"
              style={{
                transform: `scaleY(${scrollProgress})`,
                height: '100%',
              }}
            />
          </div>

          {/* Mobile vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-1 bg-gradient-to-b from-gray-200 via-gray-200 to-gray-200 rounded-full md:hidden">
            <div
              className="absolute top-0 left-0 right-0 rounded-full bg-gradient-to-b from-green-500 via-blue-500 to-brand-500 origin-top"
              style={{
                transform: `scaleY(${scrollProgress})`,
                height: '100%',
                willChange: 'transform',
              }}
            />
          </div>

          {/* Timeline Items */}
          <div className="space-y-6 md:space-y-8 pl-12 md:pl-0">
            {timeline.map((item, index) => (
              <TimelineItem
                key={`${item.phase}-${index}`}
                phase={item.phase}
                title={item.title}
                description={item.description}
                index={index}
                isVisible={isInView}
                position={index % 2 === 0 ? "left" : "right"}
                isCompleted={index < 2}
                isStage={item.isStage}
                scrollProgress={scrollProgress}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
