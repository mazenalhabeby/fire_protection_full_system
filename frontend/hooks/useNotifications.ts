"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/lib/api/notifications";
import { useAuth } from "./useAuth";
import type {
  Notification,
  NotificationListResponse,
  NotificationPreferences,
  UpdatePreferencesDto,
  NotificationType,
  SSENotificationEvent,
} from "@/types/notifications";

// ============================================
// QUERY KEYS
// ============================================

export const notificationQueryKeys = {
  notifications: (params?: {
    page?: number;
    limit?: number;
    type?: NotificationType;
    unreadOnly?: boolean;
  }) => ["notifications", params] as const,
  unreadCount: ["notificationsUnreadCount"] as const,
  preferences: ["notificationPreferences"] as const,
};

// ============================================
// NOTIFICATION QUERIES
// ============================================

/**
 * Fetch user's notifications with pagination
 */
export function useNotifications(params?: {
  page?: number;
  limit?: number;
  type?: NotificationType;
  unreadOnly?: boolean;
}) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: notificationQueryKeys.notifications(params),
    queryFn: async (): Promise<NotificationListResponse> => {
      return notificationsApi.getNotifications(params);
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch unread notification count
 */
export function useUnreadNotificationCount() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: notificationQueryKeys.unreadCount,
    queryFn: async (): Promise<number> => {
      const result = await notificationsApi.getUnreadCount();
      return result.unreadCount;
    },
    enabled: isAuthenticated,
    staleTime: 15 * 1000, // 15 seconds
    refetchInterval: 60 * 1000, // Refetch every minute as fallback
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch notification preferences
 */
export function useNotificationPreferences() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: notificationQueryKeys.preferences,
    queryFn: async (): Promise<NotificationPreferences> => {
      return notificationsApi.getPreferences();
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

// ============================================
// NOTIFICATION MUTATIONS
// ============================================

/**
 * Mark a notification as read
 */
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string): Promise<Notification> => {
      return notificationsApi.markAsRead(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({
        queryKey: notificationQueryKeys.unreadCount,
      });
    },
  });
}

/**
 * Mark all notifications as read
 */
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ markedCount: number }> => {
      return notificationsApi.markAllAsRead();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({
        queryKey: notificationQueryKeys.unreadCount,
      });
    },
  });
}

/**
 * Delete a notification
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string): Promise<{ success: boolean }> => {
      return notificationsApi.deleteNotification(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({
        queryKey: notificationQueryKeys.unreadCount,
      });
    },
  });
}

/**
 * Update notification preferences
 */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: UpdatePreferencesDto
    ): Promise<NotificationPreferences> => {
      return notificationsApi.updatePreferences(data);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(notificationQueryKeys.preferences, data);
    },
  });
}

// ============================================
// SSE STREAM HOOK
// ============================================

/**
 * Subscribe to real-time notifications via SSE
 * Returns the EventSource connection and handles reconnection
 */
export function useNotificationStream(options?: {
  onNotification?: (notification: Notification) => void;
  enabled?: boolean;
}) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enabled = options?.enabled ?? true;
  const onNotification = options?.onNotification;

  const connect = useCallback(() => {
    if (!isAuthenticated || !enabled) return;

    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const streamUrl = notificationsApi.getStreamUrl();

    // Create EventSource with credentials
    const eventSource = new EventSource(streamUrl, {
      withCredentials: true,
    });

    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as SSENotificationEvent;

        if (data.type === "notification" && data.notification) {
          // Invalidate queries to refresh data
          queryClient.invalidateQueries({
            queryKey: notificationQueryKeys.unreadCount,
          });
          queryClient.invalidateQueries({ queryKey: ["notifications"] });

          // Call the callback if provided
          if (onNotification) {
            onNotification(data.notification);
          }
        }
        // Ignore heartbeat events
      } catch {
        // Silently ignore parse errors
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      setError("Connection lost");
      eventSource.close();

      // Try to reconnect after 5 seconds
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 5000);
    };
  }, [isAuthenticated, enabled, queryClient, onNotification]);

  // Connect when component mounts and authenticated
  useEffect(() => {
    if (isAuthenticated && enabled) {
      connect();
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [isAuthenticated, enabled, connect]);

  // Disconnect function for manual control
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
  }, []);

  return {
    isConnected,
    error,
    reconnect: connect,
    disconnect,
  };
}

// ============================================
// CACHE INVALIDATION
// ============================================

export function useInvalidateNotifications() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({
      queryKey: notificationQueryKeys.unreadCount,
    });
  };
}
