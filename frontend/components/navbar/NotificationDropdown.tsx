"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "@/i18n/navigation";
import {
  Bell,
  CheckCheck,
  Clock,
  Coins,
  Gift,
  Lock,
  Settings,
  ShieldAlert,
  Sparkles,
  X,
  ChevronRight,
  Volume2,
  VolumeX,
  Megaphone,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useClickOutside } from "@/hooks";
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
  useNotificationStream,
} from "@/hooks/useNotifications";
import type { Notification, NotificationType } from "@/types/notifications";

// Icon mapping for notification types
const notificationIcons: Record<NotificationType, React.ReactNode> = {
  TRANSACTION: <Coins className="h-4 w-4 sm:h-5 sm:w-5" />,
  SECURITY: <ShieldAlert className="h-4 w-4 sm:h-5 sm:w-5" />,
  LOCKING: <Lock className="h-4 w-4 sm:h-5 sm:w-5" />,
  SYSTEM: <Megaphone className="h-4 w-4 sm:h-5 sm:w-5" />,
  MARKETING: <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />,
};

// Icon background colors
const iconColors: Record<NotificationType, string> = {
  TRANSACTION: "from-emerald-500 to-teal-600",
  SECURITY: "from-red-500 to-rose-600",
  LOCKING: "from-blue-500 to-indigo-600",
  SYSTEM: "from-gray-500 to-gray-600",
  MARKETING: "from-brand-500 to-brand-600",
};

type FilterTab = "all" | "unread";

interface NotificationDropdownProps {
  className?: string;
}

// Notification sound path
const NOTIFICATION_SOUND_PATH = "/sounds/notification.mp3";

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

