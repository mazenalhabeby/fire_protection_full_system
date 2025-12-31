"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Ticket,
  Plus,
  Filter,
  ArrowLeft,
  InboxIcon,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { usePageLoading } from "@/hooks/useMinimumLoading";
import { supportApi } from "@/lib/api";
import { TicketCard } from "@/components/help";
import { Skeleton } from "@/components/ui/skeleton";
import type { SupportTicket, TicketStatus } from "@/types/support";
import { TICKET_STATUS_LABELS } from "@/types/support";

export default function TicketsPage() {
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "ALL">("ALL");

  // Page loading state
  const { isLoading: isMinLoading, stopLoading } = usePageLoading();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/${locale}/login`);
      return;
    }

    if (isAuthenticated) {
      loadTickets();
    }
  }, [isAuthenticated, authLoading, locale, router]);

  const loadTickets = async (status?: TicketStatus) => {
    setIsDataLoading(true);
    try {
      const data = await supportApi.getMyTickets(status);
      setTickets(data);
    } catch (error) {
      console.error("Failed to load tickets:", error);
    } finally {
      setIsDataLoading(false);
      stopLoading();
    }
  };

  const handleFilterChange = (status: TicketStatus | "ALL") => {
    setStatusFilter(status);
    if (status === "ALL") {
      loadTickets();
    } else {
      loadTickets(status);
    }
  };

  const showSkeleton = authLoading || !isAuthenticated || isDataLoading || isMinLoading;

  if (showSkeleton) {
    return <TicketsSkeleton />;
  }

  const statusOptions: (TicketStatus | "ALL")[] = [
    "ALL",
    "OPEN",
    "IN_PROGRESS",
    "AWAITING_REPLY",
    "RESOLVED",
    "CLOSED",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Link */}
        <div className="mb-8 animate-in fade-in slide-in-from-left-4 duration-300">
          <Link
            href={`/${locale}/help`}
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Help Center
          </Link>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                <Ticket className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  My Support Tickets
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Track and manage your support requests
                </p>
              </div>
            </div>

            <Link
              href={`/${locale}/help/tickets/new`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              <Plus className="w-5 h-5" />
              New Ticket
            </Link>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
            {statusOptions.map((status) => (
              <button
                key={status}
                onClick={() => handleFilterChange(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  statusFilter === status
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {status === "ALL" ? "All" : TICKET_STATUS_LABELS[status]}
              </button>
            ))}
          </div>

          {/* Tickets List */}
          <div className="space-y-4 animate-in fade-in duration-300 delay-200">
            {tickets.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700">
                <InboxIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No tickets yet
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  You haven&apos;t created any support tickets.
                </p>
                <Link
                  href={`/${locale}/help/tickets/new`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Create Your First Ticket
                </Link>
              </div>
            ) : (
              tickets.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} locale={locale} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TicketsSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Link */}
        <div className="mb-8">
          <Skeleton className="h-5 w-32" />
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-xl" />
              <div>
                <Skeleton className="h-7 w-48 mb-2" />
                <Skeleton className="h-4 w-56" />
              </div>
            </div>
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
            <Skeleton className="w-4 h-4" />
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-9 w-24 rounded-lg" />
            ))}
          </div>

          {/* Tickets List */}
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-5 bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-lg" />
                    <div>
                      <Skeleton className="h-5 w-48 mb-2" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
