"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface ScrollPosition {
  y: number;
  isScrolled: boolean;
}

interface UseScrollPositionOptions {
  threshold?: number;
  throttleMs?: number;
}

export function useScrollPosition({
  threshold = 12,
  throttleMs = 16, // ~60fps
}: UseScrollPositionOptions = {}): ScrollPosition {
  const [scrollPosition, setScrollPosition] = useState<ScrollPosition>({
    y: 0,
    isScrolled: false,
  });

  const rafId = useRef<number | null>(null);
  const lastUpdate = useRef<number>(0);

  const updatePosition = useCallback(() => {
    const now = performance.now();

    if (now - lastUpdate.current < throttleMs) {
      return;
    }

    lastUpdate.current = now;
    const y = window.scrollY;

    setScrollPosition((prev) => {
      const isScrolled = y > threshold;
      // Only update if values actually changed
      if (prev.y === y && prev.isScrolled === isScrolled) {
        return prev;
      }
      return { y, isScrolled };
    });
  }, [threshold, throttleMs]);

  const handleScroll = useCallback(() => {
    if (rafId.current !== null) {
      return;
    }

    rafId.current = requestAnimationFrame(() => {
      updatePosition();
      rafId.current = null;
    });
  }, [updatePosition]);

  useEffect(() => {
    // Defer initial position check to avoid setState during render
    const initialRafId = requestAnimationFrame(() => {
      updatePosition();
    });

    // Use passive listener for better scroll performance
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(initialRafId);
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [handleScroll, updatePosition]);

  return scrollPosition;
}
