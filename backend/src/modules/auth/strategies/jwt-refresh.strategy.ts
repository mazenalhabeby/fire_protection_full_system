import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PrismaService } from '../../../prisma/prisma.service';
import { SessionService } from '../session.service';
import { REFRESH_TOKEN_COOKIE } from '../../../config/cookie.config';
import { JwtPayload } from '../token.service';

/**
 * Extract refresh token from HttpOnly cookie
 */
const refreshCookieExtractor = (req: Request): string | null => {
  if (req && req.cookies) {
    const token = req.cookies[REFRESH_TOKEN_COOKIE];
    if (token) {
      return token;
    }
  }
  return null;
};

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  private readonly logger = new Logger(JwtRefreshStrategy.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private sessionService: SessionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        refreshCookieExtractor,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      algorithms: ['HS256'], // Enforce algorithm to prevent algorithm confusion attacks
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    // Verify token type
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Get the raw refresh token from cookie for validation
    const refreshToken = req.cookies[REFRESH_TOKEN_COOKIE];
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    // Validate session by the refresh token
    const session = await this.sessionService.validateSessionByToken(refreshToken);
    if (!session) {
      this.logger.warn(`Invalid refresh token for user ${payload.sub}`);
      throw new UnauthorizedException('Session expired or revoked');
    }

    // Verify session belongs to the user in the token
    if (session.userId !== payload.sub) {
      this.logger.error(`Token user mismatch: ${payload.sub} vs ${session.userId}`);
      // Security violation - revoke the session
      await this.sessionService.revokeSession(session.id, 'security');
      throw new UnauthorizedException('Invalid session');
    }

    // Fetch user
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        walletAddress: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Return user with session info and refresh token for rotation
    return {
      ...user,
      sessionId: session.id,
      refreshToken, // Needed for token rotation
    };
  }
}
