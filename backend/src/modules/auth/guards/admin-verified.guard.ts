import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Guard that ensures:
 * 1. User is authenticated
 * 2. User has ADMIN role
 * 3. User has completed step-up authentication (2FA verification for admin access)
 * 4. Step-up verification hasn't expired
 * 5. Request IP matches the IP used during step-up verification
 */
@Injectable()
export class AdminVerifiedGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Check if user is authenticated
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    // Check if user is admin
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin access required');
    }

    // Get session ID from the request (set by JWT strategy)
    const sessionId = user.sessionId;
    if (!sessionId) {
      throw new UnauthorizedException('Invalid session');
    }

    // Get session with admin verification details
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        adminVerifiedAt: true,
        adminVerifiedIp: true,
        adminVerifiedUntil: true,
        isValid: true,
      },
    });

    if (!session || !session.isValid) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    // Check if admin verification was completed
    if (!session.adminVerifiedUntil) {
      throw new ForbiddenException({
        message: 'Admin step-up authentication required',
        code: 'ADMIN_VERIFICATION_REQUIRED',
        requiresVerification: true,
      });
    }

    // Check if verification has expired
    if (new Date() > session.adminVerifiedUntil) {
      throw new ForbiddenException({
        message: 'Admin verification has expired',
        code: 'ADMIN_VERIFICATION_EXPIRED',
        requiresVerification: true,
      });
    }

    // Check IP address matches (additional security layer)
    const currentIp = this.getClientIp(request);
    if (session.adminVerifiedIp && session.adminVerifiedIp !== currentIp) {
      throw new ForbiddenException({
        message: 'IP address mismatch - please re-verify admin access',
        code: 'ADMIN_VERIFICATION_IP_MISMATCH',
        requiresVerification: true,
      });
    }

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
