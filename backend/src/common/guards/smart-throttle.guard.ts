import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimiterService, OperationType } from '../services/rate-limiter.service';

export const THROTTLE_KEY = 'smart_throttle';

/**
 * Decorator to apply smart throttling to an endpoint
 * @param operation The type of operation for rate limit configuration
 * @param useRiskProfile Whether to apply risk-based adjustments (default: true)
 */
export const SmartThrottle = (operation: OperationType, useRiskProfile = true) =>
  SetMetadata(THROTTLE_KEY, { operation, useRiskProfile });

@Injectable()
export class SmartThrottleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimiter: RateLimiterService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const throttleConfig = this.reflector.getAllAndOverride<{
      operation: OperationType;
      useRiskProfile: boolean;
    }>(THROTTLE_KEY, [context.getHandler(), context.getClass()]);

    // If no throttle decorator, allow
    if (!throttleConfig) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const userId = request.user?.id || null;
    const ipAddress = this.getClientIp(request);

    // Get risk profile if user is authenticated and risk-based throttling is enabled
    let riskProfile;
    if (userId && throttleConfig.useRiskProfile) {
      try {
        riskProfile = await this.rateLimiter.getUserRiskProfile(userId, ipAddress);
      } catch {
        // If we can't get risk profile, continue with default limits
      }
    }

    // Check rate limit
    const result = await this.rateLimiter.checkRateLimit(
      throttleConfig.operation,
      userId,
      ipAddress,
      riskProfile,
    );

    // Set rate limit headers
    response.setHeader('X-RateLimit-Remaining', result.remaining);
    response.setHeader('X-RateLimit-Reset', result.resetAt.toISOString());

    if (result.warning) {
      response.setHeader('X-RateLimit-Warning', result.warning);
    }

    if (!result.allowed) {
      response.setHeader('Retry-After', Math.ceil(result.retryAfterMs / 1000));

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Please try again in ${Math.ceil(result.retryAfterMs / 1000)} seconds.`,
          retryAfter: Math.ceil(result.retryAfterMs / 1000),
          resetAt: result.resetAt.toISOString(),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Record this operation
    this.rateLimiter.recordOperation(throttleConfig.operation, userId, ipAddress);

    return true;
  }

  private getClientIp(request: any): string {
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor.split(',')[0];
      return ips.trim();
    }
    return request.socket?.remoteAddress || request.ip || 'unknown';
  }
}
