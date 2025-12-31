import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Request Logger Middleware
 *
 * Logs all incoming HTTP requests to console only.
 * For production monitoring, use external services like:
 * - AWS CloudWatch
 * - Datadog
 * - New Relic
 * - Nginx access logs
 *
 * Database logging was removed for scalability reasons.
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, originalUrl } = req;

    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      const statusCode = res.statusCode;
      const contentLength = res.get('content-length') || 0;

      const logMessage = `${method} ${originalUrl} ${statusCode} ${responseTime}ms ${contentLength}`;

      if (statusCode >= 500) {
        this.logger.error(logMessage);
      } else if (statusCode >= 400) {
        this.logger.warn(logMessage);
      } else if (process.env.NODE_ENV !== 'production') {
        // Only log successful requests in development
        this.logger.log(logMessage);
      }
    });

    next();
  }
}
