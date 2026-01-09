"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { HelpCircle, Mail, Ticket, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const helpNavItems = [
  {
    href: "/help",
    label: "Help Center",
    icon: HelpCircle,
    exact: true,
  },
  {
    href: "/help/contact",
    label: "Contact Support",
    icon: Mail,
  },
  {
    href: "/help/ticket",
    label: "Find Ticket",
    icon: Search,
  },
];

export function HelpNav() {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href || pathname === `${href}/`;
    }
    return pathname === href || pathname?.startsWith(`${href}/`);
  };

  return (
    <nav className="flex items-center gap-1 sm:gap-2 p-1 bg-gray-100 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
      {helpNavItems.map((item) => {
        const active = isActive(item.href, item.exact);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0",
              active
                ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50"
            )}
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
