import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SmartThrottleGuard, THROTTLE_KEY } from './smart-throttle.guard';
import { RateLimiterService } from '../services/rate-limiter.service';

describe('SmartThrottleGuard', () => {
  let guard: SmartThrottleGuard;
  let reflector: Reflector;
  let rateLimiter: jest.Mocked<RateLimiterService>;

  const mockExecutionContext = (
    userId: string | null = 'test-user',
    ip: string = '192.168.1.1',
  ): ExecutionContext => {
    const mockRequest = {
      user: userId ? { id: userId } : null,
      headers: { 'x-forwarded-for': ip },
      socket: { remoteAddress: ip },
      ip,
    };
    const mockResponse = {
      setHeader: jest.fn(),
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const mockRateLimiter = {
      checkRateLimit: jest.fn(),
      recordOperation: jest.fn(),
      getUserRiskProfile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmartThrottleGuard,
        Reflector,
        {
          provide: RateLimiterService,
          useValue: mockRateLimiter,
        },
      ],
    }).compile();

    guard = module.get<SmartThrottleGuard>(SmartThrottleGuard);
    reflector = module.get<Reflector>(Reflector);
    rateLimiter = module.get(RateLimiterService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should allow request when no throttle decorator is present', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const context = mockExecutionContext();
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(rateLimiter.checkRateLimit).not.toHaveBeenCalled();
    });

    it('should allow request when rate limit check passes', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
        operation: 'withdrawal_create',
        useRiskProfile: true,
      });

      rateLimiter.getUserRiskProfile.mockResolvedValue({
        accountAgeDays: 30,
        isEmailVerified: true,
        is2FAEnabled: false,
        hasCompletedKYC: false,
        totalSuccessfulWithdrawals: 0,
        recentFailedAttempts: 0,
        isTrustedDevice: false,
      });

      rateLimiter.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 5,
        resetAt: new Date(Date.now() + 3600000),
        retryAfterMs: 0,
        riskMultiplier: 1.0,
      });

      const context = mockExecutionContext();
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(rateLimiter.recordOperation).toHaveBeenCalledWith(
        'withdrawal_create',
        'test-user',
        '192.168.1.1',
      );
    });

    it('should throw 429 when rate limit exceeded', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
        operation: 'withdrawal_create',
        useRiskProfile: true,
      });

      rateLimiter.getUserRiskProfile.mockResolvedValue({
        accountAgeDays: 30,
        isEmailVerified: true,
        is2FAEnabled: false,
        hasCompletedKYC: false,
        totalSuccessfulWithdrawals: 0,
        recentFailedAttempts: 0,
        isTrustedDevice: false,
      });

      const resetAt = new Date(Date.now() + 60000);
      rateLimiter.checkRateLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfterMs: 60000,
        riskMultiplier: 1.0,
      });

      const context = mockExecutionContext();

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
      await expect(guard.canActivate(context)).rejects.toMatchObject({
        status: HttpStatus.TOO_MANY_REQUESTS,
      });
    });

    it('should set rate limit headers on response', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
        operation: 'transfer_create',
        useRiskProfile: false,
      });

      const resetAt = new Date(Date.now() + 3600000);
      rateLimiter.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 15,
        resetAt,
        retryAfterMs: 0,
        warning: 'Approaching rate limit. 15 requests remaining.',
        riskMultiplier: 1.0,
      });

      const context = mockExecutionContext();
      const response = context.switchToHttp().getResponse();

      await guard.canActivate(context);

      expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 15);
      expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', resetAt.toISOString());
      expect(response.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Warning',
        'Approaching rate limit. 15 requests remaining.',
      );
    });

    it('should work without user (unauthenticated)', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
        operation: 'login_attempt',
        useRiskProfile: false,
      });

      rateLimiter.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 10,
        resetAt: new Date(Date.now() + 900000),
        retryAfterMs: 0,
        riskMultiplier: 1.0,
      });

      const context = mockExecutionContext(null); // No user
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(rateLimiter.getUserRiskProfile).not.toHaveBeenCalled();
      expect(rateLimiter.checkRateLimit).toHaveBeenCalledWith(
        'login_attempt',
        null,
        '192.168.1.1',
        undefined,
      );
    });

    it('should continue if risk profile fetch fails', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
        operation: 'withdrawal_create',
        useRiskProfile: true,
      });

      rateLimiter.getUserRiskProfile.mockRejectedValue(new Error('DB error'));
      rateLimiter.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 10,
        resetAt: new Date(Date.now() + 3600000),
        retryAfterMs: 0,
        riskMultiplier: 1.0,
      });

      const context = mockExecutionContext();
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      // Should still call checkRateLimit without risk profile
      expect(rateLimiter.checkRateLimit).toHaveBeenCalledWith(
        'withdrawal_create',
        'test-user',
        '192.168.1.1',
        undefined,
      );
    });
  });

  describe('IP extraction', () => {
    it('should extract IP from x-forwarded-for header', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
        operation: 'api_general',
        useRiskProfile: false,
      });

      rateLimiter.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 100,
        resetAt: new Date(),
        retryAfterMs: 0,
        riskMultiplier: 1.0,
      });

      const context = mockExecutionContext('user', '203.0.113.50');
      await guard.canActivate(context);

      expect(rateLimiter.checkRateLimit).toHaveBeenCalledWith(
        'api_general',
        'user',
        '203.0.113.50',
        undefined,
      );
    });
  });
});
