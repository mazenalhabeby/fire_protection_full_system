"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import {
  Bell,
  CheckCheck,
  Clock,
  Coins,
  Lock,
  Settings,
  ShieldAlert,
  Sparkles,
  Trash2,
  ChevronRight,
  Loader2,
  Megaphone,
  Filter,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
  useInvalidateNotifications,
} from "@/hooks/useNotifications";
import type { Notification, NotificationType } from "@/types/notifications";

// Icon mapping for notification types
const notificationIcons: Record<NotificationType, React.ReactNode> = {
  TRANSACTION: <Coins className="h-5 w-5" />,
  SECURITY: <ShieldAlert className="h-5 w-5" />,
  LOCKING: <Lock className="h-5 w-5" />,
  SYSTEM: <Megaphone className="h-5 w-5" />,
  MARKETING: <Sparkles className="h-5 w-5" />,
};

// Icon background colors
const iconColors: Record<NotificationType, string> = {
  TRANSACTION: "from-emerald-500 to-teal-600",
  SECURITY: "from-red-500 to-rose-600",
  LOCKING: "from-blue-500 to-indigo-600",
  SYSTEM: "from-gray-500 to-gray-600",
  MARKETING: "from-brand-500 to-brand-600",
};

// Type labels
const typeLabels: Record<NotificationType, string> = {
  TRANSACTION: "Transactions",
  SECURITY: "Security",
  LOCKING: "Locking",
  SYSTEM: "System",
  MARKETING: "Updates",
};

