import { useState, useEffect, useCallback, useRef } from "react";

interface UseMinimumLoadingOptions {
  /** Minimum time to show loading state (default: 2000ms) */
  minimumDuration?: number;
  /** Initial loading state (default: true) */
  initialLoading?: boolean;
}

interface UseMinimumLoadingReturn {
  /** Whether to show loading state */
  isLoading: boolean;
  /** Call when actual loading starts */
  startLoading: () => void;
  /** Call when actual loading finishes */
  stopLoading: () => void;
  /** Wrap an async function to automatically manage loading state */
  withLoading: <T>(fn: () => Promise<T>) => Promise<T>;
}

/**
 * Hook that ensures loading state shows for a minimum duration
 * Creates a premium feel by preventing flash of loading state
 *
 * @example
 * ```tsx
 * const { isLoading, stopLoading } = useMinimumLoading({ minimumDuration: 2000 });
 *
 * useEffect(() => {
 *   fetchData().finally(() => stopLoading());
 * }, []);
 *
 * if (isLoading) return <Skeleton />;
 * ```
 */
export function useMinimumLoading(
  options: UseMinimumLoadingOptions = {}
): UseMinimumLoadingReturn {
  const { minimumDuration = 2000, initialLoading = true } = options;

  const [isLoading, setIsLoading] = useState(initialLoading);
  const loadingStartTime = useRef<number>(Date.now());
  const actualLoadingComplete = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track when loading starts
  const startLoading = useCallback(() => {
    loadingStartTime.current = Date.now();
    actualLoadingComplete.current = false;
    setIsLoading(true);
  }, []);

  // Stop loading only after minimum duration
  const stopLoading = useCallback(() => {
    actualLoadingComplete.current = true;

    const elapsed = Date.now() - loadingStartTime.current;
    const remaining = minimumDuration - elapsed;

    if (remaining <= 0) {
      setIsLoading(false);
    } else {
      timeoutRef.current = setTimeout(() => {
        if (actualLoadingComplete.current) {
          setIsLoading(false);
        }
      }, remaining);
    }
  }, [minimumDuration]);

  // Wrap async function with loading management
  const withLoading = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T> => {
      startLoading();
      try {
        return await fn();
      } finally {
        stopLoading();
      }
    },
    [startLoading, stopLoading]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isLoading,
    startLoading,
    stopLoading,
    withLoading,
  };
}

/**
 * Simpler hook for page-level loading with auto-start
 * Automatically starts loading on mount and requires explicit stop
 *
 * @example
 * ```tsx
 * const { isLoading, stopLoading } = usePageLoading();
 *
 * useEffect(() => {
 *   fetchPageData().finally(stopLoading);
 * }, []);
 * ```
 */
export function usePageLoading(minimumDuration = 2000) {
  return useMinimumLoading({
    minimumDuration,
    initialLoading: true,
  });
}

/**
 * Hook that debounces a value
 * Returns the debounced value after the specified delay
 *
 * @example
 * ```tsx
 * const [search, setSearch] = useState('');
 * const debouncedSearch = useDebounce(search, 300);
 *
 * useEffect(() => {
 *   // This only runs after user stops typing for 300ms
 *   searchApi(debouncedSearch);
 * }, [debouncedSearch]);
 * ```
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