export function NotificationDropdown({ className }: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [isMuted, setIsMuted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // API hooks
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const { data: notificationsData, isLoading } = useNotifications({
    limit: 20,
    unreadOnly: activeTab === "unread",
  });
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();
  const deleteNotificationMutation = useDeleteNotification();

  // SSE stream for real-time updates
  const { isConnected } = useNotificationStream({
    enabled: true,
    onNotification: useCallback((notification: Notification) => {
      // Play sound for new notifications
      if (!isMuted && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
    }, [isMuted]),
  });

  const notifications = notificationsData?.notifications || [];

  // Initialize audio and load mute preference from localStorage
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_PATH);
    audioRef.current.volume = 0.5;

    const savedMutePreference = localStorage.getItem("notificationsMuted");
    if (savedMutePreference !== null) {
      setIsMuted(JSON.parse(savedMutePreference));
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Save mute preference to localStorage
  useEffect(() => {
    localStorage.setItem("notificationsMuted", JSON.stringify(isMuted));
  }, [isMuted]);

  const closeDropdown = useCallback(() => setIsOpen(false), []);
  useClickOutside(dropdownRef, closeDropdown, isOpen);

  // Mark single notification as read
  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate(id);
  };

  // Mark all as read
  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  // Remove notification
  const handleRemoveNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNotificationMutation.mutate(id);
  };

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative p-2 sm:p-2.5 rounded-xl",
          "bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm",
          "border border-gray-200/50 dark:border-gray-700/50",
          "hover:bg-white dark:hover:bg-gray-700",
          "hover:border-gray-300 dark:hover:border-gray-600",
          "hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-black/20",
          "transition-all duration-200",
          isOpen && "bg-white dark:bg-gray-700 shadow-lg"
        )}
        aria-label="Notifications"
      >
        <Bell
          className={cn(
            "h-5 w-5 transition-colors",
            isOpen
              ? "text-brand-500 dark:text-brand-400"
              : "text-gray-600 dark:text-gray-300"
          )}
        />

        {/* Notification Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
            <span
              className={cn(
                "relative inline-flex items-center justify-center",
                "min-w-[18px] h-[18px] sm:min-w-[20px] sm:h-5 px-1 sm:px-1.5 rounded-full",
                "bg-gradient-to-r from-brand-500 to-brand-600",
                "text-[10px] sm:text-[11px] font-bold text-white",
                "shadow-lg shadow-brand-500/30"
              )}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          </span>
        )}

      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className={cn(
            "fixed sm:absolute",
            "left-2 right-2 sm:left-auto sm:right-0",
            "top-16 sm:top-full sm:mt-2",
            "sm:w-96",
            "bg-white dark:bg-gray-800",
            "rounded-2xl",
            "shadow-2xl",
            "border border-gray-200/50 dark:border-gray-700/50",
            "overflow-hidden z-50",
            "max-h-[80vh] sm:max-h-[500px]",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2",
            "duration-200"
          )}
        >
          {/* Header */}
          <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 dark:border-gray-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
                  <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-[15px] font-semibold text-gray-900 dark:text-white">
                    Notifications
                  </h3>
                  <p className="text-[11px] sm:text-[12px] text-gray-500 dark:text-gray-400">
                    {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-0.5 sm:gap-1">
                {/* Mute Button */}
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={cn(
                    "p-2 rounded-lg transition-all duration-200",
                    isMuted
                      ? "bg-red-50 dark:bg-red-900/20 text-red-500"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
                  )}
                  title={isMuted ? "Unmute notifications" : "Mute notifications"}
                >
                  {isMuted ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </button>

                {/* Mark All Read Button */}
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    disabled={markAllAsReadMutation.isPending}
                    className={cn(
                      "p-2 rounded-lg transition-all duration-200",
                      "hover:bg-brand-50 dark:hover:bg-brand-900/20",
                      "text-gray-400 hover:text-brand-500",
                      "disabled:opacity-50"
                    )}
                    title="Mark all as read"
                  >
                    {markAllAsReadMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCheck className="h-4 w-4" />
                    )}
                  </button>
                )}

                {/* Close Button - Mobile */}
                <button
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "p-2 rounded-lg sm:hidden",
                    "hover:bg-gray-100 dark:hover:bg-gray-700",
                    "text-gray-400"
                  )}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1 mt-3 sm:mt-4 p-1 bg-gray-100 dark:bg-gray-700/50 rounded-xl">
              {(["all", "unread"] as FilterTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg text-[12px] sm:text-[13px] font-medium",
                    "transition-all duration-200",
                    activeTab === tab
                      ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  )}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {tab === "unread" && unreadCount > 0 && (
                    <span className="ml-1 sm:ml-1.5 px-1 sm:px-1.5 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 text-[9px] sm:text-[10px] font-semibold">
                      {unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-[45vh] sm:max-h-[350px] overflow-y-auto overscroll-contain">
            {isLoading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : notifications.length > 0 ? (
              <div className="py-1.5 sm:py-2">
                {notifications.map((notification, index) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "group relative mx-1.5 sm:mx-2 mb-1 px-2.5 sm:px-3 py-2.5 sm:py-3 rounded-xl",
                      "transition-all duration-200 cursor-pointer",
                      notification.isRead
                        ? "hover:bg-gray-50 dark:hover:bg-gray-700/30 active:bg-gray-100 dark:active:bg-gray-700/50"
                        : "bg-brand-50/50 dark:bg-brand-900/10 hover:bg-brand-50 dark:hover:bg-brand-900/20",
                      "animate-in fade-in-0 slide-in-from-right-2"
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}
                  >
                    <div className="flex gap-2.5 sm:gap-3">
                      {/* Icon */}
                      <div
                        className={cn(
                          "shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl",
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
                        <div className="flex items-start justify-between gap-1.5 sm:gap-2">
                          <div className="flex-1 min-w-0">
                            <p
                              className={cn(
                                "text-[13px] sm:text-[14px] font-medium leading-tight",
                                notification.isRead
                                  ? "text-gray-700 dark:text-gray-200"
                                  : "text-gray-900 dark:text-white"
                              )}
                            >
                              <span className="line-clamp-1">{notification.title}</span>
                            </p>
                            <p
                              className={cn(
                                "text-[12px] sm:text-[13px] mt-0.5 line-clamp-2 leading-snug",
                                notification.isRead
                                  ? "text-gray-500 dark:text-gray-400"
                                  : "text-gray-600 dark:text-gray-300"
                              )}
                            >
                              {notification.message}
                            </p>
                          </div>

                          {/* Close Button */}
                          <button
                            onClick={(e) => handleRemoveNotification(notification.id, e)}
                            disabled={deleteNotificationMutation.isPending}
                            className={cn(
                              "shrink-0 p-1.5 sm:p-1 rounded-lg",
                              "sm:opacity-0 sm:group-hover:opacity-100",
                              "bg-gray-100 dark:bg-gray-700 sm:bg-transparent",
                              "hover:bg-gray-200 dark:hover:bg-gray-600",
                              "transition-all duration-200"
                            )}
                          >
                            <X className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-gray-400" />
                          </button>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between mt-1.5 sm:mt-2">
                          <div className="flex items-center gap-1 text-[11px] sm:text-[12px] text-gray-400 dark:text-gray-500">
                            <Clock className="h-3 w-3" />
                            {formatTimeAgo(notification.createdAt)}
                          </div>

                          {notification.actionUrl && (
                            <Link
                              href={notification.actionUrl}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!notification.isRead) {
                                  handleMarkAsRead(notification.id);
                                }
                                setIsOpen(false);
                              }}
                              className={cn(
                                "flex items-center gap-0.5 sm:gap-1 px-2 sm:px-2.5 py-1 rounded-lg",
                                "text-[11px] sm:text-[12px] font-medium",
                                "bg-gray-100 dark:bg-gray-700",
                                "text-gray-600 dark:text-gray-300",
                                "hover:bg-brand-50 dark:hover:bg-brand-900/20",
                                "hover:text-brand-600 dark:hover:text-brand-400",
                                "active:scale-95",
                                "transition-all duration-200"
                              )}
                            >
                              View
                              <ChevronRight className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                      </div>

                      {/* Unread Indicator */}
                      {!notification.isRead && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 sm:h-8 rounded-r-full bg-gradient-to-b from-brand-500 to-brand-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Empty State
              <div className="py-10 sm:py-12 px-6 text-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <Bell className="h-7 w-7 sm:h-8 sm:w-8 text-gray-300 dark:text-gray-500" />
                </div>
                <h4 className="text-[14px] sm:text-[15px] font-medium text-gray-700 dark:text-gray-200 mb-1">
                  {activeTab === "all" ? "No notifications yet" : "All caught up!"}
                </h4>
                <p className="text-[12px] sm:text-[13px] text-gray-500 dark:text-gray-400 max-w-[200px] mx-auto">
                  {activeTab === "all"
                    ? "When you get notifications, they'll show up here"
                    : "You've read all your notifications"}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-t border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50">
            <div className="flex gap-2">
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 sm:py-2.5 rounded-xl",
                  "text-[12px] sm:text-[13px] font-medium",
                  "text-gray-600 dark:text-gray-300",
                  "hover:bg-white dark:hover:bg-gray-700",
                  "hover:text-gray-900 dark:hover:text-white",
                  "active:scale-[0.98]",
                  "transition-all duration-200"
                )}
              >
                View All
              </Link>
              <Link
                href="/settings?tab=notifications"
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center justify-center gap-2 px-4 py-2 sm:py-2.5 rounded-xl",
                  "text-[12px] sm:text-[13px] font-medium",
                  "text-gray-600 dark:text-gray-300",
                  "hover:bg-white dark:hover:bg-gray-700",
                  "hover:text-gray-900 dark:hover:text-white",
                  "active:scale-[0.98]",
                  "transition-all duration-200"
                )}
              >
                <Settings className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
