"use client";

import { Link, usePathname } from "@/i18n/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useCookieConsent } from "@/providers/CookieConsentProvider";

const footerLinks = [
  { name: "Buy HBCT", href: "/buy-tokens" },
  {
    name: "White Paper",
    href: "https://hbc-1.gitbook.io/hbc-fire-protection/",
    external: true,
  },
  { name: "Tokenomics", href: "/#token-distribution" },
  { name: "Roadmap", href: "/#timeline" },
  { name: "Support", href: "/help/contact" },
  { name: "Terms", href: "/terms" },
  { name: "Privacy", href: "/privacy" },
  { name: "Audit", href: "/audit" },
];

const socials = [
  {
    name: "X",
    href: "https://twitter.com",
    icon: (props: React.SVGProps<SVGSVGElement>) => (
      <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    name: "Telegram",
    href: "https://telegram.org",
    icon: (props: React.SVGProps<SVGSVGElement>) => (
      <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
  },
  {
    name: "Discord",
    href: "https://discord.com",
    icon: (props: React.SVGProps<SVGSVGElement>) => (
      <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
        <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
      </svg>
    ),
  },
  {
    name: "GitHub",
    href: "https://github.com",
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
  const filteredLinks = isHomePage
    ? footerLinks
    : footerLinks.filter(item => !item.href.startsWith("/#"));

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
      <div className="h-px bg-gradient-to-r from-transparent via-brand-500 to-transparent" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main content - Single row on desktop */}
        <div className="py-10 lg:py-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            {/* Left - Logo */}
            <Link href="/" className="inline-block group shrink-0">
              <Image
                src="/images/logo.svg"
                alt="HBC Engineering"
                width={140}
                height={42}
                className="object-contain opacity-80 group-hover:opacity-100 transition-opacity duration-300"
              />
            </Link>

            {/* Center - All links in one row */}
            <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 lg:gap-x-8">
              {filteredLinks.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                  className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
                >
                  {item.name}
                </Link>
              ))}
              <button
                onClick={openSettings}
                className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
              >
                {t("footer.manageCookies")}
              </button>
            </nav>

            {/* Right - Social icons */}
            <div className="flex items-center justify-center lg:justify-end gap-1 shrink-0">
              {socials.map((social) => (
                <Link
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 text-gray-500 hover:text-brand-400 transition-colors duration-200"
                >
                  <span className="sr-only">{social.name}</span>
                  <social.icon className="w-5 h-5" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar - minimal */}
        <div className="border-t border-white/5 py-6">
          <p className="text-sm text-gray-500 text-center">
            © {new Date().getFullYear()} HBC Engineering. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
