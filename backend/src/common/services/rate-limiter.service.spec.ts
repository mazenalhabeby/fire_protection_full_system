import { Test, TestingModule } from '@nestjs/testing';
import { RateLimiterService, OperationType, UserRiskProfile } from './rate-limiter.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('RateLimiterService', () => {
  let service: RateLimiterService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrisma = {
      user: {
        findUnique: jest.fn(),
      },
      withdrawal: {
        count: jest.fn(),
      },
      withdrawalProcessingLog: {
        count: jest.fn(),
      },
      session: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimiterService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<RateLimiterService>(RateLimiterService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkRateLimit', () => {
    it('should allow first request', async () => {
      const result = await service.checkRateLimit(
        'withdrawal_create',
        'user-123',
        '192.168.1.1',
      );

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it('should track requests per user', async () => {
      const userId = 'user-456';
      const ip = '192.168.1.2';

      // Make multiple requests
      for (let i = 0; i < 5; i++) {
        const result = await service.checkRateLimit('withdrawal_create', userId, ip);
        expect(result.allowed).toBe(true);
        service.recordOperation('withdrawal_create', userId, ip);
      }

      // Check remaining decreases
      const finalResult = await service.checkRateLimit('withdrawal_create', userId, ip);
      expect(finalResult.remaining).toBeLessThan(10); // Base limit is 10
    });

    it('should block when limit exceeded', async () => {
      const userId = 'user-789';
      const ip = '192.168.1.3';

      // Exhaust the limit (base limit is 10 for withdrawal_create)
      for (let i = 0; i < 10; i++) {
        service.recordOperation('withdrawal_create', userId, ip);
      }

      const result = await service.checkRateLimit('withdrawal_create', userId, ip);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfterMs).toBeGreaterThan(0);
    });

    it('should apply different limits for different operations', async () => {
      const userId = 'user-ops';
      const ip = '192.168.1.4';

      // withdrawal_create has lower limit than withdrawal_read
      const createResult = await service.checkRateLimit('withdrawal_create', userId, ip);
      const readResult = await service.checkRateLimit('withdrawal_read', userId, ip);

      // Read should have higher limit (100 vs 10)
      expect(readResult.remaining).toBeGreaterThan(createResult.remaining);
    });

    it('should show warning when approaching limit', async () => {
      const userId = 'user-warning';
      const ip = '192.168.1.5';

      // Use up 80% of limit (8 out of 10 for withdrawal_create)
      for (let i = 0; i < 8; i++) {
        service.recordOperation('withdrawal_create', userId, ip);
      }

      const result = await service.checkRateLimit('withdrawal_create', userId, ip);
      expect(result.allowed).toBe(true);
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('Approaching rate limit');
    });
  });

  describe('risk profile adjustments', () => {
    const baseProfile: UserRiskProfile = {
      accountAgeDays: 30,
      isEmailVerified: true,
      is2FAEnabled: false,
      hasCompletedKYC: false,
      totalSuccessfulWithdrawals: 0,
      recentFailedAttempts: 0,
      isTrustedDevice: false,
    };

    it('should increase limits for trusted users with 2FA', async () => {
      const trustedProfile: UserRiskProfile = {
        ...baseProfile,
        accountAgeDays: 100,
        is2FAEnabled: true,
        hasCompletedKYC: true,
        totalSuccessfulWithdrawals: 15,
        isTrustedDevice: true,
      };

      const resultBase = await service.checkRateLimit(
        'withdrawal_create',
        'base-user',
        '10.0.0.1',
        baseProfile,
      );

      const resultTrusted = await service.checkRateLimit(
        'withdrawal_create',
        'trusted-user',
        '10.0.0.2',
        trustedProfile,
      );

      // Trusted user should have higher limits
      expect(resultTrusted.riskMultiplier).toBeGreaterThan(resultBase.riskMultiplier);
      expect(resultTrusted.remaining).toBeGreaterThan(resultBase.remaining);
    });

    it('should decrease limits for risky users', async () => {
      const riskyProfile: UserRiskProfile = {
        ...baseProfile,
        accountAgeDays: 3, // New account
        isEmailVerified: false,
        recentFailedAttempts: 6, // Many failed attempts
      };

      const resultRisky = await service.checkRateLimit(
        'withdrawal_create',
        'risky-user',
        '10.0.0.3',
        riskyProfile,
      );

      // Risky user should have lower multiplier
      expect(resultRisky.riskMultiplier).toBeLessThan(1.0);
    });

    it('should cap risk multiplier between 0.3 and 2.5', async () => {
      const extremeTrusted: UserRiskProfile = {
        accountAgeDays: 1000,
        isEmailVerified: true,
        is2FAEnabled: true,
        hasCompletedKYC: true,
        totalSuccessfulWithdrawals: 100,
        recentFailedAttempts: 0,
        isTrustedDevice: true,
      };

      const extremeRisky: UserRiskProfile = {
        accountAgeDays: 1,
        isEmailVerified: false,
        is2FAEnabled: false,
        hasCompletedKYC: false,
        totalSuccessfulWithdrawals: 0,
        recentFailedAttempts: 10,
        isTrustedDevice: false,
      };

      const trustedResult = await service.checkRateLimit(
        'withdrawal_create',
        'extreme-trusted',
        '10.0.0.4',
        extremeTrusted,
      );

      const riskyResult = await service.checkRateLimit(
        'withdrawal_create',
        'extreme-risky',
        '10.0.0.5',
        extremeRisky,
      );

      expect(trustedResult.riskMultiplier).toBeLessThanOrEqual(2.5);
      expect(riskyResult.riskMultiplier).toBeGreaterThanOrEqual(0.3);
    });
  });

  describe('IP-based rate limiting', () => {
    it('should track IP independently from user', async () => {
      const ip = '192.168.10.1';

      // Different users, same IP
      for (let i = 0; i < 15; i++) {
        service.recordOperation('withdrawal_create', `user-${i}`, ip);
      }

      // IP limit (20) should be partially exhausted
      const result = await service.checkRateLimit('withdrawal_create', 'new-user', ip);
      expect(result.remaining).toBeLessThan(20);
    });

    it('should work for unauthenticated requests', async () => {
      const result = await service.checkRateLimit(
        'login_attempt',
        null, // No user ID for login
        '192.168.20.1',
      );

      expect(result.allowed).toBe(true);
    });
  });

  describe('getUserRiskProfile', () => {
    it('should fetch risk profile from database', async () => {
      const userId = 'db-user';
      const ip = '192.168.30.1';

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
        isEmailVerified: true,
        twoFactorAuth: { isEnabled: true },
      });
      (prisma.withdrawal.count as jest.Mock).mockResolvedValue(5);
      (prisma.withdrawalProcessingLog.count as jest.Mock).mockResolvedValue(0);
      (prisma.session.findFirst as jest.Mock).mockResolvedValue({ id: 'session-1' });

      const profile = await service.getUserRiskProfile(userId, ip);

      expect(profile.accountAgeDays).toBeGreaterThanOrEqual(59);
      expect(profile.isEmailVerified).toBe(true);
      expect(profile.is2FAEnabled).toBe(true);
      expect(profile.totalSuccessfulWithdrawals).toBe(5);
      expect(profile.isTrustedDevice).toBe(true);
    });

    it('should handle missing user gracefully', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.withdrawal.count as jest.Mock).mockResolvedValue(0);
      (prisma.withdrawalProcessingLog.count as jest.Mock).mockResolvedValue(0);
      (prisma.session.findFirst as jest.Mock).mockResolvedValue(null);

      const profile = await service.getUserRiskProfile('nonexistent', '1.2.3.4');

      expect(profile.accountAgeDays).toBe(0);
      expect(profile.isEmailVerified).toBe(false);
      expect(profile.is2FAEnabled).toBe(false);
    });
  });
});
