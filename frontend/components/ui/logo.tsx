"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useCallback } from "react";

interface LogoProps {
  variant?: "light" | "dark" | "auto";
  href?: string;
  className?: string;
  width?: number;
  height?: number;
}

export function Logo({
  variant = "auto",
  href = "/",
  className,
  width = 36,
  height = 44,
}: LogoProps) {
  // Auto variant uses white for dark mode, dark for light mode
  const logoSrc =
    variant === "light"
      ? "/images/logo-white.svg"
      : variant === "dark"
        ? "/images/logo-dark.svg"
        : "/images/logo-white.svg"; // Default to white for dark backgrounds

  const handleLogoClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      // If already at the top or on home page, scroll to top smoothly
      if (window.scrollY > 0) {
        e.preventDefault();
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }
      // If scrollY is 0, let the default link behavior work (navigate to href)
    },
    []
  );

  const image = (
    <Image
      src={logoSrc}
      alt="HBC Logo"
      width={width}
      height={height}
      className={cn("h-10 w-auto sm:h-11", className)}
      priority
    />
  );

  // Auto variant: show both logos, CSS handles visibility
  if (variant === "auto") {
    return (
      <Link
        href={href}
        onClick={handleLogoClick}
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md block"
      >
        {/* White logo - visible in dark mode / dark backgrounds */}
        <Image
          src="/images/logo-white.svg"
          alt="HBC Logo"
          width={width}
          height={height}
          className={cn("h-10 w-auto sm:h-11 dark:block hidden", className)}
          priority
        />
        {/* Dark logo - visible in light mode / light backgrounds */}
        <Image
          src="/images/logo-dark.svg"
          alt="HBC Logo"
          width={width}
          height={height}
          className={cn("h-10 w-auto sm:h-11 dark:hidden block", className)}
          priority
        />
      </Link>
    );
  }

  if (href) {
    return (
      <Link
        href={href}
        onClick={handleLogoClick}
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md block"
      >
        {image}
      </Link>
    );
  }

  return image;
}
