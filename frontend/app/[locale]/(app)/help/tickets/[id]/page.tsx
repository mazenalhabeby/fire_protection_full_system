"use client";

import { useState, useEffect, useRef } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import {
  ArrowLeft,
  Send,
  Loader2,
  User,
  Shield,
  Bot,
  Clock,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useLocale } from "next-intl";
import { useAuth } from "@/hooks/useAuth";
import { supportApi } from "@/lib/api";
import { TicketStatusBadge, TicketPriorityBadge } from "@/components/help";
import type { SupportTicket, TicketMessage } from "@/types/support";
import { TICKET_CATEGORY_LABELS } from "@/types/support";
import { toast } from "sonner";
import { cn, formatName } from "@/lib/utils";

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const ticketId = params.id as string;
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isAuthenticated && ticketId) {
      loadTicket();
    }
  }, [isAuthenticated, authLoading, ticketId, locale, router]);

  useEffect(() => {
    scrollToBottom();
  }, [ticket?.messages]);

  const loadTicket = async () => {
    setIsLoading(true);
    try {
      const data = await supportApi.getTicket(ticketId);
      setTicket(data);
    } catch (error) {
      console.error("Failed to load ticket:", error);
      toast.error("Failed to load ticket");
      router.push('/help/tickets');
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim()) return;

    setIsSending(true);
    try {
      const message = await supportApi.replyToTicket(ticketId, {
        content: newMessage.trim(),
      });

      // Add message to the list
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
      default:
        return <User className="w-5 h-5 text-gray-600" />;
    }
  };

  const getMessageStyles = (message: TicketMessage) => {
    const isOwnMessage =
      message.senderType === "USER" && message.sender?.id === user?.id;

    if (message.senderType === "SYSTEM") {
      return "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 mx-auto max-w-md text-center";
    }

    if (message.senderType === "ADMIN") {
      return "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 mr-auto";
    }

    return isOwnMessage
      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 ml-auto"
      : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 mr-auto";
  };

  if (authLoading || !isAuthenticated || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
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
        {/* Back Link */}
        <div className="mb-6 animate-in fade-in slide-in-from-left-4 duration-300">
          <Link
            href="/help/tickets"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Tickets
          </Link>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Ticket Header */}
          <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-6 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
                  <span className="font-mono">#{ticket.ticketNumber}</span>
                  <span>•</span>
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
                          : message.sender?.firstName ||
                            message.sender?.lastName
                          ? formatName(message.sender.firstName, message.sender.lastName)
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
                  href="/help/tickets/new"
                  className="inline-flex items-center gap-2 mt-3 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Create New Ticket
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
