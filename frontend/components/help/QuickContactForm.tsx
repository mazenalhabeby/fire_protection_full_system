"use client";

import { useState } from "react";
import { Send, CheckCircle, Loader2, Ticket, Copy } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { supportApi } from "@/lib/api";
import { toast } from "sonner";

interface QuickContactFormProps {
  onSuccess?: () => void;
  compact?: boolean;
}

interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface TicketResult {
  ticketNumber: string;
  accessToken: string;
}

export function QuickContactForm({
  onSuccess,
  compact = false,
}: QuickContactFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketResult, setTicketResult] = useState<TicketResult | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create a guest ticket instead of contact form
      const result = await supportApi.createGuestTicket({
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
      });

      setTicketResult({
        ticketNumber: result.ticketNumber,
        accessToken: result.accessToken,
      });

      toast.success("Support ticket created! Check your email for the access link.");
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Failed to create ticket:", error);
      toast.error("Failed to create ticket. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyTicketNumber = () => {
    if (ticketResult) {
      navigator.clipboard.writeText(ticketResult.ticketNumber);
      toast.success("Ticket number copied!");
    }
  };

  if (ticketResult) {
    return (
      <div className="flex flex-col items-center justify-center py-4 sm:py-8 text-center animate-in fade-in zoom-in duration-300">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-3 sm:mb-4">
          <CheckCircle className="w-7 h-7 sm:w-10 sm:h-10 text-green-500" />
        </div>
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-1.5 sm:mb-2">
          Ticket Created!
        </h3>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-3 sm:mb-4">
          We&apos;ve sent an access link to your email.
        </p>

        <div className="w-full max-w-sm p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-3 sm:mb-4">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">Your Ticket Number</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-base sm:text-lg font-mono font-bold text-gray-900 dark:text-white">
              #{ticketResult.ticketNumber}
            </span>
            <button
              onClick={copyTicketNumber}
              className="p-1.5 text-gray-500 hover:text-indigo-600 transition-colors"
              title="Copy ticket number"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        <Link
          href={`/help/ticket?token=${ticketResult.accessToken}`}
          className="inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm sm:text-base font-medium rounded-lg shadow-lg hover:shadow-xl transition-all"
        >
          <Ticket className="w-4 h-4 sm:w-5 sm:h-5" />
          View Your Ticket
        </Link>

        <button
          onClick={() => {
            setTicketResult(null);
            setFormData({ name: "", email: "", subject: "", message: "" });
          }}
          className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-500 hover:text-indigo-600 transition-colors"
        >
          Create another ticket
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
      <div className={compact ? "grid sm:grid-cols-2 gap-3 sm:gap-4" : "space-y-3 sm:space-y-4"}>
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Your Name
          </label>
          <input
            type="text"
            id="name"
            required
            minLength={2}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Email Address
          </label>
          <input
            type="email"
            id="email"
            required
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            placeholder="john@example.com"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="subject"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Subject
        </label>
        <input
          type="text"
          id="subject"
          required
          minLength={5}
          value={formData.subject}
          onChange={(e) =>
            setFormData({ ...formData, subject: e.target.value })
          }
          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          placeholder="How can we help?"
        />
      </div>

      <div>
        <label
          htmlFor="message"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Message
        </label>
        <textarea
          id="message"
          required
          minLength={10}
          rows={compact ? 3 : 4}
          value={formData.message}
          onChange={(e) =>
            setFormData({ ...formData, message: e.target.value })
          }
          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
          placeholder="Describe your inquiry in detail..."
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm sm:text-base font-medium rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
            <span className="hidden sm:inline">Creating Ticket...</span>
            <span className="sm:hidden">Creating...</span>
          </>
        ) : (
          <>
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Create Support Ticket</span>
            <span className="sm:hidden">Create Ticket</span>
          </>
        )}
      </button>

      <p className="text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">
        Have an existing ticket?{" "}
        <Link
          href="/help/ticket"
          className="text-indigo-600 hover:text-indigo-700 font-medium"
        >
          Look it up here
        </Link>
      </p>
    </form>
  );
}
