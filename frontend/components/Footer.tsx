"use client";

import { Link, usePathname } from "@/i18n/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useCookieConsent } from "@/providers/CookieConsentProvider";

const productLinks = [
  { name: "Buy HBCT", href: "/buy-tokens" },
  { name: "Tokenomics", href: "/#token-distribution" },
  { name: "Roadmap", href: "/#timeline" },
  {
    name: "White Paper",
    href: "https://hbc-1.gitbook.io/fire-protection-hbct/",
    external: true,
  },
];

const companyLinks = [
  { name: "Support", href: "/help/contact" },
  { name: "Audit", href: "/audit" },
];

const legalLinks = [
  { name: "Terms of Service", href: "/terms" },
  { name: "Privacy Policy", href: "/privacy" },
];

const socials = [
  {
    name: "X",
    href: "https://x.com/HBCT911",
    icon: (props: React.SVGProps<SVGSVGElement>) => (
      <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    name: "Telegram",
    href: "https://t.me/hbct911",
    icon: (props: React.SVGProps<SVGSVGElement>) => (
      <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
  },
  {
    name: "GitHub",
    href: "https://github.com/mazenalhabeby/fire_protection_full_system",
    icon: (props: React.SVGProps<SVGSVGElement>) => (
      <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
        <path
          fillRule="evenodd"
          d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
];

export function Footer({ className }: { className?: string }) {
  const pathname = usePathname();
  const t = useTranslations("cookies");
  const { openSettings } = useCookieConsent();

  // Only show anchor links on home page
  const isHomePage = pathname === "/" || pathname === "";
  const filteredProductLinks = isHomePage
    ? productLinks
    : productLinks.filter(item => !item.href.startsWith("/#"));

  return (
    <footer
      className={cn("relative overflow-hidden", className)}
      style={{
        background: "linear-gradient(180deg, #0a0a0a 0%, #000000 50%, #0d0704 100%)",
      }}
    >
      {/* Background glow effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -bottom-20 left-1/4 w-[400px] h-[200px] bg-brand-500/8 rounded-full blur-[100px]" />
        <div className="absolute -bottom-10 right-1/4 w-[300px] h-[150px] bg-brand-600/5 rounded-full blur-[80px]" />
      </div>

      {/* Gradient border top */}
      <div className="h-px bg-gradient-to-r from-transparent via-brand-500/50 to-transparent" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main content - 3 column grid */}
        <div className="py-16 lg:py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8">

            {/* Column 1 - Logo & Description */}
            <div className="lg:col-span-4">
              <Link href="/" className="inline-block group">
                <Image
                  src="/images/logo.svg"
                  alt="HBC Engineering"
                  width={160}
                  height={48}
                  className="object-contain opacity-90 group-hover:opacity-100 transition-opacity duration-300"
                />
              </Link>
              <p className="mt-6 text-sm text-gray-400 leading-relaxed max-w-sm">
                Revolutionizing fire protection through blockchain technology. Building a safer future with transparent, verified certifications.
              </p>
              {/* Social icons */}
              <div className="mt-8 flex items-center gap-3">
                {socials.map((social) => (
                  <Link
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                  >
                    <span className="sr-only">{social.name}</span>
                    <social.icon className="w-4 h-4" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Column 2 - Product Links */}
            <div className="lg:col-span-3 lg:ml-auto">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-6">
                Product
              </h3>
              <ul className="space-y-4">
                {filteredProductLinks.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      target={item.external ? "_blank" : undefined}
                      rel={item.external ? "noopener noreferrer" : undefined}
                      className="group flex items-center text-sm text-gray-400 hover:text-white transition-colors duration-300"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-500/50 mr-3 group-hover:bg-brand-500 transition-colors duration-300" />
                      {item.name}
                      {item.external && (
                        <svg className="w-3 h-3 ml-1.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3 - Company Links */}
            <div className="lg:col-span-2">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-6">
                Company
              </h3>
              <ul className="space-y-4">
                {companyLinks.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="group flex items-center text-sm text-gray-400 hover:text-white transition-colors duration-300"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-500/50 mr-3 group-hover:bg-brand-500 transition-colors duration-300" />
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4 - Legal Links */}
            <div className="lg:col-span-3">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-6">
                Legal
              </h3>
              <ul className="space-y-4">
                {legalLinks.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="group flex items-center text-sm text-gray-400 hover:text-white transition-colors duration-300"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-500/50 mr-3 group-hover:bg-brand-500 transition-colors duration-300" />
                      {item.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <button
                    onClick={openSettings}
                    className="group flex items-center text-sm text-gray-400 hover:text-white transition-colors duration-300"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500/50 mr-3 group-hover:bg-brand-500 transition-colors duration-300" />
                    {t("footer.manageCookies")}
                  </button>
                </li>
              </ul>
            </div>

          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} HBC Engineering. All rights reserved.
            </p>
            <p className="text-xs text-gray-600">
              Built on BNB Smart Chain
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
