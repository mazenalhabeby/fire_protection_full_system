"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  HelpCircle,
  X,
  MessageSquare,
  BookOpen,
  Ticket,
  Mail,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { useParams, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { QuickContactForm } from "./QuickContactForm";
import { cn } from "@/lib/utils";

type WidgetView = "menu" | "faq" | "contact";

const quickFAQs = [
  {
    question: "How do I buy HBCT tokens?",
    answer:
      "Navigate to the 'Buy Tokens' page from the dashboard. Select your payment method and complete the transaction.",
  },
  {
    question: "What is token locking?",
    answer:
      "Token locking allows you to lock your HBCT tokens for rewards. The longer you lock, the higher the bonus.",
  },
  {
    question: "How does the affiliate program work?",
    answer:
      "Share your referral link and earn 5% commission when referred users make purchases.",
  },
  {
    question: "How can I connect my wallet?",
    answer:
      "Click 'Connect Wallet' in the navbar. We support MetaMask, WalletConnect, and other popular wallets.",
  },
];

export function HelpWidget() {
  const params = useParams();
  const pathname = usePathname();
  const locale = (params.locale as string) || "en";
  const { isAuthenticated } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<WidgetView>("menu");
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  // Don't show widget on help pages
  const isHelpPage = pathname?.includes("/help");

  // Load saved state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem("helpWidgetOpen");
    if (savedState === "true") {
      setIsOpen(true);
    }
  }, []);

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem("helpWidgetOpen", isOpen.toString());
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    setView("menu");
    setExpandedFAQ(null);
  };

  const menuItems = [
    {
      icon: BookOpen,
      label: "Quick FAQ",
      description: "Common questions",
      action: () => setView("faq"),
    },
    {
      icon: Mail,
      label: "Contact Us",
      description: "Send a message",
      action: () => setView("contact"),
    },
    {
      icon: MessageSquare,
      label: "Help Center",
      description: "Browse all topics",
      href: `/${locale}/help`,
    },
  ];

  if (isAuthenticated) {
    menuItems.push({
      icon: Ticket,
      label: "My Tickets",
      description: "View support history",
      href: `/${locale}/help/tickets`,
    });
  }

  if (isHelpPage) {
    return null;
  }

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95",
          isOpen
            ? "bg-gray-700 dark:bg-gray-600 hover:bg-gray-800 dark:hover:bg-gray-500"
            : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
        )}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white transition-transform duration-150" />
        ) : (
          <HelpCircle className="w-6 h-6 text-white transition-transform duration-150" />
        )}
      </button>

      {/* Widget Panel */}
      <div
        className={cn(
          "fixed bottom-24 right-6 z-50 w-80 sm:w-96 max-h-[70vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-200 origin-bottom-right",
          isOpen
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-4 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {view !== "menu" && (
                <button
                  onClick={() => setView("menu")}
                  className="p-1 rounded-lg hover:bg-white/20 transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-white rotate-180" />
                </button>
              )}
              <h3 className="font-semibold text-white">
                {view === "menu" && "Need Help?"}
                {view === "faq" && "Quick FAQ"}
                {view === "contact" && "Contact Us"}
              </h3>
            </div>
            <button
              onClick={handleClose}
              className="p-1 rounded-lg hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          {view === "menu" && (
            <p className="text-indigo-100 text-sm mt-1">
              We&apos;re here to help you 24/7
            </p>
          )}
        </div>

        {/* Content */}
        <div className="max-h-[50vh] overflow-y-auto">
          {/* Menu View */}
          {view === "menu" && (
            <div className="p-4 space-y-2">
              {menuItems.map((item, index) => {
                const content = (
                  <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {item.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {item.description}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                  </div>
                );

                if ("href" in item && item.href) {
                  return (
                    <Link key={index} href={item.href} onClick={handleClose}>
                      {content}
                    </Link>
                  );
                }

                return (
                  <div key={index} onClick={"action" in item ? item.action : undefined}>
                    {content}
                  </div>
                );
              })}

              {/* Create Ticket Button */}
              {isAuthenticated && (
                <Link
                  href={`/${locale}/help/tickets/new`}
                  onClick={handleClose}
                  className="block mt-4 w-full p-3 text-center font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl transition-colors"
                >
                  Open Support Ticket
                </Link>
              )}
            </div>
          )}

          {/* FAQ View */}
          {view === "faq" && (
            <div className="p-4 space-y-3">
              {quickFAQs.map((faq, index) => (
                <div
                  key={index}
                  className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setExpandedFAQ(expandedFAQ === index ? null : index)
                    }
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <span className="font-medium text-gray-900 dark:text-white text-sm pr-2">
                      {faq.question}
                    </span>
                    <ChevronRight
                      className={cn(
                        "w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200",
                        expandedFAQ === index && "rotate-90"
                      )}
                    />
                  </button>
                  <div
                    className={cn(
                      "grid transition-all duration-200",
                      expandedFAQ === index
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="px-3 pb-3 pt-0">
                        <p className="text-sm text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-2">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <Link
                href={`/${locale}/help#faq`}
                onClick={handleClose}
                className="flex items-center justify-center gap-2 p-3 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                View All FAQ
              </Link>
            </div>
          )}

          {/* Contact View */}
          {view === "contact" && (
            <div className="p-4">
              <QuickContactForm compact onSuccess={handleClose} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
