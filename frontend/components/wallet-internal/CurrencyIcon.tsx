"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";

interface CurrencyIconProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeConfig = {
  xs: { container: "w-5 h-5", logo: 12 },
  sm: { container: "w-8 h-8", logo: 20 },
  md: { container: "w-10 h-10", logo: 24 },
  lg: { container: "w-12 h-12", logo: 28 },
  xl: { container: "w-16 h-16", logo: 40 },
};

export function CurrencyIcon({ size = "md", className }: CurrencyIconProps) {
  const config = sizeConfig[size];

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center shadow-lg",
        "bg-gradient-to-br from-brand-500 to-brand-600",
        config.container,
        className
      )}
    >
      <Image
        src="/images/logo-white.svg"
        alt="HBCT"
        width={config.logo}
        height={config.logo}
        className="object-contain"
      />
    </div>
  );
}

// For backwards compatibility - just renders the same HBCT icon
export function CurrencyIconWithNetwork({
  network = "BSC",
  size = "md",
  className,
}: CurrencyIconProps & { network?: string }) {
  return (
    <div className={cn("relative", className)}>
      <CurrencyIcon size={size} />
      <div className="absolute -bottom-0.5 -right-0.5 px-1 py-0.5 bg-gray-800 rounded text-[8px] font-medium text-gray-300 border border-gray-700">
        {network}
      </div>
    </div>
  );
}
