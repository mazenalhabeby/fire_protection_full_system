import type { Metadata } from "next";
import { Geist, Geist_Mono, Bebas_Neue } from "next/font/google";
import "@/styles/globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales } from "@/i18n/request";
import type { Locale } from "@/i18n/request";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/theme-provider";
import { Web3ModalProvider } from "@/providers/Web3ModalProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { ReferralProvider } from "@/providers/ReferralProvider";
import { Toaster } from "sonner";
import { WalletConflictModal } from "@/components/wallet/WalletConflictModal";

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

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${bebasNeue.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <NextIntlClientProvider messages={messages}>
              <ReferralProvider>
                <AuthProvider>
                  <Web3ModalProvider>
                    {children}
                    <WalletConflictModal />
                    <Toaster
                      position="bottom-right"
                      richColors
                      closeButton
                      toastOptions={{
                        duration: 4000,
                        className: "premium-toast",
                      }}
                    />
                  </Web3ModalProvider>
                </AuthProvider>
              </ReferralProvider>
            </NextIntlClientProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
