"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  type ReactNode,
  type RefCallback,
} from "react";

type NavbarTheme = "light" | "dark";

interface NavbarThemeContextType {
  theme: NavbarTheme;
  registerSection: (id: string, theme: NavbarTheme, element: HTMLElement) => void;
  unregisterSection: (id: string) => void;
}

const NavbarThemeContext = createContext<NavbarThemeContextType | null>(null);

export function NavbarThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<NavbarTheme>("light");
  const sectionsRef = useRef<Map<string, { theme: NavbarTheme; element: HTMLElement }>>(
    new Map()
  );
  const observerRef = useRef<IntersectionObserver | null>(null);

  const updateTheme = useCallback(() => {
    // Find which section is currently at the top of the viewport (behind navbar)
    const navbarHeight = 64; // h-16 = 64px
    let currentTheme: NavbarTheme = "light";
    let foundSection: string | null = null;

    sectionsRef.current.forEach(({ theme: sectionTheme, element }, id) => {
      const rect = element.getBoundingClientRect();
      // Check if section is behind the navbar (top of section is above navbar bottom)
      if (rect.top <= navbarHeight && rect.bottom > navbarHeight) {
        currentTheme = sectionTheme;
        foundSection = id;
      }
    });

    setTheme(currentTheme);
  }, []);

  const registerSection = useCallback(
    (id: string, sectionTheme: NavbarTheme, element: HTMLElement) => {
      sectionsRef.current.set(id, { theme: sectionTheme, element });

      // Observe this element
      if (observerRef.current) {
        observerRef.current.observe(element);
      }

      updateTheme();
    },
    [updateTheme]
  );

  const unregisterSection = useCallback((id: string) => {
    const section = sectionsRef.current.get(id);
    if (section && observerRef.current) {
      observerRef.current.unobserve(section.element);
    }
    sectionsRef.current.delete(id);
  }, []);

  useEffect(() => {
    // Create intersection observer
    observerRef.current = new IntersectionObserver(
      () => {
        updateTheme();
      },
      {
        rootMargin: "-64px 0px 0px 0px", // Account for navbar height
        threshold: [0, 0.1, 0.5, 0.9, 1],
      }
    );

    // Also listen to scroll for more precise updates
    const handleScroll = () => {
      updateTheme();
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [updateTheme]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({ theme, registerSection, unregisterSection }),
    [theme, registerSection, unregisterSection]
  );

  return (
    <NavbarThemeContext.Provider value={contextValue}>
      {children}
    </NavbarThemeContext.Provider>
  );
}

export function useNavbarTheme() {
  const context = useContext(NavbarThemeContext);
  if (!context) {
    throw new Error("useNavbarTheme must be used within NavbarThemeProvider");
  }
  return context;
}

// Optional hook that returns null if provider is not present
export function useNavbarThemeOptional() {
  return useContext(NavbarThemeContext);
}

// Hook for sections to register themselves
export function useRegisterSection(id: string, theme: NavbarTheme): RefCallback<HTMLElement> {
  const context = useContext(NavbarThemeContext);
  const [element, setElement] = useState<HTMLElement | null>(null);

  // Extract stable function references to avoid depending on entire context
  // (which includes theme and would cause re-registration on every theme change)
  const registerSection = context?.registerSection;
  const unregisterSection = context?.unregisterSection;

  useEffect(() => {
    if (!registerSection || !unregisterSection || !element) return;

    registerSection(id, theme, element);

    return () => {
      unregisterSection(id);
    };
  }, [id, theme, element, registerSection, unregisterSection]);

  // Return a callback ref that updates state
  const setRef: RefCallback<HTMLElement> = useCallback((el) => {
    setElement(el);
  }, []);

  return setRef;
}
