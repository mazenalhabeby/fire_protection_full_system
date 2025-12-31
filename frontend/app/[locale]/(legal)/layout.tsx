"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { Navbar, AppNavbar } from "@/components/navbar";
import { Footer } from "@/components/Footer";
import { AppFooter } from "@/components/AppFooter";
import { NavbarThemeProvider } from "@/hooks/useNavbarTheme";
import { useAuth } from "@/hooks/useAuth";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setTheme, resolvedTheme } = useTheme();
  const previousThemeRef = useRef<string | undefined>(undefined);
  const { isAuthenticated, isLoading } = useAuth();

  // Force light theme for these pages
  useEffect(() => {
    // Store the current theme only once on mount
    if (previousThemeRef.current === undefined) {
      previousThemeRef.current = resolvedTheme;
    }

    setTheme("light");

    return () => {
      // Restore previous theme when unmounting
      if (previousThemeRef.current && previousThemeRef.current !== "light") {
        setTheme(previousThemeRef.current);
      }
    };
  }, [setTheme, resolvedTheme]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <NavbarThemeProvider>
        <div className="flex flex-col min-h-screen">
          <div className="h-16 bg-black" /> {/* Navbar placeholder */}
          <main className="flex-1">{children}</main>
          <div className="h-20 bg-gray-100" /> {/* Footer placeholder */}
        </div>
      </NavbarThemeProvider>
    );
  }

  // Authenticated users see the app layout
  // Still wrap with NavbarThemeProvider so useRegisterSection in pages doesn't error
  if (isAuthenticated) {
    return (
      <NavbarThemeProvider>
        <div className="flex flex-col min-h-screen">
          <AppNavbar />
          <main className="flex-1">{children}</main>
          <AppFooter />
        </div>
      </NavbarThemeProvider>
    );
  }

  // Non-authenticated users see the marketing layout
  return (
    <NavbarThemeProvider>
      <Navbar hideSpacer />
      {children}
      <Footer />
    </NavbarThemeProvider>
  );
}
