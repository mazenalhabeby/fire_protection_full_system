"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";

export interface UserAvatarProps {
  src?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  username?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  showBorder?: boolean;
  onClick?: () => void;
}

const sizeClasses = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-lg",
  "2xl": "w-20 h-20 text-xl",
};

const iconSizes = {
  xs: "w-3 h-3",
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
  xl: "w-8 h-8",
  "2xl": "w-10 h-10",
};

// Generate a consistent color based on the user's name/email
function getAvatarColor(identifier: string): string {
  const colors = [
    "from-violet-500 to-purple-500",
    "from-blue-500 to-cyan-500",
    "from-emerald-500 to-teal-500",
    "from-orange-500 to-amber-500",
    "from-pink-500 to-rose-500",
    "from-indigo-500 to-blue-500",
    "from-green-500 to-emerald-500",
    "from-red-500 to-orange-500",
  ];

  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function UserAvatar({
  src,
  firstName,
  lastName,
  email,
  username,
  size = "md",
  className,
  showBorder = false,
  onClick,
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Reset error and loaded state when src changes
  useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
  }, [src]);

  // Get initials from available data
  const initials = useMemo(() => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) {
      return firstName.slice(0, 2).toUpperCase();
    }
    if (username) {
      return username.slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return null;
  }, [firstName, lastName, email, username]);

  // Get consistent color based on user identifier
  const gradientColor = useMemo(() => {
    const identifier = email || username || firstName || "default";
    return getAvatarColor(identifier);
  }, [email, username, firstName]);

  // Determine if we should show the image
  const showImage = src && !imageError;

  // Get the full image URL (handle relative paths)
  const imageUrl = useMemo(() => {
    if (!src) return "";

    let url = src;
    if (!src.startsWith("http")) {
      // Prepend backend URL for relative paths
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      // Remove /api suffix to get base backend URL
      const backendUrl = apiUrl.replace(/\/api\/?$/, "");
      url = `${backendUrl}${src}`;
    }

    // Add cache-busting for avatar images to prevent stale cached images
    // Extract the unique ID from the URL (e.g., uuid-original.webp) as cache key
    const match = src.match(/([a-f0-9-]+)-(?:original|thumb)\.webp$/i);
    if (match) {
      url = `${url}?v=${match[1].slice(0, 8)}`;
    }

    return url;
  }, [src]);

  const handleClick = onClick ? onClick : undefined;
  const isClickable = !!onClick;

  return (
    <div
      className={cn(
        "relative rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center font-semibold",
        sizeClasses[size],
        showBorder && "ring-2 ring-white dark:ring-gray-800 ring-offset-2 ring-offset-gray-100 dark:ring-offset-gray-900",
        isClickable && "cursor-pointer hover:opacity-90 transition-opacity",
        !showImage && `bg-gradient-to-br ${gradientColor} text-white`,
        className
      )}
      onClick={handleClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      {showImage ? (
        <>
          {/* Loading placeholder */}
          {!imageLoaded && (
            <div className={cn(
              "absolute inset-0 bg-gradient-to-br animate-pulse",
              gradientColor
            )} />
          )}
          <Image
            key={imageUrl}
            src={imageUrl}
            alt={firstName ? `${firstName}'s avatar` : "User avatar"}
            fill
            unoptimized
            className={cn(
              "object-cover transition-opacity duration-200",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
            onError={() => setImageError(true)}
            onLoad={() => setImageLoaded(true)}
            sizes={size === "2xl" ? "80px" : size === "xl" ? "64px" : size === "lg" ? "48px" : "40px"}
          />
        </>
      ) : initials ? (
        <span>{initials}</span>
      ) : (
        <User className={cn(iconSizes[size], "text-white/80")} />
      )}
    </div>
  );
}

// Convenience component for current user
export function CurrentUserAvatar({
  size = "md",
  className,
  showBorder,
  onClick,
}: Omit<UserAvatarProps, "src" | "firstName" | "lastName" | "email" | "username"> & {
  user?: {
    profileImageUrl?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    username?: string | null;
  } | null;
}) {
  // This will be connected to useAuth hook
  // For now, it's a placeholder that can be extended
  return (
    <UserAvatar
      size={size}
      className={className}
      showBorder={showBorder}
      onClick={onClick}
    />
  );
}