type FilterTab = "all" | "unread" | NotificationType;

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function formatFullDate(dateString: string): string {
  return new Date(dateString).toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [page, setPage] = useState(1);

  // API hooks
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const { data: notificationsData, isLoading, isFetching } = useNotifications({
    page,
    limit: 20,
    unreadOnly: activeTab === "unread",
    type: activeTab !== "all" && activeTab !== "unread" ? activeTab : undefined,
  });
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();
  const deleteNotificationMutation = useDeleteNotification();
  const invalidateNotifications = useInvalidateNotifications();

  const notifications = notificationsData?.notifications || [];
  const pagination = notificationsData?.pagination;

  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate(id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleDelete = (id: string) => {
    deleteNotificationMutation.mutate(id);
  };

  const handleRefresh = () => {
    invalidateNotifications();
  };

  const filterTabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: "all", label: "All" },
    { key: "unread", label: "Unread", count: unreadCount },
    { key: "TRANSACTION", label: "Transactions" },
    { key: "SECURITY", label: "Security" },
    { key: "LOCKING", label: "Locking" },
    { key: "SYSTEM", label: "System" },
  ];

  return (
    <div className="flex-1 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50 via-gray-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950" />
        <div
          className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Bell className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Notifications
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {unreadCount > 0
                  ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
                  : "All caught up!"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isFetching}
              className={cn(
                "p-2.5 rounded-xl",
                "bg-gray-100 dark:bg-gray-800",
                "hover:bg-gray-200 dark:hover:bg-gray-700",
                "text-gray-600 dark:text-gray-300",
                "transition-all duration-200",
                "disabled:opacity-50"
              )}
              title="Refresh"
            >
              <RefreshCw
                className={cn("h-5 w-5", isFetching && "animate-spin")}
              />
            </button>

            {/* Mark All Read */}
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl",
                  "bg-brand-50 dark:bg-brand-900/20",
                  "hover:bg-brand-100 dark:hover:bg-brand-900/30",
                  "text-brand-600 dark:text-brand-400",
                  "font-medium text-sm",
                  "transition-all duration-200",
                  "disabled:opacity-50"
                )}
              >
                {markAllAsReadMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCheck className="h-4 w-4" />
                )}
                Mark all read
              </button>
            )}

            {/* Settings Link */}
            <Link
              href="/settings?tab=notifications"
              className={cn(
                "p-2.5 rounded-xl",
                "bg-gray-100 dark:bg-gray-800",
                "hover:bg-gray-200 dark:hover:bg-gray-700",
                "text-gray-600 dark:text-gray-300",
                "transition-all duration-200"
              )}
              title="Notification Settings"
            >
              <Settings className="h-5 w-5" />
            </Link>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setPage(1);
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap",
                "transition-all duration-200",
                activeTab === tab.key
                  ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
              )}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded-full text-xs font-semibold",
                    activeTab === tab.key
                      ? "bg-white/20 text-white dark:bg-gray-900/20 dark:text-gray-900"
                      : "bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg shadow-gray-200/50 dark:shadow-black/20 overflow-hidden">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                Loading notifications...
              </p>
            </div>
          ) : notifications.length > 0 ? (
            <>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "group relative p-4 md:p-5",
                      "transition-all duration-200",
                      notification.isRead
                        ? "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        : "bg-brand-50/30 dark:bg-brand-900/10 hover:bg-brand-50/50 dark:hover:bg-brand-900/20"
                    )}
                  >
                    <div className="flex gap-4">
                      {/* Icon */}
                      <div
                        className={cn(
                          "shrink-0 w-12 h-12 rounded-xl",
                          "bg-gradient-to-br",
                          iconColors[notification.type],
                          "flex items-center justify-center text-white",
                          "shadow-lg"
                        )}
                      >
                        {notificationIcons[notification.type]}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-1">
                          <div>
                            <p
                              className={cn(
                                "text-base font-semibold",
                                notification.isRead
                                  ? "text-gray-700 dark:text-gray-200"
                                  : "text-gray-900 dark:text-white"
                              )}
                            >
                              {notification.title}
                            </p>
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              {typeLabels[notification.type]}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            {!notification.isRead && (
                              <button
                                onClick={() => handleMarkAsRead(notification.id)}
                                disabled={markAsReadMutation.isPending}
                                className={cn(
                                  "p-2 rounded-lg",
                                  "text-gray-400 hover:text-brand-500",
                                  "hover:bg-brand-50 dark:hover:bg-brand-900/20",
                                  "transition-all duration-200"
                                )}
                                title="Mark as read"
                              >
                                <CheckCheck className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(notification.id)}
                              disabled={deleteNotificationMutation.isPending}
                              className={cn(
                                "p-2 rounded-lg",
                                "text-gray-400 hover:text-red-500",
                                "hover:bg-red-50 dark:hover:bg-red-900/20",
                                "transition-all duration-200",
                                "opacity-0 group-hover:opacity-100"
                              )}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <p
                          className={cn(
                            "text-sm mb-3",
                            notification.isRead
                              ? "text-gray-500 dark:text-gray-400"
                              : "text-gray-600 dark:text-gray-300"
                          )}
                        >
                          {notification.message}
                        </p>

                        {/* Footer */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                            <Clock className="h-3.5 w-3.5" />
                            <span title={formatFullDate(notification.createdAt)}>
                              {formatTimeAgo(notification.createdAt)}
                            </span>
                          </div>

                          {notification.actionUrl && (
                            <Link
                              href={notification.actionUrl}
                              onClick={() => {
                                if (!notification.isRead) {
                                  handleMarkAsRead(notification.id);
                                }
                              }}
                              className={cn(
                                "flex items-center gap-1 px-3 py-1.5 rounded-lg",
                                "text-xs font-medium",
                                "bg-gray-100 dark:bg-gray-800",
                                "text-gray-600 dark:text-gray-300",
                                "hover:bg-brand-50 dark:hover:bg-brand-900/20",
                                "hover:text-brand-600 dark:hover:text-brand-400",
                                "transition-all duration-200"
                              )}
                            >
                              View details
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                          )}
                        </div>
                      </div>

                      {/* Unread Indicator */}
                      {!notification.isRead && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 rounded-r-full bg-gradient-to-b from-brand-500 to-brand-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium",
                        "bg-white dark:bg-gray-800",
                        "border border-gray-200 dark:border-gray-700",
                        "text-gray-600 dark:text-gray-300",
                        "hover:bg-gray-50 dark:hover:bg-gray-700",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        "transition-all duration-200"
                      )}
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={page === pagination.totalPages}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium",
                        "bg-white dark:bg-gray-800",
                        "border border-gray-200 dark:border-gray-700",
                        "text-gray-600 dark:text-gray-300",
                        "hover:bg-gray-50 dark:hover:bg-gray-700",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        "transition-all duration-200"
                      )}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Empty State */
            <div className="py-16 px-6 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Bell className="h-10 w-10 text-gray-300 dark:text-gray-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">
                {activeTab === "all"
                  ? "No notifications yet"
                  : activeTab === "unread"
                  ? "All caught up!"
                  : `No ${typeLabels[activeTab as NotificationType] || activeTab} notifications`}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                {activeTab === "all"
                  ? "When you receive notifications, they'll appear here"
                  : activeTab === "unread"
                  ? "You've read all your notifications"
                  : "Notifications of this type will appear here"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
