import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('RequestLogger');

  constructor(private prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, originalUrl, ip } = req;

    // Get user and session from JWT if available
    const user = (req as any).user;
    const userId = user?.id || null;
    const sessionId = user?.sessionId || null;

    // Create date hour for aggregation (truncate to hour)
    const dateHour = new Date();
    dateHour.setMinutes(0, 0, 0);

    // Listen for response finish
    res.on('finish', async () => {
      const responseTime = Date.now() - startTime;
      const statusCode = res.statusCode;

      // Log to console
      const logMessage = `${method} ${originalUrl} ${statusCode} ${responseTime}ms`;
      if (statusCode >= 500) {
        this.logger.error(logMessage);
      } else if (statusCode >= 400) {
        this.logger.warn(logMessage);
      } else {
        this.logger.log(logMessage);
      }

      // Async insert to database (non-blocking)
      this.logRequest({
        endpoint: this.normalizeEndpoint(originalUrl),
        method,
        statusCode,
        userId,
        sessionId,
        ipAddress: this.getClientIp(req),
        responseTime,
        dateHour,
      }).catch((error) => {
        this.logger.warn(`Failed to log request: ${error.message}`);
      });
    });

    next();
  }

  private async logRequest(data: {
    endpoint: string;
    method: string;
    statusCode: number;
    userId: string | null;
    sessionId: string | null;
    ipAddress: string | null;
    responseTime: number;
    dateHour: Date;
  }): Promise<void> {
    try {
      await this.prisma.requestLog.create({
        data: {
          endpoint: data.endpoint,
          method: data.method,
          statusCode: data.statusCode,
          userId: data.userId,
          sessionId: data.sessionId,
          ipAddress: data.ipAddress,
          responseTime: data.responseTime,
          dateHour: data.dateHour,
        },
      });
    } catch (error) {
      // Silently fail - don't break the request
    }
  }

  private normalizeEndpoint(url: string): string {
    // Remove query string
    const path = url.split('?')[0];

    // Normalize IDs in paths (e.g., /users/123 -> /users/:id)
    return path
      .replace(/\/[a-f0-9]{24}(?=\/|$)/gi, '/:id') // MongoDB ObjectId
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\/|$)/gi, '/:id') // UUID
      .replace(/\/\d+(?=\/|$)/g, '/:id'); // Numeric IDs
  }

  private getClientIp(req: Request): string | null {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor.split(',')[0];
      return ips.trim();
    }
    return req.socket?.remoteAddress || req.ip || null;
  }
}
