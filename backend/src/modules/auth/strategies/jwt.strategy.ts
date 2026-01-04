import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PrismaService } from '../../../prisma/prisma.service';
import { SessionService } from '../session.service';
import { ACCESS_TOKEN_COOKIE } from '../../../config/cookie.config';
import { JwtPayload } from '../token.service';

/**
 * Extract JWT from HttpOnly cookie first, then fallback to Authorization header
 */
const cookieExtractor = (req: Request): string | null => {
  if (req && req.cookies) {
    const token = req.cookies[ACCESS_TOKEN_COOKIE];
    if (token) {
      return token;
    }
  }
  return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private sessionService: SessionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      algorithms: ['HS256'], // Enforce algorithm to prevent algorithm confusion attacks
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    const tokenExp = payload.exp ? new Date(payload.exp * 1000).toISOString() : 'unknown';
    const timeLeft = payload.exp ? Math.round((payload.exp * 1000 - Date.now()) / 1000) : 0;
    this.logger.debug(`🔑 ACCESS TOKEN validated - User: ${payload.sub}, Session: ${payload.sessionId}, Expires: ${tokenExp} (${timeLeft}s left)`);

    // Verify token type
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Validate session exists and is valid
    if (payload.sessionId) {
      const session = await this.sessionService.validateSession(payload.sessionId);
      if (!session) {
        this.logger.warn(`Invalid session for user ${payload.sub}: ${payload.sessionId}`);
        throw new UnauthorizedException('Session expired or revoked');
      }

      // Update last activity (non-blocking)
      this.sessionService.updateLastActivity(payload.sessionId).catch(() => {});
    }

    // Fetch user with necessary fields
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        walletAddress: true,
        legacyRole: true,
        roleId: true,
        isActive: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Attach session ID to user object for later use
    // Map legacyRole to role for backward compatibility
    return {
      ...user,
      role: user.legacyRole,
      sessionId: payload.sessionId,
    };
  }
}
