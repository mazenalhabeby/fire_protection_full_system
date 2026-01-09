"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, type Locale } from "@/i18n/request";
import { Globe, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const languageNames: Record<Locale, string> = {
  en: "English",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
  it: "Italiano",
};

const languageFlags: Record<Locale, string> = {
  en: "🇺🇸",
  de: "🇩🇪",
  fr: "🇫🇷",
  es: "🇪🇸",
  it: "🇮🇹",
};

const languageNativeNames: Record<Locale, string> = {
  en: "United States",
  de: "Deutschland",
  fr: "France",
  es: "España",
  it: "Italia",
};

interface LanguageSwitcherProps {
  isTransparent?: boolean;
}

export function LanguageSwitcher({ isTransparent = false }: LanguageSwitcherProps) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by only rendering Dialog after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLocaleChange = (newLocale: Locale) => {
    router.replace(pathname, { locale: newLocale });
    setIsOpen(false);
  };

  const buttonClassName = cn(
    "flex items-center gap-2 px-3 py-2 rounded-xl",
    "text-sm font-medium",
    "transition-all duration-300",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    isTransparent
      ? [
          // Home page on dark section - white text
          "text-white/90 hover:text-white",
          "hover:bg-white/10",
        ]
      : [
          // App pages or home page on light section - theme-aware
          "text-gray-600 hover:text-gray-900",
          "dark:text-gray-300 dark:hover:text-white",
          "bg-gray-100 hover:bg-gray-200",
          "dark:bg-gray-800 dark:hover:bg-gray-700",
        ]
  );

  // Render a simple button during SSR to avoid hydration mismatch
  if (!mounted) {
    return (
      <button className={buttonClassName} aria-label="Select language">
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{locale.toUpperCase()}</span>
      </button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button className={buttonClassName} aria-label="Select language">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{locale.toUpperCase()}</span>
        </button>
      </DialogTrigger>

      <DialogContent
        className={cn(
          "sm:max-w-md",
          // Glassmorphism styling
          "bg-white/90 dark:bg-black/90",
          "backdrop-blur-xl backdrop-saturate-150",
          "border border-black/10 dark:border-white/10",
          "shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Globe className="h-5 w-5" />
            Select Language
          </DialogTitle>
        </DialogHeader>

        {/* Language options grid */}
        <div className="grid gap-2 py-4">
          {locales.map((loc) => (
            <button
              key={loc}
              onClick={() => handleLocaleChange(loc)}
              className={cn(
                "w-full flex items-center gap-4 px-4 py-4 rounded-xl",
                "text-left transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                locale === loc
                  ? [
                      "bg-primary/10 dark:bg-primary/20",
                      "border-2 border-primary",
                      "text-foreground",
                    ]
                  : [
                      "bg-black/5 dark:bg-white/5",
                      "border-2 border-transparent",
                      "text-foreground/80 hover:text-foreground",
                      "hover:bg-black/10 dark:hover:bg-white/10",
                    ]
              )}
            >
              {/* Flag */}
              <span className="text-3xl">{languageFlags[loc]}</span>

              {/* Language info */}
              <div className="flex-1">
                <div className="font-semibold text-base">
                  {languageNames[loc]}
                </div>
                <div className="text-sm text-muted-foreground">
                  {languageNativeNames[loc]}
                </div>
              </div>

              {/* Check mark for selected */}
              {locale === loc && (
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground">
                  <Check className="h-4 w-4" />
                </div>
              )}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
