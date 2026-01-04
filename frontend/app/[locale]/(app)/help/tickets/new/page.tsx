"use client";

import { useState, useEffect } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import {
  Ticket,
  ArrowLeft,
  Send,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supportApi } from "@/lib/api";
import type {
  CreateTicketRequest,
  TicketCategory,
  TicketPriority,
} from "@/types/support";
import { TICKET_CATEGORY_LABELS, TICKET_PRIORITY_LABELS } from "@/types/support";
import { toast } from "sonner";

export default function NewTicketPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateTicketRequest>({
    subject: "",
    message: "",
    category: "GENERAL",
    priority: "MEDIUM",
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.subject.length < 5) {
      toast.error("Subject must be at least 5 characters");
      return;
    }

    if (formData.message.length < 10) {
      toast.error("Message must be at least 10 characters");
      return;
    }

    setIsSubmitting(true);

    try {
      const ticket = await supportApi.createTicket(formData);
      toast.success("Ticket created successfully!");
      router.push(`/help/tickets/${ticket.id}`);
    } catch (error) {
      console.error("Failed to create ticket:", error);
      toast.error("Failed to create ticket. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const categories: TicketCategory[] = [
    "GENERAL",
    "TECHNICAL",
    "BILLING",
    "ACCOUNT",
    "TOKEN_PURCHASE",
    "LOCKING",
    "MARKETPLACE",
    "AFFILIATE",
    "OTHER",
  ];

  const priorities: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Link */}
        <div className="mb-8 animate-in fade-in slide-in-from-left-4 duration-300">
          <Link
            href={`/${locale}/help/tickets`}
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Tickets
          </Link>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-4">
              <Ticket className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Create Support Ticket
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Describe your issue and we&apos;ll help you resolve it
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-lg space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100"
          >
            {/* Category & Priority */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="category"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Category
                </label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value as TicketCategory,
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {TICKET_CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="priority"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Priority
                </label>
                <select
                  id="priority"
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      priority: e.target.value as TicketPriority,
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                >
                  {priorities.map((pri) => (
                    <option key={pri} value={pri}>
                      {TICKET_PRIORITY_LABELS[pri]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Subject */}
            <div>
              <label
                htmlFor="subject"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Subject
              </label>
              <input
                type="text"
                id="subject"
                required
                minLength={5}
                maxLength={200}
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="Brief description of your issue"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {formData.subject.length}/200 characters
              </p>
            </div>

            {/* Message */}
            <div>
              <label
                htmlFor="message"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Message
              </label>
              <textarea
                id="message"
                required
                minLength={10}
                maxLength={5000}
                rows={8}
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                placeholder="Describe your issue in detail. Include any relevant information such as error messages, steps to reproduce, etc."
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {formData.message.length}/5000 characters
              </p>
            </div>

            {/* Tips */}
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-medium mb-1">Tips for faster resolution:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-600 dark:text-blue-400">
                    <li>Be specific about the issue you&apos;re experiencing</li>
                    <li>Include any error messages you see</li>
                    <li>Mention steps to reproduce the problem</li>
                    <li>Check our FAQ first for common questions</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Ticket...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit Ticket
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
