"use client";

import { cn } from "../lib/utils";

interface FloatingCardProps {
  label: string;
  description: string;
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  floatSpeed?: "slow" | "medium" | "fast";
  entranceDelay?: number;
  className?: string;
}

const positionClasses = {
  "top-left": "top-[38%] left-[15%]",
  "top-right": "top-[45%] right-[12%]",
  "bottom-left": "bottom-[30%] left-[10%]",
  "bottom-right": "bottom-[35%] right-[8%]",
};

const entranceClasses = {
  "top-left": "animate-fade-in-left",
  "top-right": "animate-fade-in-right",
  "bottom-left": "animate-fade-in-left",
  "bottom-right": "animate-fade-in-right",
};

const floatClasses = {
  slow: "animate-float-slow",
  medium: "animate-float-medium",
  fast: "animate-float-fast",
};

const delayClasses: Record<number, string> = {
  0: "",
  200: "animation-delay-200",
  300: "animation-delay-300",
  400: "animation-delay-400",
  600: "animation-delay-600",
  800: "animation-delay-800",
  1000: "animation-delay-1000",
};

export function FloatingCard({
  label,
  description,
  position,
  floatSpeed = "medium",
  entranceDelay = 600,
  className,
}: FloatingCardProps) {
  return (
    <div
      className={cn(
        "absolute",
        positionClasses[position],
        entranceClasses[position],
        delayClasses[entranceDelay] || "",
        className
      )}
    >
      <div
        className={cn(
          "pointer-events-auto",
          "px-5 py-4 rounded-2xl",
          "bg-white/3 backdrop-blur-sm",
          "border border-white/8",
          "transition-all duration-500 ease-out",
          "hover:bg-white/6 hover:border-white/15",
          "hover:-translate-y-1 max-w-[250px]",
          floatClasses[floatSpeed]
        )}
      >
        <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-1">
          {label}
        </p>
        <p className="text-white/80 text-lg tracking-wider font-medium">
          {description}
        </p>
      </div>
    </div>
  );
}
