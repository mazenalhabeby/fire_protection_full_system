"use client";

import { useState, useEffect, useRef } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import {
  useAdminTicket,
  useUpdateTicket,
  useAdminReplyToTicket,
} from "@/hooks/useAdminSupport";
import { adminApi } from "@/lib/api";
import { cn } from "@/components/ui";
import {
  ArrowLeft,
  Send,
  Loader2,
  User,
  Shield,
  Bot,
  Clock,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  X,
  Eye,
  EyeOff,
  MoreHorizontal,
  Edit,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useAdminAuth } from "@/providers/AuthProvider";
import type {
  SupportTicket,
  TicketMessage,
  TicketStatus,
  TicketPriority,
} from "@/types";
import {
  TICKET_STATUS_LABELS,
  TICKET_STATUS_COLORS,
  TICKET_PRIORITY_LABELS,
  TICKET_PRIORITY_COLORS,
  TICKET_CATEGORY_LABELS,
} from "@/types/support";

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id as string;
  const { hasPermission, user } = useAdminAuth();

  const [newMessage, setNewMessage] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [showEditPanel, setShowEditPanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Queries
  const { data: ticket, isLoading, refetch } = useAdminTicket(ticketId);

  // Mutations
  const updateTicket = useUpdateTicket();
  const replyToTicket = useAdminReplyToTicket();

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [ticket?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    await replyToTicket.mutateAsync({
      ticketId,
      data: { content: newMessage.trim(), isInternal },
    });

    setNewMessage("");
    setIsInternal(false);
    refetch();
  };

  const handleStatusChange = async (status: TicketStatus) => {
    await updateTicket.mutateAsync({ ticketId, data: { status } });
    refetch();
  };

  const handlePriorityChange = async (priority: TicketPriority) => {
    await updateTicket.mutateAsync({ ticketId, data: { priority } });
    refetch();
  };

  const handleAssignToMe = async () => {
    if (!user?.id) return;
    await updateTicket.mutateAsync({ ticketId, data: { assignedTo: user.id } });
    refetch();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">Ticket not found</p>
          <Link
            href="/support"
            className="mt-4 inline-flex items-center gap-2 text-brand-600 hover:text-brand-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Support
          </Link>
        </div>
      </div>
    );
  }

  const isTicketClosed =
    ticket.status === "CLOSED" || ticket.status === "RESOLVED";
  const statusColors = TICKET_STATUS_COLORS[ticket.status];
  const priorityColors = TICKET_PRIORITY_COLORS[ticket.priority];

  return (
    <div className="flex-1 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            href="/support"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Support
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content - Chat */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ticket Header */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
              <div className="flex items-start justify-between gap-4">
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
                    <span
                      className={cn(
                        "inline-flex px-2.5 py-1 text-xs font-medium rounded-full border",
                        statusColors.bg,
                        statusColors.text,
                        statusColors.border
                      )}
                    >
                      {TICKET_STATUS_LABELS[ticket.status]}
                    </span>
                    <span
                      className={cn(
                        "inline-flex px-2.5 py-1 text-xs font-medium rounded-full border",
                        priorityColors.bg,
                        priorityColors.text,
                        priorityColors.border
                      )}
                    >
                      {TICKET_PRIORITY_LABELS[ticket.priority]}
                    </span>
                  </div>
                </div>

                {/* Quick Actions */}
                {hasPermission("support.edit") && !isTicketClosed && (
                  <button
                    onClick={() => setShowEditPanel(!showEditPanel)}
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      showEditPanel
                        ? "bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                    )}
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                )}
              </div>

              {/* Edit Panel */}
              {showEditPanel && hasPermission("support.edit") && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Status */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Status
                      </label>
                      <select
                        value={ticket.status}
                        onChange={(e) =>
                          handleStatusChange(e.target.value as TicketStatus)
                        }
                        disabled={updateTicket.isPending}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                      >
                        <option value="OPEN">Open</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="AWAITING_REPLY">Awaiting Reply</option>
                        <option value="RESOLVED">Resolved</option>
                        {hasPermission("support.close") && (
                          <option value="CLOSED">Closed</option>
                        )}
                      </select>
                    </div>

                    {/* Priority */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Priority
                      </label>
                      <select
                        value={ticket.priority}
                        onChange={(e) =>
                          handlePriorityChange(e.target.value as TicketPriority)
                        }
                        disabled={updateTicket.isPending}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="URGENT">Urgent</option>
                      </select>
                    </div>
                  </div>

                  {/* Assign */}
                  {hasPermission("support.assign") && !ticket.assignee && (
                    <button
                      onClick={handleAssignToMe}
                      disabled={updateTicket.isPending}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 hover:bg-brand-200 dark:hover:bg-brand-500/30 transition-colors"
                    >
                      <UserCheck className="h-4 w-4" />
                      Assign to Me
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              {/* Message List */}
              <div className="max-h-[500px] overflow-y-auto p-6 space-y-4">
                {ticket.messages?.map((message, index) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    index={index}
                    currentUserId={user?.id}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Form */}
              {!isTicketClosed && hasPermission("support.edit") ? (
                <form
                  onSubmit={handleSendMessage}
                  className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30"
                >
                  {/* Internal Note Toggle */}
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setIsInternal(!isInternal)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-full transition-colors",
                        isInternal
                          ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                      )}
                    >
                      {isInternal ? (
                        <>
                          <EyeOff className="h-3 w-3" />
                          Internal Note (User won't see)
                        </>
                      ) : (
                        <>
                          <Eye className="h-3 w-3" />
                          Public Reply
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex gap-3">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={
                        isInternal
                          ? "Add an internal note (only visible to staff)..."
                          : "Type your reply to the customer..."
                      }
                      rows={3}
                      className={cn(
                        "flex-1 px-4 py-3 rounded-xl border bg-white dark:bg-gray-800 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all resize-none",
                        isInternal
                          ? "border-amber-300 dark:border-amber-500/30"
                          : "border-gray-200 dark:border-gray-700"
                      )}
                    />
                    <button
                      type="submit"
                      disabled={replyToTicket.isPending || !newMessage.trim()}
                      className="self-end px-5 py-3 bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {replyToTicket.isPending ? (
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
                    {isTicketClosed
                      ? `This ticket is ${ticket.status.toLowerCase()}.`
                      : "You don't have permission to reply."}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Ticket Info */}
          <div className="space-y-6">
            {/* User Info */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                Customer
              </h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <User className="h-6 w-6 text-gray-500" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {ticket.user?.firstName && ticket.user?.lastName
                      ? `${ticket.user.firstName} ${ticket.user.lastName}`
                      : ticket.guestName || "Unknown User"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {ticket.user?.email || ticket.guestEmail}
                  </p>
                  {!ticket.user && ticket.guestEmail && (
                    <span className="inline-flex items-center px-2 py-0.5 mt-1 text-xs font-medium rounded bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
                      Guest User
                    </span>
                  )}
                </div>
              </div>
              {ticket.user?.id ? (
                <Link
                  href={`/users/${ticket.user.id}`}
                  className="block w-full text-center px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  View User Profile
                </Link>
              ) : ticket.guestEmail && (
                <a
                  href={`mailto:${ticket.guestEmail}`}
                  className="block w-full text-center px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Send Email
                </a>
              )}
            </div>

            {/* Ticket Details */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                Ticket Details
              </h3>
              <dl className="space-y-4">
                <div>
                  <dt className="text-xs text-gray-500 uppercase mb-1">
                    Created
                  </dt>
                  <dd className="text-sm text-gray-900 dark:text-white">
                    {formatDate(ticket.createdAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 uppercase mb-1">
                    Last Updated
                  </dt>
                  <dd className="text-sm text-gray-900 dark:text-white">
                    {formatDate(ticket.updatedAt)}
                  </dd>
                </div>
                {ticket.resolvedAt && (
                  <div>
                    <dt className="text-xs text-gray-500 uppercase mb-1">
                      Resolved
                    </dt>
                    <dd className="text-sm text-gray-900 dark:text-white">
                      {formatDate(ticket.resolvedAt)}
                    </dd>
                  </div>
                )}
                {ticket.closedAt && (
                  <div>
                    <dt className="text-xs text-gray-500 uppercase mb-1">
                      Closed
                    </dt>
                    <dd className="text-sm text-gray-900 dark:text-white">
                      {formatDate(ticket.closedAt)}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-gray-500 uppercase mb-1">
                    Assigned To
                  </dt>
                  <dd className="text-sm text-gray-900 dark:text-white">
                    {ticket.assignee ? (
                      <span className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center">
                          <span className="text-xs font-medium text-brand-600 dark:text-brand-400">
                            {ticket.assignee.firstName?.[0] || "?"}
                          </span>
                        </div>
                        {ticket.assignee.firstName} {ticket.assignee.lastName}
                      </span>
                    ) : (
                      <span className="text-gray-400">Unassigned</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 uppercase mb-1">
                    Messages
                  </dt>
                  <dd className="text-sm text-gray-900 dark:text-white">
                    {ticket._count?.messages || ticket.messages?.length || 0}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Quick Status Actions */}
            {hasPermission("support.edit") && !isTicketClosed && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  {ticket.status === "OPEN" && (
                    <button
                      onClick={() => handleStatusChange("IN_PROGRESS")}
                      disabled={updateTicket.isPending}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-500/30 transition-colors disabled:opacity-50"
                    >
                      <Clock className="h-4 w-4" />
                      Start Working
                    </button>
                  )}
                  {ticket.status === "IN_PROGRESS" && (
                    <button
                      onClick={() => handleStatusChange("AWAITING_REPLY")}
                      disabled={updateTicket.isPending}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-500/30 transition-colors disabled:opacity-50"
                    >
                      <Clock className="h-4 w-4" />
                      Awaiting Reply
                    </button>
                  )}
                  {(ticket.status === "IN_PROGRESS" ||
                    ticket.status === "AWAITING_REPLY") && (
                    <button
                      onClick={() => handleStatusChange("RESOLVED")}
                      disabled={updateTicket.isPending}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-500/30 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Mark Resolved
                    </button>
                  )}
                  {hasPermission("support.close") && (
                    <button
                      onClick={() => handleStatusChange("CLOSED")}
                      disabled={updateTicket.isPending}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                      Close Ticket
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MESSAGE BUBBLE COMPONENT
// ============================================

function MessageBubble({
  message,
  index,
  currentUserId,
}: {
  message: TicketMessage;
  index: number;
  currentUserId?: string;
}) {
  const getMessageIcon = () => {
    switch (message.senderType) {
      case "ADMIN":
        return <Shield className="w-5 h-5 text-brand-600" />;
      case "SYSTEM":
        return <Bot className="w-5 h-5 text-gray-500" />;
      default:
        return <User className="w-5 h-5 text-gray-600" />;
    }
  };

  const getMessageStyles = () => {
    if (message.isInternal) {
      return "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 mx-auto max-w-md";
    }

    if (message.senderType === "SYSTEM") {
      return "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 mx-auto max-w-md text-center";
    }

    if (message.senderType === "ADMIN") {
      return "bg-brand-50 dark:bg-brand-500/10 border-brand-200 dark:border-brand-800 ml-auto";
    }

    return "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 mr-auto";
  };

  const getSenderName = () => {
    if (message.senderType === "ADMIN") {
      return message.sender?.firstName
        ? `${message.sender.firstName} ${message.sender.lastName || ""}`
        : "Support Team";
    }
    if (message.senderType === "SYSTEM") {
      return "System";
    }
    return message.sender?.firstName
      ? `${message.sender.firstName} ${message.sender.lastName || ""}`
      : "Customer";
  };

  return (
    <div
      className={cn(
        "p-4 rounded-xl border max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300",
        getMessageStyles()
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
          {getMessageIcon()}
        </div>
        <div className="flex-1">
          <span className="font-medium text-gray-900 dark:text-white text-sm">
            {getSenderName()}
          </span>
          {message.isInternal && (
            <span className="ml-2 px-2 py-0.5 text-[10px] font-medium rounded bg-amber-200 dark:bg-amber-500/30 text-amber-700 dark:text-amber-400">
              Internal Note
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {formatDate(message.createdAt)}
        </span>
      </div>
      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap pl-10">
        {message.content}
      </p>
    </div>
  );
}
