import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { NotificationType, NotificationChannel } from '@prisma/client';
import { Observable, interval, map, merge, takeWhile } from 'rxjs';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * SSE endpoint for real-time notifications
   * Client connects and receives notifications as they happen
   */
  @Sse('stream')
  stream(@Req() req: AuthenticatedRequest): Observable<MessageEvent> {
    const userId = req.user.id;

    // Heartbeat every 30 seconds to keep connection alive
    const heartbeat$ = interval(30000).pipe(
      map(() => ({ data: { type: 'heartbeat', timestamp: new Date() } })),
    );

    // Notification stream
    const notifications$ = this.notificationsService
      .getNotificationStream(userId)
      .pipe(
        map((event) => ({
          data: {
            type: 'notification',
            notification: event.notification,
          },
        })),
      );

    // Merge heartbeat and notifications
    return merge(heartbeat$, notifications$);
  }

  /**
   * Get user's notifications with pagination
   */
  @Get()
  async getNotifications(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: NotificationType,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationsService.getUserNotifications(req.user.id, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      type,
      unreadOnly: unreadOnly === 'true',
    });
  }

  /**
   * Get unread count
   */
  @Get('unread-count')
  async getUnreadCount(@Req() req: AuthenticatedRequest) {
    const count = await this.notificationsService.getUnreadCount(req.user.id);
    return { unreadCount: count };
  }

  /**
   * Mark a notification as read
   */
  @Patch(':id/read')
  async markAsRead(
    @Req() req: AuthenticatedRequest,
    @Param('id') notificationId: string,
  ) {
    return this.notificationsService.markAsRead(req.user.id, notificationId);
  }

  /**
   * Mark all notifications as read
   */
  @Post('read-all')
  async markAllAsRead(@Req() req: AuthenticatedRequest) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  /**
   * Delete a notification
   */
  @Delete(':id')
  async deleteNotification(
    @Req() req: AuthenticatedRequest,
    @Param('id') notificationId: string,
  ) {
    return this.notificationsService.delete(req.user.id, notificationId);
  }

  /**
   * Cleanup old read notifications
   */
  @Delete('cleanup/old')
  async cleanupOld(
    @Req() req: AuthenticatedRequest,
    @Query('days') days?: string,
  ) {
    return this.notificationsService.cleanupOldNotifications(
      req.user.id,
      days ? parseInt(days, 10) : 30,
    );
  }

  /**
   * Get notification preferences
   */
  @Get('preferences')
  async getPreferences(@Req() req: AuthenticatedRequest) {
    const prefs = await this.notificationsService.getOrCreatePreferences(
      req.user.id,
    );
    return {
      transactionChannel: prefs.transactionChannel,
      securityChannel: prefs.securityChannel,
      lockingChannel: prefs.lockingChannel,
      systemChannel: prefs.systemChannel,
      marketingChannel: prefs.marketingChannel,
      emailEnabled: prefs.emailEnabled,
      emailDigest: prefs.emailDigest,
      quietHoursEnabled: prefs.quietHoursEnabled,
      quietHoursStart: prefs.quietHoursStart,
      quietHoursEnd: prefs.quietHoursEnd,
    };
  }

  /**
   * Update notification preferences
   */
  @Patch('preferences')
  async updatePreferences(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
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
    },
  ) {
    return this.notificationsService.updatePreferences(req.user.id, body);
  }
}
