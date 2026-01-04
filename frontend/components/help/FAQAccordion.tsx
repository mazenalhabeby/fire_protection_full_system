"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { ChevronDown, ThumbsUp, ThumbsDown, Search } from "lucide-react";
import { supportApi } from "@/lib/api";
import type { FAQCategory, FAQItem } from "@/types/support";
import { cn } from "@/lib/utils";

interface FAQAccordionProps {
  categories: FAQCategory[];
}

const categoryIcons: Record<string, string> = {
  "getting-started": "🚀",
  tokens: "🪙",
  locking: "🔒",
  marketplace: "🛒",
  affiliates: "🤝",
  security: "🔐",
  account: "👤",
};

export function FAQAccordion({ categories }: FAQAccordionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [ratedItems, setRatedItems] = useState<Set<string>>(new Set());

  const toggleItem = async (item: FAQItem) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(item.id)) {
      newOpenItems.delete(item.id);
    } else {
      newOpenItems.add(item.id);
      // Track view
      try {
        await supportApi.trackFAQView(item.id);
      } catch (error) {
        console.error("Failed to track FAQ view:", error);
      }
    }
    setOpenItems(newOpenItems);
  };

  const handleRate = async (item: FAQItem, helpful: boolean) => {
    if (ratedItems.has(item.id)) return;

    try {
      await supportApi.rateFAQItem(item.id, helpful);
      setRatedItems(new Set([...ratedItems, item.id]));
    } catch (error) {
      console.error("Failed to rate FAQ item:", error);
    }
  };

  // Filter FAQ items based on search query
  const filteredCategories = categories
    .map((category) => ({
      ...category,
      items: category.items.filter(
        (item) =>
          item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.answer.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((category) => category.items.length > 0);

  return (
    <div className="space-y-8">
      {/* Search Bar */}
      <div className="relative max-w-xl mx-auto">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search FAQ..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        />
      </div>

      {/* FAQ Categories */}
      <div className="space-y-8">
        {filteredCategories.map((category) => (
          <div key={category.id} className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {categoryIcons[category.slug] || "📋"}
              </span>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {category.name}
              </h3>
              {category.description && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  — {category.description}
                </span>
              )}
            </div>

            <div className="space-y-3">
              {category.items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <button
                    onClick={() => toggleItem(item)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <span className="font-medium text-gray-900 dark:text-white pr-4">
                      {item.question}
                    </span>
                    <ChevronDown
                      className={cn(
                        "w-5 h-5 text-gray-500 flex-shrink-0 transition-transform duration-200",
                        openItems.has(item.id) && "rotate-180"
                      )}
                    />
                  </button>

                  <div
                    className={cn(
                      "grid transition-all duration-200 ease-in-out",
                      openItems.has(item.id)
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="px-4 pb-4 pt-0">
                        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                          <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                            {item.answer}
                          </p>

                          {/* Rating */}
                          <div className="mt-4 flex items-center gap-4">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              Was this helpful?
                            </span>
                            {ratedItems.has(item.id) ? (
                              <span className="text-sm text-green-600 dark:text-green-400">
                                Thank you for your feedback!
                              </span>
                            ) : (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleRate(item, true)}
                                  className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-green-100 dark:hover:bg-green-900/30 text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                                >
                                  <ThumbsUp className="w-4 h-4" />
                                  Yes
                                </button>
                                <button
                                  onClick={() => handleRate(item, false)}
                                  className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                >
                                  <ThumbsDown className="w-4 h-4" />
                                  No
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {filteredCategories.length === 0 && searchQuery && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            No results found for &ldquo;{searchQuery}&rdquo;
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Try different keywords or{" "}
            <Link
              href="/help/contact"
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              contact support
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
