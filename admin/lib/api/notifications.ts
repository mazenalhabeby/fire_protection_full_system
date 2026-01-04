// Notifications API Service

import { api } from "./client";
import type {
  Notification,
  NotificationListResponse,
  NotificationPreferences,
  UpdatePreferencesDto,
  NotificationType,
} from "@/types";

export const notificationsApi = {
  // ============================================
  // NOTIFICATIONS
  // ============================================

  /**
   * Get user's notifications with pagination
   */
  getNotifications: (params?: {
    page?: number;
    limit?: number;
    type?: NotificationType;
    unreadOnly?: boolean;
  }): Promise<NotificationListResponse> => {
    return api.get<NotificationListResponse>("/notifications", params);
  },

  /**
   * Get unread notification count
   */
  getUnreadCount: (): Promise<{ unreadCount: number }> => {
    return api.get<{ unreadCount: number }>("/notifications/unread-count");
  },

  /**
   * Mark a notification as read
   */
  markAsRead: (notificationId: string): Promise<Notification> => {
    return api.patch<Notification>(`/notifications/${notificationId}/read`);
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: (): Promise<{ markedCount: number }> => {
    return api.post<{ markedCount: number }>("/notifications/read-all");
  },

  /**
   * Delete a notification
   */
  deleteNotification: (notificationId: string): Promise<{ success: boolean }> => {
    return api.delete<{ success: boolean }>(`/notifications/${notificationId}`);
  },

  /**
   * Cleanup old read notifications
   */
  cleanupOld: (days?: number): Promise<{ deletedCount: number }> => {
    return api.delete<{ deletedCount: number }>("/notifications/cleanup/old", {
      days,
    });
  },

  // ============================================
  // PREFERENCES
  // ============================================

  /**
   * Get notification preferences
   */
  getPreferences: (): Promise<NotificationPreferences> => {
    return api.get<NotificationPreferences>("/notifications/preferences");
  },

  /**
   * Update notification preferences
   */
  updatePreferences: (data: UpdatePreferencesDto): Promise<NotificationPreferences> => {
    return api.patch<NotificationPreferences>("/notifications/preferences", data);
  },

  // ============================================
  // SSE STREAM
  // ============================================

  /**
   * Get SSE stream URL for real-time notifications
   * Note: This should be used with EventSource, not a regular fetch
   */
  getStreamUrl: (): string => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    return `${baseUrl}/notifications/stream`;
  },
};
