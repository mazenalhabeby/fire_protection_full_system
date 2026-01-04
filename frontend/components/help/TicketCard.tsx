"use client";

import { Clock, MessageCircle, ArrowRight } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import type { SupportTicket } from "@/types/support";
import { TICKET_CATEGORY_LABELS } from "@/types/support";
import { TicketStatusBadge, TicketPriorityBadge } from "./TicketStatusBadge";

interface TicketCardProps {
  ticket: SupportTicket;
  locale?: string;
}

export function TicketCard({ ticket, locale = "en" }: TicketCardProps) {
  const router = useRouter();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all cursor-pointer group"
      onClick={() => router.push(`/help/tickets/${ticket.id}`)}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Ticket Number & Subject */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-mono text-gray-500 dark:text-gray-400">
              #{ticket.ticketNumber}
            </span>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {TICKET_CATEGORY_LABELS[ticket.category]}
            </span>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {ticket.subject}
          </h3>

          {/* Status & Priority */}
          <div className="flex flex-wrap items-center gap-2">
            <TicketStatusBadge status={ticket.status} size="sm" />
            <TicketPriorityBadge priority={ticket.priority} size="sm" />
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex flex-col items-end gap-2 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>{formatDate(ticket.createdAt)}</span>
            <span className="text-gray-400 dark:text-gray-500">
              {formatTime(ticket.createdAt)}
            </span>
          </div>

          {ticket._count && (
            <div className="flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4" />
              <span>{ticket._count.messages} messages</span>
            </div>
          )}

          <ArrowRight className="w-5 h-5 text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </div>
  );
}
