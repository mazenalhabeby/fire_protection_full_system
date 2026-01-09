"use client";

import { useState, useEffect, useRef } from "react";
import { Link } from "@/i18n/navigation";
import {
  Send,
  Loader2,
  User,
  Shield,
  Bot,
  Clock,
  Search,
  Mail,
  Ticket,
  UserCircle,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { supportApi } from "@/lib/api";
import { TicketStatusBadge, TicketPriorityBadge, HelpNav } from "@/components/help";
import type { SupportTicket, TicketMessage } from "@/types/support";
import { TICKET_CATEGORY_LABELS } from "@/types/support";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function GuestTicketPage() {
  const searchParams = useSearchParams();
  const locale = useLocale();
  const token = searchParams.get("token");

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [accessToken, setAccessToken] = useState(token || "");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Lookup form state
  const [showLookup, setShowLookup] = useState(!token);
  const [lookupTicketNumber, setLookupTicketNumber] = useState("");
  const [lookupEmail, setLookupEmail] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);

  useEffect(() => {
    if (token) {
      loadTicket(token);
    }
  }, [token]);

  useEffect(() => {
    scrollToBottom();
  }, [ticket?.messages]);

  const loadTicket = async (tkn: string) => {
    setIsLoading(true);
    try {
      const data = await supportApi.getGuestTicket(tkn);
      setTicket(data);
      setAccessToken(tkn);
      setShowLookup(false);
    } catch (error) {
      console.error("Failed to load ticket:", error);
      toast.error("Failed to load ticket. Please check your access link.");
      setShowLookup(true);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !accessToken) return;

    setIsSending(true);
    try {
      const message = await supportApi.replyToGuestTicket({
        accessToken,
        content: newMessage.trim(),
      });

      setTicket((prev) =>
        prev
          ? {
              ...prev,
              messages: [...(prev.messages || []), message],
            }
          : null
      );

      setNewMessage("");
      toast.success("Reply sent!");
    } catch (error) {
      console.error("Failed to send reply:", error);
      toast.error("Failed to send reply");
    } finally {
      setIsSending(false);
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!lookupTicketNumber.trim() || !lookupEmail.trim()) {
      toast.error("Please enter ticket number and email");
      return;
    }

    setIsLookingUp(true);
    try {
      await supportApi.requestTicketAccess({
        ticketNumber: lookupTicketNumber.trim(),
        email: lookupEmail.trim(),
      });
      toast.success("Access link has been sent to your email!");
    } catch (error) {
      console.error("Failed to lookup ticket:", error);
      toast.error("Ticket not found or email does not match");
    } finally {
      setIsLookingUp(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getMessageIcon = (message: TicketMessage) => {
    switch (message.senderType) {
      case "ADMIN":
        return <Shield className="w-5 h-5 text-indigo-600" />;
      case "SYSTEM":
        return <Bot className="w-5 h-5 text-gray-500" />;
      case "GUEST":
        return <UserCircle className="w-5 h-5 text-emerald-600" />;
      default:
        return <User className="w-5 h-5 text-gray-600" />;
    }
  };

  const getMessageStyles = (message: TicketMessage) => {
    if (message.senderType === "SYSTEM") {
      return "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 mx-auto max-w-md text-center";
    }

    if (message.senderType === "ADMIN") {
      return "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 mr-auto";
    }

    // GUEST or USER messages (from the ticket creator)
    return "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 ml-auto";
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Lookup form (no token or invalid token)
  if (showLookup && !ticket) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6 animate-in fade-in slide-in-from-left-4 duration-300">
          <HelpNav />
        </div>

          <div className="max-w-md mx-auto">
            <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Ticket className="w-8 h-8 text-indigo-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Find Your Ticket
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Enter your ticket number and email to receive an access link
                </p>
              </div>

              <form onSubmit={handleLookup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Ticket Number
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={lookupTicketNumber}
                      onChange={(e) => setLookupTicketNumber(e.target.value.toUpperCase())}
                      placeholder="TKT202501XXXX"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={lookupEmail}
                      onChange={(e) => setLookupEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLookingUp || !lookupTicketNumber || !lookupEmail}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLookingUp ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : (
                    "Send Access Link"
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                  Don&apos;t have a ticket?{" "}
                  <Link
                    href="/help/contact"
                    className="text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Create a new support request
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Ticket not found</p>
      </div>
    );
  }

  const isTicketClosed =
    ticket.status === "CLOSED" || ticket.status === "RESOLVED";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Help Navigation */}
        <div className="mb-6 animate-in fade-in slide-in-from-left-4 duration-300">
          <HelpNav />
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Ticket Header */}
          <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-6 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
                  <span className="font-mono">#{ticket.ticketNumber}</span>
                  <span>-</span>
                  <span>{TICKET_CATEGORY_LABELS[ticket.category]}</span>
                </div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  {ticket.subject}
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                  <TicketStatusBadge status={ticket.status} />
                  <TicketPriorityBadge priority={ticket.priority} />
                </div>
              </div>

              <div className="text-sm text-gray-500 dark:text-gray-400 text-right">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>Created {formatDate(ticket.createdAt)}</span>
                </div>
                {ticket.resolvedAt && (
                  <div className="mt-1">
                    Resolved {formatDate(ticket.resolvedAt)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            {/* Message List */}
            <div className="max-h-[500px] overflow-y-auto p-6 space-y-4">
              {ticket.messages?.map((message, index) => (
                <div
                  key={message.id}
                  className={cn(
                    "p-4 rounded-xl border max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300",
                    getMessageStyles(message)
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      {getMessageIcon(message)}
                    </div>
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white text-sm">
                        {message.senderType === "ADMIN"
                          ? "Support Team"
                          : message.senderType === "SYSTEM"
                          ? "System"
                          : "You"}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                        {formatDate(message.createdAt)}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap pl-10">
                    {message.content}
                  </p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Form */}
            {!isTicketClosed ? (
              <form
                onSubmit={handleSendMessage}
                className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30"
              >
                <div className="flex gap-3">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your reply..."
                    rows={3}
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                  />
                  <button
                    type="submit"
                    disabled={isSending || !newMessage.trim()}
                    className="self-end px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 text-center">
                <p className="text-gray-500 dark:text-gray-400">
                  This ticket is {ticket.status.toLowerCase()}. Create a new
                  ticket if you need further assistance.
                </p>
                <Link
                  href="/help/contact"
                  className="inline-flex items-center gap-2 mt-3 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Create New Support Request
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
