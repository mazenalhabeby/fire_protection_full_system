"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { useRegisterSection } from "@/hooks/useNavbarTheme";
import { useTranslations } from "next-intl";
import {
  FacadeIcon,
  FilmIcon,
  TextileIcon,
  WoodIcon,
} from "@/components/custom-svg";

interface BentoCardProps {
  image: string;
  title: string;
  description: string;
  features: string[];
  icon: React.ReactNode;
  size: "tall" | "wide" | "small";
  delay?: number;
}

function BentoCard({
  image,
  title,
  description,
  features,
  icon,
  size,
  delay = 0,
}: BentoCardProps) {
  const isTall = size === "tall";
  const isWide = size === "wide";

  return (
    <div
      className={cn(
        "group relative animate-fade-in-up",
        isTall && "md:row-span-2",
        isWide && "md:col-span-2"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className={cn(
          "relative h-full flex overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm transition-all duration-500",
          "shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.15)] hover:-translate-y-2",
          isWide ? "flex-row" : "flex-col"
        )}
      >
        {/* Image */}
        <div
          className={cn(
            "relative overflow-hidden",
            isTall && "h-1/2",
            isWide && "w-2/5 h-auto",
            !isTall && !isWide && "h-44"
          )}
        >
          <Image
            src={image}
            alt={title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {/* Gradient overlay */}
          <div
            className={cn(
              "absolute inset-0",
              isWide
                ? "bg-linear-to-r from-transparent via-transparent to-white"
                : "bg-linear-to-t from-white via-white/20 to-transparent"
            )}
          />
        </div>

        {/* Content */}
        <div
          className={cn(
            "flex flex-col flex-1 p-6",
            isTall && "lg:p-8",
            isWide && "justify-center"
          )}
        >
          {/* Icon */}
          <div
            className={cn(
              "inline-flex items-center justify-center rounded-2xl bg-brand-500 text-white mb-4",
              isTall ? "w-14 h-14" : "w-12 h-12"
            )}
          >
            {icon}
          </div>

          {/* Title */}
          <h3
            className={cn(
              "font-bebas-neue tracking-wide text-gray-900 mb-2",
              isTall ? "text-3xl lg:text-4xl" : "text-2xl lg:text-3xl"
            )}
          >
            {title}
          </h3>

          {/* Description */}
          <p
            className={cn(
              "text-gray-500 leading-relaxed mb-4",
              isTall ? "text-base" : "text-sm"
            )}
          >
            {description}
          </p>

          {/* Features */}
          <ul
            className={cn("space-y-2", !isTall && !isWide && "hidden sm:block")}
          >
            {features.map((feature, index) => (
              <li
                key={index}
                className="flex items-center gap-2 text-sm text-gray-600"
              >
                <svg
                  className="w-4 h-4 text-brand-500 shrink-0"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

interface AboutTechnologySectionProps {
  className?: string;
}

export function AboutTechnologySection({
  className,
}: AboutTechnologySectionProps) {
  const sectionRef = useRegisterSection("about-technology", "light");
  const t = useTranslations("aboutTechnology");

  const technologies = [
    {
      image: "/images/technology/wood-preservation.webp",
      title: t("woodPreservation.title"),
      description: t("woodPreservation.description"),
      features: t.raw("woodPreservation.features") as string[],
      icon: <WoodIcon />,
      size: "tall" as const,
    },
    {
      image: "/images/technology/film-protection.webp",
      title: t("filmProtection.title"),
      description: t("filmProtection.description"),
      features: t.raw("filmProtection.features") as string[],
      icon: <FilmIcon />,
      size: "small" as const,
    },
    {
      image: "/images/technology/facade-solutions.webp",
      title: t("facadeSystems.title"),
      description: t("facadeSystems.description"),
      features: t.raw("facadeSystems.features") as string[],
      icon: <FacadeIcon />,
      size: "small" as const,
    },
    {
      image: "/images/technology/textile-protection.jpg",
      title: t("textileProtection.title"),
      description: t("textileProtection.description"),
      features: t.raw("textileProtection.features") as string[],
      icon: <TextileIcon />,
      size: "wide" as const,
    },
  ];

  return (
    <section
      ref={sectionRef}
      id="about-technology"
      className={cn(
        "relative w-full bg-white py-20 md:py-28 lg:py-32 overflow-hidden",
        className
      )}
    >
      {/* Animated Mesh Gradient Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-linear-to-br from-brand-50 via-white to-gray-50" />

        {/* Animated mesh blobs */}
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-brand-300/40 blur-[100px] animate-mesh-1" />
        <div className="absolute top-1/4 -right-20 w-[400px] h-[400px] rounded-full bg-brand-secondary-200/30 blur-[80px] animate-mesh-2" />
        <div className="absolute -bottom-32 left-1/4 w-[600px] h-[400px] rounded-full bg-brand-200/35 blur-[120px] animate-mesh-3" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-brand-secondary-100/40 blur-[100px] animate-mesh-4" />
        <div
          className="absolute bottom-0 right-0 w-[350px] h-[350px] rounded-full bg-brand-100/50 blur-[80px] animate-mesh-1"
          style={{ animationDelay: "-5s" }}
        />

        {/* Noise texture overlay for depth */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16 md:mb-20">
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

        {/* Asymmetric Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 auto-rows-[minmax(200px,auto)]">
          {technologies.map((tech, index) => (
            <BentoCard
              key={tech.title}
              image={tech.image}
              title={tech.title}
              description={tech.description}
              features={tech.features}
              icon={tech.icon}
              size={tech.size}
              delay={200 + index * 100}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
