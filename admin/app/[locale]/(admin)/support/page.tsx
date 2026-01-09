"use client";

import { useState, useRef } from "react";
import { Link } from "@/i18n/navigation";
import {
  useSupportStats,
  useAdminTickets,
  useUpdateTicket,
  useBulkUpdateTickets,
} from "@/hooks/useAdminSupport";
import { StatCard } from "@/components/stat-card";
import { AdminSkeleton } from "@/components/skeletons";
import { cn } from "@/components/ui";
import {
  Ticket,
  MessageSquare,
  Mail,
  RefreshCw,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  User,
  MoreHorizontal,
  Eye,
  UserCheck,
  X,
  Loader2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useAdminAuth } from "@/providers/AuthProvider";
import type {
  SupportTicket,
  TicketStatus,
  TicketPriority,
  TicketCategory,
} from "@/types";
import {
  TICKET_STATUS_LABELS,
  TICKET_STATUS_COLORS,
  TICKET_PRIORITY_LABELS,
  TICKET_PRIORITY_COLORS,
  TICKET_CATEGORY_LABELS,
} from "@/types/support";

export default function AdminSupportPage() {
  const { hasPermission, user } = useAdminAuth();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "">("");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "">("");
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | "">("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Queries
  const { data: stats, refetch: refetchStats } = useSupportStats();
  const {
    data: ticketsData,
    isLoading,
    refetch: refetchTickets,
  } = useAdminTickets({
    page,
    limit: 20,
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
    category: categoryFilter || undefined,
  });

  // Mutations
  const updateTicket = useUpdateTicket();
  const bulkUpdate = useBulkUpdateTickets();

  const handleRefresh = () => {
    refetchStats();
    refetchTickets();
  };

  const handleSelectAll = () => {
    if (selectedTickets.length === ticketsData?.tickets.length) {
      setSelectedTickets([]);
    } else {
      setSelectedTickets(ticketsData?.tickets.map((t) => t.id) || []);
    }
  };

  const handleSelectTicket = (ticketId: string) => {
    setSelectedTickets((prev) =>
      prev.includes(ticketId)
        ? prev.filter((id) => id !== ticketId)
        : [...prev, ticketId]
    );
  };

  const handleBulkStatusUpdate = async (status: TicketStatus) => {
    if (selectedTickets.length === 0) return;
    await bulkUpdate.mutateAsync({ ticketIds: selectedTickets, data: { status } });
    setSelectedTickets([]);
    handleRefresh();
  };

  const handleAssignToMe = async () => {
    if (selectedTickets.length === 0 || !user?.id) return;
    await bulkUpdate.mutateAsync({
      ticketIds: selectedTickets,
      data: { assignedTo: user.id },
    });
    setSelectedTickets([]);
    handleRefresh();
  };

  const clearFilters = () => {
    setStatusFilter("");
    setPriorityFilter("");
    setCategoryFilter("");
    setSearchQuery("");
    setPage(1);
  };

  const hasActiveFilters = statusFilter || priorityFilter || categoryFilter || searchQuery;

  if (isLoading) {
    return (
      <div className="p-6">
        <AdminSkeleton />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Support Management
          </h1>
          <p className="text-sm text-gray-500">
            Manage support tickets and contact submissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/support/contacts"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
          >
            <Mail className="h-4 w-4" />
            Contact Submissions
            {stats?.unreadContacts ? (
              <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold">
                {stats.unreadContacts}
              </span>
            ) : null}
          </Link>
          <button
            onClick={handleRefresh}
            className="p-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <RefreshCw className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Open Tickets"
          value={stats?.tickets.open || 0}
          icon={<Ticket className="h-5 w-5" />}
          variant={stats?.tickets.open ? "warning" : "default"}
        />
        <StatCard
          label="In Progress"
          value={stats?.tickets.inProgress || 0}
          icon={<Clock className="h-5 w-5" />}
        />
        <StatCard
          label="Awaiting Reply"
          value={stats?.tickets.awaitingReply || 0}
          icon={<MessageSquare className="h-5 w-5" />}
          variant={stats?.tickets.awaitingReply ? "warning" : "default"}
        />
        <StatCard
          label="Resolved"
          value={stats?.tickets.resolved || 0}
          icon={<CheckCircle2 className="h-5 w-5" />}
          variant="success"
        />
        <StatCard
          label="Total Tickets"
          value={stats?.tickets.total || 0}
          icon={<Ticket className="h-5 w-5" />}
        />
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tickets by number, subject, or user..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors",
              showFilters || hasActiveFilters
                ? "bg-brand-50 dark:bg-brand-500/10 border-brand-200 dark:border-brand-500/30 text-brand-600 dark:text-brand-400"
                : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300"
            )}
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-brand-500" />
            )}
          </button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as TicketStatus | "");
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              >
                <option value="">All</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="AWAITING_REPLY">Awaiting Reply</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Priority:</span>
              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value as TicketPriority | "");
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              >
                <option value="">All</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value as TicketCategory | "");
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              >
                <option value="">All</option>
                <option value="GENERAL">General</option>
                <option value="TECHNICAL">Technical</option>
                <option value="BILLING">Billing</option>
                <option value="ACCOUNT">Account</option>
                <option value="TOKEN_PURCHASE">Token Purchase</option>
                <option value="LOCKING">Token Locking</option>
                <option value="MARKETPLACE">Marketplace</option>
                <option value="AFFILIATE">Affiliate</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
                Clear All
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedTickets.length > 0 && hasPermission("support.edit") && (
        <div className="flex items-center gap-4 p-4 rounded-xl bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/30">
          <span className="text-sm font-medium text-brand-700 dark:text-brand-300">
            {selectedTickets.length} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAssignToMe}
              disabled={bulkUpdate.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <UserCheck className="h-4 w-4" />
              Assign to Me
            </button>
            <button
              onClick={() => handleBulkStatusUpdate("IN_PROGRESS")}
              disabled={bulkUpdate.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-500/30 transition-colors"
            >
              Mark In Progress
            </button>
            {hasPermission("support.close") && (
              <button
                onClick={() => handleBulkStatusUpdate("CLOSED")}
                disabled={bulkUpdate.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            )}
          </div>
          {bulkUpdate.isPending && (
            <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
          )}
        </div>
      )}

      {/* Tickets Table */}
      <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        {!ticketsData?.tickets?.length ? (
          <div className="p-8 text-center">
            <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No tickets found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={
                        selectedTickets.length === ticketsData.tickets.length &&
                        ticketsData.tickets.length > 0
                      }
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Ticket
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Assignee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Created
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {ticketsData.tickets.map((ticket) => (
                  <TicketRow
                    key={ticket.id}
                    ticket={ticket}
                    isSelected={selectedTickets.includes(ticket.id)}
                    onSelect={() => handleSelectTicket(ticket.id)}
                    onRefresh={handleRefresh}
                    canEdit={hasPermission("support.edit")}
                    canAssign={hasPermission("support.assign")}
                    canClose={hasPermission("support.close")}
                    currentUserId={user?.id}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {ticketsData?.pagination && ticketsData.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {page} of {ticketsData.pagination.totalPages} (
            {ticketsData.pagination.total} total)
          </span>
          <button
            onClick={() =>
              setPage((p) => Math.min(ticketsData.pagination.totalPages, p + 1))
            }
            disabled={page === ticketsData.pagination.totalPages}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// TICKET ROW COMPONENT
// ============================================

function TicketRow({
  ticket,
  isSelected,
  onSelect,
  onRefresh,
  canEdit,
  canAssign,
  canClose,
  currentUserId,
}: {
  ticket: SupportTicket;
  isSelected: boolean;
  onSelect: () => void;
  onRefresh: () => void;
  canEdit: boolean;
  canAssign: boolean;
  canClose: boolean;
  currentUserId?: string;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, openUp: false });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const updateTicket = useUpdateTicket();

  const handleMenuToggle = () => {
    if (!showMenu && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuHeight = 200;
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUp = spaceBelow < menuHeight && spaceAbove > menuHeight;

      setMenuPosition({
        top: openUp ? rect.top - menuHeight - 4 : rect.bottom + 4,
        left: rect.right - 160,
        openUp,
      });
    }
    setShowMenu(!showMenu);
  };

  const handleStatusChange = async (status: TicketStatus) => {
    setShowMenu(false);
    await updateTicket.mutateAsync({ ticketId: ticket.id, data: { status } });
    onRefresh();
  };

  const handleAssignToMe = async () => {
    if (!currentUserId) return;
    setShowMenu(false);
    await updateTicket.mutateAsync({
      ticketId: ticket.id,
      data: { assignedTo: currentUserId },
    });
    onRefresh();
  };

  const statusColors = TICKET_STATUS_COLORS[ticket.status];
  const priorityColors = TICKET_PRIORITY_COLORS[ticket.priority];

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
        />
      </td>
      <td className="px-4 py-3">
        <div>
          <Link
            href={`/support/${ticket.id}`}
            className="text-sm font-medium text-gray-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400"
          >
            #{ticket.ticketNumber}
          </Link>
          <p className="text-sm text-gray-500 truncate max-w-[200px]">
            {ticket.subject}
          </p>
          {ticket._count?.messages && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400 mt-1">
              <MessageSquare className="h-3 w-3" />
              {ticket._count.messages}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <User className="h-4 w-4 text-gray-500" />
          </div>
          <div>
            <p className="text-sm text-gray-900 dark:text-white">
              {ticket.user?.firstName && ticket.user?.lastName
                ? `${ticket.user.firstName} ${ticket.user.lastName}`
                : ticket.user?.email?.split("@")[0] || "Unknown"}
            </p>
            <p className="text-xs text-gray-500 truncate max-w-[150px]">
              {ticket.user?.email}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {TICKET_CATEGORY_LABELS[ticket.category]}
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          className={cn(
            "inline-flex px-2 py-1 text-xs font-medium rounded-full border",
            priorityColors.bg,
            priorityColors.text,
            priorityColors.border
          )}
        >
          {TICKET_PRIORITY_LABELS[ticket.priority]}
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          className={cn(
            "inline-flex px-2 py-1 text-xs font-medium rounded-full border",
            statusColors.bg,
            statusColors.text,
            statusColors.border
          )}
        >
          {TICKET_STATUS_LABELS[ticket.status]}
        </span>
      </td>
      <td className="px-4 py-3">
        {ticket.assignee ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center">
              <span className="text-xs font-medium text-brand-600 dark:text-brand-400">
                {ticket.assignee.firstName?.[0] || "?"}
              </span>
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {ticket.assignee.firstName} {ticket.assignee.lastName?.[0]}.
            </span>
          </div>
        ) : (
          <span className="text-sm text-gray-400">Unassigned</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-gray-500">
          {formatDate(ticket.createdAt)}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/support/${ticket.id}`}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="View Details"
          >
            <Eye className="h-4 w-4 text-gray-500" />
          </Link>
          {(canEdit || canAssign || canClose) && (
            <>
              <button
                ref={buttonRef}
                onClick={handleMenuToggle}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <MoreHorizontal className="h-4 w-4 text-gray-500" />
              </button>
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMenu(false)}
                  />
                  <div
                    className="fixed z-50 w-40 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1"
                    style={{ top: menuPosition.top, left: menuPosition.left }}
                  >
                    {canAssign && !ticket.assignee && (
                      <button
                        onClick={handleAssignToMe}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <UserCheck className="h-4 w-4" />
                        Assign to Me
                      </button>
                    )}
                    {canEdit && ticket.status === "OPEN" && (
                      <button
                        onClick={() => handleStatusChange("IN_PROGRESS")}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-500/10"
                      >
                        <Clock className="h-4 w-4" />
                        Start Working
                      </button>
                    )}
                    {canEdit && ticket.status === "IN_PROGRESS" && (
                      <button
                        onClick={() => handleStatusChange("RESOLVED")}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/10"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Mark Resolved
                      </button>
                    )}
                    {canClose &&
                      ticket.status !== "CLOSED" &&
                      ticket.status !== "RESOLVED" && (
                        <button
                          onClick={() => handleStatusChange("CLOSED")}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          <X className="h-4 w-4" />
                          Close Ticket
                        </button>
                      )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
