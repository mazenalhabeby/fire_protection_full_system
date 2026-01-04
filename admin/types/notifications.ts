// Notification types

export type NotificationType =
  | "TRANSACTION"
  | "SECURITY"
  | "LOCKING"
  | "SYSTEM"
  | "MARKETING";

export type NotificationChannel = "IN_APP" | "EMAIL" | "BOTH" | "NONE";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  actionUrl?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  unreadCount: number;
}

export interface NotificationPreferences {
  transactionChannel: NotificationChannel;
  securityChannel: NotificationChannel;
  lockingChannel: NotificationChannel;
  systemChannel: NotificationChannel;
  marketingChannel: NotificationChannel;
  emailEnabled: boolean;
  emailDigest: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
}

export interface UpdatePreferencesDto {
  transactionChannel?: NotificationChannel;
  securityChannel?: NotificationChannel;
  lockingChannel?: NotificationChannel;
  systemChannel?: NotificationChannel;
  marketingChannel?: NotificationChannel;
  emailEnabled?: boolean;
  emailDigest?: boolean;
  quietHoursEnabled?: boolean;
  quietHoursStart?: number;
  quietHoursEnd?: number;
}

export interface SSENotificationEvent {
  type: "notification" | "heartbeat";
  notification?: Notification;
  timestamp?: string;
}
