"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { setThemeCookie, type ThemeValue } from "@/lib/cookies";

// Component that syncs theme to cookie
function ThemeCookieSync() {
  const { theme } = useTheme();

  React.useEffect(() => {
    if (theme && (theme === 'light' || theme === 'dark' || theme === 'system')) {
      setThemeCookie(theme as ThemeValue);
    }
  }, [theme]);

  return null;
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props}>
      <ThemeCookieSync />
      {children}
    </NextThemesProvider>
  );
}
