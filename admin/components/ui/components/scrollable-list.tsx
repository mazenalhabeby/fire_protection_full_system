"use client";

import * as React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../lib/utils";

interface ScrollableListProps {
  children: React.ReactNode;
  maxHeight?: string | number;
  showScrollIndicator?: boolean;
  scrollIndicatorThreshold?: number;
  className?: string;
  containerClassName?: string;
}

/**
 * ScrollableList - A reusable scrollable container with optional scroll indicator
 *
 * Features:
 * - Configurable max height
 * - Optional scroll indicator with bouncing arrow that appears when content overflows
 * - Indicator auto-hides when scrolled to bottom
 * - Smooth gradient shadow effect at bottom when more content exists
 *
 * @param children - Content to display inside the scrollable container
 * @param maxHeight - Maximum height of the scrollable area (default: 400px)
 * @param showScrollIndicator - Whether to show the scroll indicator (default: true)
 * @param scrollIndicatorThreshold - Number of items before showing indicator (default: 0, always show if overflow)
 * @param className - Additional classes for the scroll container
 * @param containerClassName - Additional classes for the outer wrapper
 */
export function ScrollableList({
  children,
  maxHeight = "400px",
  showScrollIndicator = true,
  scrollIndicatorThreshold = 0,
  className,
  containerClassName,
}: ScrollableListProps) {
  const [showIndicator, setShowIndicator] = useState(true);
  const [hasOverflow, setHasOverflow] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const checkOverflow = useCallback(() => {
    if (scrollRef.current) {
      const { scrollHeight, clientHeight } = scrollRef.current;
      setHasOverflow(scrollHeight > clientHeight);
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollHeight, scrollTop, clientHeight } = scrollRef.current;
      const isAtBottom = scrollHeight - scrollTop <= clientHeight + 10;
      setShowIndicator(!isAtBottom);
    }
  }, []);

  useEffect(() => {
    checkOverflow();
    // Re-check on window resize
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [checkOverflow, children]);

  const maxHeightValue = typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight;
  const shouldShowIndicator = showScrollIndicator && hasOverflow && showIndicator;

  return (
    <div className={cn("relative", containerClassName)}>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={cn(
          "overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent",
          className
        )}
        style={{ maxHeight: maxHeightValue }}
      >
        {children}
      </div>

      {/* Scroll Indicator */}
      {shouldShowIndicator && (
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
          {/* Gradient shadow */}
          <div className="h-16 bg-gradient-to-t from-white dark:from-gray-900 via-white/80 dark:via-gray-900/80 to-transparent" />

          {/* Arrow indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
            <div className="animate-bounce">
              <div className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
                <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </div>
            </div>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
              Scroll for more
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
