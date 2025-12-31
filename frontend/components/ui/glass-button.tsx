"use client";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

interface GlassButtonProps {
  href: string;
  variant?: "primary" | "secondary";
  children: React.ReactNode;
  className?: string;
}

const variantStyles = {
  primary: {
    border: "border-brand-500/30 hover:border-brand-400/50",
    shadow:
      "shadow-[0_0_0_var(--shadow-primary)] hover:shadow-[0_0_20px_var(--shadow-primary)]",
    ring: "focus-visible:ring-brand-500/50",
  },
  secondary: {
    border: "border-white/10 hover:border-white/25",
    shadow:
      "shadow-[0_0_0_rgba(255,255,255,0)] hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]",
    ring: "focus-visible:ring-white/30",
  },
};

export function GlassButton({
  href,
  variant = "primary",
  children,
  className,
}: GlassButtonProps) {
  const styles = variantStyles[variant];

  return (
    <Link
      href={href}
      className={cn(
        "glass-blur",
        "group inline-flex items-center gap-3 px-8 py-4 rounded-full bg-slate-950/40 border",
        styles.border,
        styles.shadow,
        "transition-[border-color,box-shadow] duration-300 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
        styles.ring,
        className
      )}
    >
      {children}
    </Link>
  );
}
