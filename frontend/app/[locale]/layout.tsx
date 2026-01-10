import type { Metadata } from "next";
import { Geist, Geist_Mono, Bebas_Neue } from "next/font/google";
import { cookies } from "next/headers";
import "@/styles/globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales } from "@/i18n/request";
import type { Locale } from "@/i18n/request";
import { AuthProvider } from "@/hooks/useAuth";
import { ReAuthProvider } from "@/hooks/useReAuth";
import { ThemeProvider } from "@/components/theme-provider";
import { Web3ModalProvider } from "@/providers/Web3ModalProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { ReferralProvider } from "@/providers/ReferralProvider";
import { InitialHintsProvider } from "@/providers/InitialHintsProvider";
import { CookieConsentProvider } from "@/providers/CookieConsentProvider";
import { Toaster } from "sonner";
import { WalletConflictModal } from "@/components/wallet/WalletConflictModal";
import { CookieBanner, CookieSettingsModal } from "@/components/cookies";
import { SESSION_HINT_COOKIE, THEME_COOKIE } from "@/lib/cookies";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas-neue",
  subsets: ["latin"],
  weight: "400",
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const messages = await getMessages({ locale });
  const metadata = messages.metadata as { title: string; description: string };

  return {
    title: metadata.title,
    description: metadata.description,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  // Fetch messages for the locale
  const messages = await getMessages();

  // Read cookies for initial hints (prevents flash on page load)
  const cookieStore = await cookies();
  const hasSessionHint = cookieStore.get(SESSION_HINT_COOKIE)?.value === 'true';
  const themeCookie = cookieStore.get(THEME_COOKIE)?.value as 'light' | 'dark' | 'system' | undefined;
  const initialTheme = themeCookie || 'system';

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${bebasNeue.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme={initialTheme}
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <NextIntlClientProvider messages={messages}>
              <ReferralProvider>
                <InitialHintsProvider hasSessionHint={hasSessionHint}>
                  <AuthProvider>
                    <Web3ModalProvider>
                      <ReAuthProvider>
                        <CookieConsentProvider>
                          {children}
                          <WalletConflictModal />
                          <CookieBanner />
                          <CookieSettingsModal />
                          <Toaster
                            position="bottom-right"
                            theme="system"
                            richColors
                            closeButton
                            toastOptions={{
                              duration: 4000,
                              className: "premium-toast",
                            }}
                          />
                        </CookieConsentProvider>
                      </ReAuthProvider>
                    </Web3ModalProvider>
                  </AuthProvider>
                </InitialHintsProvider>
              </ReferralProvider>
            </NextIntlClientProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
