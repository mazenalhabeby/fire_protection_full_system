"use client";

import { cn } from "@/lib/utils";
import { useRegisterSection } from "@/hooks/useNavbarTheme";
import { useId } from "react";

interface SectionProps {
  children: React.ReactNode;
  background?: "light" | "dark";
  className?: string;
  id?: string;
  as?: "section" | "div" | "main" | "article";
}

export function Section({
  children,
  background = "light",
  className,
  id,
  as: Component = "section",
}: SectionProps) {
  const generatedId = useId();
  const sectionId = id || generatedId;
  const sectionRef = useRegisterSection(sectionId, background);

  return (
    <Component
      ref={sectionRef}
      id={id}
      className={cn(
        background === "dark" ? "bg-black text-white" : "bg-white text-gray-900",
        className
      )}
    >
      {children}
    </Component>
  );
}
