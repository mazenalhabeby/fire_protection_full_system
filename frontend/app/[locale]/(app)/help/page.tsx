"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/navigation";
import {
  MessageSquare,
  Mail,
  BookOpen,
  Ticket,
  Search,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supportApi } from "@/lib/api";
import { FAQAccordion, HelpNav } from "@/components/help";
import type { FAQCategory } from "@/types/support";

// Mock FAQ data for initial display (will be replaced by API data)
const mockFAQCategories: FAQCategory[] = [
  {
    id: "1",
    name: "Getting Started",
    slug: "getting-started",
    description: "New to HBCT? Start here",
    items: [
      {
        id: "1-1",
        question: "What is HBCT Fire Protection Token?",
        answer:
          "HBCT (HBC Fire Protection Token) is a utility token designed for the fire protection industry. It enables users to purchase fire safety products, access exclusive services, and participate in the HBC ecosystem.",
      },
      {
        id: "1-2",
        question: "How do I create an account?",
        answer:
          "Click the 'Sign Up' button in the navigation bar, enter your email address, create a secure password, and verify your email. Once verified, you can access all platform features.",
      },
      {
        id: "1-3",
        question: "How do I connect my wallet?",
        answer:
          "After logging in, click the 'Connect Wallet' button in the top right corner. We support MetaMask, WalletConnect, and other popular Web3 wallets. Follow the prompts to securely connect your wallet.",
      },
    ],
  },
  {
    id: "2",
    name: "Token & Purchases",
    slug: "tokens",
    description: "Buying and managing tokens",
    items: [
      {
        id: "2-1",
        question: "How do I buy HBCT tokens?",
        answer:
          "Navigate to the 'Buy Tokens' page from the dashboard. Select your payment method (crypto or fiat), enter the amount you wish to purchase, and complete the transaction. Tokens will be credited to your account immediately.",
      },
      {
        id: "2-2",
        question: "What payment methods are accepted?",
        answer:
          "We accept major cryptocurrencies (BNB, USDT, USDC) and traditional payment methods including credit/debit cards. Payment options may vary by region.",
      },
      {
        id: "2-3",
        question: "Is there a minimum purchase amount?",
        answer:
          "The minimum purchase amount is 100 HBCT tokens. There's no maximum limit, though large purchases may require additional verification for security purposes.",
      },
    ],
  },
  {
    id: "3",
    name: "Token Locking",
    slug: "locking",
    description: "Lock tokens and earn rewards",
    items: [
      {
        id: "3-1",
        question: "What is token locking?",
        answer:
          "Token locking allows you to lock your HBCT tokens for a specified period (3, 6, or 12 months) in exchange for bonus tokens and fee discounts. The longer you lock, the higher the rewards.",
      },
      {
        id: "3-2",
        question: "Can I unlock my tokens early?",
        answer:
          "Early unlocking is not available. Tokens remain locked until the end of your selected lock period. This ensures the stability of the ecosystem and rewards long-term holders.",
      },
      {
        id: "3-3",
        question: "How are locking rewards calculated?",
        answer:
          "Rewards are calculated based on the lock period: 3 months = 5% bonus, 6 months = 12% bonus, 12 months = 25% bonus. You also receive transaction fee discounts during the lock period.",
      },
    ],
  },
  {
    id: "4",
    name: "Marketplace",
    slug: "marketplace",
    description: "Shopping with HBCT",
    items: [
      {
        id: "4-1",
        question: "What can I buy in the marketplace?",
        answer:
          "The marketplace offers fire protection equipment, safety gear, training materials, and exclusive merchandise. All items can be purchased using HBCT tokens, often at discounted rates.",
      },
      {
        id: "4-2",
        question: "How does shipping work?",
        answer:
          "We ship worldwide. Shipping costs and delivery times vary by location. Standard shipping is free for orders over $100. You can track your order through your account dashboard.",
      },
    ],
  },
  {
    id: "5",
    name: "Affiliate Program",
    slug: "affiliates",
    description: "Earn by referring others",
    items: [
      {
        id: "5-1",
        question: "How does the affiliate program work?",
        answer:
          "Share your unique referral link with others. When they sign up and make purchases, you earn 5% commission in HBCT tokens. There's no limit to how much you can earn!",
      },
      {
        id: "5-2",
        question: "When do I receive my affiliate commissions?",
        answer:
          "Commissions are credited to your account immediately after the referred user's transaction is completed. You can view your earnings in the Affiliates dashboard.",
      },
    ],
  },
];

export default function HelpPage() {
  const params = useParams();
  const locale = params.locale as string;
  const { isAuthenticated } = useAuth();
  const [faqCategories, setFaqCategories] =
    useState<FAQCategory[]>(mockFAQCategories);

  useEffect(() => {
    const loadFAQ = async () => {
      try {
        const data = await supportApi.getFAQ();
        if (data && data.length > 0) {
          setFaqCategories(data);
        }
      } catch {
        // Keep using mock data on error
      }
    };

    loadFAQ();
  }, []);

  const quickActions = [
    {
      title: "Search FAQ",
      description: "Find answers to common questions",
      icon: Search,
      href: "#faq",
      color: "from-blue-500 to-cyan-500",
    },
    {
      title: "Contact Support",
      description: "Send us a message",
      icon: Mail,
      href: "/help/contact",
      color: "from-purple-500 to-pink-500",
    },
    {
      title: "My Tickets",
      description: "View your support history",
      icon: Ticket,
      href: "/help/tickets",
      color: "from-orange-500 to-amber-500",
      requiresAuth: true,
    },
    {
      title: "New Ticket",
      description: "Create a support request",
      icon: MessageSquare,
      href: "/help/tickets/new",
      color: "from-green-500 to-emerald-500",
      requiresAuth: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Help Navigation */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <HelpNav />
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 mb-6">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Help Center</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              How can we{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                help you?
              </span>
            </h1>

            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
              Find answers to common questions, browse our knowledge base, or
              get in touch with our support team.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-12 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            {quickActions.map((action, index) => {
              const isDisabled = action.requiresAuth && !isAuthenticated;

              return (
                <Link
                  key={index}
                  href={isDisabled ? `/${locale}/login` : action.href}
                  className={`group relative p-6 rounded-2xl bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all ${
                    isDisabled ? "opacity-60" : ""
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <action.icon className="w-6 h-6 text-white" />
                  </div>

                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {action.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {action.description}
                    {isDisabled && (
                      <span className="block text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                        Login required
                      </span>
                    )}
                  </p>

                  <ArrowRight className="absolute top-6 right-6 w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 scroll-mt-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 mb-4">
                <BookOpen className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Frequently Asked Questions
                </span>
              </div>

              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                Common Questions
              </h2>
            </div>

            <FAQAccordion categories={faqCategories} />
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 to-purple-600 p-8 sm:p-12">
              <div className="absolute inset-0 bg-[url('/patterns/circuit.svg')] opacity-10" />

              <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="text-center sm:text-left">
                  <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                    Still need help?
                  </h3>
                  <p className="text-indigo-100">
                    Our support team is here to assist you 24/7
                  </p>
                </div>

                <div className="flex gap-4">
                  <Link
                    href="/help/contact"
                    className="flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 font-medium rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <Mail className="w-5 h-5" />
                    Contact Us
                  </Link>

                  {isAuthenticated && (
                    <Link
                      href="/help/tickets/new"
                      className="flex items-center gap-2 px-6 py-3 bg-white/20 text-white font-medium rounded-xl hover:bg-white/30 transition-colors backdrop-blur-sm border border-white/30"
                    >
                      <Ticket className="w-5 h-5" />
                      Open Ticket
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
